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

export const JntmOutro: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();

	const s = spring({frame, fps, config: {damping: 10}});
	const sub = interpolate(frame, [35, 60], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const fadeOut = interpolate(
		frame,
		[durationInFrames - 20, durationInFrames],
		[1, 0],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);

	return (
		<AbsoluteFill
			style={{
				background:
					'linear-gradient(180deg, #FF3A94 0%, #7209B7 50%, #1a0320 100%)',
				fontFamily,
				alignItems: 'center',
				justifyContent: 'center',
				flexDirection: 'column',
				gap: 40,
				opacity: fadeOut,
			}}
		>
			<div
				style={{
					fontSize: 180,
					transform: `scale(${s})`,
					filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.5))',
				}}
			>
				🎤 🏀 🐔
			</div>
			<div
				style={{
					fontSize: 160,
					fontWeight: 900,
					color: '#fff',
					transform: `scale(${s})`,
					letterSpacing: 12,
					textShadow: '0 0 40px rgba(255,210,63,0.6), 0 8px 0 rgba(0,0,0,0.3)',
					lineHeight: 1.1,
					textAlign: 'center',
				}}
			>
				只因
				<br />
				你太美
			</div>
			<div
				style={{
					fontSize: 64,
					color: '#FFD23F',
					fontWeight: 900,
					opacity: sub,
					letterSpacing: 16,
				}}
			>
				- The End -
			</div>
			<div
				style={{
					fontSize: 44,
					color: 'rgba(255,255,255,0.85)',
					opacity: sub,
					letterSpacing: 4,
					marginTop: 10,
				}}
			>
				Made with Remotion · 致敬经典
			</div>
		</AbsoluteFill>
	);
};
