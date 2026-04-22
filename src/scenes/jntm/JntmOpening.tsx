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

export const JntmOpening: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const q1 = spring({frame, fps, config: {damping: 10, mass: 0.5}});
	const q2 = spring({frame: frame - 20, fps, config: {damping: 10, mass: 0.5}});
	const q3 = spring({frame: frame - 40, fps, config: {damping: 10, mass: 0.5}});

	const textOpacity = interpolate(frame, [55, 75], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const textY = interpolate(frame, [55, 75], [30, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const wobble = Math.sin(frame / 4) * 6;

	return (
		<AbsoluteFill
			style={{
				background:
					'radial-gradient(circle at 50% 40%, #2a1a4e 0%, #1a0f2e 70%, #0a0515 100%)',
				fontFamily,
				alignItems: 'center',
				justifyContent: 'center',
				flexDirection: 'column',
				gap: 40,
			}}
		>
			<div
				style={{
					display: 'flex',
					gap: 40,
					fontSize: 320,
					fontWeight: 900,
					color: '#FFD23F',
					textShadow: '0 0 60px rgba(255,210,63,0.6)',
				}}
			>
				<span style={{transform: `scale(${q1}) rotate(${-wobble}deg)`}}>?</span>
				<span style={{transform: `scale(${q2}) rotate(${wobble}deg)`}}>?</span>
				<span style={{transform: `scale(${q3}) rotate(${-wobble}deg)`}}>?</span>
			</div>
			<div
				style={{
					fontSize: 96,
					fontWeight: 900,
					color: '#fff',
					opacity: textOpacity,
					transform: `translateY(${textY}px)`,
					letterSpacing: 12,
					textShadow: '0 0 30px rgba(255,255,255,0.3)',
				}}
			>
				你干嘛～哎哟～
			</div>
		</AbsoluteFill>
	);
};
