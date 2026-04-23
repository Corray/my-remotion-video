import OpenAI from 'openai';
import {
	SYSTEM_PROMPT,
	TOOL_SCHEMA,
	buildConversation,
	buildUserMessage,
	type ToolArgs,
} from './prompts.js';
import type {
	AdapterEvent,
	ChatMessage,
	ModelEntry,
	ProviderAdapter,
	StreamingProviderAdapter,
} from './types.js';

const BASE_URL_ENV: Record<ModelEntry['vendor'], string | undefined> = {
	anthropic: undefined, // not used here
	openai: 'OPENAI_BASE_URL',
	minimax: 'MINIMAX_BASE_URL',
	deepseek: 'DEEPSEEK_BASE_URL',
};

const DEFAULT_BASE_URL: Record<ModelEntry['vendor'], string | undefined> = {
	anthropic: undefined,
	openai: 'https://api.openai.com/v1',
	minimax: 'https://api.minimax.chat/v1',
	deepseek: 'https://api.deepseek.com/v1',
};

function resolveBaseURL(vendor: ModelEntry['vendor']): string {
	const envVar = BASE_URL_ENV[vendor];
	const fromEnv = envVar ? process.env[envVar] : undefined;
	const url = fromEnv ?? DEFAULT_BASE_URL[vendor];
	if (!url) throw new Error(`无法解析 ${vendor} 的 baseURL`);
	return url;
}

/**
 * NON-STREAMING (legacy). Kept so generator.ts / routes compile until
 * T005 flips the registry to streaming.
 */
export const openaiCompatAdapter: ProviderAdapter = async (entry, input) => {
	const apiKey = process.env[entry.envKey];
	if (!apiKey) throw new Error(`${entry.envKey} 未设置`);

	const client = new OpenAI({
		apiKey,
		baseURL: resolveBaseURL(entry.vendor),
	});

	const response = await client.chat.completions.create({
		model: entry.model,
		messages: [
			{role: 'system', content: SYSTEM_PROMPT},
			{role: 'user', content: buildUserMessage(input)},
		],
		tools: [
			{
				type: 'function',
				function: {
					name: TOOL_SCHEMA.name,
					description: TOOL_SCHEMA.description,
					parameters: TOOL_SCHEMA.parameters,
				},
			},
		],
		tool_choice: {
			type: 'function',
			function: {name: TOOL_SCHEMA.name},
		},
	});

	const choice = response.choices[0];
	if (!choice) throw new Error(`${entry.vendor} 未返回任何结果`);

	const toolCall = choice.message.tool_calls?.[0];
	if (!toolCall || toolCall.type !== 'function') {
		throw new Error(
			`${entry.vendor}(${entry.model}) 没有返回 function call，原始文本：${choice.message.content?.slice(0, 200) ?? '(空)'}`,
		);
	}

	let args: ToolArgs;
	try {
		args = JSON.parse(toolCall.function.arguments) as ToolArgs;
	} catch (err) {
		throw new Error(
			`${entry.vendor} 返回的 JSON 无法解析: ${(err as Error).message}\n原始: ${toolCall.function.arguments.slice(0, 300)}`,
		);
	}

	if (!args.tsxContent || typeof args.tsxContent !== 'string') {
		throw new Error(`${entry.vendor} 返回的 tsxContent 缺失或非字符串`);
	}

	return {
		tsxContent: args.tsxContent,
		meta: {
			durationInFrames: args.durationInFrames,
			fps: args.fps,
			width: args.width,
			height: args.height,
		},
		summary: args.summary ?? '',
	};
};

// ========== Streaming path ==========

/**
 * Minimal subset of OpenAI chat.completions streaming chunk shape.
 * Full types live in 'openai' package but we only need these fields.
 */
export type OpenAIChunk = {
	choices: Array<{
		delta: {
			content?: string | null;
			tool_calls?: Array<{
				index?: number;
				id?: string;
				type?: 'function';
				function?: {name?: string; arguments?: string};
			}>;
		};
		finish_reason?: 'stop' | 'tool_calls' | 'length' | null;
		index: number;
	}>;
};

/**
 * Pure translator: consumes an async iterable of OpenAI streaming chunks
 * and yields our AdapterEvent. Testable with fake chunks.
 */
export async function* translateOpenAIStream(
	chunks: AsyncIterable<OpenAIChunk>,
	vendorLabel: string,
): AsyncGenerator<AdapterEvent> {
	let toolStarted = false;
	let argBuffer = '';
	let finished = false;

	for await (const chunk of chunks) {
		const choice = chunk.choices[0];
		if (!choice) continue;
		const delta = choice.delta;

		if (delta.content) {
			yield {type: 'token', delta: delta.content};
		}

		const tc = delta.tool_calls?.[0];
		if (tc) {
			if (!toolStarted && tc.function?.name) {
				toolStarted = true;
				yield {type: 'tool_call_start', name: tc.function.name};
			}
			if (tc.function?.arguments) {
				argBuffer += tc.function.arguments;
				yield {type: 'tool_args_delta', delta: tc.function.arguments};
			}
		}

		if (choice.finish_reason === 'tool_calls' && !finished) {
			finished = true;
			if (!toolStarted) {
				yield {type: 'tool_call_start', name: 'emit_composition'};
			}
			yield {type: 'tool_call_done', result: finalizeToolCall(argBuffer, vendorLabel)};
		}
	}
}

