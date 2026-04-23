import express from 'express';
import request from 'supertest';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
	JobController,
	__resetControllersForTest,
	registerController,
} from '../generator.js';
import {__resetJobsForTest, getJob, saveJob} from '../jobs.js';
import type {
	AdapterEvent,
	ModelEntry,
	StreamingProviderAdapter,
} from '../providers/types.js';
import type {Job} from '../types.js';
import interactRouter from './interact.js';

// Stub registry + registry.ts + bundler.ts (same as generator tests).
let mockAdapter: StreamingProviderAdapter | null = null;
const mockEntry: ModelEntry = {
	id: 'mock/mock',
	label: 'mock',
	vendor: 'anthropic',
	model: 'mock',
	envKey: 'MOCK_API_KEY',
};

vi.mock('../providers/index.js', () => ({
	getProvider: (id: string) =>
		id === mockEntry.id && mockAdapter
			? {entry: mockEntry, adapter: mockAdapter}
			: undefined,
}));
vi.mock('../registry.js', () => ({
	writeGeneratedComposition: vi.fn(async (jobId: string) => {
		return `src/generated/${jobId}.tsx`;
	}),
}));
vi.mock('../bundler.js', () => ({invalidateBundle: vi.fn()}));

function mkApp() {
	const app = express();
	app.use(express.json());
	app.use('/api', interactRouter);
	return app;
}

function mkJob(overrides: Partial<Job> = {}): Job {
	const now = Date.now();
	return {
		id: 'j1',
		status: 'generating',
		scene: 's',
		assets: [],
		modelId: mockEntry.id,
		conversation: [{role: 'user', content: 's', ts: now}],
		events: [],
		eventsTotalCount: 0,
		turn: 0,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

async function waitUntil(pred: () => boolean, ms = 2000): Promise<void> {
	const start = Date.now();
	while (!pred() && Date.now() - start < ms) {
		await new Promise((r) => setTimeout(r, 10));
	}
	if (!pred()) throw new Error('waitUntil timed out');
}

describe('POST /api/jobs/:id/cancel', () => {
	beforeEach(() => {
		__resetJobsForTest();
		__resetControllersForTest();
	});
	afterEach(() => {
		mockAdapter = null;
	});

	it('404 for unknown job', async () => {
		const res = await request(mkApp()).post('/api/jobs/missing/cancel');
		expect(res.status).toBe(404);
	});

	it('idempotent when nothing is running (returns current status)', async () => {
		saveJob(mkJob({status: 'ready'}));
		const res = await request(mkApp()).post('/api/jobs/j1/cancel');
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ok: true, status: 'ready'});
	});

	it('aborts an in-flight controller', async () => {
		mockAdapter = async function* (_entry, input): AsyncGenerator<AdapterEvent> {
			yield {type: 'tool_call_start', name: 'emit_composition'};
			for (let i = 0; i < 100; i++) {
				if (input.signal.aborted) throw new DOMException('aborted', 'AbortError');
				yield {type: 'tool_args_delta', delta: String(i)};
				await new Promise((r) => setTimeout(r, 5));
			}
		};
		saveJob(mkJob());
		const controller = new JobController('j1', mockEntry.id);
		registerController(controller);
		controller.start(0);

		await new Promise((r) => setTimeout(r, 20));
		const res = await request(mkApp()).post('/api/jobs/j1/cancel');
		expect(res.status).toBe(200);
		expect(res.body.status).toBe('cancelling');
		await waitUntil(() => getJob('j1')?.status === 'cancelled');
	});

	it('rejects cancel during rendering with 400', async () => {
		saveJob(mkJob({status: 'rendering'}));
		const res = await request(mkApp()).post('/api/jobs/j1/cancel');
		expect(res.status).toBe(400);
	});
});

describe('POST /api/jobs/:id/feedback', () => {
	beforeEach(() => {
		__resetJobsForTest();
		__resetControllersForTest();
	});
	afterEach(() => {
		mockAdapter = null;
	});

	it('404 for unknown job', async () => {
		const res = await request(mkApp())
			.post('/api/jobs/missing/feedback')
			.send({content: 'hi'});
		expect(res.status).toBe(404);
	});

	it('rejects feedback during rendering with 409', async () => {
		saveJob(mkJob({status: 'rendering'}));
		const res = await request(mkApp())
			.post('/api/jobs/j1/feedback')
			.send({content: '把背景改蓝'});
		expect(res.status).toBe(409);
	});

	it('rejects empty content with 400', async () => {
		saveJob(mkJob({status: 'ready'}));
		const res = await request(mkApp())
			.post('/api/jobs/j1/feedback')
			.send({content: '   '});
		expect(res.status).toBe(400);
	});

	it('kicks off a new turn and marks job generating', async () => {
		mockAdapter = async function* (): AsyncGenerator<AdapterEvent> {
			yield {type: 'tool_call_start', name: 'emit_composition'};
			yield {
				type: 'tool_call_done',
				result: {
					tsxContent: `export const metadata = {id:'j1',durationInFrames:30,fps:30,width:1080,height:1920}; export const Composition = () => null;`,
					meta: {durationInFrames: 30, fps: 30, width: 1080, height: 1920},
					summary: 'v2',
				},
			};
		};
		saveJob(mkJob({status: 'ready'}));
		const controller = new JobController('j1', mockEntry.id);
		registerController(controller);

		const res = await request(mkApp())
			.post('/api/jobs/j1/feedback')
			.send({content: '换成猫'});
		expect(res.status).toBe(202);
		expect(res.body).toMatchObject({ok: true, turn: 1});

		await waitUntil(() => getJob('j1')?.status === 'ready');
		const job = getJob('j1')!;
		expect(job.turn).toBe(1);
		expect(job.summary).toBe('v2');
		expect(job.conversation.map((t) => t.role)).toEqual([
			'user',
			'user',
			'assistant',
		]);
		expect(job.conversation[1].content).toBe('换成猫');
	});
});
