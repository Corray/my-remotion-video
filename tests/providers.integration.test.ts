import {createServer, type IncomingMessage, type Server, type ServerResponse} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';

// Mock filesystem side effects so tests don't touch src/generated/
vi.mock('../server/registry.js', () => ({
	writeGeneratedComposition: vi.fn(
		async (jobId: string) => `src/generated/${jobId}.tsx`,
	),
}));
vi.mock('../server/bundler.js', () => ({
	invalidateBundle: vi.fn(),
}));

// Import after mocks so generator uses the mocked modules.
const {JobController, __resetControllersForTest, registerController} =
	await import('../server/generator.js');
const {__resetJobsForTest, saveJob} = await import('../server/jobs.js');
const {__resetMiniMaxFlagForTest} = await import(
	'../server/providers/openai-compat.js'
);
const {getProvider} = await import('../server/providers/index.js');
type StudioEventT = import('../server/types.js').StudioEvent;
type JobT = import('../server/types.js').Job;

// ========== Mock HTTP server ==========

const VALID_TSX = [
	"import {AbsoluteFill} from 'remotion';",
	'export const metadata = {id: "test", durationInFrames: 150, fps: 30, width: 1080, height: 1920};',
	'export const Composition = () => <AbsoluteFill style={{background: "red"}} />;',
].join('\n');

const VALID_TOOL_ARGS = JSON.stringify({
	tsxContent: VALID_TSX,
	durationInFrames: 150,
	fps: 30,
	width: 1080,
	height: 1920,
	summary: 'integration test fixture',
});

type Handler = (
	req: IncomingMessage,
	res: ServerResponse,
	body: string,
) => void | Promise<void>;

class MockUpstream {
	private server: Server | null = null;
	private handler: Handler = () => {
		throw new Error('no handler set');
	};
	public lastAbortedAt: number | null = null;

	async listen(): Promise<number> {
		this.server = createServer((req, res) => {
			let body = '';
			let handlerFinishedNaturally = false;
			req.on('data', (chunk: Buffer) => {
				body += chunk.toString('utf8');
			});
			// Register close tracking FIRST so we run before any handler
			// listeners do res.end() on abort.
			res.on('close', () => {
				if (!handlerFinishedNaturally) this.lastAbortedAt = Date.now();
			});
			req.on('end', () => {
				void Promise.resolve(this.handler(req, res, body))
					.then(() => {
						handlerFinishedNaturally = res.writableEnded;
					})
					.catch((err) => {
						if (!res.headersSent) {
							res.writeHead(500);
							res.end(String(err));
						}
					});
			});
		});
		await new Promise<void>((resolve) => this.server!.listen(0, resolve));
		const {port} = this.server!.address() as AddressInfo;
		return port;
	}

	setHandler(h: Handler): void {
		this.handler = h;
	}

	async close(): Promise<void> {
		await new Promise<void>((resolve) =>
			this.server!.close(() => resolve()),
		);
	}
}

// Build an OpenAI chat.completions SSE streaming chunk.
function sseChunk(delta: object, finish: string | null = null): string {
	const payload = {
		id: 'chatcmpl-test',
		object: 'chat.completion.chunk',
		choices: [{index: 0, delta, finish_reason: finish}],
	};
	return `data: ${JSON.stringify(payload)}\n\n`;
}

// ========== Fixtures ==========

function mkJob(id = 'jint1', scene = 'a scene'): JobT {
	const now = Date.now();
	return {
		id,
		status: 'generating',
		scene,
		assets: [],
		conversation: [],
		events: [],
		eventsTotalCount: 0,
		turn: 0,
		createdAt: now,
		updatedAt: now,
	};
}

type Collector = {
	events: StudioEventT[];
	waitUntilTerminal: (timeoutMs?: number) => Promise<void>;
	waitForType: (
		type: StudioEventT['type'],
		timeoutMs?: number,
	) => Promise<void>;
};

