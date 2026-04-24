import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	useCurrentFrame,
} from 'remotion';

const fontFamily =
	'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

const BABIES = [
	{delay: 0, x: '50%', size: 260, color: '#FFD23F'},
	{delay: 20, x: '20%', size: 200, color: '#FF3A94'},
	{delay: 40, x: '80%', size: 200, color: '#4CC9F0'},
	{delay: 60, x: '35%', size: 170, color: '#B5179E'},
	{delay: 80, x: '65%', size: 170, color: '#F72585'},
	{delay: 100, x: '50%', size: 320, color: '#FFD23F'},
];

export const JntmBaby: React.FC = () => {
	const frame = useCurrentFrame();

	const beat = Math.abs(Math.sin(frame / 4));
	const hue = (frame * 4) % 360;

	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(circle at 50% 50%, hsl(${hue},85%,55%) 0%, hsl(${(hue + 80) % 360},90%,20%) 80%)`,
				fontFamily,
				overflow: 'hidden',
			}}
		>
			{/* rhythm flash */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: '#fff',
					opacity: beat * 0.18,
				}}
			/>

			{BABIES.map((b, i) => {
				const t = frame - b.delay;
				const opacity = interpolate(t, [0, 10, 50, 70], [0, 1, 1, 0], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				});
				const scale = interpolate(t, [0, 12], [0.4, 1], {
					extrapolateRight: 'clamp',
				});
				const y = interpolate(t, [0, 70], [0, -80]);
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: b.x,
							top: '50%',
							transform: `translate(-50%, calc(-50% + ${y}px)) scale(${scale})`,
							fontSize: b.size,
							fontWeight: 900,
							color: b.color,
							opacity,
							textShadow: `0 0 40px ${b.color}, 0 10px 0 rgba(0,0,0,0.4)`,
							letterSpacing: 4,
							whiteSpace: 'nowrap',
						}}
					>
						Baby
					</div>
				);
			})}

			{/* final "I was you" */}
			<div
				style={{
					position: 'absolute',
					bottom: 180,
					left: 0,
					right: 0,
					textAlign: 'center',
					fontSize: 88,
					fontWeight: 900,
					color: '#fff',
					opacity: interpolate(frame, [130, 170], [0, 1], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					}),
					letterSpacing: 10,
					textShadow: '0 0 40px rgba(255,255,255,0.6), 0 8px 0 #4a0a3e',
				}}
			>
				I was you baby ♪
			</div>
		</AbsoluteFill>
	);
};
