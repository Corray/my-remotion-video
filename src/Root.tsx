import React from 'react';
import {Composition} from 'remotion';
import {YoungCyclist} from './YoungCyclist';
import {Main, MAIN_DURATION_IN_FRAMES} from './Main';
import {JiNiTaiMei, JINITAIMEI_DURATION_IN_FRAMES} from './JiNiTaiMei';
import {GENERATED_COMPS} from './generated';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="ScaldCare"
				component={Main}
				durationInFrames={MAIN_DURATION_IN_FRAMES}
				fps={30}
				width={1080}
				height={1920}
			/>
			<Composition
				id="JiNiTaiMei"
				component={JiNiTaiMei}
				durationInFrames={JINITAIMEI_DURATION_IN_FRAMES}
				fps={30}
				width={1080}
				height={1920}
			/>
			<Composition
				id="HelloWorld"
				component={YoungCyclist}
				durationInFrames={90}
				fps={30}
				width={1920}
				height={1080}
				defaultProps={{}}
			/>
			{GENERATED_COMPS.map((c) => (
				<Composition
					key={c.id}
					id={c.id}
					component={c.component}
					durationInFrames={c.durationInFrames}
					fps={c.fps}
					width={c.width}
					height={c.height}
				/>
			))}
		</>
	);
};
