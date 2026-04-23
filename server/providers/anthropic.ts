import Anthropic from '@anthropic-ai/sdk';
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
	ProviderAdapter,
	StreamingProviderAdapter,
} from './types.js';

/**
 * NON-STREAMING (legacy). Kept around so generator.ts / routes keep working
 * until T005 switches the registry over to the streaming path.
 */
export const anthropicAdapter: ProviderAdapter = async (entry, input) => {
	const apiKey = process.env[entry.envKey];
	if (!apiKey) throw new Error(`${entry.envKey} 未设置`);

	const client = new Anthropic({apiKey});

	const response = await client.messages.create({
		model: entry.model,
		max_tokens: 8000,
		system: [
			{
				type: 'text',
				text: SYSTEM_PROMPT,
				cache_control: {type: 'ephemeral'},
			},
		],
		tools: [
			{
				name: TOOL_SCHEMA.name,
				description: TOOL_SCHEMA.description,
				input_schema: TOOL_SCHEMA.parameters,
			},
		],
		tool_choice: {type: 'tool', name: TOOL_SCHEMA.name},
		messages: [{role: 'user', content: buildUserMessage(input)}],
	});

	const toolUse = response.content.find((c) => c.type === 'tool_use');
	if (!toolUse || toolUse.type !== 'tool_use') {
		throw new Error('Claude 没有返回 emit_composition 工具调用。');
	}
	const args = toolUse.input as ToolArgs;
	return {
		tsxContent: args.tsxContent,
		meta: {
			durationInFrames: args.durationInFrames,
			fps: args.fps,
			width: args.width,
			height: args.height,
		},
		summary: args.summary,
	};
};

/**
 * Pure translator: takes Anthropic SDK's streaming events and yields our
 * AdapterEvent shape. Testable with a hand-crafted fake stream.
 *
 * Tracks a single tool_use block (we force tool_choice so there's only one).
 * Any plain text/thinking blocks before it are surfaced as token/thinking.
 */
export async function* translateAnthropicStream(
	stream: AsyncIterable<AnthropicRawEvent>,
): AsyncGenerator<AdapterEvent> {
	let inToolBlock = false;
	let toolArgsBuffer = '';

	for await (const ev of stream) {
		if (ev.type === 'content_block_start') {
			if (
				ev.content_block &&
				ev.content_block.type === 'tool_use'
			) {
				inToolBlock = true;
				toolArgsBuffer = '';
				yield {type: 'tool_call_start', name: ev.content_block.name};
			}
		} else if (ev.type === 'content_block_delta') {
			const d = ev.delta;
			if (d.type === 'text_delta') {
				yield {type: 'token', delta: d.text};
			} else if (d.type === 'input_json_delta') {
				toolArgsBuffer += d.partial_json;
				yield {type: 'tool_args_delta', delta: d.partial_json};
			} else if (d.type === 'thinking_delta') {
				yield {type: 'thinking', delta: d.thinking};
			}
		} else if (ev.type === 'content_block_stop') {
			if (inToolBlock) {
				inToolBlock = false;
				const parsed = parseToolArgs(toolArgsBuffer);
				yield {
					type: 'tool_call_done',
					result: {
						tsxContent: parsed.tsxContent,
						meta: {
							durationInFrames: parsed.durationInFrames,
							fps: parsed.fps,
							width: parsed.width,
							height: parsed.height,
						},
						summary: parsed.summary,
					},
				};
			}
		}
		// message_start / message_delta / message_stop are not translated
	}
}

function parseToolArgs(buf: string): ToolArgs {
	try {
		return JSON.parse(buf) as ToolArgs;
	} catch (err) {
		throw new Error(
			`Claude 返回的 tool_use JSON 无法解析: ${(err as Error).message}\n原始前 300 字符: ${buf.slice(0, 300)}`,
		);
	}
}

/**
 * STREAMING adapter (new). Registry switches to this in T005.
 */
export const anthropicStreamingAdapter: StreamingProviderAdapter =
	async function* (entry, input) {
		const apiKey = process.env[entry.envKey];
		if (!apiKey) throw new Error(`${entry.envKey} 未设置`);

		const client = new Anthropic({apiKey});
		const messages = buildConversation(input, input.conversation) as ChatMessage[];

		const stream = client.messages.stream(
			{
				model: entry.model,
				max_tokens: 8000,
				system: [
					{
						type: 'text',
						text: SYSTEM_PROMPT,
						cache_control: {type: 'ephemeral'},
					},
				],
				tools: [
					{
						name: TOOL_SCHEMA.name,
						description: TOOL_SCHEMA.description,
						input_schema: TOOL_SCHEMA.parameters,
					},
				],
				tool_choice: {type: 'tool', name: TOOL_SCHEMA.name},
				messages,
			},
			{signal: input.signal},
		);

		// SDK's MessageStream is AsyncIterable over raw events
		yield* translateAnthropicStream(
			stream as unknown as AsyncIterable<AnthropicRawEvent>,
		);
	};

// Minimal subset of Anthropic SDK event shapes we care about.
// Full types live in @anthropic-ai/sdk but we only need these fields.
export type AnthropicRawEvent =
	| {
			type: 'content_block_start';
			content_block?:
				| {type: 'tool_use'; name: string; id: string}
				| {type: 'text'}
				| {type: 'thinking'};
	  }
	| {
			type: 'content_block_delta';
			delta:
				| {type: 'text_delta'; text: string}
				| {type: 'input_json_delta'; partial_json: string}
				| {type: 'thinking_delta'; thinking: string};
	  }
	| {type: 'content_block_stop'}
	| {type: 'message_start'}
	| {type: 'message_delta'}
	| {type: 'message_stop'};