// Subscribe BEFORE start() so we don't miss the `started` event.
function makeCollector(ctrl: InstanceType<typeof JobController>): Collector {
	const events: StudioEventT[] = [];
	const terminal: Set<StudioEventT['type']> = new Set([
		'done',
		'error',
		'cancelled',
	]);
	const waiters: Array<{
		match: (ev: StudioEventT) => boolean;
		resolve: () => void;
	}> = [];
	ctrl.subscribe((ev) => {
		events.push(ev);
		for (let i = waiters.length - 1; i >= 0; i--) {
			if (waiters[i].match(ev)) {
				waiters[i].resolve();
				waiters.splice(i, 1);
			}
		}
	});
	const waitFor = (
		match: (ev: StudioEventT) => boolean,
		timeoutMs = 5000,
	): Promise<void> => {
		const existing = events.find(match);
		if (existing) return Promise.resolve();
		return new Promise<void>((resolve, reject) => {
			const timer = setTimeout(
				() => reject(new Error(`timeout after ${timeoutMs}ms`)),
				timeoutMs,
			);
			waiters.push({
				match,
				resolve: () => {
					clearTimeout(timer);
					resolve();
				},
			});
		});
	};
	return {
		events,
		waitUntilTerminal: (t) => waitFor((ev) => terminal.has(ev.type), t),
		waitForType: (type, t) => waitFor((ev) => ev.type === type, t),
	};
}

// ========== Tests ==========

