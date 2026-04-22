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

const wrongItems = [
	{emoji: '🧴', text: '涂牙膏'},
	{emoji: '🍶', text: '抹酱油'},
	{emoji: '🧊', text: '敷冰块'},
];

export const Warning: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const titleScale = spring({frame, fps, config: {damping: 10}});
	const shake = Math.sin(frame / 2) * (frame < 15 ? 8 : 0);

	return (
		<AbsoluteFill
			style={{
				background:
					'linear-gradient(180deg, #8B0000 0%, #B71C1C 50%, #D32F2F 100%)',
				fontFamily,
				alignItems: 'center',
				justifyContent: 'center',
				flexDirection: 'column',
				gap: 80,
				padding: 80,
			}}
		>
			<div
				style={{
					fontSize: 120,
					fontWeight: 900,
					color: '#fff',
					textAlign: 'center',
					transform: `scale(${titleScale}) translateX(${shake}px)`,
					textShadow: '0 6px 20px rgba(0,0,0,0.4)',
				}}
			>
				千万别这样！
			</div>

			<div style={{display: 'flex', flexDirection: 'column', gap: 50}}>
				{wrongItems.map((item, i) => {
					const delay = i * 12 + 10;
					const x = spring({
						frame: frame - delay,
						fps,
						from: -800,
						to: 0,
						config: {damping: 14, mass: 0.8},
					});
					const opacity = interpolate(
						frame,
						[delay, delay + 8],
						[0, 1],
						{extrapolateRight: 'clamp'},
					);
					return (
						<div
							key={i}
							style={{
								transform: `translateX(${x}px)`,
								opacity,
								fontSize: 90,
								color: '#fff',
								display: 'flex',
								alignItems: 'center',
								gap: 40,
								background: 'rgba(0,0,0,0.25)',
								padding: '24px 48px',
								borderRadius: 24,
								fontWeight: 800,
							}}
						>
							<span style={{fontSize: 110}}>{item.emoji}</span>
							<span>{item.text}</span>
							<span
								style={{
									color: '#FFD23F',
									fontSize: 100,
									fontWeight: 900,
									marginLeft: 20,
								}}
							>
								✗
							</span>
						</div>
					);
				})}
			</div>

			<div
				style={{
					fontSize: 52,
					color: '#FFD23F',
					fontWeight: 700,
					textAlign: 'center',
					marginTop: 40,
				}}
			>
				会加重损伤 · 增加感染风险
			</div>
		</AbsoluteFill>
	);
};
