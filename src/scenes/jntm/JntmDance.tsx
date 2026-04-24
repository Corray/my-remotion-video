import React from 'react';
import {
	AbsoluteFill,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

const fontFamily =
	'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

const POSES = ['💃', '🕺', '🤸', '🕺', '💃', '🤾', '🕺', '💃'];

export const JntmDance: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const labelS = spring({frame, fps, config: {damping: 9}});
	const poseIdx = Math.floor(frame / 20) % POSES.length;
	const pose = POSES[poseIdx];

	const jump = Math.abs(Math.sin(frame / 4)) * 60;
	const tilt = Math.sin(frame / 6) * 12;
	const bgHue = (frame * 3) % 360;

	return (
		<AbsoluteFill
			style={{
				background: `linear-gradient(135deg, hsl(${bgHue},80%,50%) 0%, hsl(${(bgHue + 60) % 360},80%,30%) 100%)`,
				fontFamily,
				overflow: 'hidden',
			}}
		>
			<AbsoluteFill
				style={{
					alignItems: 'center',
					justifyContent: 'center',
					flexDirection: 'column',
					gap: 30,
				}}
			>
				<div
					style={{
						fontSize: 50,
						fontWeight: 900,
						color: '#fff',
						background: 'rgba(0,0,0,0.3)',
						padding: '14px 40px',
						borderRadius: 40,
						letterSpacing: 6,
						marginBottom: 20,
					}}
				>
					🎶 打 · 篮 · 球 · 的 · 时 · 间 🎶
				</div>

				<div
					style={{
						fontSize: 520,
						transform: `translateY(${-jump}px) rotate(${tilt}deg)`,
						filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))',
					}}
				>
					{pose}
				</div>

				<div
					style={{
						fontSize: 240,
						fontWeight: 900,
						color: '#fff',
						transform: `scale(${labelS})`,
						letterSpacing: 30,
						textShadow:
							'0 0 50px rgba(255,255,255,0.6), 0 10px 0 #FF3A94, 0 20px 0 rgba(0,0,0,0.3)',
					}}
				>
					跳
				</div>

				<div
					style={{
						display: 'flex',
						gap: 30,
						fontSize: 90,
						opacity: labelS,
					}}
				>
					<span style={{transform: `rotate(${tilt}deg)`}}>✨</span>
					<span style={{transform: `translateY(${-jump / 3}px)`}}>⭐</span>
					<span style={{transform: `rotate(${-tilt}deg)`}}>✨</span>
				</div>
			</AbsoluteFill>

			{/* floor reflection */}
			<div
				style={{
					position: 'absolute',
					bottom: 0,
					left: 0,
					right: 0,
					height: 200,
					background:
						'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)',
				}}
			/>
		</AbsoluteFill>
	);
};
