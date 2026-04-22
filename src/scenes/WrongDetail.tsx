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

export type WrongDetailProps = {
	emoji: string;
	name: string;
	reason: string;
};

export const WrongDetail: React.FC<WrongDetailProps> = ({
	emoji,
	name,
	reason,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const cardScale = spring({frame, fps, config: {damping: 10, mass: 0.7}});
	const crossOpacity = interpolate(frame, [15, 30], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const crossScale = spring({
		frame: frame - 15,
		fps,
		config: {damping: 7, mass: 0.4},
	});
	const reasonOpacity = interpolate(frame, [35, 55], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const reasonY = interpolate(frame, [35, 55], [40, 0], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				background: 'linear-gradient(180deg, #8B0000 0%, #B71C1C 100%)',
				fontFamily,
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 60,
				padding: 80,
			}}
		>
			<div
				style={{
					fontSize: 72,
					color: '#fff',
					fontWeight: 900,
					letterSpacing: 6,
					opacity: interpolate(frame, [0, 15], [0, 1], {
						extrapolateRight: 'clamp',
					}),
				}}
			>
				⚠️ 错误做法
			</div>

			<div
				style={{
					position: 'relative',
					transform: `scale(${cardScale})`,
					background: '#fff',
					borderRadius: 40,
					padding: '60px 80px',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 20,
					boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
				}}
			>
				<div style={{fontSize: 220, lineHeight: 1}}>{emoji}</div>
				<div
					style={{
						fontSize: 100,
						fontWeight: 900,
						color: '#1a1a2e',
					}}
				>
					{name}
				</div>
				<div
					style={{
						position: 'absolute',
						top: 30,
						right: 30,
						fontSize: 140,
						fontWeight: 900,
						color: '#D32F2F',
						opacity: crossOpacity,
						transform: `scale(${crossScale}) rotate(12deg)`,
					}}
				>
					✗
				</div>
			</div>

			<div
				style={{
					background: 'rgba(0,0,0,0.35)',
					padding: '30px 56px',
					borderRadius: 28,
					fontSize: 50,
					color: '#FFD23F',
					fontWeight: 700,
					textAlign: 'center',
					maxWidth: 900,
					lineHeight: 1.45,
					opacity: reasonOpacity,
					transform: `translateY(${reasonY}px)`,
				}}
			>
				{reason}
			</div>
		</AbsoluteFill>
	);
};
