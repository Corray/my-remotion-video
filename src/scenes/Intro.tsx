import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {Nurse} from '../Nurse';

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
					'radial-gradient(circle at 50% 40%, #4a2420 0%, #2a1a3e 60%, #1a1430 100%)',
				fontFamily,
				alignItems: 'center',
				justifyContent: 'flex-start',
				flexDirection: 'column',
				gap: 50,
				paddingTop: 160,
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
						fontSize: 240,
						marginBottom: 24,
						transform: `scale(${firePulse})`,
					}}
				>
					🔥
				</div>
				<div
					style={{
						fontSize: 140,
						fontWeight: 900,
						color: '#fff',
						lineHeight: 1.15,
						letterSpacing: 8,
						textShadow: '0 4px 24px rgba(255,140,80,0.5)',
					}}
				>
					烫伤了
					<br />
					别慌，看我
				</div>
			</div>

			<div
				style={{
					fontSize: 52,
					color: '#FFD23F',
					fontWeight: 700,
					opacity: subtitleOpacity,
					letterSpacing: 6,
					textAlign: 'center',
				}}
			>
				第一时间做对 · 不留疤痕
			</div>

			<div
				style={{
					background: 'rgba(255,255,255,0.1)',
					border: '2px solid rgba(255,210,63,0.4)',
					borderRadius: 28,
					padding: '26px 46px',
					opacity: statOpacity,
					transform: `translateY(${statY}px)`,
					maxWidth: 860,
				}}
			>
				<div
					style={{
						fontSize: 40,
						color: '#fff',
						fontWeight: 600,
						textAlign: 'center',
						lineHeight: 1.5,
					}}
				>
					咱国每年约{' '}
					<span style={{color: '#FFD23F', fontWeight: 900, fontSize: 52}}>
						2600 万
					</span>{' '}
					人烫伤
					<br />
					<span style={{color: '#FFB3B3'}}>多数处理不当 · 留下永久疤痕</span>
				</div>
			</div>

			<div
				style={{
					position: 'absolute',
					bottom: 80,
					left: '50%',
					transform: 'translateX(-50%)',
				}}
			>
				<Nurse
					speech="别怕 我带你学"
					size={340}
					bubbleColor="#FFD23F"
					mood="caring"
					bubbleDelay={100}
					hearts
				/>
			</div>
		</AbsoluteFill>
	);
};
