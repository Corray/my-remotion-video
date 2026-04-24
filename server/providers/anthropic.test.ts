import {describe, expect, it} from 'vitest';
import {
	translateAnthropicStream,
	type AnthropicRawEvent,
} from './anthropic.js';

async function* fakeStream(
	events: AnthropicRawEvent[],
): AsyncIterable<AnthropicRawEvent> {
	for (const e of events) yield e;
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const x of iter) out.push(x);
	return out;
}

describe('translateAnthropicStream', () => {
	it('emits tool_call_start → tool_args_delta* → tool_call_done for a well-formed stream', async () => {
		const jsonArgs = JSON.stringify({
			tsxContent: 'const x = 1;',
			durationInFrames: 300,
			fps: 30,
			width: 1080,
			height: 1920,
			summary: '测试视频',
		});

		// Split the JSON across 3 deltas to simulate incremental streaming.
		const chunks = [
			jsonArgs.slice(0, 20),
			jsonArgs.slice(20, 40),
			jsonArgs.slice(40),
		];

		const events: AnthropicRawEvent[] = [
			{type: 'message_start'},
			{
				type: 'content_block_start',
				content_block: {type: 'tool_use', name: 'emit_composition', id: 'tu_1'},
			},
			...chunks.map((c) => ({
				type: 'content_block_delta' as const,
				delta: {type: 'input_json_delta' as const, partial_json: c},
			})),
			{type: 'content_block_stop'},
			{type: 'message_stop'},
		];

		const out = await collect(translateAnthropicStream(fakeStream(events)));
		expect(out.map((e) => e.type)).toEqual([
			'tool_call_start',
			'tool_args_delta',
			'tool_args_delta',
			'tool_args_delta',
			'tool_call_done',
		]);

		const done = out[out.length - 1];
		if (done.type !== 'tool_call_done') throw new Error('expected tool_call_done');
		expect(done.result).toBeDefined();
		expect(done.result!.tsxContent).toBe('const x = 1;');
		expect(done.result!.meta).toEqual({
			durationInFrames: 300,
			fps: 30,
			width: 1080,
			height: 1920,
		});
		expect(done.result!.summary).toBe('测试视频');
	});

	it('surfaces text_delta events as token events', async () => {
		const events: AnthropicRawEvent[] = [
			{type: 'content_block_start', content_block: {type: 'text'}},
			{
				type: 'content_block_delta',
				delta: {type: 'text_delta', text: 'hi'},
			},
			{
				type: 'content_block_delta',
				delta: {type: 'text_delta', text: ' there'},
			},
			{type: 'content_block_stop'},
		];
		const out = await collect(translateAnthropicStream(fakeStream(events)));
		expect(out.map((e) => e.type)).toEqual(['token', 'token']);
		expect(out[0]).toMatchObject({type: 'token', delta: 'hi'});
		expect(out[1]).toMatchObject({type: 'token', delta: ' there'});
	});

	it('surfaces thinking_delta events as thinking events', async () => {
		const events: AnthropicRawEvent[] = [
			{type: 'content_block_start', content_block: {type: 'thinking'}},
			{
				type: 'content_block_delta',
				delta: {type: 'thinking_delta', thinking: 'hmm...'},
			},
			{type: 'content_block_stop'},
		];
		const out = await collect(translateAnthropicStream(fakeStream(events)));
		expect(out.map((e) => e.type)).toEqual(['thinking']);
		expect(out[0]).toMatchObject({type: 'thinking', delta: 'hmm...'});
	});

	it('throws a readable error when tool JSON is malformed', async () => {
		const events: AnthropicRawEvent[] = [
			{
				type: 'content_block_start',
				content_block: {type: 'tool_use', name: 'emit_composition', id: 't'},
			},
			{
				type: 'content_block_delta',
				delta: {type: 'input_json_delta', partial_json: '{not json'},
			},
			{type: 'content_block_stop'},
		];
		await expect(
			collect(translateAnthropicStream(fakeStream(events))),
		).rejects.toThrow(/tool_use JSON 无法解析/);
	});

	it('stops translating when upstream iterator ends mid-stream (simulates cancel)', async () => {
		// Upstream cut off before content_block_stop → we should just yield what we saw.
		const events: AnthropicRawEvent[] = [
			{
				type: 'content_block_start',
				content_block: {type: 'tool_use', name: 'emit_composition', id: 't'},
			},
			{
				type: 'content_block_delta',
				delta: {type: 'input_json_delta', partial_json: '{"tsxConten'},
			},
		];
		const out = await collect(translateAnthropicStream(fakeStream(events)));
		expect(out.map((e) => e.type)).toEqual(['tool_call_start', 'tool_args_delta']);
	});
});
