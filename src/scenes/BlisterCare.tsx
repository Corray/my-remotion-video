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

type Card = {
	emoji: string;
	heading: string;
	action: string;
	color: string;
};

const cards: Card[] = [
	{
		emoji: '🫧',
		heading: '小水泡',
		action: '别挑破\n让它自己吸收',
		color: '#06A77D',
	},
	{
		emoji: '💧',
		heading: '大水泡',
		action: '去医院消毒穿刺\n保留表皮天然护伤',
		color: '#E63946',
	},
];

export const BlisterCare: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const titleY = interpolate(frame, [0, 15], [-30, 0], {
		extrapolateRight: 'clamp',
	});
	const warningOpacity = interpolate(frame, [180, 210], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const warningScale = spring({
		frame: frame - 180,
		fps,
		config: {damping: 9},
	});

	return (
		<AbsoluteFill
			style={{
				background: 'linear-gradient(180deg, #E1F5FE 0%, #B3E5FC 100%)',
				fontFamily,
				flexDirection: 'column',
				alignItems: 'center',
				padding: '110px 60px 260px',
				gap: 50,
			}}
		>
			<div
				style={{
					fontSize: 92,
					fontWeight: 900,
					color: '#1a1a2e',
					opacity: titleOpacity,
					transform: `translateY(${titleY}px)`,
					textAlign: 'center',
					letterSpacing: 4,
				}}
			>
				起水泡了 · 怎么办？
			</div>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 32,
					width: '100%',
				}}
			>
				{cards.map((c, i) => {
					const delay = 25 + i * 30;
					const scale = spring({
						frame: frame - delay,
						fps,
						config: {damping: 10, mass: 0.7},
					});
					return (
						<div
							key={c.heading}
							style={{
								background: '#fff',
								borderRadius: 36,
								padding: '36px 44px',
								display: 'flex',
								alignItems: 'center',
								gap: 36,
								boxShadow: '0 12px 32px rgba(0,80,160,0.15)',
								transform: `scale(${scale})`,
								borderLeft: `14px solid ${c.color}`,
							}}
						>
							<div style={{fontSize: 140, lineHeight: 1}}>{c.emoji}</div>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: 12,
									flex: 1,
								}}
							>
								<div
									style={{
										fontSize: 64,
										fontWeight: 900,
										color: c.color,
									}}
								>
									{c.heading}
								</div>
								<div
									style={{
										fontSize: 38,
										color: '#333',
										fontWeight: 600,
										lineHeight: 1.4,
										whiteSpace: 'pre-line',
									}}
								>
									{c.action}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div
				style={{
					background: '#D32F2F',
					color: '#fff',
					padding: '26px 44px',
					borderRadius: 28,
					fontSize: 46,
					fontWeight: 800,
					textAlign: 'center',
					opacity: warningOpacity,
					transform: `scale(${warningScale})`,
					letterSpacing: 3,
					boxShadow: '0 12px 32px rgba(211,47,47,0.4)',
				}}
			>
				⚠️ 别自己挑破 求你啦
			</div>

			<div
				style={{
					position: 'absolute',
					bottom: 30,
					right: 30,
				}}
			>
				<Nurse
					speech="手放开 别碰它"
					size={240}
					bubbleColor="#0288D1"
					mood="concerned"
					bubbleDelay={60}
				/>
			</div>
		</AbsoluteFill>
	);
};
