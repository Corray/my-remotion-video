import type {ConversationTurn} from '../types.js';
import type {ChatMessage, GenerateInput} from './types.js';

export const SYSTEM_PROMPT = `你是一个 Remotion 视频作曲师。根据用户描述的场景和提供的素材，生成一份可直接运行的 Remotion Composition TSX 文件。

## 输出格式（强制）
必须通过调用 \`emit_composition\` 工具返回结果。tsxContent 必须是一个完整的、自包含的 TSX 文件字符串。

## TSX 文件结构（严格遵守）

\`\`\`tsx
import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  Sequence,
  Series,
  Img,
  Audio,
  Video,
  staticFile,
} from 'remotion';

export const metadata = {
  id: '<JOB_ID>',           // 必须等于用户传入的 jobId
  durationInFrames: 300,    // 整数
  fps: 30,                  // 一般用 30
  width: 1080,              // 竖屏 1080x1920，横屏 1920x1080
  height: 1920,
};

export const Composition: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames, width, height, fps} = useVideoConfig();
  // ...动画逻辑
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* 视觉内容 */}
    </AbsoluteFill>
  );
};
\`\`\`

## 关键规则

1. **只能 export 两样**：\`metadata\`（对象） 和 \`Composition\`（React 组件）。组件名就叫 \`Composition\`。
2. **所有动画用 Remotion API**：\`useCurrentFrame\`、\`interpolate\`、\`spring\`、\`Sequence\`、\`Series\`。不要用 CSS transitions/animations、setTimeout、setInterval、requestAnimationFrame。
3. **时间单位是 frame**。一秒 = fps 帧（默认 30）。\`durationInFrames\` 决定总时长。
4. **素材路径**：用户上传的素材通过 \`staticFile('generated/<jobId>/<filename>')\` 引用。用 \`<Img src={staticFile(...)} />\`、\`<Audio src={staticFile(...)} />\`、\`<Video src={staticFile(...)} />\`。
5. **画面单位**：所有尺寸以 px 计。背景用 \`AbsoluteFill\`，内容绝对定位或 flex。
6. **中文文案**：用户是中文场景时，文案保留中文，选择支持中文的 webfont（可以用 system-ui / sans-serif，或 \`@remotion/google-fonts\` 引入思源黑体等）。除非用户指定字体，优先用 \`system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif\`。
7. **时长**：根据场景复杂度合理设置，短视频 5-15 秒（150-450 帧），一般不超过 30 秒。除非用户明确指定。
8. **不要 import 任何外部包**，只能用 \`react\` 和 \`remotion\`。不要用 Tailwind class（即使项目配置了），用 inline style，避免打包失败。
9. **严禁语法错误**：输出前在脑中过一遍 TypeScript 编译。
10. **防黑屏**：确保从 frame 0 就有可见内容。不要让所有元素 opacity 从 0 开始且没有动画。

## 常用模式

**淡入淡出：**
\`\`\`tsx
const opacity = interpolate(frame, [0, 30, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
\`\`\`

**弹簧动画：**
\`\`\`tsx
const scale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
\`\`\`

**分段（适合多场景）：**
\`\`\`tsx
<Series>
  <Series.Sequence durationInFrames={90}><SceneA /></Series.Sequence>
  <Series.Sequence durationInFrames={120}><SceneB /></Series.Sequence>
</Series>
\`\`\`

**图片：**
\`\`\`tsx
<Img src={staticFile('generated/<jobId>/photo.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
\`\`\`

## 错误示例（不要这么写）

❌ \`export default\` —— 必须用命名导出
❌ \`import { something } from 'lodash'\` —— 不允许外部依赖
❌ \`<div className="bg-red-500">\` —— 用 inline style
❌ \`setTimeout(() => setX(...), 1000)\` —— 用 frame 驱动
`;

export const TOOL_SCHEMA = {
	name: 'emit_composition',
	description: 'Emit the generated Remotion Composition as a single TSX file.',
	parameters: {
		type: 'object' as const,
		properties: {
			tsxContent: {
				type: 'string',
				description:
					'Complete TSX file content. Must export `metadata` and `Composition`.',
			},
			durationInFrames: {
				type: 'integer',
				description: 'Total duration in frames. Must match metadata.',
			},
			fps: {type: 'integer', description: 'Frames per second.'},
			width: {type: 'integer', description: 'Video width in px.'},
			height: {type: 'integer', description: 'Video height in px.'},
			summary: {
				type: 'string',
				description:
					'One-sentence summary (Chinese OK) of what this composition shows.',
			},
		},
		required: [
			'tsxContent',
			'durationInFrames',
			'fps',
			'width',
			'height',
			'summary',
		],
	},
};

