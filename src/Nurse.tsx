import React from 'react';
import {
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

const fontFamily =
	'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

export type NurseProps = {
	speech?: string;
	size?: number;
	flipped?: boolean;
	bubbleColor?: string;
};

export const Nurse: React.FC<NurseProps> = ({
	speech,
	size = 300,
	flipped = false,
	bubbleColor = '#00B4D8',
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// 呼吸起伏
	const breathe = 1 + Math.sin(frame / 15) * 0.018;

	// 眨眼：每 90 帧一次，持续 6 帧
	const blinkCycle = frame % 90;
	const isBlink = blinkCycle >= 82 && blinkCycle <= 88;
	const eyeScaleY = isBlink ? 0.1 : 1;

	// 挥手 / 姿态浮动
	const handBob = Math.sin(frame / 8) * 3;

	// 对话气泡出现动画
	const bubbleScale = spring({
		frame: frame - 8,
		fps,
		config: {damping: 11, mass: 0.6},
	});
	const bubbleOpacity = interpolate(frame, [8, 24], [0, 1], {
		extrapolateRight: 'clamp',
	});

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

			<div
				style={{
					transform: `${flipped ? 'scaleX(-1) ' : ''}scale(${breathe})`,
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
						d="M 74 87 Q 82 83 90 87"
						stroke="#4E342E"
						strokeWidth="2.8"
						fill="none"
						strokeLinecap="round"
					/>
					<path
						d="M 110 87 Q 118 83 126 87"
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
						fill="#F48FB1"
						opacity="0.55"
					/>
					<ellipse
						cx="128"
						cy="120"
						rx="8"
						ry="5"
						fill="#F48FB1"
						opacity="0.55"
					/>

					{/* 嘴 */}
					<path
						d="M 86 124 Q 100 140 114 124"
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
