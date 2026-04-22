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

export type DegreeCardProps = {
	level: string;
	degreeNumber: string;
	emoji: string;
	symptoms: string[];
	depth: string;
	severity: string;
	severityColor: string;
	bgColor: string;
};

export const DegreeCard: React.FC<DegreeCardProps> = ({
	level,
	degreeNumber,
	emoji,
	symptoms,
	depth,
	severity,
	severityColor,
	bgColor,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const numberScale = spring({frame, fps, config: {damping: 9, mass: 0.6}});
	const emojiFloat = Math.sin(frame / 10) * 12;
	const levelOpacity = interpolate(frame, [10, 25], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const depthOpacity = interpolate(frame, [100, 120], [0, 1], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				background: bgColor,
				fontFamily,
				flexDirection: 'column',
				alignItems: 'center',
				padding: '100px 60px',
				gap: 30,
			}}
		>
			<div
				style={{
					fontSize: 70,
					fontWeight: 700,
					color: severityColor,
					letterSpacing: 8,
					opacity: levelOpacity,
				}}
			>
				{level}
			</div>

			<div
				style={{
					fontSize: 220,
					fontWeight: 900,
					color: severityColor,
					lineHeight: 1,
					transform: `scale(${numberScale})`,
					textShadow: `0 10px 0 ${severityColor}22`,
				}}
			>
				{degreeNumber}
			</div>

			<div
				style={{
					fontSize: 180,
					lineHeight: 1,
					transform: `translateY(${emojiFloat}px)`,
				}}
			>
				{emoji}
			</div>

			<div
				style={{
					background: '#fff',
					borderRadius: 28,
					padding: '36px 50px',
					display: 'flex',
					flexDirection: 'column',
					gap: 16,
					alignItems: 'flex-start',
					boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
					width: '85%',
				}}
			>
				{symptoms.map((s, i) => {
					const delay = 30 + i * 12;
					const opacity = interpolate(
						frame,
						[delay, delay + 10],
						[0, 1],
						{extrapolateRight: 'clamp'},
					);
					const x = interpolate(frame, [delay, delay + 14], [-30, 0], {
						extrapolateRight: 'clamp',
					});
					return (
						<div
							key={i}
							style={{
								fontSize: 46,
								color: '#1a1a2e',
								fontWeight: 600,
								opacity,
								transform: `translateX(${x}px)`,
								display: 'flex',
								alignItems: 'baseline',
								gap: 18,
							}}
						>
							<span
								style={{
									color: severityColor,
									fontSize: 52,
									lineHeight: 1,
								}}
							>
								●
							</span>
							<span>{s}</span>
						</div>
					);
				})}
			</div>

			<div
				style={{
					fontSize: 42,
					color: '#555',
					fontWeight: 600,
					marginTop: 10,
					textAlign: 'center',
					opacity: depthOpacity,
				}}
			>
				损伤层次：{depth}
			</div>

			<div
				style={{
					background: severityColor,
					color: '#fff',
					padding: '18px 50px',
					borderRadius: 999,
					fontSize: 50,
					fontWeight: 800,
					opacity: depthOpacity,
					boxShadow: `0 8px 20px ${severityColor}55`,
				}}
			>
				严重度：{severity}
			</div>
		</AbsoluteFill>
	);
};
