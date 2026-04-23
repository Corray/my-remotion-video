import {describe, expect, it} from 'vitest';
import {
	buildConversation,
	buildFeedbackMessage,
	buildUserMessage,
	estimateTokens,
	TOKEN_BUDGET,
} from './prompts.js';
import type {ConversationTurn} from '../types.js';
import type {GenerateInput} from './types.js';

function mkInput(overrides: Partial<GenerateInput> = {}): GenerateInput {
	return {
		jobId: 'gen-test',
		scene: '一个女孩在樱花树下转圈',
		assets: [],
		...overrides,
	};
}

function turn(role: 'user' | 'assistant', content: string, tsxPath?: string): ConversationTurn {
	return {role, content, tsxPath, ts: Date.now()};
}

describe('prompts.buildConversation', () => {
	it('first turn — single user message with full scene context', () => {
		const input = mkInput();
		const history: ConversationTurn[] = [turn('user', input.scene)];
		const msgs = buildConversation(input, history);
		expect(msgs).toHaveLength(1);
		expect(msgs[0].role).toBe('user');
		expect(msgs[0].content).toContain('樱花树下');
		expect(msgs[0].content).toContain('gen-test');
		expect(msgs[0].content).toContain('请调用');
	});

	it('after one feedback — 3 messages, feedback wrapped in buildFeedbackMessage', () => {
		const input = mkInput();
		const history: ConversationTurn[] = [
			turn('user', input.scene),
			turn('assistant', '樱花树下女孩转圈', 'src/generated/gen-test.tsx'),
			turn('user', '把女孩换成猫'),
		];
		const msgs = buildConversation(input, history);
		expect(msgs).toHaveLength(3);
		expect(msgs[0].role).toBe('user');
		expect(msgs[1].role).toBe('assistant');
		expect(msgs[1].content).toContain('已生成视频');
		expect(msgs[1].content).toContain('src/generated/gen-test.tsx');
		expect(msgs[2].role).toBe('user');
		expect(msgs[2].content).toContain('基于【已有代码】作局部修改');
		expect(msgs[2].content).toContain('把女孩换成猫');
	});

	it('two feedbacks — 5 messages alternating', () => {
		const input = mkInput();
		const history: ConversationTurn[] = [
			turn('user', input.scene),
			turn('assistant', 'v1', 'path1.tsx'),
			turn('user', '改短一点'),
			turn('assistant', 'v2', 'path2.tsx'),
			turn('user', '加音乐'),
		];
		const msgs = buildConversation(input, history);
		expect(msgs).toHaveLength(5);
		expect(msgs.map((m) => m.role)).toEqual([
			'user',
			'assistant',
			'user',
			'assistant',
			'user',
		]);
		expect(msgs[4].content).toContain('加音乐');
	});

	it('empty history — still yields first user message (defensive)', () => {
		const input = mkInput();
		const msgs = buildConversation(input, []);
		expect(msgs).toHaveLength(1);
		expect(msgs[0].role).toBe('user');
	});

	it('truncates when total tokens exceed TOKEN_BUDGET', () => {
		const input = mkInput();
		// 6 feedback rounds with huge content each to blow past budget.
		const big = 'x'.repeat(20_000);
		const history: ConversationTurn[] = [turn('user', input.scene)];
		for (let i = 0; i < 6; i++) {
			history.push(turn('assistant', big, `path${i}.tsx`));
			history.push(turn('user', big));
		}
		// Sanity: would exceed budget without truncation.
		const rawTotal = history.reduce(
			(acc, t) => acc + estimateTokens(t.content),
			0,
		);
		expect(rawTotal).toBeGreaterThan(TOKEN_BUDGET);

		const msgs = buildConversation(input, history);
		// Structure: head + notice + last-4
		expect(msgs).toHaveLength(6);
		expect(msgs[0].role).toBe('user');
		expect(msgs[1].role).toBe('assistant');
		expect(msgs[1].content).toContain('已省略');
		expect(msgs[msgs.length - 1].content).toContain(big);
	});
});

describe('prompts.buildUserMessage', () => {
	it('includes assets when present', () => {
		const input = mkInput({
			assets: [
				{
					originalName: 'photo.jpg',
					filename: 'photo.jpg',
					staticPath: 'generated/gen-test/photo.jpg',
					mimeType: 'image/jpeg',
					sizeBytes: 12345,
				},
			],
		});
		const msg = buildUserMessage(input);
		expect(msg).toContain('generated/gen-test/photo.jpg');
		expect(msg).toContain('image/jpeg');
	});

	it('signals no assets when empty', () => {
		const msg = buildUserMessage(mkInput());
		expect(msg).toContain('没有上传任何素材');
	});

	it('includes retry block when previousError set', () => {
		const msg = buildUserMessage(
			mkInput({
				previousError: 'SyntaxError: Unexpected token',
				previousAttempt: 'bad tsx content',
			}),
		);
		expect(msg).toContain('上一次生成失败');
		expect(msg).toContain('SyntaxError');
		expect(msg).toContain('bad tsx content');
	});
});

describe('prompts.buildFeedbackMessage', () => {
	it('wraps feedback in "基于已有代码修改" preamble', () => {
		const msg = buildFeedbackMessage('把背景改成蓝色');
		expect(msg).toContain('基于【已有代码】作局部修改');
		expect(msg).toContain('把背景改成蓝色');
		expect(msg).toContain('metadata.id 不变');
	});
});

describe('prompts.estimateTokens', () => {
	it('rough estimates CJK heavier than ASCII', () => {
		const asciiTokens = estimateTokens('a'.repeat(100));
		const cjkTokens = estimateTokens('女'.repeat(100));
		expect(cjkTokens).toBeGreaterThan(asciiTokens);
	});
});