export type ToolArgs = {
	tsxContent: string;
	durationInFrames: number;
	fps: number;
	width: number;
	height: number;
	summary: string;
};

export function buildUserMessage(input: GenerateInput): string {
	const {jobId, scene, assets, previousError, previousAttempt} = input;
	const assetLines = assets.length
		? assets
				.map(
					(a) =>
						`- \`${a.staticPath}\` (${a.mimeType}, ${a.sizeBytes} bytes, 原名: ${a.originalName})`,
				)
				.join('\n')
		: '（用户没有上传任何素材，仅用代码生成视觉内容）';

	const retryBlock = previousError
		? `\n\n## 上一次生成失败\n错误：\n\`\`\`\n${previousError}\n\`\`\`\n上次生成的代码（需要修正）：\n\`\`\`tsx\n${previousAttempt ?? ''}\n\`\`\`\n请基于错误修正后重新生成完整的 tsx。`
		: '';

	return `## Job ID
${jobId}

## 场景描述
${scene}

## 可用素材
${assetLines}${retryBlock}

请调用 \`emit_composition\` 工具返回结果。metadata.id 必须等于 "${jobId}"。`;
}

/**
 * 用户反馈轮的 user message。明确要求"基于已有代码修改"而不是重写。
 */
export function buildFeedbackMessage(feedback: string): string {
	return `用户对上一次生成提出反馈，请基于【已有代码】作局部修改，不要完全重写：

${feedback}

请调用 emit_composition 工具返回修改后的完整 tsx。metadata.id 不变。`;
}

/**
 * 粗略 token 估算：中文字符约 0.5 token，其它约 0.25 token。
 * 不是真实 tokenization，只用于决定是否触发截断。
 */
export function estimateTokens(s: string): number {
	let tokens = 0;
	for (const c of s) {
		if (c.codePointAt(0)! >= 0x4e00 && c.codePointAt(0)! <= 0x9fff) {
			tokens += 0.5;
		} else {
			tokens += 0.25;
		}
	}
	return Math.ceil(tokens);
}

export const TOKEN_BUDGET = 12_000;

/**
 * 把 Job.conversation 翻译成 provider 无关的 ChatMessage[]。
 *
 * 结构：
 *   msg[0]            = buildUserMessage(input)   // 首轮场景 + 素材清单
 *   msg[1..N-1]       = assistant 回显 / user 反馈  // 交替
 *
 * 如果总 token 估算超过 TOKEN_BUDGET，丢弃中间的 turn，保留
 * 首轮 user + 最近 2 轮 user/assistant 对，并在中间插入一条
 * assistant 标记说明历史被压缩。
 */
export function buildConversation(
	input: GenerateInput,
	history: ConversationTurn[],
): ChatMessage[] {
	if (history.length === 0) {
		// 无历史：按首轮处理
		return [{role: 'user', content: buildUserMessage(input)}];
	}

	const messages: ChatMessage[] = [];

	// 首轮 user message 用完整的 buildUserMessage（包含 assets 清单）
	messages.push({role: 'user', content: buildUserMessage(input)});

	// 从 history[1] 开始，依次翻译为 assistant / feedback user
	for (let i = 1; i < history.length; i++) {
		const turn = history[i];
		if (turn.role === 'assistant') {
			messages.push({
				role: 'assistant',
				content: `已生成视频：${turn.content}${turn.tsxPath ? `（文件路径 ${turn.tsxPath}）` : ''}`,
			});
		} else {
			messages.push({role: 'user', content: buildFeedbackMessage(turn.content)});
		}
	}

	return maybeTruncate(messages);
}

function maybeTruncate(messages: ChatMessage[]): ChatMessage[] {
	const total = messages.reduce((acc, m) => acc + estimateTokens(m.content), 0);
	if (total <= TOKEN_BUDGET) return messages;

	// 保留：首条（index 0）+ 最后 4 条（最近 2 轮 user/assistant 对）
	if (messages.length <= 5) return messages;
	const head = messages[0];
	const tail = messages.slice(-4);
	const noticeCount = messages.length - 5;
	const notice: ChatMessage = {
		role: 'assistant',
		content: `（中间 ${noticeCount} 条对话已省略，保留了首轮需求和最近的反馈）`,
	};
	return [head, notice, ...tail];
}
