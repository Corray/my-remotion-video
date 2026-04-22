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

export type StepProps = {
	number: number;
	character: string;
	title: string;
	tips: string[];
	emoji: string;
	accentColor: string;
	bgColor: string;
};

export const Step: React.FC<StepProps> = ({
	number,
	character,
	title,
	tips,
	emoji,
	accentColor,
	bgColor,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const badgeScale = spring({frame, fps, config: {damping: 10}});
	const charScale = spring({
		frame: frame - 8,
		fps,
		config: {damping: 9, mass: 0.7},
	});
	const titleOpacity = interpolate(frame, [24, 42], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const titleY = interpolate(frame, [24, 42], [30, 0], {
		extrapolateRight: 'clamp',
	});
	const emojiFloat = Math.sin(frame / 10) * 16;

	return (
		<AbsoluteFill style={{background: bgColor, fontFamily}}>
			<div
				style={{
					position: 'absolute',
					top: 80,
					left: 60,
					width: 150,
					height: 150,
					borderRadius: '50%',
					background: accentColor,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: 96,
					fontWeight: 900,
					color: '#fff',
					boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
					transform: `scale(${badgeScale})`,
					zIndex: 2,
				}}
			>
				{number}
			</div>

			<div
				style={{
					position: 'absolute',
					top: 120,
					right: 60,
					fontSize: 42,
					fontWeight: 700,
					color: accentColor,
					letterSpacing: 6,
					zIndex: 2,
				}}
			>
				STEP {number} / 5
			</div>

			<AbsoluteFill
				style={{
					flexDirection: 'column',
					alignItems: 'center',
					padding: '260px 50px 80px',
					gap: 24,
				}}
			>
				<div
					style={{
						fontSize: 200,
						transform: `translateY(${emojiFloat}px)`,
						lineHeight: 1,
					}}
				>
					{emoji}
				</div>

				<div
					style={{
						fontSize: 340,
						fontWeight: 900,
						color: accentColor,
						transform: `scale(${charScale})`,
						lineHeight: 1,
						textShadow: `0 10px 0 ${accentColor}22`,
					}}
				>
					{character}
				</div>

				<div
					style={{
						fontSize: 90,
						fontWeight: 900,
						color: '#1a1a2e',
						opacity: titleOpacity,
						transform: `translateY(${titleY}px)`,
						letterSpacing: 4,
					}}
				>
					{title}
				</div>

				<div
					style={{
						background: '#fff',
						borderRadius: 28,
						padding: '36px 44px',
						display: 'flex',
						flexDirection: 'column',
						gap: 18,
						boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
						width: '92%',
						borderLeft: `12px solid ${accentColor}`,
					}}
				>
					{tips.map((tip, i) => {
						const delay = 50 + i * 18;
						const opacity = interpolate(
							frame,
							[delay, delay + 12],
							[0, 1],
							{extrapolateRight: 'clamp'},
						);
						const x = interpolate(frame, [delay, delay + 16], [-40, 0], {
							extrapolateRight: 'clamp',
						});
						return (
							<div
								key={i}
								style={{
									fontSize: 44,
									color: '#1a1a2e',
									fontWeight: 600,
									lineHeight: 1.4,
									display: 'flex',
									gap: 16,
									alignItems: 'flex-start',
									opacity,
									transform: `translateX(${x}px)`,
								}}
							>
								<span
									style={{
										color: accentColor,
										fontSize: 46,
										lineHeight: 1.2,
										flexShrink: 0,
										fontWeight: 900,
									}}
								>
									▸
								</span>
								<span>{tip}</span>
							</div>
						);
					})}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
