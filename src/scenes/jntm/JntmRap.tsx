import React from 'react';
import {
	AbsoluteFill,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

const fontFamily =
	'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

const LYRICS = [
	'Oh baby baby baby',
	'Oh baby baby baby',
	'你干嘛 哎哟',
	'I was you baby',
];

export const JntmRap: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const labelS = spring({frame, fps, config: {damping: 9}});
	const beat = Math.abs(Math.sin(frame / 3));
	const shake = Math.sin(frame / 2) * 8;

	const lyricIdx = Math.min(Math.floor(frame / 42), LYRICS.length - 1);
	const lyric = LYRICS[lyricIdx];

	return (
		<AbsoluteFill
			style={{
				background:
					'linear-gradient(45deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
				fontFamily,
				overflow: 'hidden',
			}}
		>
			{/* beat flashes */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: 'rgba(255,58,148,0.2)',
					opacity: beat,
				}}
			/>

			{/* equalizer bars */}
			<div
				style={{
					position: 'absolute',
					bottom: 0,
					left: 0,
					right: 0,
					height: 300,
					display: 'flex',
					alignItems: 'flex-end',
					justifyContent: 'center',
					gap: 12,
					padding: '0 60px',
				}}
			>
				{Array.from({length: 24}).map((_, i) => {
					const h =
						40 +
						Math.abs(Math.sin((frame + i * 7) / 5)) * 220 +
						Math.abs(Math.cos((frame + i * 11) / 4)) * 60;
					return (
						<div
							key={i}
							style={{
								width: 28,
								height: h,
								background: `linear-gradient(180deg, #FFD23F 0%, #FF3A94 50%, #7209B7 100%)`,
								borderRadius: 4,
								boxShadow: '0 0 15px rgba(255,58,148,0.6)',
							}}
						/>
					);
				})}
			</div>

			<AbsoluteFill
				style={{
					alignItems: 'center',
					justifyContent: 'center',
					flexDirection: 'column',
					gap: 50,
					paddingBottom: 350,
				}}
			>
				<div
					style={{
						fontSize: 380,
						transform: `scale(${1 + beat * 0.15}) rotate(${shake}deg)`,
						filter: 'drop-shadow(0 0 40px rgba(255,210,63,0.8))',
					}}
				>
					🎙️
				</div>

				<div
					style={{
						fontSize: 240,
						fontWeight: 900,
						color: '#FFD23F',
						transform: `scale(${labelS})`,
						letterSpacing: 40,
						textShadow: '0 0 50px rgba(255,210,63,0.8), 0 10px 0 #B5179E',
					}}
				>
					RAP
				</div>

				<div
					style={{
						fontSize: 58,
						color: '#fff',
						fontWeight: 900,
						padding: '16px 48px',
						background: 'rgba(255,58,148,0.3)',
						borderRadius: 20,
						letterSpacing: 3,
						transform: `translateX(${shake}px)`,
						border: '2px solid rgba(255,255,255,0.4)',
					}}
					key={lyricIdx}
				>
					♪ {lyric} ♪
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
