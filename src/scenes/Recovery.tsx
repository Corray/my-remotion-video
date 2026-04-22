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

const tips = [
	{emoji: '🧼', title: '保持清洁', detail: '避免伤口沾水沾污'},
	{emoji: '🌶️', title: '饮食清淡', detail: '少辛辣 · 少海鲜'},
	{emoji: '🥚', title: '补充蛋白', detail: '蛋 · 瘦肉 · 牛奶 利于修复'},
	{emoji: '☂️', title: '防晒防疤', detail: '新生皮肤避免暴晒 6 个月'},
];

export const Recovery: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const titleY = interpolate(frame, [0, 15], [-30, 0], {
		extrapolateRight: 'clamp',
	});
	const footerOpacity = interpolate(frame, [280, 320], [0, 1], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				background: 'linear-gradient(180deg, #E8F5E9 0%, #C8E6C9 100%)',
				fontFamily,
				flexDirection: 'column',
				alignItems: 'center',
				padding: '100px 60px',
				gap: 50,
			}}
		>
			<div
				style={{
					fontSize: 60,
					color: '#06A77D',
					fontWeight: 700,
					letterSpacing: 8,
					opacity: titleOpacity,
				}}
			>
				恢复期护理
			</div>

			<div
				style={{
					fontSize: 92,
					color: '#1a1a2e',
					fontWeight: 900,
					opacity: titleOpacity,
					transform: `translateY(${titleY}px)`,
					textAlign: 'center',
					letterSpacing: 4,
				}}
			>
				想不留疤 · 做好 4 件事
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(2, 1fr)',
					gap: 30,
					width: '100%',
				}}
			>
				{tips.map((t, i) => {
					const delay = 30 + i * 20;
					const scale = spring({
						frame: frame - delay,
						fps,
						config: {damping: 10, mass: 0.6},
					});
					return (
						<div
							key={t.title}
							style={{
								background: '#fff',
								borderRadius: 28,
								padding: '36px 24px',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: 14,
								boxShadow: '0 8px 24px rgba(6,167,125,0.15)',
								transform: `scale(${scale})`,
								border: '3px solid #A5D6A7',
							}}
						>
							<div style={{fontSize: 130, lineHeight: 1}}>{t.emoji}</div>
							<div
								style={{
									fontSize: 52,
									fontWeight: 900,
									color: '#06A77D',
								}}
							>
								{t.title}
							</div>
							<div
								style={{
									fontSize: 34,
									color: '#555',
									fontWeight: 600,
									textAlign: 'center',
									lineHeight: 1.35,
								}}
							>
								{t.detail}
							</div>
						</div>
					);
				})}
			</div>

			<div
				style={{
					fontSize: 50,
					color: '#06A77D',
					fontWeight: 800,
					textAlign: 'center',
					opacity: footerOpacity,
					letterSpacing: 3,
					marginTop: 10,
				}}
			>
				伤口红肿流脓 · 立即就医
			</div>
		</AbsoluteFill>
	);
};
