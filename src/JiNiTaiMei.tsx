import React from 'react';
import {Series} from 'remotion';
import {JntmOpening} from './scenes/jntm/JntmOpening';
import {JntmTitle} from './scenes/jntm/JntmTitle';
import {JntmSing} from './scenes/jntm/JntmSing';
import {JntmDance} from './scenes/jntm/JntmDance';
import {JntmRap} from './scenes/jntm/JntmRap';
import {JntmBasketball} from './scenes/jntm/JntmBasketball';
import {JntmChicken} from './scenes/jntm/JntmChicken';
import {JntmBattle} from './scenes/jntm/JntmBattle';
import {JntmBaby} from './scenes/jntm/JntmBaby';
import {JntmOutro} from './scenes/jntm/JntmOutro';

const OPENING = 90;
const TITLE = 120;
const SING = 180;
const DANCE = 240;
const RAP = 180;
const BASKETBALL = 240;
const CHICKEN = 210;
const BATTLE = 240;
const BABY = 180;
const OUTRO = 120;

export const JINITAIMEI_DURATION_IN_FRAMES =
	OPENING +
	TITLE +
	SING +
	DANCE +
	RAP +
	BASKETBALL +
	CHICKEN +
	BATTLE +
	BABY +
	OUTRO;

export const JiNiTaiMei: React.FC = () => {
	return (
		<Series>
			<Series.Sequence durationInFrames={OPENING}>
				<JntmOpening />
			</Series.Sequence>
			<Series.Sequence durationInFrames={TITLE}>
				<JntmTitle />
			</Series.Sequence>
			<Series.Sequence durationInFrames={SING}>
				<JntmSing />
			</Series.Sequence>
			<Series.Sequence durationInFrames={DANCE}>
				<JntmDance />
			</Series.Sequence>
			<Series.Sequence durationInFrames={RAP}>
				<JntmRap />
			</Series.Sequence>
			<Series.Sequence durationInFrames={BASKETBALL}>
				<JntmBasketball />
			</Series.Sequence>
			<Series.Sequence durationInFrames={CHICKEN}>
				<JntmChicken />
			</Series.Sequence>
			<Series.Sequence durationInFrames={BATTLE}>
				<JntmBattle />
			</Series.Sequence>
			<Series.Sequence durationInFrames={BABY}>
				<JntmBaby />
			</Series.Sequence>
			<Series.Sequence durationInFrames={OUTRO}>
				<JntmOutro />
			</Series.Sequence>
		</Series>
	);
};
