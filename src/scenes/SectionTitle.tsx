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

export type SectionTitleProps = {
	prefix: string;
	title: string;
	accentColor: string;
	bgColor: string;
	nurseSpeech?: string;
};

export const SectionTitle: React.FC<SectionTitleProps> = ({
	prefix,
	title,
	accentColor,
	bgColor,
	nurseSpeech,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const titleScale = spring({
		frame,
		fps,
		config: {damping: 10, mass: 0.7},
	});
	const prefixOpacity = interpolate(frame, [8, 20], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const barWidth = interpolate(frame, [15, 40], [0, 160], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{background: bgColor, fontFamily}}>
			<AbsoluteFill
				style={{
					alignItems: 'center',
					justifyContent: 'center',
					flexDirection: 'column',
					gap: 40,
					paddingBottom: 400,
				}}
			>
				<div
					style={{
						fontSize: 56,
						color: accentColor,
						fontWeight: 600,
						letterSpacing: 12,
						opacity: prefixOpacity,
					}}
				>
					{prefix}
				</div>
				<div
					style={{
						fontSize: 150,
						color: '#1a1a2e',
						fontWeight: 900,
						transform: `scale(${titleScale})`,
						letterSpacing: 8,
						textAlign: 'center',
						lineHeight: 1.15,
						whiteSpace: 'pre-line',
					}}
				>
					{title}
				</div>
				<div
					style={{
						width: barWidth,
						height: 10,
						background: accentColor,
						borderRadius: 5,
					}}
				/>
			</AbsoluteFill>

			{nurseSpeech && (
				<div
					style={{
						position: 'absolute',
						bottom: 60,
						right: 40,
					}}
				>
					<Nurse
						speech={nurseSpeech}
						size={300}
						bubbleColor={accentColor}
					/>
				</div>
			)}
		</AbsoluteFill>
	);
};
