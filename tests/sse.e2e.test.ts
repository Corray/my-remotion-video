import express, {type Express} from 'express';
import type {AddressInfo} from 'node:net';
import type {Server} from 'node:http';
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import type {AdapterEvent, ModelEntry, StreamingProviderAdapter} from '../server/providers/types.js';
import type {Job, StudioEvent} from '../server/types.js';

// Provider registry mock — keeps real adapters available but lets us inject a
// controllable one under the id `mock/mock` for the live-reconnect scenario.
let mockAdapter: StreamingProviderAdapter | null = null;
const mockEntry: ModelEntry = {
	id: 'mock/mock',
	label: 'mock',
	vendor: 'anthropic',
	model: 'mock',
	envKey: 'MOCK_KEY',
};
vi.mock('../server/providers/index.js', () => ({
	getProvider: (id: string) =>
		id === mockEntry.id && mockAdapter
			? {entry: mockEntry, adapter: mockAdapter}
			: undefined,
}));

// Imports that depend on the mocked providers module must come after vi.mock.
const {__resetJobsForTest, appendEvent, saveJob} = await import(
	'../server/jobs.js'
);
const {__resetControllersForTest, JobController, registerController} =
	await import('../server/generator.js');
const eventsRouter = (await import('../server/routes/events.js')).default;

// ========== Test server setup ==========

let app: Express;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
	app = express();
	app.use('/api', eventsRouter);
	server = app.listen(0);
	await new Promise<void>((resolve) => server.once('listening', () => resolve()));
	const {port} = server.address() as AddressInfo;
	baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
	__resetJobsForTest();
	__resetControllersForTest();
});

// ========== SSE reader ==========

type SSERecord = {id: number; data: string};

/**
 * Consume /api/jobs/:id/events (streaming). Returns once the server ends
 * the connection or the caller aborts via the returned AbortController.
 * The `onEvent` callback can return `true` to proactively abort.
 */
async function subscribe(
	path: string,
	onEvent: (rec: SSERecord) => boolean | void,
): Promise<{aborted: boolean; records: SSERecord[]; status: number}> {
	const ac = new AbortController();
	const records: SSERecord[] = [];
	const res = await fetch(`${baseUrl}${path}`, {signal: ac.signal});
	if (res.status !== 200 || !res.body) {
		return {aborted: false, records, status: res.status};
	}
	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buf = '';
	let aborted = false;
	try {
		while (true) {
			const {value, done} = await reader.read();
			if (done) break;
			buf += decoder.decode(value, {stream: true});
			let idx: number;
			// eslint-disable-next-line no-cond-assign
			while ((idx = buf.indexOf('\n\n')) >= 0) {
				const block = buf.slice(0, idx);
				buf = buf.slice(idx + 2);
				const lines = block.split('\n').filter(Boolean);
				let id: number | null = null;
				let data: string | null = null;
				for (const line of lines) {
					if (line.startsWith(':')) continue; // heartbeat
					if (line.startsWith('id:')) id = parseInt(line.slice(3).trim(), 10);
					else if (line.startsWith('data:')) data = line.slice(5).trim();
				}
				if (id !== null && data !== null) {
					const rec: SSERecord = {id, data};
					records.push(rec);
					if (onEvent(rec) === true) {
						aborted = true;
						ac.abort();
						break;
					}
				}
			}
			if (aborted) break;
		}
	} catch (err) {
		if ((err as Error).name !== 'AbortError') throw err;
		aborted = true;
	}
	return {aborted, records, status: 200};
}

// ========== Fixtures ==========

function mkEvent(i: number): StudioEvent {
	return {type: 'token', delta: `tok-${i}`, turn: 0, ts: i};
}

function mkJob(id: string, status: Job['status'] = 'ready'): Job {
	const now = Date.now();
	return {
		id,
		status,
		scene: 's',
		assets: [],
		conversation: [],
		events: [],
		eventsTotalCount: 0,
		turn: 0,
		createdAt: now,
		updatedAt: now,
	};
}

