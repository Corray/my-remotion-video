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

export const JntmChicken: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// chicken entrance: slide in + bounce
	const entrance = spring({frame, fps, config: {damping: 8, mass: 0.8}});
	const chickenX = interpolate(entrance, [0, 1], [-600, 0]);

	// chicken bob (head-bob)
	const bob = Math.sin(frame / 4) * 20;
	const tilt = Math.sin(frame / 8) * 8;

	// "鸡" character stomps in after chicken arrives
	const jiChar = spring({
		frame: frame - 35,
		fps,
		config: {damping: 6, mass: 0.5},
	});

	// flash
	const flash = interpolate(frame, [35, 42], [0, 0.5, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	// subtitle
	const subtitleOpacity = interpolate(frame, [80, 110], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	// feathers floating
	const feathers = Array.from({length: 8}).map((_, i) => {
		const t = frame + i * 12;
		const x = 100 + i * 130 + Math.sin(t / 15) * 40;
		const y = ((t * 3) % 2200) - 200;
		return {x, y, rot: t * 3, i};
	});

	return (
		<AbsoluteFill
			style={{
				background:
					'radial-gradient(circle at 50% 60%, #fff5d1 0%, #ffd23f 50%, #c48800 100%)',
				fontFamily,
				overflow: 'hidden',
			}}
		>
			{/* feathers */}
			{feathers.map((f) => (
				<div
					key={f.i}
					style={{
						position: 'absolute',
						left: f.x,
						top: f.y,
						fontSize: 60,
						opacity: 0.5,
						transform: `rotate(${f.rot}deg)`,
					}}
				>
					🪶
				</div>
			))}

			{/* flash */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: '#fff',
					opacity: flash,
				}}
			/>

			<AbsoluteFill
				style={{
					alignItems: 'center',
					justifyContent: 'center',
					flexDirection: 'column',
					gap: 20,
				}}
			>
				{/* 鸡 character stomp */}
				<div
					style={{
						fontSize: 300,
						fontWeight: 900,
						color: '#B5179E',
						transform: `scale(${jiChar}) rotate(${(1 - jiChar) * 45}deg)`,
						textShadow:
							'0 0 40px rgba(181,23,158,0.6), 0 12px 0 #fff, 0 20px 0 rgba(0,0,0,0.3)',
						letterSpacing: 10,
						marginBottom: -40,
					}}
				>
					鸡！
				</div>

				{/* chicken emoji */}
				<div
					style={{
						fontSize: 560,
						transform: `translateX(${chickenX}px) translateY(${bob}px) rotate(${tilt}deg)`,
						filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
					}}
				>
					🐔
				</div>

				<div
					style={{
						fontSize: 72,
						color: '#7a0a5a',
						fontWeight: 900,
						opacity: subtitleOpacity,
						background: 'rgba(255,255,255,0.7)',
						padding: '14px 50px',
						borderRadius: 50,
						letterSpacing: 8,
						border: '4px solid #B5179E',
					}}
				>
					咕咕 咕咕咕 🐥
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
