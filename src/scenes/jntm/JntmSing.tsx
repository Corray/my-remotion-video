import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

const fontFamily =
	'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

const NOTE_COUNT = 14;

type Note = {
	left: number;
	delay: number;
	char: string;
	color: string;
	size: number;
};

const notes: Note[] = Array.from({length: NOTE_COUNT}).map((_, i) => ({
	left: (i * 73 + 60) % 1000,
	delay: i * 5,
	char: i % 2 === 0 ? '♪' : '♫',
	color: ['#FFD23F', '#FF3A94', '#4CC9F0', '#B5179E'][i % 4],
	size: 70 + (i % 4) * 26,
}));

export const JntmSing: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const labelS = spring({frame, fps, config: {damping: 10}});
	const mouthOpen = Math.abs(Math.sin(frame / 5));

	return (
		<AbsoluteFill
			style={{
				background:
					'linear-gradient(180deg, #1a0a3e 0%, #3d1560 50%, #1a0520 100%)',
				fontFamily,
				overflow: 'hidden',
			}}
		>
			{notes.map((n, i) => {
				const t = frame - n.delay;
				const opacity = interpolate(t, [0, 10, 60, 80], [0, 1, 1, 0], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				});
				const y = interpolate(t, [0, 120], [1600, -200]);
				const sway = Math.sin((t + i * 10) / 8) * 40;
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: n.left + sway,
							top: y,
							fontSize: n.size,
							color: n.color,
							opacity,
							textShadow: `0 0 30px ${n.color}`,
							fontWeight: 900,
						}}
					>
						{n.char}
					</div>
				);
			})}

			<AbsoluteFill
				style={{
					alignItems: 'center',
					justifyContent: 'center',
					flexDirection: 'column',
					gap: 40,
				}}
			>
				<div
					style={{
						fontSize: 420,
						transform: `scale(${1 + mouthOpen * 0.1})`,
						filter: 'drop-shadow(0 0 40px rgba(255,210,63,0.6))',
					}}
				>
					🎤
				</div>
				<div
					style={{
						fontSize: 240,
						fontWeight: 900,
						color: '#FFD23F',
						transform: `scale(${labelS})`,
						letterSpacing: 30,
						textShadow: '0 0 50px rgba(255,210,63,0.8), 0 8px 0 #FF3A94',
					}}
				>
					唱
				</div>
				<div
					style={{
						fontSize: 60,
						color: '#fff',
						opacity: labelS,
						letterSpacing: 10,
						fontWeight: 700,
					}}
				>
					🎵 哼哼哼 啊啊啊 🎵
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
