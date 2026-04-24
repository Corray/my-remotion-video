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

export const JntmBasketball: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const labelS = spring({frame, fps, config: {damping: 9}});

	// ball bouncing: height follows |sin| curve, period ~30 frames
	const period = 30;
	const phase = (frame % period) / period;
	const ballY = 900 - Math.sin(phase * Math.PI) * 480;
	const ballSquish = 1 - Math.max(0, 1 - phase * 3) * 0.15;
	const ballRot = frame * 18;

	// player sway
	const sway = Math.sin(frame / 8) * 8;

	// impact ring at bottom
	const bounceTime = frame % period;
	const ringScale = interpolate(bounceTime, [0, 8], [0.4, 2], {
		extrapolateRight: 'clamp',
	});
	const ringOpacity = interpolate(bounceTime, [0, 8], [0.8, 0], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				background:
					'linear-gradient(180deg, #e76f2c 0%, #c04a1a 50%, #8b2e0d 100%)',
				fontFamily,
				overflow: 'hidden',
			}}
		>
			{/* court lines */}
			<div
				style={{
					position: 'absolute',
					bottom: 240,
					left: 0,
					right: 0,
					height: 4,
					background: 'rgba(255,255,255,0.3)',
				}}
			/>

			<AbsoluteFill
				style={{
					alignItems: 'center',
					justifyContent: 'flex-start',
					flexDirection: 'column',
					paddingTop: 120,
					gap: 30,
				}}
			>
				<div
					style={{
						fontSize: 240,
						fontWeight: 900,
						color: '#fff',
						transform: `scale(${labelS})`,
						letterSpacing: 30,
						textShadow: '0 0 50px rgba(255,255,255,0.6), 0 10px 0 #5a1a00',
					}}
				>
					篮球
				</div>
				<div
					style={{
						fontSize: 56,
						color: '#FFD23F',
						fontWeight: 900,
						opacity: labelS,
						letterSpacing: 6,
						textShadow: '0 4px 0 #5a1a00',
					}}
				>
					🏆 最爱的运动 🏆
				</div>
			</AbsoluteFill>

			{/* player */}
			<div
				style={{
					position: 'absolute',
					bottom: 240,
					left: '50%',
					transform: `translateX(calc(-50% - 260px)) translateX(${sway}px)`,
					fontSize: 360,
					filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))',
				}}
			>
				🕺
			</div>

			{/* bouncing ball */}
			<div
				style={{
					position: 'absolute',
					top: ballY,
					left: '50%',
					transform: `translateX(calc(-50% + 180px)) rotate(${ballRot}deg) scaleY(${ballSquish})`,
					fontSize: 220,
					filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.4))',
				}}
			>
				🏀
			</div>

			{/* impact ring */}
			<div
				style={{
					position: 'absolute',
					bottom: 228,
					left: '50%',
					transform: `translateX(calc(-50% + 180px)) scale(${ringScale})`,
					width: 200,
					height: 40,
					borderRadius: '50%',
					border: '6px solid rgba(255,210,63,0.8)',
					opacity: ringOpacity,
				}}
			/>
		</AbsoluteFill>
	);
};
