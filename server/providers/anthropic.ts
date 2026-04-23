import Anthropic from '@anthropic-ai/sdk';
import {SYSTEM_PROMPT, TOOL_SCHEMA, buildUserMessage, type ToolArgs} from './prompts.js';
import type {ProviderAdapter} from './types.js';

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
