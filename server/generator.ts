import {compileCheck, validateExports} from './compile-check.js';
import {appendEvent, getJob, updateJob} from './jobs.js';
import {getProvider} from './providers/index.js';
import {invalidateBundle} from './bundler.js';
import {writeGeneratedComposition} from './registry.js';
import type {
	CompositionMeta,
	ConversationTurn,
	StudioEvent,
} from './types.js';

function runChecks(tsx: string): string[] | null {
	const exportCheck = validateExports(tsx);
	if (!exportCheck.ok) return exportCheck.errors;
	const compile = compileCheck(tsx);
	if (!compile.ok) return compile.errors;
	return null;
}

function isAbortError(err: unknown): boolean {
	if (err instanceof DOMException && err.name === 'AbortError') return true;
	if ((err as Error)?.name === 'AbortError') return true;
	if ((err as {code?: string})?.code === 'ABORT_ERR') return true;
	return false;
}

type EventListener = (ev: StudioEvent) => void;

const controllers = new Map<string, JobController>();

export function getController(id: string): JobController | undefined {
	return controllers.get(id);
}

export function registerController(c: JobController): void {
	controllers.set(c.jobId, c);
}

export function disposeController(id: string): void {
	controllers.delete(id);
}

export function __resetControllersForTest(): void {
	controllers.clear();
}

export class JobController {
	readonly jobId: string;
	readonly modelId: string;
	private abortController: AbortController | null = null;
	private listeners = new Set<EventListener>();
	private running = false;
	private stopResolvers: Array<() => void> = [];
	private readonly maxAttempts: number;

	constructor(jobId: string, modelId: string, opts: {maxAttempts?: number} = {}) {
		this.jobId = jobId;
		this.modelId = modelId;
		this.maxAttempts = opts.maxAttempts ?? 2;
	}

	/** Kick off a generation round. Must not be called while already running. */
	start(turn: number): void {
		if (this.running) throw new Error('JobController already running');
		this.abortController = new AbortController();
		this.running = true;
		this.runLoop(turn).catch((err) => {
			this.emit({
				type: 'error',
				stage: 'internal',
				message: (err as Error)?.message ?? String(err),
				turn,
				ts: Date.now(),
			});
			updateJob(this.jobId, {
				status: 'error',
				error: (err as Error)?.message ?? String(err),
			});
		}).finally(() => {
			this.running = false;
			for (const r of this.stopResolvers.splice(0)) r();
		});
	}

	/** Idempotent cancel. No-op if not running. */
	cancel(): void {
		if (!this.running) return;
		this.abortController?.abort();
	}

	/**
	 * Cancel the current round (if any), append the user turn to
	 * conversation, then start a new round at turn + 1.
	 */
	async feedback(content: string): Promise<void> {
		if (this.running) {
			this.cancel();
			await this.waitForStop();
		}
		const job = getJob(this.jobId);
		if (!job) throw new Error(`job ${this.jobId} disappeared before feedback`);
		const newTurn = job.turn + 1;
		const userTurn: ConversationTurn = {
			role: 'user',
			content,
			ts: Date.now(),
		};
		updateJob(this.jobId, {
			turn: newTurn,
			status: 'generating',
			conversation: [...job.conversation, userTurn],
			error: undefined,
		});
		this.emit({type: 'user_feedback', content, turn: newTurn, ts: Date.now()});
		this.start(newTurn);
	}

