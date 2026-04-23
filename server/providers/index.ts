import {anthropicStreamingAdapter} from './anthropic.js';
import {openaiCompatStreamingAdapter} from './openai-compat.js';
import type {ModelEntry, StreamingProviderAdapter} from './types.js';

type Registered = {
	entry: ModelEntry;
	adapter: StreamingProviderAdapter;
};

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL ?? 'MiniMax-Text-01';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

const REGISTRY: Registered[] = [
	{
		entry: {
			id: `anthropic/${ANTHROPIC_MODEL}`,
			label: `Claude · ${ANTHROPIC_MODEL}`,
			vendor: 'anthropic',
			model: ANTHROPIC_MODEL,
			envKey: 'ANTHROPIC_API_KEY',
		},
		adapter: anthropicStreamingAdapter,
	},
	{
		entry: {
			id: `openai/${OPENAI_MODEL}`,
			label: `OpenAI · ${OPENAI_MODEL}`,
			vendor: 'openai',
			model: OPENAI_MODEL,
			envKey: 'OPENAI_API_KEY',
		},
		adapter: openaiCompatStreamingAdapter,
	},
	{
		entry: {
			id: `minimax/${MINIMAX_MODEL}`,
			label: `MiniMax · ${MINIMAX_MODEL}`,
			vendor: 'minimax',
			model: MINIMAX_MODEL,
			envKey: 'MINIMAX_API_KEY',
		},
		adapter: openaiCompatStreamingAdapter,
	},
	{
		entry: {
			id: `deepseek/${DEEPSEEK_MODEL}`,
			label: `DeepSeek · ${DEEPSEEK_MODEL}`,
			vendor: 'deepseek',
			model: DEEPSEEK_MODEL,
			envKey: 'DEEPSEEK_API_KEY',
		},
		adapter: openaiCompatStreamingAdapter,
	},
];

export function listAvailableModels(): ModelEntry[] {
	return REGISTRY.filter((r) => Boolean(process.env[r.entry.envKey])).map(
		(r) => r.entry,
	);
}

export function listAllModels(): ModelEntry[] {
	return REGISTRY.map((r) => r.entry);
}

export function getProvider(id: string): Registered | undefined {
	return REGISTRY.find((r) => r.entry.id === id);
}

export function getDefaultModelId(): string | undefined {
	// Prefer in order: Claude > GPT > DeepSeek > MiniMax
	const preferred = ['anthropic', 'openai', 'deepseek', 'minimax'] as const;
	for (const v of preferred) {
		const match = REGISTRY.find(
			(r) => r.entry.vendor === v && process.env[r.entry.envKey],
		);
		if (match) return match.entry.id;
	}
	return undefined;
}
