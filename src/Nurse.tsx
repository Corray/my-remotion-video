import React from 'react';
import {
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

const fontFamily =
	'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

export type NurseMood = 'warm' | 'concerned' | 'cheer' | 'urgent' | 'caring';

export type NurseProps = {
	speech?: string;
	size?: number;
	flipped?: boolean;
	bubbleColor?: string;
	mood?: NurseMood;
	// 气泡从第几帧开始弹出（默认 8）
	bubbleDelay?: number;
	// 是否显示爱心漂浮
	hearts?: boolean;
};

type MoodShape = {
	mouth: string;
	leftBrow: string;
	rightBrow: string;
	cheekColor: string;
	cheekOpacity: number;
	// 手部上下摆动系数
	armSwing: number;
};

const MOODS: Record<NurseMood, MoodShape> = {
	warm: {
		// 温柔微笑
		mouth: 'M 86 124 Q 100 140 114 124',
		leftBrow: 'M 74 87 Q 82 83 90 87',
		rightBrow: 'M 110 87 Q 118 83 126 87',
		cheekColor: '#F48FB1',
		cheekOpacity: 0.55,
		armSwing: 3,
	},
	caring: {
		// 柔和抿嘴笑 + 更明显腮红
		mouth: 'M 86 126 Q 100 136 114 126',
		leftBrow: 'M 74 88 Q 82 85 90 89',
		rightBrow: 'M 110 89 Q 118 85 126 88',
		cheekColor: '#F06292',
		cheekOpacity: 0.7,
		armSwing: 2,
	},
	concerned: {
		// 担忧：眉毛下垂内八，嘴微下撇
		mouth: 'M 86 130 Q 100 122 114 130',
		leftBrow: 'M 74 82 Q 82 88 90 86',
		rightBrow: 'M 110 86 Q 118 88 126 82',
		cheekColor: '#F48FB1',
		cheekOpacity: 0.4,
		armSwing: 2,
	},
	cheer: {
		// 开心大笑，眉毛上扬
		mouth: 'M 82 122 Q 100 146 118 122',
		leftBrow: 'M 74 84 Q 82 78 90 84',
		rightBrow: 'M 110 84 Q 118 78 126 84',
		cheekColor: '#EC407A',
		cheekOpacity: 0.7,
		armSwing: 6,
	},
	urgent: {
		// 严肃认真，眉毛压低
		mouth: 'M 86 130 Q 100 130 114 130',
		leftBrow: 'M 74 84 Q 82 90 90 86',
		rightBrow: 'M 110 86 Q 118 90 126 84',
		cheekColor: '#F48FB1',
		cheekOpacity: 0.3,
		armSwing: 2,
	},
};

export const Nurse: React.FC<NurseProps> = ({
	speech,
	size = 300,
	flipped = false,
	bubbleColor = '#00B4D8',
	mood = 'warm',
	bubbleDelay = 8,
	hearts = false,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const m = MOODS[mood];

	// 呼吸起伏
	const breathe = 1 + Math.sin(frame / 15) * 0.018;

	// 眨眼：每 90 帧一次，持续 6 帧
	const blinkCycle = frame % 90;
	const isBlink = blinkCycle >= 82 && blinkCycle <= 88;
	const eyeScaleY = isBlink ? 0.1 : 1;

	// 手臂摆动（mood 决定幅度）
	const handBob = Math.sin(frame / 8) * m.armSwing;

	// 点头（urgent / concerned 幅度更小）
	const headNod =
		mood === 'cheer' ? Math.sin(frame / 10) * 2 : Math.sin(frame / 18) * 0.8;

	// 对话气泡出现动画
	const bubbleScale = spring({
		frame: frame - bubbleDelay,
		fps,
		config: {damping: 11, mass: 0.6},
	});
	const bubbleOpacity = interpolate(
		frame,
		[bubbleDelay, bubbleDelay + 16],
		[0, 1],
		{
			extrapolateRight: 'clamp',
		},
	);

	const svgWidth = size;
	const svgHeight = size * 1.4;

	return (
		<div style={{position: 'relative', display: 'inline-block'}}>
			{speech && (
				<div
					style={{
						position: 'absolute',
						bottom: svgHeight - 40,
						left: '50%',
						transform: `translateX(-50%) scale(${bubbleScale})`,
						transformOrigin: 'center bottom',
						opacity: bubbleOpacity,
						background: '#fff',
						border: `5px solid ${bubbleColor}`,
						borderRadius: 28,
						padding: '20px 32px',
						fontSize: size * 0.12,
						fontWeight: 800,
						color: '#1a1a2e',
						whiteSpace: 'nowrap',
						boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
						fontFamily,
						zIndex: 3,
						textAlign: 'center',
					}}
				>
					{speech}
					<div
						style={{
							position: 'absolute',
							bottom: -24,
							left: '50%',
							transform: 'translateX(-50%)',
							width: 0,
							height: 0,
							borderLeft: '18px solid transparent',
							borderRight: '18px solid transparent',
							borderTop: `24px solid ${bubbleColor}`,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							bottom: -16,
							left: '50%',
							transform: 'translateX(-50%)',
							width: 0,
							height: 0,
							borderLeft: '12px solid transparent',
							borderRight: '12px solid transparent',
							borderTop: '16px solid #fff',
						}}
					/>
				</div>
			)}

			{hearts && (
				<>
					{[0, 1, 2].map((i) => {
						const baseDelay = i * 30;
						const progress = ((frame + baseDelay) % 90) / 90;
						const opacity =
							progress < 0.15
								? progress / 0.15
								: progress > 0.85
									? (1 - progress) / 0.15
									: 1;
						const y = -progress * 140;
						const x = Math.sin((frame + baseDelay) / 12) * 18 + (i - 1) * 30;
						return (
							<div
								key={i}
								style={{
									position: 'absolute',
									left: '50%',
									top: svgHeight * 0.25,
									fontSize: size * 0.11,
									transform: `translate(${x}px, ${y}px)`,
									opacity,
									pointerEvents: 'none',
									zIndex: 1,
								}}
							>
								💗
							</div>
						);
					})}
				</>
			)}

			<div
				style={{
					transform: `${flipped ? 'scaleX(-1) ' : ''}scale(${breathe}) translateY(${headNod}px)`,
					transformOrigin: 'center bottom',
				}}
			>
				<svg
					viewBox="0 0 200 280"
					width={svgWidth}
					height={svgHeight}
					style={{overflow: 'visible'}}
				>
					{/* 脑后头发 */}
					<ellipse cx="100" cy="92" rx="62" ry="58" fill="#6D4C41" />

					{/* 脖子 */}
					<rect x="88" y="135" width="24" height="24" fill="#FFDBB5" />

					{/* 身体 / 护士服 */}
					<path
						d="M 44 160 Q 50 155 70 155 L 130 155 Q 150 155 156 160 L 172 275 L 28 275 Z"
						fill="#ffffff"
						stroke="#00B4D8"
						strokeWidth="3"
					/>

					{/* V 领 */}
					<path
						d="M 80 155 L 100 182 L 120 155"
						fill="none"
						stroke="#00B4D8"
						strokeWidth="3"
					/>

					{/* 胸前红十字 */}
					<rect x="62" y="202" width="22" height="6" fill="#E63946" />
					<rect x="70" y="194" width="6" height="22" fill="#E63946" />

					{/* 左手臂 */}
					<path
						d={`M 44 162 Q 32 205 ${36 + handBob} ${252 + handBob}`}
						fill="none"
						stroke="#ffffff"
						strokeWidth="24"
						strokeLinecap="round"
					/>
					<circle
						cx={36 + handBob}
						cy={252 + handBob}
						r="13"
						fill="#FFDBB5"
					/>

					{/* 右手臂 */}
					<path
						d={`M 156 162 Q 168 205 ${164 - handBob} ${252 + handBob}`}
						fill="none"
						stroke="#ffffff"
						strokeWidth="24"
						strokeLinecap="round"
					/>
					<circle
						cx={164 - handBob}
						cy={252 + handBob}
						r="13"
						fill="#FFDBB5"
					/>

					{/* 听诊器 */}
					<path
						d="M 80 165 Q 80 192 92 202 Q 100 206 108 202 Q 120 192 120 165"
						fill="none"
						stroke="#333"
						strokeWidth="3"
					/>
					<circle cx="100" cy="212" r="8" fill="#C62828" />
					<circle cx="100" cy="212" r="4" fill="#fff" opacity="0.4" />

					{/* 脸 */}
					<circle cx="100" cy="97" r="52" fill="#FFDBB5" />

					{/* 刘海 */}
					<path
						d="M 52 72 Q 58 46 100 44 Q 142 46 148 72
							 Q 140 68 128 72 Q 118 75 108 70 Q 100 64 92 70 Q 82 75 72 72 Q 60 68 52 72 Z"
						fill="#6D4C41"
					/>

					{/* 护士帽 */}
					<rect
						x="66"
						y="42"
						width="68"
						height="24"
						rx="4"
						fill="#ffffff"
						stroke="#ddd"
						strokeWidth="1.5"
					/>
					<rect x="96" y="46" width="8" height="16" fill="#E63946" />
					<rect x="88" y="50" width="24" height="8" fill="#E63946" />

					{/* 眉毛 */}
					<path
						d={m.leftBrow}
						stroke="#4E342E"
						strokeWidth="2.8"
						fill="none"
						strokeLinecap="round"
					/>
					<path
						d={m.rightBrow}
						stroke="#4E342E"
						strokeWidth="2.8"
						fill="none"
						strokeLinecap="round"
					/>

					{/* 左眼 */}
					<g transform={`translate(82 102) scale(1 ${eyeScaleY})`}>
						<circle cx="0" cy="0" r="5.5" fill="#2E2E2E" />
						<circle cx="1.5" cy="-1.8" r="1.6" fill="#fff" />
					</g>
					{/* 右眼 */}
					<g transform={`translate(118 102) scale(1 ${eyeScaleY})`}>
						<circle cx="0" cy="0" r="5.5" fill="#2E2E2E" />
						<circle cx="1.5" cy="-1.8" r="1.6" fill="#fff" />
					</g>

					{/* 腮红 */}
					<ellipse
						cx="72"
						cy="120"
						rx="8"
						ry="5"
						fill={m.cheekColor}
						opacity={m.cheekOpacity}
					/>
					<ellipse
						cx="128"
						cy="120"
						rx="8"
						ry="5"
						fill={m.cheekColor}
						opacity={m.cheekOpacity}
					/>

					{/* 嘴 */}
					<path
						d={m.mouth}
						fill="none"
						stroke="#333"
						strokeWidth="3"
						strokeLinecap="round"
					/>
				</svg>
			</div>
		</div>
	);
};
