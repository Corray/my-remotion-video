import {describe, expect, it} from 'vitest';
import {
	isStreamIncompatibleError,
	translateOpenAIStream,
	type OpenAIChunk,
} from './openai-compat.js';

async function* fakeChunks(
	chunks: OpenAIChunk[],
): AsyncIterable<OpenAIChunk> {
	for (const c of chunks) yield c;
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const x of iter) out.push(x);
	return out;
}

describe('translateOpenAIStream', () => {
	it('emits tool_call_start on first chunk with function.name, then tool_args_delta, then tool_call_done on finish_reason', async () => {
		const jsonArgs = JSON.stringify({
			tsxContent: 'const x = 1;',
			durationInFrames: 150,
			fps: 30,
			width: 1080,
			height: 1920,
			summary: 'chunked test',
		});
		const chunks: OpenAIChunk[] = [
			{
				choices: [
					{
						index: 0,
						delta: {
							tool_calls: [
								{
									index: 0,
									id: 'call_1',
									type: 'function',
									function: {name: 'emit_composition', arguments: ''},
								},
							],
						},
						finish_reason: null,
					},
				],
			},
			{
				choices: [
					{
						index: 0,
						delta: {
							tool_calls: [
								{
									index: 0,
									function: {arguments: jsonArgs.slice(0, 25)},
								},
							],
						},
						finish_reason: null,
					},
				],
			},
			{
				choices: [
					{
						index: 0,
						delta: {
							tool_calls: [
								{
									index: 0,
									function: {arguments: jsonArgs.slice(25)},
								},
							],
						},
						finish_reason: null,
					},
				],
			},
			{
				choices: [
					{index: 0, delta: {}, finish_reason: 'tool_calls'},
				],
			},
		];
		const out = await collect(translateOpenAIStream(fakeChunks(chunks), 'openai'));
		const types = out.map((e) => e.type);
		expect(types[0]).toBe('tool_call_start');
		expect(types.filter((t) => t === 'tool_args_delta').length).toBe(2);
		expect(types[types.length - 1]).toBe('tool_call_done');

		const done = out[out.length - 1];
		if (done.type !== 'tool_call_done') throw new Error('expected tool_call_done');
		expect(done.result?.tsxContent).toBe('const x = 1;');
		expect(done.result?.meta.durationInFrames).toBe(150);
		expect(done.result?.summary).toBe('chunked test');
	});

	it('surfaces free-text content deltas as token events', async () => {
		const chunks: OpenAIChunk[] = [
			{choices: [{index: 0, delta: {content: 'hi'}, finish_reason: null}]},
			{choices: [{index: 0, delta: {content: ' there'}, finish_reason: null}]},
			{choices: [{index: 0, delta: {}, finish_reason: 'stop'}]},
		];
		const out = await collect(translateOpenAIStream(fakeChunks(chunks), 'openai'));
		expect(out.map((e) => e.type)).toEqual(['token', 'token']);
	});

	it('throws readable error on malformed JSON at finish', async () => {
		const chunks: OpenAIChunk[] = [
			{
				choices: [
					{
						index: 0,
						delta: {
							tool_calls: [
								{index: 0, type: 'function', function: {name: 'emit_composition', arguments: '{bad'}},
							],
						},
						finish_reason: null,
					},
				],
			},
			{choices: [{index: 0, delta: {}, finish_reason: 'tool_calls'}]},
		];
		await expect(
			collect(translateOpenAIStream(fakeChunks(chunks), 'deepseek')),
		).rejects.toThrow(/JSON 无法解析/);
	});

	it('emits synthetic tool_call_start if vendor skipped the name', async () => {
		// Some MiniMax-compat impls don't send function.name in deltas.
		const chunks: OpenAIChunk[] = [
			{
				choices: [
					{
						index: 0,
						delta: {
							tool_calls: [{index: 0, function: {arguments: '{"tsxContent":"","durationInFrames":1,"fps":1,"width":1,"height":1,"summary":""}'}}],
						},
						finish_reason: null,
					},
				],
			},
			{choices: [{index: 0, delta: {}, finish_reason: 'tool_calls'}]},
		];
		const out = await collect(translateOpenAIStream(fakeChunks(chunks), 'minimax'));
		expect(out[0].type).toBe('tool_args_delta');
		// synthetic start appears right before done
		expect(out.find((e) => e.type === 'tool_call_start')).toBeDefined();
		expect(out[out.length - 1].type).toBe('tool_call_done');
	});
});

describe('isStreamIncompatibleError', () => {
	it('matches typical MiniMax stream-unsupported phrasings', () => {
		expect(isStreamIncompatibleError(new Error('stream not supported for this model'))).toBe(true);
		expect(isStreamIncompatibleError(new Error('tool calls not supported with stream'))).toBe(true);
		expect(isStreamIncompatibleError(new Error('invalid param: stream must be false'))).toBe(true);
	});

	it('does NOT match generic errors', () => {
		expect(isStreamIncompatibleError(new Error('rate limit exceeded'))).toBe(false);
		expect(isStreamIncompatibleError(new Error('network timeout'))).toBe(false);
		expect(isStreamIncompatibleError(new Error('invalid api key'))).toBe(false);
	});
});
