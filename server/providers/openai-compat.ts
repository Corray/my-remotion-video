import OpenAI from 'openai';
import {SYSTEM_PROMPT, TOOL_SCHEMA, buildUserMessage, type ToolArgs} from './prompts.js';
import type {ModelEntry, ProviderAdapter} from './types.js';

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
