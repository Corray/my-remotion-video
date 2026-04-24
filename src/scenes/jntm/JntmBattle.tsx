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

export const JntmBattle: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const topS = spring({frame, fps, config: {damping: 10}});
	const topY = interpolate(topS, [0, 1], [-200, 0]);

	const bottomS = spring({frame: frame - 15, fps, config: {damping: 10}});
	const bottomY = interpolate(bottomS, [0, 1], [200, 0]);

	const vsScale = spring({
		frame: frame - 35,
		fps,
		config: {damping: 6, mass: 0.4},
	});
	const vsShake = Math.sin(frame / 2) * 4;

	const topBob = Math.sin(frame / 5) * 14;
	const bottomBob = Math.sin(frame / 5 + Math.PI) * 14;

	return (
		<AbsoluteFill
			style={{
				background: '#0a0515',
				fontFamily,
				overflow: 'hidden',
			}}
		>
			{/* top half - KUN */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					height: '50%',
					background:
						'linear-gradient(180deg, #FF3A94 0%, #7209B7 100%)',
					clipPath: 'polygon(0 0, 100% 0, 100% 88%, 0 100%)',
					transform: `translateY(${topY}px)`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-around',
				}}
			>
				<div
					style={{
						fontSize: 320,
						transform: `translateY(${topBob}px)`,
						filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))',
					}}
				>
					🕺
				</div>
				<div
					style={{
						fontSize: 180,
						fontWeight: 900,
						color: '#fff',
						letterSpacing: 8,
						textShadow: '0 0 30px rgba(255,255,255,0.5), 0 8px 0 #4a0a3e',
					}}
				>
					坤坤
				</div>
			</div>

			{/* bottom half - CHICKEN */}
			<div
				style={{
					position: 'absolute',
					bottom: 0,
					left: 0,
					right: 0,
					height: '50%',
					background:
						'linear-gradient(180deg, #ffd23f 0%, #d48800 100%)',
					clipPath: 'polygon(0 12%, 100% 0, 100% 100%, 0 100%)',
					transform: `translateY(${bottomY}px)`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-around',
				}}
			>
				<div
					style={{
						fontSize: 180,
						fontWeight: 900,
						color: '#7a0a5a',
						letterSpacing: 8,
						textShadow: '0 0 30px rgba(255,255,255,0.5), 0 8px 0 #fff',
					}}
				>
					鸡鸡
				</div>
				<div
					style={{
						fontSize: 320,
						transform: `translateY(${bottomBob}px)`,
						filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))',
					}}
				>
					🐔
				</div>
			</div>

			{/* VS */}
			<AbsoluteFill
				style={{
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<div
					style={{
						fontSize: 280,
						fontWeight: 900,
						color: '#FFD23F',
						transform: `scale(${vsScale}) rotate(${vsShake}deg)`,
						textShadow:
							'0 0 50px rgba(255,210,63,0.8), 0 10px 0 #000, 0 20px 0 rgba(0,0,0,0.5)',
						letterSpacing: 20,
						fontStyle: 'italic',
					}}
				>
					VS
				</div>
			</AbsoluteFill>

			{/* hype text */}
			<div
				style={{
					position: 'absolute',
					bottom: 40,
					left: 0,
					right: 0,
					textAlign: 'center',
					fontSize: 48,
					color: '#fff',
					fontWeight: 900,
					letterSpacing: 8,
					opacity: vsScale,
				}}
			>
				⚔️ 世纪对决 ⚔️
			</div>
		</AbsoluteFill>
	);
};
