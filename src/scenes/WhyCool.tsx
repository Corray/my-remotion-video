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

export const WhyCool: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const titleScale = spring({frame, fps, config: {damping: 10}});
	const dropFloat = Math.sin(frame / 8) * 20;
	const explanationOpacity = interpolate(frame, [30, 55], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const explanationY = interpolate(frame, [30, 55], [40, 0], {
		extrapolateRight: 'clamp',
	});
	const conclusionOpacity = interpolate(frame, [150, 180], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const conclusionScale = spring({
		frame: frame - 150,
		fps,
		config: {damping: 10},
	});

	return (
		<AbsoluteFill
			style={{
				background:
					'linear-gradient(180deg, #0277BD 0%, #01579B 60%, #002F6C 100%)',
				fontFamily,
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'flex-start',
				padding: '100px 80px 60px',
				gap: 40,
			}}
		>
			<div
				style={{
					fontSize: 90,
					color: '#fff',
					fontWeight: 900,
					textAlign: 'center',
					transform: `scale(${titleScale})`,
					letterSpacing: 6,
				}}
			>
				来 听我说
			</div>

			<div
				style={{
					fontSize: 80,
					color: '#FFD23F',
					fontWeight: 800,
					textAlign: 'center',
					letterSpacing: 4,
				}}
			>
				为什么要冷水冲？
			</div>

			<div
				style={{
					fontSize: 260,
					transform: `translateY(${dropFloat}px)`,
					lineHeight: 1,
				}}
			>
				💧
			</div>

			<div
				style={{
					background: 'rgba(255,255,255,0.15)',
					padding: '36px 50px',
					borderRadius: 32,
					opacity: explanationOpacity,
					transform: `translateY(${explanationY}px)`,
					maxWidth: 900,
					border: '2px solid rgba(255,255,255,0.2)',
				}}
			>
				<div
					style={{
						fontSize: 44,
						color: '#fff',
						fontWeight: 600,
						lineHeight: 1.6,
						textAlign: 'center',
					}}
				>
					皮肤里的{' '}
					<span style={{color: '#FFD23F', fontWeight: 900}}>残余热量</span>
					<br />
					会继续往深层钻
					<br />
					<span style={{color: '#FF9B9B', fontWeight: 900}}>伤口还在加重</span>
				</div>
			</div>

			<div
				style={{
					fontSize: 56,
					color: '#FFD23F',
					fontWeight: 900,
					textAlign: 'center',
					opacity: conclusionOpacity,
					transform: `scale(${conclusionScale})`,
					letterSpacing: 6,
					marginTop: 10,
				}}
			>
				越快降温 · 损伤越小
			</div>

			<div
				style={{
					position: 'absolute',
					bottom: 30,
					left: 30,
				}}
			>
				<Nurse
					speech="别走开 马上就懂"
					size={220}
					bubbleColor="#FFD23F"
					mood="warm"
					bubbleDelay={20}
				/>
			</div>
		</AbsoluteFill>
	);
};
