import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {Nurse, NurseMood} from '../Nurse';

const fontFamily =
	'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

export type SpecialCaseProps = {
	emoji: string;
	tag: string;
	title: string;
	instructions: string[];
	urgency: string;
	accentColor: string;
	bgColor: string;
	nurseSpeech?: string;
	nurseMood?: NurseMood;
};

export const SpecialCase: React.FC<SpecialCaseProps> = ({
	emoji,
	tag,
	title,
	instructions,
	urgency,
	accentColor,
	bgColor,
	nurseSpeech = '这种要特别留意',
	nurseMood = 'urgent',
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const emojiScale = spring({frame, fps, config: {damping: 9, mass: 0.6}});
	const emojiFloat = Math.sin(frame / 10) * 14;
	const titleOpacity = interpolate(frame, [15, 30], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const urgencyOpacity = interpolate(frame, [180, 210], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const urgencyScale = spring({
		frame: frame - 180,
		fps,
		config: {damping: 9},
	});

	return (
		<AbsoluteFill
			style={{
				background: bgColor,
				fontFamily,
				flexDirection: 'column',
				alignItems: 'center',
				padding: '80px 60px 260px',
				gap: 22,
			}}
		>
			<div
				style={{
					fontSize: 40,
					color: accentColor,
					fontWeight: 700,
					letterSpacing: 8,
					opacity: titleOpacity,
				}}
			>
				{tag}
			</div>

			<div
				style={{
					fontSize: 210,
					lineHeight: 1,
					transform: `scale(${emojiScale}) translateY(${emojiFloat}px)`,
				}}
			>
				{emoji}
			</div>

			<div
				style={{
					fontSize: 96,
					fontWeight: 900,
					color: accentColor,
					opacity: titleOpacity,
					letterSpacing: 4,
					textAlign: 'center',
				}}
			>
				{title}
			</div>

			<div
				style={{
					background: '#fff',
					borderRadius: 28,
					padding: '32px 44px',
					display: 'flex',
					flexDirection: 'column',
					gap: 16,
					width: '86%',
					boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
					marginTop: 6,
				}}
			>
				{instructions.map((s, i) => {
					const delay = 40 + i * 18;
					const opacity = interpolate(
						frame,
						[delay, delay + 12],
						[0, 1],
						{extrapolateRight: 'clamp'},
					);
					const x = interpolate(frame, [delay, delay + 16], [-30, 0], {
						extrapolateRight: 'clamp',
					});
					return (
						<div
							key={i}
							style={{
								fontSize: 40,
								color: '#1a1a2e',
								fontWeight: 600,
								opacity,
								transform: `translateX(${x}px)`,
								lineHeight: 1.35,
								display: 'flex',
								gap: 16,
							}}
						>
							<span
								style={{
									color: accentColor,
									fontSize: 44,
									lineHeight: 1,
									flexShrink: 0,
								}}
							>
								▸
							</span>
							<span>{s}</span>
						</div>
					);
				})}
			</div>

			<div
				style={{
					background: accentColor,
					color: '#fff',
					padding: '20px 50px',
					borderRadius: 999,
					fontSize: 50,
					fontWeight: 900,
					opacity: urgencyOpacity,
					transform: `scale(${urgencyScale})`,
					marginTop: 8,
					boxShadow: `0 12px 32px ${accentColor}66`,
					letterSpacing: 3,
				}}
			>
				{urgency}
			</div>

			<div
				style={{
					position: 'absolute',
					bottom: 30,
					right: 30,
				}}
			>
				<Nurse
					speech={nurseSpeech}
					size={240}
					bubbleColor={accentColor}
					mood={nurseMood}
					bubbleDelay={80}
				/>
			</div>
		</AbsoluteFill>
	);
};