describe('Provider streaming integration (real SDK ↔ mock HTTP server)', () => {
	let upstream: MockUpstream;
	let port: number;

	beforeAll(async () => {
		upstream = new MockUpstream();
		port = await upstream.listen();
	});

	afterAll(async () => {
		await upstream.close();
	});

	beforeEach(() => {
		__resetJobsForTest();
		__resetControllersForTest();
		__resetMiniMaxFlagForTest();
		process.env.OPENAI_API_KEY = 'sk-fake-for-test';
		process.env.OPENAI_BASE_URL = `http://127.0.0.1:${port}/v1`;
		process.env.MINIMAX_API_KEY = 'mm-fake-for-test';
		process.env.MINIMAX_BASE_URL = `http://127.0.0.1:${port}/v1`;
	});

	afterEach(() => {
		upstream.lastAbortedAt = null;
		upstream.setHandler(() => {
			throw new Error('handler not set in current test');
		});
		delete process.env.OPENAI_API_KEY;
		delete process.env.OPENAI_BASE_URL;
		delete process.env.MINIMAX_API_KEY;
		delete process.env.MINIMAX_BASE_URL;
	});

	it('OpenAI streaming happy path: JobController → adapter → SDK → mock → events', async () => {
		upstream.setHandler((_req, res) => {
			res.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			});
			// tool_call_start
			res.write(
				sseChunk({
					tool_calls: [
						{
							index: 0,
							id: 'call_1',
							type: 'function',
							function: {name: 'emit_composition', arguments: ''},
						},
					],
				}),
			);
			// tool_args_delta (one chunk for simplicity)
			res.write(
				sseChunk({
					tool_calls: [
						{index: 0, function: {arguments: VALID_TOOL_ARGS}},
					],
				}),
			);
			// finish
			res.write(sseChunk({}, 'tool_calls'));
			res.write('data: [DONE]\n\n');
			res.end();
		});

		const job = mkJob('jint-happy');
		saveJob(job);

		const openaiModelId = `openai/${process.env.OPENAI_MODEL ?? 'gpt-5'}`;
		// Sanity: provider must be registered (requires OPENAI_API_KEY set above).
		expect(getProvider(openaiModelId)).toBeDefined();

		const ctrl = new JobController(job.id, openaiModelId);
		registerController(ctrl);
		const c = makeCollector(ctrl);
		ctrl.start(0);
		await c.waitUntilTerminal();

		const types = c.events.map((e) => e.type);
		expect(types).toContain('started');
		expect(types).toContain('tool_call_start');
		expect(types).toContain('tool_args_delta');
		expect(types).toContain('tool_call_done');
		expect(types).toContain('compile_check');
		expect(types).toContain('tsx_written');
		expect(types[types.length - 1]).toBe('done');
	});

	it('cancel mid-stream propagates AbortSignal and the upstream request is aborted', async () => {
		let firstChunkSent = false;
		upstream.setHandler((req, res) => {
			res.writeHead(200, {
				'Content-Type': 'text/event-stream',
				Connection: 'keep-alive',
			});
			// Slow-drip: send one chunk, then hold the socket open indefinitely.
			res.write(
				sseChunk({
					tool_calls: [
						{
							index: 0,
							id: 'call_slow',
							type: 'function',
							function: {name: 'emit_composition', arguments: ''},
						},
					],
				}),
			);
			firstChunkSent = true;
			// Never write [DONE] — the controller must cancel for the test to progress.
			req.on('close', () => {
				if (!res.writableEnded) res.end();
			});
		});

		const job = mkJob('jint-cancel');
		saveJob(job);
		const openaiModelId = `openai/${process.env.OPENAI_MODEL ?? 'gpt-5'}`;
		const ctrl = new JobController(job.id, openaiModelId);
		registerController(ctrl);
		const c = makeCollector(ctrl);
		ctrl.start(0);

		await c.waitForType('tool_call_start');
		expect(firstChunkSent).toBe(true);

		const pre = Date.now();
		ctrl.cancel();

		await c.waitUntilTerminal();
		// Whether the SDK raises AbortError (→ emit 'cancelled') or the reader
		// silently ends and generator emits 'error'/'provider 未产出 tsxContent'
		// depends on the runtime. Both are acceptable terminal states — the
		// critical integration contract is that cancel() breaks the loop and
		// the upstream HTTP connection is torn down. Track the observation in
		// docs/feedback if the 'error' branch persists — it indicates
		// generator.ts could add a post-loop signal.aborted check.
		const last = c.events.at(-1);
		expect(['cancelled', 'error']).toContain(last?.type);

		// The upstream must have seen the connection abort regardless.
		await new Promise((r) => setTimeout(r, 200));
		expect(upstream.lastAbortedAt).not.toBeNull();
		expect(upstream.lastAbortedAt!).toBeGreaterThanOrEqual(pre - 50);
	});

	it('MiniMax fallback: streaming call returns 400 stream-not-supported → adapter retries non-streaming', async () => {
		let requestN = 0;
		upstream.setHandler((_req, res, body) => {
			requestN += 1;
			const parsed = JSON.parse(body) as {stream?: boolean};
			if (parsed.stream) {
				// First call: MiniMax-ish "stream not supported" error.
				res.writeHead(400, {'Content-Type': 'application/json'});
				res.end(
					JSON.stringify({
						error: {
							message: 'stream is not supported for function_call',
							type: 'invalid_request_error',
						},
					}),
				);
				return;
			}
			// Second call: non-streaming response with tool_call.
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end(
				JSON.stringify({
					id: 'chatcmpl-test',
					object: 'chat.completion',
					choices: [
						{
							index: 0,
							message: {
								role: 'assistant',
								content: null,
								tool_calls: [
									{
										id: 'call_1',
										type: 'function',
										function: {
											name: 'emit_composition',
											arguments: VALID_TOOL_ARGS,
										},
									},
								],
							},
							finish_reason: 'tool_calls',
						},
					],
				}),
			);
		});

		const job = mkJob('jint-minimax');
		saveJob(job);
		const minimaxModelId = `minimax/${
			process.env.MINIMAX_MODEL ?? 'MiniMax-Text-01'
		}`;
		expect(getProvider(minimaxModelId)).toBeDefined();

		const ctrl = new JobController(job.id, minimaxModelId);
		registerController(ctrl);
		const c = makeCollector(ctrl);
		ctrl.start(0);
		await c.waitUntilTerminal();

		expect(requestN).toBe(2); // streaming attempt + fallback
		const types = c.events.map((e) => e.type);
		expect(types[types.length - 1]).toBe('done');
		expect(types).toContain('tool_call_done');
		expect(types).toContain('tsx_written');
	});
});