// ========== Tests ==========

describe('SSE e2e: real express + fetch streaming (replay + reconnect via since=)', () => {
	it('replay from since=0 returns all buffered events then closes (terminal job)', async () => {
		const job = mkJob('jsse-replay', 'ready');
		saveJob(job);
		for (let i = 0; i < 3; i++) appendEvent(job.id, mkEvent(i));

		const {records} = await subscribe(
			`/api/jobs/${job.id}/events?since=0`,
			() => undefined,
		);

		expect(records).toHaveLength(3);
		expect(records.map((r) => r.id)).toEqual([0, 1, 2]);
		const parsed = records.map((r) => JSON.parse(r.data) as StudioEvent);
		expect(parsed.map((p) => (p as {delta: string}).delta)).toEqual([
			'tok-0',
			'tok-1',
			'tok-2',
		]);
	});

	it('replay with since=N skips earlier events', async () => {
		const job = mkJob('jsse-skip', 'ready');
		saveJob(job);
		for (let i = 0; i < 5; i++) appendEvent(job.id, mkEvent(i));

		const {records} = await subscribe(
			`/api/jobs/${job.id}/events?since=3`,
			() => undefined,
		);

		expect(records.map((r) => r.id)).toEqual([3, 4]);
	});

	it('disconnect mid-stream then reconnect with since=N: no loss, no duplicates across live feed', async () => {
		const job = mkJob('jsse-resume', 'generating');
		saveJob(job);

		// Controllable queue driving the mocked adapter. Each push() resolves
		// once the generator has yielded the event (letting the test know when
		// downstream state — appendEvent — is up to date).
		type Slot = {ev: AdapterEvent; sent: () => void};
		const queue: Slot[] = [];
		let readyResolve: (() => void) | null = null;
		const readyPromise = (): Promise<void> =>
			new Promise((r) => {
				if (queue.length > 0) r();
				else readyResolve = r;
			});
		const push = (ev: AdapterEvent): Promise<void> =>
			new Promise<void>((sent) => {
				queue.push({ev, sent});
				if (readyResolve) {
					readyResolve();
					readyResolve = null;
				}
			});

		mockAdapter = async function* () {
			while (true) {
				await readyPromise();
				const slot = queue.shift();
				if (!slot) continue;
				yield slot.ev;
				slot.sent();
				if (slot.ev.type === 'tool_call_done') return;
			}
		};

		try {
			const ctrl = new JobController(job.id, 'mock/mock', {maxAttempts: 1});
			registerController(ctrl);
			ctrl.start(0);

			// Emit 3 token events before the first subscriber connects.
			// runLoop also emits `started` (id=0), so after these we expect
			// ids 0..3 in the buffer.
			await push({type: 'thinking', delta: 'first'});
			await push({type: 'token', delta: 'a'});
			await push({type: 'token', delta: 'b'});
			await new Promise((r) => setTimeout(r, 50));

			// First subscribe: read until id>=3 then destroy.
			const first = await subscribe(
				`/api/jobs/${job.id}/events?since=0`,
				(rec) => (rec.id >= 3 ? true : undefined),
			);
			expect(first.aborted).toBe(true);
			expect(first.records.map((r) => r.id)).toEqual([0, 1, 2, 3]);

			// Emit 2 more events after disconnect.
			await push({type: 'token', delta: 'c'});
			await push({type: 'token', delta: 'd'});
			await new Promise((r) => setTimeout(r, 50));

			// Reconnect with since=4.
			const second = await subscribe(
				`/api/jobs/${job.id}/events?since=4`,
				(rec) => (rec.id >= 5 ? true : undefined),
			);

			const ids = second.records.map((r) => r.id);
			expect(ids).toContain(4);
			expect(ids).toContain(5);
			// No duplicates — server must not re-send events 0..3.
			for (const r of second.records) expect(r.id).toBeGreaterThanOrEqual(4);

			ctrl.cancel();
			await new Promise((r) => setTimeout(r, 50));
		} finally {
			mockAdapter = null;
		}
	});
});
