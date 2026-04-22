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

const chars = ['冲', '脱', '泡', '盖', '送'];
const colors = ['#00B4D8', '#FFB703', '#06A77D', '#8E44AD', '#E63946'];

export const Outro: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const titleY = interpolate(frame, [0, 20], [60, 0], {
		extrapolateRight: 'clamp',
	});
	const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const sloganOpacity = interpolate(frame, [120, 150], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const disclaimerOpacity = interpolate(frame, [200, 240], [0, 1], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				background:
					'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
				fontFamily,
			}}
		>
			<AbsoluteFill
				style={{
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'flex-start',
					padding: '120px 60px 60px',
					gap: 50,
				}}
			>
				<div
					style={{
						fontSize: 72,
						color: '#fff',
						fontWeight: 700,
						opacity: titleOpacity,
						transform: `translateY(${titleY}px)`,
						letterSpacing: 8,
					}}
				>
					记住这 5 个字
				</div>

				<div style={{display: 'flex', gap: 12}}>
					{chars.map((c, i) => {
						const scale = spring({
							frame: frame - i * 6 - 15,
							fps,
							config: {damping: 9, mass: 0.6},
						});
						return (
							<div
								key={c}
								style={{
									width: 175,
									height: 225,
									borderRadius: 28,
									background: colors[i],
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: 145,
									fontWeight: 900,
									color: '#fff',
									transform: `scale(${scale})`,
									boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
								}}
							>
								{c}
							</div>
						);
					})}
				</div>

				<div
					style={{
						fontSize: 68,
						color: '#FFD23F',
						fontWeight: 900,
						textAlign: 'center',
						opacity: sloganOpacity,
						letterSpacing: 6,
						marginTop: 20,
					}}
				>
					正确处理 · 不留疤痕
				</div>

				<div
					style={{
						background: 'rgba(255,255,255,0.08)',
						borderRadius: 24,
						padding: '24px 40px',
						opacity: disclaimerOpacity,
						maxWidth: 900,
						marginTop: 10,
					}}
				>
					<div
						style={{
							fontSize: 34,
							color: '#bbb',
							fontWeight: 500,
							lineHeight: 1.55,
							textAlign: 'center',
						}}
					>
						本视频仅供科普参考
						<br />
						严重烫伤请立即就医 · 不要延误
					</div>
				</div>
			</AbsoluteFill>

			<div style={{position: 'absolute', bottom: 40, left: 40}}>
				<Nurse
					speech="照着做就对啦！"
					size={320}
					bubbleColor="#FFD23F"
				/>
			</div>
		</AbsoluteFill>
	);
};
