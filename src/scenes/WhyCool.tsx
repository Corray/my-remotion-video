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

export const WhyCool: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const titleScale = spring({frame, fps, config: {damping: 10}});
	const dropFloat = Math.sin(frame / 8) * 20;
	const explanationOpacity = interpolate(frame, [30, 55], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const explanationY = interpolate(frame, [30, 55], [40, 0], {
		extrapolateRight: 'clamp',
	});
	const conclusionOpacity = interpolate(frame, [150, 180], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const conclusionScale = spring({
		frame: frame - 150,
		fps,
		config: {damping: 10},
	});

	return (
		<AbsoluteFill
			style={{
				background:
					'linear-gradient(180deg, #0277BD 0%, #01579B 60%, #002F6C 100%)',
				fontFamily,
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				padding: 80,
				gap: 50,
			}}
		>
			<div
				style={{
					fontSize: 96,
					color: '#fff',
					fontWeight: 900,
					textAlign: 'center',
					transform: `scale(${titleScale})`,
					letterSpacing: 6,
				}}
			>
				为什么要冷水冲？
			</div>

			<div
				style={{
					fontSize: 320,
					transform: `translateY(${dropFloat}px)`,
					lineHeight: 1,
				}}
			>
				💧
			</div>

			<div
				style={{
					background: 'rgba(255,255,255,0.15)',
					padding: '44px 56px',
					borderRadius: 32,
					opacity: explanationOpacity,
					transform: `translateY(${explanationY}px)`,
					maxWidth: 920,
					border: '2px solid rgba(255,255,255,0.2)',
				}}
			>
				<div
					style={{
						fontSize: 50,
						color: '#fff',
						fontWeight: 600,
						lineHeight: 1.6,
						textAlign: 'center',
					}}
				>
					皮肤里的{' '}
					<span style={{color: '#FFD23F', fontWeight: 900}}>残余热量</span>
					<br />
					会继续向深层组织传导
					<br />
					<span style={{color: '#FF6B6B', fontWeight: 900}}>损伤仍在加重</span>
				</div>
			</div>

			<div
				style={{
					fontSize: 64,
					color: '#FFD23F',
					fontWeight: 900,
					textAlign: 'center',
					opacity: conclusionOpacity,
					transform: `scale(${conclusionScale})`,
					letterSpacing: 6,
					marginTop: 20,
				}}
			>
				越快降温 · 损伤越小
			</div>
		</AbsoluteFill>
	);
};
