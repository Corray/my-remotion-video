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

const causes = [
	{emoji: '🫖', name: '开水 / 热水'},
	{emoji: '🍲', name: '热汤 / 热粥'},
	{emoji: '🍳', name: '热油 / 高温锅'},
	{emoji: '♨️', name: '蒸汽烫伤'},
];

export const CauseGrid: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const titleY = interpolate(frame, [0, 15], [-30, 0], {
		extrapolateRight: 'clamp',
	});
	const footerOpacity = interpolate(frame, [130, 160], [0, 1], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				background: 'linear-gradient(180deg, #FFF8E1 0%, #FFE0B2 100%)',
				fontFamily,
				alignItems: 'center',
				flexDirection: 'column',
				gap: 50,
				padding: '120px 60px 260px',
			}}
		>
			<div
				style={{
					fontSize: 84,
					fontWeight: 900,
					color: '#1a1a2e',
					opacity: titleOpacity,
					transform: `translateY(${titleY}px)`,
					textAlign: 'center',
					letterSpacing: 4,
				}}
			>
				这些咱身边都有
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(2, 1fr)',
					gap: 36,
					width: '100%',
				}}
			>
				{causes.map((c, i) => {
					const delay = 20 + i * 14;
					const scale = spring({
						frame: frame - delay,
						fps,
						config: {damping: 10, mass: 0.6},
					});
					return (
						<div
							key={c.name}
							style={{
								background: '#fff',
								borderRadius: 36,
								padding: '46px 26px',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: 20,
								boxShadow: '0 12px 32px rgba(180,120,0,0.15)',
								transform: `scale(${scale})`,
								border: '4px solid #FFD23F',
							}}
						>
							<div style={{fontSize: 160, lineHeight: 1}}>{c.emoji}</div>
							<div
								style={{
									fontSize: 44,
									fontWeight: 800,
									color: '#1a1a2e',
									textAlign: 'center',
								}}
							>
								{c.name}
							</div>
						</div>
					);
				})}
			</div>

			<div
				style={{
					fontSize: 48,
					color: '#B85C00',
					fontWeight: 800,
					textAlign: 'center',
					opacity: footerOpacity,
					letterSpacing: 2,
					marginTop: 10,
				}}
			>
				别急 · 黄金时间就是 5 分钟内
			</div>

			<div
				style={{
					position: 'absolute',
					bottom: 30,
					right: 30,
				}}
			>
				<Nurse
					speech="遇到别慌哦"
					size={220}
					bubbleColor="#F9A825"
					mood="warm"
					bubbleDelay={45}
				/>
			</div>
		</AbsoluteFill>
	);
};
