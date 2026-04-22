import React from 'react';
import {
	Easing,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

export const YoungCyclist: React.FC = () => {
	const frame = useCurrentFrame();
	const {durationInFrames, width, height} = useVideoConfig();

	const progress = frame / durationInFrames;

	// 水平位移：从左到右穿过画面
	const cyclistX = interpolate(
		progress,
		[0, 1],
		[-400, width + 200],
		Easing.inOut(Easing.quad)
	);

	// 上下轻微起伏（模拟踩踏）
	const bobbing = interpolate(
		Math.sin(progress * Math.PI * 4),
		[-1, 1],
		[-20, 20]
	);

	// 车轮旋转
	const wheelRotation = interpolate(frame, [0, durationInFrames], [0, 360 * 4]);

	const containerStyle: React.CSSProperties = {
		flex: 1,
		background: 'linear-gradient(to top, #87CEEB 0%, #E0F5FF 50%, #FFFFFF 100%)',
		overflow: 'hidden',
	};

	const roadStyle: React.CSSProperties = {
		position: 'absolute',
		bottom: 0,
		left: 0,
		width: '100%',
		height: height * 0.25,
		background: 'linear-gradient(to bottom, #555555, #333333)',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
	};

	const roadLineStyle: React.CSSProperties = {
		width: '100%',
		height: 6,
		backgroundImage:
			'linear-gradient(to right, #ffffff 30%, rgba(255,255,255,0) 0%)',
		backgroundSize: '40px 6px',
		backgroundRepeat: 'repeat-x',
		opacity: 0.8,
	};

	const cyclistWrapperStyle: React.CSSProperties = {
		position: 'absolute',
		bottom: height * 0.25,
		transform: `translate(${cyclistX}px, ${bobbing}px)`,
		transformOrigin: 'center bottom',
	};

	const bikeStyle: React.CSSProperties = {
		position: 'relative',
		width: 260,
		height: 180,
	};

	const wheelStyle: React.CSSProperties = {
		position: 'absolute',
		bottom: 0,
		width: 80,
		height: 80,
		borderRadius: '50%',
		border: '6px solid #111111',
		boxSizing: 'border-box',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
	};

	const wheelInnerStyle: React.CSSProperties = {
		width: 50,
		height: 50,
		borderRadius: '50%',
		border: '4px dashed #cccccc',
		transform: `rotate(${wheelRotation}deg)`,
		transition: 'transform 0.1s linear',
	};

	const frameBarStyle: React.CSSProperties = {
		position: 'absolute',
		left: 40,
		bottom: 60,
		width: 160,
		height: 8,
		backgroundColor: '#1E88E5',
		borderRadius: 4,
	};

	const frameDownTubeStyle: React.CSSProperties = {
		position: 'absolute',
		left: 120,
		bottom: 60,
		width: 8,
		height: 70,
		backgroundColor: '#1E88E5',
		transform: 'skewX(-15deg)',
		borderRadius: 4,
	};

	const seatTubeStyle: React.CSSProperties = {
		position: 'absolute',
		left: 110,
		bottom: 80,
		width: 8,
		height: 60,
		backgroundColor: '#1E88E5',
		transform: 'skewX(10deg)',
		borderRadius: 4,
	};

	const handleBarStyle: React.CSSProperties = {
		position: 'absolute',
		right: 40,
		bottom: 110,
		width: 60,
		height: 8,
		backgroundColor: '#1E88E5',
		borderRadius: 4,
	};

	const seatStyle: React.CSSProperties = {
		position: 'absolute',
		left: 100,
		bottom: 140,
		width: 60,
		height: 10,
		backgroundColor: '#424242',
		borderRadius: 6,
	};

	const pedalCrankStyle: React.CSSProperties = {
		position: 'absolute',
		left: 120,
		bottom: 70,
		width: 40,
		height: 4,
		backgroundColor: '#424242',
		transformOrigin: 'left center',
		transform: `rotate(${wheelRotation}deg)`,
	};

	const pedalStyle: React.CSSProperties = {
		position: 'absolute',
		right: -8,
		top: -6,
		width: 16,
		height: 12,
		backgroundColor: '#424242',
		borderRadius: 4,
	};

	// 简单的人物（青年）
	const bodyStyle: React.CSSProperties = {
		position: 'absolute',
		left: 120,
		bottom: 140,
		width: 18,
		height: 60,
		backgroundColor: '#1976D2',
		borderRadius: 10,
	};

	const headStyle: React.CSSProperties = {
		position: 'absolute',
		left: 114,
		bottom: 200,
		width: 30,
		height: 30,
		backgroundColor: '#FFCC80',
		borderRadius: '50%',
		boxShadow: '0 4px 0 rgba(0,0,0,0.15)',
	};

	const armStyle: React.CSSProperties = {
		position: 'absolute',
		left: 135,
		bottom: 165,
		width: 70,
		height: 6,
		backgroundColor: '#FFCC80',
		borderRadius: 4,
		transformOrigin: 'left center',
		transform: 'rotate(-10deg)',
	};

	const legAngle = interpolate(
		Math.sin(progress * Math.PI * 4),
		[-1, 1],
		[25, -25]
	);

	const frontLegStyle: React.CSSProperties = {
		position: 'absolute',
		left: 120,
		bottom: 120,
		width: 70,
		height: 8,
		backgroundColor: '#1976D2',
		borderRadius: 4,
		transformOrigin: 'left center',
		transform: `rotate(${legAngle}deg)`,
	};

	const backLegStyle: React.CSSProperties = {
		position: 'absolute',
		left: 118,
		bottom: 120,
		width: 70,
		height: 8,
		backgroundColor: '#1565C0',
		borderRadius: 4,
		transformOrigin: 'left center',
		transform: `rotate(${legAngle - 20}deg)`,
	};

	const hairStyle: React.CSSProperties = {
		position: 'absolute',
		left: 112,
		bottom: 208,
		width: 34,
		height: 20,
		backgroundColor: '#424242',
		borderRadius: '16px 16px 8px 8px',
	};

	return (
		<div style={containerStyle}>
			{/* 简单的远景城市轮廓 */}
			<svg
				width={width}
				height={height}
				style={{position: 'absolute', bottom: height * 0.25, left: 0}}
			>
				<rect x="80" y="120" width="120" height="200" fill="#B0BEC5" />
				<rect x="260" y="80" width="100" height="240" fill="#CFD8DC" />
				<rect x="420" y="140" width="150" height="180" fill="#B0BEC5" />
				<rect x="620" y="110" width="110" height="210" fill="#CFD8DC" />
				<rect x="780" y="130" width="130" height="190" fill="#B0BEC5" />
			</svg>

			<div style={roadStyle}>
				<div style={roadLineStyle} />
			</div>

			<div style={cyclistWrapperStyle}>
				<div style={bikeStyle}>
					{/* 车轮 */}
					<div style={{...wheelStyle, left: 0}}>
						<div style={wheelInnerStyle} />
					</div>
					<div style={{...wheelStyle, right: 0}}>
						<div style={wheelInnerStyle} />
					</div>

					{/* 车架 */}
					<div style={frameBarStyle} />
					<div style={frameDownTubeStyle} />
					<div style={seatTubeStyle} />
					<div style={handleBarStyle} />
					<div style={seatStyle} />

					{/* 踏板曲柄 */}
					<div style={pedalCrankStyle}>
						<div style={pedalStyle} />
					</div>

					{/* 人物 */}
					<div style={bodyStyle} />
					<div style={headStyle} />
					<div style={hairStyle} />
					<div style={armStyle} />
					<div style={backLegStyle} />
					<div style={frontLegStyle} />
				</div>
			</div>
		</div>
	);
};
