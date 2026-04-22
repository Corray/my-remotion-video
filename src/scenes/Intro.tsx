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

export const Intro: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const scale = spring({frame, fps, config: {damping: 12, mass: 0.6}});
	const subtitleOpacity = interpolate(frame, [25, 45], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const statOpacity = interpolate(frame, [70, 100], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const statY = interpolate(frame, [70, 100], [40, 0], {
		extrapolateRight: 'clamp',
	});
	const firePulse = 1 + Math.sin(frame / 6) * 0.08;

	return (
		<AbsoluteFill
			style={{
				background:
					'radial-gradient(circle at 50% 40%, #3a1a1a 0%, #1a1a2e 60%, #0a0a1a 100%)',
				fontFamily,
				alignItems: 'center',
				justifyContent: 'center',
				flexDirection: 'column',
				gap: 60,
			}}
		>
			<div
				style={{
					transform: `scale(${scale})`,
					textAlign: 'center',
				}}
			>
				<div
					style={{
						fontSize: 260,
						marginBottom: 30,
						transform: `scale(${firePulse})`,
					}}
				>
					🔥
				</div>
				<div
					style={{
						fontSize: 150,
						fontWeight: 900,
						color: '#fff',
						lineHeight: 1.15,
						letterSpacing: 8,
						textShadow: '0 4px 24px rgba(255,100,50,0.4)',
					}}
				>
					烫伤了
					<br />
					怎么办？
				</div>
			</div>

			<div
				style={{
					fontSize: 56,
					color: '#FFD23F',
					fontWeight: 700,
					opacity: subtitleOpacity,
					letterSpacing: 6,
					textAlign: 'center',
				}}
			>
				第一时间做对 · 不留疤
			</div>

			<div
				style={{
					background: 'rgba(255,255,255,0.08)',
					border: '2px solid rgba(255,210,63,0.4)',
					borderRadius: 28,
					padding: '28px 50px',
					opacity: statOpacity,
					transform: `translateY(${statY}px)`,
					maxWidth: 860,
				}}
			>
				<div
					style={{
						fontSize: 42,
						color: '#fff',
						fontWeight: 600,
						textAlign: 'center',
						lineHeight: 1.5,
					}}
				>
					我国每年约{' '}
					<span style={{color: '#FFD23F', fontWeight: 900, fontSize: 54}}>
						2600 万
					</span>{' '}
					人烫伤
					<br />
					多数处理不当 · 留下永久疤痕
				</div>
			</div>
		</AbsoluteFill>
	);
};
