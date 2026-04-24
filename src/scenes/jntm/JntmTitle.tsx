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

const chars = ['只', '因', '你', '太', '美'];

export const JntmTitle: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const bgPulse = interpolate(
		Math.sin(frame / 8),
		[-1, 1],
		[0.85, 1],
	);

	const subtitleOpacity = interpolate(frame, [75, 100], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(circle at 50% 50%, rgba(255,58,148,${bgPulse}) 0%, #5a0a3e 60%, #1a0320 100%)`,
				fontFamily,
				alignItems: 'center',
				justifyContent: 'center',
				flexDirection: 'column',
				gap: 60,
			}}
		>
			<div style={{fontSize: 140}}>🎤✨🏀</div>
			<div
				style={{
					display: 'flex',
					gap: 10,
				}}
			>
				{chars.map((c, i) => {
					const s = spring({
						frame: frame - i * 8,
						fps,
						config: {damping: 8, mass: 0.6},
					});
					const rot = interpolate(s, [0, 1], [-30, 0]);
					return (
						<span
							key={c}
							style={{
								fontSize: 220,
								fontWeight: 900,
								color: '#fff',
								transform: `scale(${s}) rotate(${rot}deg)`,
								textShadow:
									'0 0 40px rgba(255,210,63,0.8), 0 8px 0 #FF3A94, 0 16px 0 rgba(0,0,0,0.3)',
								display: 'inline-block',
								letterSpacing: 4,
							}}
						>
							{c}
						</span>
					);
				})}
			</div>
			<div
				style={{
					fontSize: 72,
					color: '#FFD23F',
					fontWeight: 900,
					opacity: subtitleOpacity,
					letterSpacing: 20,
					textShadow: '0 4px 20px rgba(0,0,0,0.4)',
				}}
			>
				- JI NI TAI MEI -
			</div>
		</AbsoluteFill>
	);
};
