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

export type WrongDetailProps = {
	emoji: string;
	name: string;
	reason: string;
	nurseSpeech?: string;
	nurseMood?: NurseMood;
};

export const WrongDetail: React.FC<WrongDetailProps> = ({
	emoji,
	name,
	reason,
	nurseSpeech = '真的 别这样',
	nurseMood = 'concerned',
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
				background: 'linear-gradient(180deg, #A01818 0%, #7A0E0E 100%)',
				fontFamily,
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'flex-start',
				gap: 40,
				padding: '100px 80px 60px',
			}}
		>
			<div
				style={{
					fontSize: 68,
					color: '#fff',
					fontWeight: 900,
					letterSpacing: 6,
					opacity: interpolate(frame, [0, 15], [0, 1], {
						extrapolateRight: 'clamp',
					}),
				}}
			>
				⚠️ 这样真不行
			</div>

			<div
				style={{
					position: 'relative',
					transform: `scale(${cardScale})`,
					background: '#fff',
					borderRadius: 40,
					padding: '50px 70px',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 16,
					boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
				}}
			>
				<div style={{fontSize: 200, lineHeight: 1}}>{emoji}</div>
				<div
					style={{
						fontSize: 92,
						fontWeight: 900,
						color: '#1a1a2e',
					}}
				>
					{name}
				</div>
				<div
					style={{
						position: 'absolute',
						top: 26,
						right: 26,
						fontSize: 130,
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
					padding: '28px 52px',
					borderRadius: 28,
					fontSize: 46,
					color: '#FFD23F',
					fontWeight: 700,
					textAlign: 'center',
					maxWidth: 860,
					lineHeight: 1.45,
					opacity: reasonOpacity,
					transform: `translateY(${reasonY}px)`,
				}}
			>
				{reason}
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
					bubbleColor="#FFD23F"
					mood={nurseMood}
					bubbleDelay={70}
				/>
			</div>
		</AbsoluteFill>
	);
};
