import React from 'react';
import {Composition} from 'remotion';
import {YoungCyclist} from './YoungCyclist';
import {Main, MAIN_DURATION_IN_FRAMES} from './Main';

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
				id="HelloWorld"
				component={YoungCyclist}
				durationInFrames={90}
				fps={30}
				width={1920}
				height={1080}
				defaultProps={{}}
			/>
		</>
	);
};
