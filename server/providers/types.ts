import type {AssetInfo, CompositionMeta} from '../types.js';

/** Input for a single generation call. Streaming signal/conversation come in T003+. */
export type GenerateInput = {
	jobId: string;
	scene: string;
	assets: AssetInfo[];
	previousError?: string;
	previousAttempt?: string;
};

export type GenerateResult = {
	tsxContent: string;
	meta: CompositionMeta;
	summary: string;
};

export type ModelEntry = {
	id: string; // stable id exposed to frontend, e.g. "anthropic/claude-sonnet-4-6"
	label: string; // human-friendly display name
	vendor: 'anthropic' | 'openai' | 'minimax' | 'deepseek';
	model: string; // actual model name passed to the API
	envKey: string; // env var that must be set for this model to be available
};

/**
 * Non-streaming adapter (current). Will be replaced by StreamingProviderAdapter
 * in T003/T004; the registry switches over in T005.
 */
export type ProviderAdapter = (
	entry: ModelEntry,
	input: GenerateInput,
) => Promise<GenerateResult>;

/** Neutral chat message shape translated per-provider to SDK format. */
export type ChatMessage = {
	role: 'user' | 'assistant';
	content: string;
};

/**
 * Event yielded by a streaming provider adapter. JobController enriches
 * with turn/ts to produce the full StudioEvent. Introduced by T002 and
 * consumed starting in T003.
 */
export type AdapterEvent =
	| {type: 'thinking'; delta: string}
	| {type: 'token'; delta: string}
	| {type: 'tool_call_start'; name: string}
	| {type: 'tool_args_delta'; delta: string}
	| {type: 'tool_call_done'; result?: GenerateResult};

/** Streaming adapter shape. Not yet wired into REGISTRY — T005 does that. */
export type StreamingProviderAdapter = (
	entry: ModelEntry,
	input: GenerateInput & {
		conversation: import('../types.js').ConversationTurn[];
		signal: AbortSignal;
	},
) => AsyncIterable<AdapterEvent>;