function finalizeToolCall(buf: string, vendor: string) {
	if (!buf) {
		throw new Error(`${vendor} 没有返回 function call arguments`);
	}
	let parsed: ToolArgs;
	try {
		parsed = JSON.parse(buf) as ToolArgs;
	} catch (err) {
		throw new Error(
			`${vendor} 返回的 JSON 无法解析: ${(err as Error).message}\n原始前 300: ${buf.slice(0, 300)}`,
		);
	}
	return {
		tsxContent: parsed.tsxContent,
		meta: {
			durationInFrames: parsed.durationInFrames,
			fps: parsed.fps,
			width: parsed.width,
			height: parsed.height,
		},
		summary: parsed.summary ?? '',
	};
}

// ========== MiniMax fallback state ==========

let miniMaxStreamFailed = false;

/** Test-only */
export function __resetMiniMaxFlagForTest(): void {
	miniMaxStreamFailed = false;
}

function canStreamMiniMax(): boolean {
	return !miniMaxStreamFailed;
}

function markMiniMaxNoStream(): void {
	miniMaxStreamFailed = true;
}

/**
 * Heuristic: does this error indicate the vendor doesn't support streaming
 * tool calls? Conservative match — we only match known incompatibility
 * phrasings, not generic errors (which should still propagate).
 */
export function isStreamIncompatibleError(err: unknown): boolean {
	const msg = (err as Error)?.message ?? String(err);
	return /(stream.*(not|un)?\s*support|tool.*(not|un)\s*support|invalid.*param.*stream|function_call.*stream)/i.test(
		msg,
	);
}

// ========== Streaming adapter ==========

export const openaiCompatStreamingAdapter: StreamingProviderAdapter =
	async function* (entry, input) {
		const apiKey = process.env[entry.envKey];
		if (!apiKey) throw new Error(`${entry.envKey} 未设置`);

		const client = new OpenAI({
			apiKey,
			baseURL: resolveBaseURL(entry.vendor),
		});

		const chatMessages = buildConversation(input, input.conversation);
		const messages = [
			{role: 'system' as const, content: SYSTEM_PROMPT},
			...chatMessages.map((m: ChatMessage) => ({role: m.role, content: m.content})),
		];

		const useStream = entry.vendor !== 'minimax' || canStreamMiniMax();

		if (!useStream) {
			yield* runNonStreaming(client, entry, input, messages);
			return;
		}

		try {
			const stream = await client.chat.completions.create(
				{
					model: entry.model,
					stream: true,
					messages,
					tools: [
						{
							type: 'function',
							function: {
								name: TOOL_SCHEMA.name,
								description: TOOL_SCHEMA.description,
								parameters: TOOL_SCHEMA.parameters,
							},
						},
					],
					tool_choice: {type: 'function', function: {name: TOOL_SCHEMA.name}},
				},
				{signal: input.signal},
			);
			yield* translateOpenAIStream(
				stream as unknown as AsyncIterable<OpenAIChunk>,
				entry.vendor,
			);
		} catch (err) {
			if (entry.vendor === 'minimax' && isStreamIncompatibleError(err)) {
				markMiniMaxNoStream();
				yield* runNonStreaming(client, entry, input, messages);
				return;
			}
			throw err;
		}
	};

async function* runNonStreaming(
	client: OpenAI,
	entry: ModelEntry,
	input: {signal: AbortSignal},
	messages: Array<{role: 'system' | 'user' | 'assistant'; content: string}>,
): AsyncGenerator<AdapterEvent> {
	yield {type: 'tool_call_start', name: TOOL_SCHEMA.name};
	const response = await client.chat.completions.create(
		{
			model: entry.model,
			messages,
			tools: [
				{
					type: 'function',
					function: {
						name: TOOL_SCHEMA.name,
						description: TOOL_SCHEMA.description,
						parameters: TOOL_SCHEMA.parameters,
					},
				},
			],
			tool_choice: {type: 'function', function: {name: TOOL_SCHEMA.name}},
		},
		{signal: input.signal},
	);
	const toolCall = response.choices[0]?.message.tool_calls?.[0];
	if (!toolCall || toolCall.type !== 'function') {
		throw new Error(`${entry.vendor} fallback: 没有返回 function call`);
	}
	yield {type: 'tool_args_delta', delta: toolCall.function.arguments};
	yield {
		type: 'tool_call_done',
		result: finalizeToolCall(toolCall.function.arguments, entry.vendor),
	};
}
