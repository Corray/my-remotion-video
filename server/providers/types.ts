import type {AssetInfo, CompositionMeta} from '../types.js';

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

export type ProviderAdapter = (
	entry: ModelEntry,
	input: GenerateInput,
) => Promise<GenerateResult>;
