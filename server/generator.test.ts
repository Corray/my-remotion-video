import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
	JobController,
	__resetControllersForTest,
	registerController,
} from './generator.js';
import {__resetJobsForTest, getJob, saveJob} from './jobs.js';
import type {
	AdapterEvent,
	ModelEntry,
	StreamingProviderAdapter,
} from './providers/types.js';
import type {GenerateResult} from './providers/types.js';
import type {Job, StudioEvent} from './types.js';

// Mock registry to inject a fake adapter under a known model id.
let mockAdapter: StreamingProviderAdapter | null = null;
const mockEntry: ModelEntry = {
	id: 'mock/mock',
	label: 'mock',
	vendor: 'anthropic',
	model: 'mock',
	envKey: 'MOCK_API_KEY',
};

vi.mock('./providers/index.js', () => ({
	getProvider: (id: string) =>
		id === mockEntry.id && mockAdapter
			? {entry: mockEntry, adapter: mockAdapter}
			: undefined,
}));

// Mock registry.writeGeneratedComposition + bundler.invalidateBundle
vi.mock('./registry.js', () => ({
	writeGeneratedComposition: vi.fn(async (jobId: string) => {
		return `src/generated/${jobId}.tsx`;
	}),
}));
vi.mock('./bundler.js', () => ({
	invalidateBundle: vi.fn(),
}));

const GOOD_TSX = `
import React from 'react';
export const metadata = {id: 'gen-test', durationInFrames: 30, fps: 30, width: 1080, height: 1920};
export const Composition: React.FC = () => <></>;
`;

const GOOD_RESULT: GenerateResult = {
	tsxContent: GOOD_TSX,
	meta: {durationInFrames: 30, fps: 30, width: 1080, height: 1920},
	summary: 'ok',
};

function mkJob(id = 'gen-test'): Job {
	const now = Date.now();
	return {
		id,
		status: 'generating',
		scene: 'scene',
		assets: [],
		modelId: mockEntry.id,
		conversation: [{role: 'user', content: 'scene', ts: now}],
		events: [],
		turn: 0,
		createdAt: now,
		updatedAt: now,
	};
}

async function waitUntil(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
	const start = Date.now();
	while (!predicate() && Date.now() - start < timeoutMs) {
		await new Promise((r) => setTimeout(r, 10));
	}
	if (!predicate()) throw new Error('waitUntil timed out');
}