	subscribe(fn: EventListener): () => void {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	isRunning(): boolean {
		return this.running;
	}

	private async waitForStop(timeoutMs = 5000): Promise<void> {
		if (!this.running) return;
		await new Promise<void>((resolve) => {
			const timer = setTimeout(() => resolve(), timeoutMs);
			this.stopResolvers.push(() => {
				clearTimeout(timer);
				resolve();
			});
		});
	}

	private emit(ev: StudioEvent): void {
		appendEvent(this.jobId, ev);
		for (const fn of this.listeners) fn(ev);
	}

	private async runLoop(turn: number): Promise<void> {
		this.emit({type: 'started', turn, ts: Date.now()});

		const registered = getProvider(this.modelId);
		if (!registered) {
			this.emit({
				type: 'error',
				stage: 'internal',
				message: `未注册的模型: ${this.modelId}`,
				turn,
				ts: Date.now(),
			});
			updateJob(this.jobId, {status: 'error', error: `未注册的模型: ${this.modelId}`});
			return;
		}

		let previousError: string | undefined;
		let previousAttempt: string | undefined;

		for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
			const job = getJob(this.jobId);
			if (!job) return;

			let tsxContent = '';
			let summary = '';
			let meta: CompositionMeta | undefined;

			try {
				const iter = registered.adapter(registered.entry, {
					jobId: this.jobId,
					scene: job.scene,
					assets: job.assets,
					conversation: job.conversation,
					previousError,
					previousAttempt,
					signal: this.abortController!.signal,
				});

				for await (const ev of iter) {
					if (this.abortController!.signal.aborted) throw new DOMException('aborted', 'AbortError');
					this.emit({...ev, turn, ts: Date.now()} as StudioEvent);
					if (ev.type === 'tool_call_done' && ev.result) {
						tsxContent = ev.result.tsxContent;
						summary = ev.result.summary;
						meta = ev.result.meta;
					}
				}
			} catch (err) {
				if (isAbortError(err) || this.abortController?.signal.aborted) {
					this.emit({type: 'cancelled', by: 'user', turn, ts: Date.now()});
					updateJob(this.jobId, {status: 'cancelled'});
					return;
				}
				this.emit({
					type: 'error',
					stage: 'provider',
					message: (err as Error)?.message ?? String(err),
					turn,
					ts: Date.now(),
				});
				updateJob(this.jobId, {
					status: 'error',
					error: (err as Error)?.message ?? String(err),
				});
				return;
			}

			if (!tsxContent) {
				this.emit({
					type: 'error',
					stage: 'provider',
					message: 'provider 未产出 tsxContent',
					turn,
					ts: Date.now(),
				});
				updateJob(this.jobId, {status: 'error', error: 'provider 未产出 tsxContent'});
				return;
			}

			const errors = runChecks(tsxContent);
			this.emit({
				type: 'compile_check',
				ok: !errors,
				errors: errors ?? undefined,
				turn,
				ts: Date.now(),
			});

			if (!errors) {
				let tsxPath: string;
				try {
					tsxPath = await writeGeneratedComposition(this.jobId, tsxContent);
					invalidateBundle();
				} catch (err) {
					this.emit({
						type: 'error',
						stage: 'filesystem',
						message: (err as Error)?.message ?? String(err),
						turn,
						ts: Date.now(),
					});
					updateJob(this.jobId, {
						status: 'error',
						error: (err as Error)?.message ?? String(err),
					});
					return;
				}
				this.emit({type: 'tsx_written', path: tsxPath, turn, ts: Date.now()});

				const nowJob = getJob(this.jobId)!;
				const assistantTurn: ConversationTurn = {
					role: 'assistant',
					content: summary,
					tsxPath,
					ts: Date.now(),
				};
				updateJob(this.jobId, {
					status: 'ready',
					meta,
					summary,
					attempts: attempt,
					conversation: [...nowJob.conversation, assistantTurn],
				});
				this.emit({type: 'done', meta: meta!, summary, turn, ts: Date.now()});
				return;
			}

			if (attempt === this.maxAttempts) {
				this.emit({
					type: 'error',
					stage: 'compile',
					message: errors.join('\n'),
					turn,
					ts: Date.now(),
				});
				updateJob(this.jobId, {status: 'error', error: errors.join('\n')});
				return;
			}

			this.emit({
				type: 'retry',
				attempt: attempt + 1,
				reason: errors[0],
				turn,
				ts: Date.now(),
			});
			previousError = errors.join('\n');
			previousAttempt = tsxContent;
		}
	}
}