describe('JobController', () => {
	beforeEach(() => {
		__resetJobsForTest();
		__resetControllersForTest();
	});
	afterEach(() => {
		mockAdapter = null;
	});

	it('happy path: streams events, writes tsx, marks job ready', async () => {
		mockAdapter = async function* (): AsyncGenerator<AdapterEvent> {
			yield {type: 'tool_call_start', name: 'emit_composition'};
			yield {type: 'tool_args_delta', delta: '{...}'};
			yield {type: 'tool_call_done', result: GOOD_RESULT};
		};

		saveJob(mkJob());
		const controller = new JobController('gen-test', mockEntry.id);
		registerController(controller);

		const collected: StudioEvent[] = [];
		controller.subscribe((ev) => collected.push(ev));

		controller.start(0);
		await waitUntil(() => getJob('gen-test')?.status === 'ready');

		const job = getJob('gen-test')!;
		expect(job.status).toBe('ready');
		expect(job.summary).toBe('ok');
		expect(job.meta?.durationInFrames).toBe(30);
		expect(job.conversation).toHaveLength(2);
		expect(job.conversation[1].role).toBe('assistant');

		const types = collected.map((e) => e.type);
		expect(types).toContain('started');
		expect(types).toContain('tool_call_done');
		expect(types).toContain('compile_check');
		expect(types).toContain('tsx_written');
		expect(types[types.length - 1]).toBe('done');
	});

	it('cancel: stops generation mid-stream and marks cancelled', async () => {
		let aborted = false;
		mockAdapter = async function* (_entry, input): AsyncGenerator<AdapterEvent> {
			yield {type: 'tool_call_start', name: 'emit_composition'};
			// Simulate slow stream: check signal each iteration.
			for (let i = 0; i < 100; i++) {
				if (input.signal.aborted) {
					aborted = true;
					throw new DOMException('aborted', 'AbortError');
				}
				yield {type: 'tool_args_delta', delta: String(i)};
				await new Promise((r) => setTimeout(r, 5));
			}
		};

		saveJob(mkJob('j-cancel'));
		const controller = new JobController('j-cancel', mockEntry.id);
		registerController(controller);
		controller.start(0);

		// Let a few deltas flow, then cancel.
		await new Promise((r) => setTimeout(r, 20));
		controller.cancel();

		await waitUntil(() => getJob('j-cancel')?.status === 'cancelled');
		expect(aborted).toBe(true);
		expect(getJob('j-cancel')!.status).toBe('cancelled');
	});

	it('feedback: cancels in-flight + adds user turn + starts new round', async () => {
		// First round streams slowly, second round resolves immediately.
		let round = 0;
		mockAdapter = async function* (_entry, input): AsyncGenerator<AdapterEvent> {
			round++;
			if (round === 1) {
				yield {type: 'tool_call_start', name: 'emit_composition'};
				for (let i = 0; i < 100; i++) {
					if (input.signal.aborted) throw new DOMException('aborted', 'AbortError');
					yield {type: 'tool_args_delta', delta: String(i)};
					await new Promise((r) => setTimeout(r, 5));
				}
			} else {
				yield {type: 'tool_call_start', name: 'emit_composition'};
				yield {type: 'tool_call_done', result: GOOD_RESULT};
			}
		};

		saveJob(mkJob('j-fb'));
		const controller = new JobController('j-fb', mockEntry.id);
		registerController(controller);
		controller.start(0);

		await new Promise((r) => setTimeout(r, 20));
		await controller.feedback('把女孩换成一只猫');

		await waitUntil(() => getJob('j-fb')?.status === 'ready');
		const job = getJob('j-fb')!;
		expect(job.turn).toBe(1);
		expect(job.conversation.map((t) => t.role)).toEqual([
			'user',
			'user',
			'assistant',
		]);
		expect(job.conversation[1].content).toBe('把女孩换成一只猫');
	});

	it('retry: compile error on first attempt triggers retry and eventually succeeds', async () => {
		const BAD_TSX = 'not a valid tsx';
		let call = 0;
		mockAdapter = async function* (): AsyncGenerator<AdapterEvent> {
			call++;
			yield {type: 'tool_call_start', name: 'emit_composition'};
			if (call === 1) {
				yield {
					type: 'tool_call_done',
					result: {...GOOD_RESULT, tsxContent: BAD_TSX},
				};
			} else {
				yield {type: 'tool_call_done', result: GOOD_RESULT};
			}
		};

		saveJob(mkJob('j-retry'));
		const controller = new JobController('j-retry', mockEntry.id);
		registerController(controller);

		const collected: StudioEvent[] = [];
		controller.subscribe((ev) => collected.push(ev));
		controller.start(0);

		await waitUntil(() => getJob('j-retry')?.status === 'ready');
		expect(call).toBe(2);
		expect(collected.some((e) => e.type === 'retry')).toBe(true);
		expect(collected.some((e) => e.type === 'compile_check' && !e.ok)).toBe(true);
	});

	it('provider error: marks job error and emits error event', async () => {
		mockAdapter = async function* (): AsyncGenerator<AdapterEvent> {
			yield {type: 'tool_call_start', name: 'emit_composition'};
			throw new Error('simulated provider failure');
		};

		saveJob(mkJob('j-err'));
		const controller = new JobController('j-err', mockEntry.id);
		registerController(controller);
		const collected: StudioEvent[] = [];
		controller.subscribe((ev) => collected.push(ev));
		controller.start(0);

		await waitUntil(() => getJob('j-err')?.status === 'error');
		const errEv = collected.find((e) => e.type === 'error');
		if (!errEv || errEv.type !== 'error')
			throw new Error('expected error event');
		expect(errEv.stage).toBe('provider');
		expect(errEv.message).toMatch(/simulated provider failure/);
	});
});
