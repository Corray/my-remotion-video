import React from 'react';
import {Audio, interpolate, Series, staticFile} from 'remotion';
import {Intro} from './scenes/Intro';
import {CauseGrid} from './scenes/CauseGrid';
import {SectionTitle} from './scenes/SectionTitle';
import {DegreeCard, DegreeCardProps} from './scenes/DegreeCard';
import {WrongDetail, WrongDetailProps} from './scenes/WrongDetail';
import {WhyCool} from './scenes/WhyCool';
import {Step, StepProps} from './scenes/Step';
import {BlisterCare} from './scenes/BlisterCare';
import {SpecialCase, SpecialCaseProps} from './scenes/SpecialCase';
import {Recovery} from './scenes/Recovery';
import {Outro} from './scenes/Outro';

const degrees: DegreeCardProps[] = [
	{
		level: '一度烫伤',
		degreeNumber: 'I',
		emoji: '🟥',
		symptoms: ['皮肤发红 · 灼热', '轻微疼痛', '无水泡'],
		depth: '仅表皮层',
		severity: '轻',
		severityColor: '#F9A825',
		bgColor: '#FFF8E1',
		nurseSpeech: '这种最轻 别紧张',
		nurseMood: 'warm',
	},
	{
		level: '二度烫伤',
		degreeNumber: 'II',
		emoji: '🫧',
		symptoms: ['明显水泡', '剧烈疼痛', '皮肤红肿 · 渗液'],
		depth: '伤及真皮',
		severity: '中',
		severityColor: '#E67E22',
		bgColor: '#FFECB3',
		nurseSpeech: '别戳水泡哦',
		nurseMood: 'caring',
	},
	{
		level: '三度烫伤',
		degreeNumber: 'III',
		emoji: '⬛',
		symptoms: ['蜡白 / 焦黄 / 炭化', '痛觉反而减弱', '皮肤硬如皮革'],
		depth: '全层皮肤 + 皮下',
		severity: '重',
		severityColor: '#C62828',
		bgColor: '#FFCDD2',
		nurseSpeech: '立刻送医 别犹豫',
		nurseMood: 'urgent',
	},
];

const wrongs: WrongDetailProps[] = [
	{
		emoji: '🧴',
		name: '涂牙膏',
		reason: '粘附创面难清洗\n掩盖病情 · 增加感染',
		nurseSpeech: '这是老方法啦',
		nurseMood: 'concerned',
	},
	{
		emoji: '🍶',
		name: '抹酱油',
		reason: '高盐刺激创面\n容易感染 · 影响医生判断',
		nurseSpeech: '真不是偏方',
		nurseMood: 'concerned',
	},
	{
		emoji: '🧊',
		name: '敷冰块',
		reason: '已损伤皮肤会被冻伤\n让病情雪上加霜',
		nurseSpeech: '反而更伤哦',
		nurseMood: 'concerned',
	},
	{
		emoji: '👕',
		name: '强撕衣物',
		reason: '粘连的衣物会带下皮肤\n加重创伤 · 扩大面积',
		nurseSpeech: '千万要忍住',
		nurseMood: 'urgent',
	},
];

const steps: StepProps[] = [
	{
		number: 1,
		character: '冲',
		title: '冷水冲洗',
		tips: [
			'用流动的自来水，15-20 分钟',
			'水温 15-20℃ 最佳，别太冰',
			'带走皮肤里的余温',
		],
		emoji: '💧',
		accentColor: '#00B4D8',
		bgColor: '#E0F7FA',
		nurseSpeech: '先冲！别犹豫',
		nurseMood: 'warm',
	},
	{
		number: 2,
		character: '脱',
		title: '小心脱衣',
		tips: [
			'降温后再脱衣物',
			'衣物粘住皮肤：拿剪刀剪开',
			'千万别硬扯 会带下皮',
		],
		emoji: '👕',
		accentColor: '#F57C00',
		bgColor: '#FFF3E0',
		nurseSpeech: '慢一点 温柔点',
		nurseMood: 'caring',
	},
	{
		number: 3,
		character: '泡',
		title: '冷水浸泡',
		tips: [
			'泡在 15-20℃ 冷水里',
			'持续 10-30 分钟',
			'能止痛 能消肿',
		],
		emoji: '🪣',
		accentColor: '#06A77D',
		bgColor: '#E8F5E9',
		nurseSpeech: '深呼吸 坚持一下',
		nurseMood: 'caring',
	},
	{
		number: 4,
		character: '盖',
		title: '清洁覆盖',
		tips: [
			'用干净纱布或毛巾轻轻盖',
			'别涂任何药膏 / 食物',
			'避免伤口二次污染',
		],
		emoji: '🩹',
		accentColor: '#8E44AD',
		bgColor: '#F3E5F5',
		nurseSpeech: '轻轻盖 别压紧',
		nurseMood: 'caring',
	},
	{
		number: 5,
		character: '送',
		title: '及时就医',
		tips: [
			'面积大于手掌 · 立即送医',
			'水泡破溃 · 深度烫伤 · 送医',
			'儿童 / 面部 / 关节 · 送医',
		],
		emoji: '🚑',
		accentColor: '#E63946',
		bgColor: '#FFEBEE',
		nurseSpeech: '该去医院就去',
		nurseMood: 'urgent',
	},
];

const specials: SpecialCaseProps[] = [
	{
		emoji: '👶',
		tag: '特殊情况 1',
		title: '儿童烫伤',
		instructions: [
			'皮肤薄 · 同面积更严重',
			'照样先 "冲脱泡盖"',
			'面积 >5% · 一律送医',
			'警惕脱水和休克',
		],
		urgency: '尽快就医',
		accentColor: '#E91E63',
		bgColor: '#FCE4EC',
		nurseSpeech: '宝宝更要当心',
		nurseMood: 'caring',
	},
	{
		emoji: '🧪',
		tag: '特殊情况 2',
		title: '化学烫伤',
		instructions: [
			'大量清水冲 20-30 分钟',
			'别信所谓 "中和剂"',
			'戴上手套保护自己',
			'化学品标签一起带去医院',
		],
		urgency: '务必就医',
		accentColor: '#7B1FA2',
		bgColor: '#F3E5F5',
		nurseSpeech: '先保护好自己',
		nurseMood: 'urgent',
	},
	{
		emoji: '⚡',
		tag: '特殊情况 3',
		title: '电烫伤',
		instructions: [
			'先切断电源再救人',
			'表面轻 · 里面往往重',
			'可能伴有心律失常',
			'一律送医 · 做心电图',
		],
		urgency: '立即就医',
		accentColor: '#FF6F00',
		bgColor: '#FFF3E0',
		nurseSpeech: '千万先断电',
		nurseMood: 'urgent',
	},
];

const BGM_VOLUME = 0.12;
const FADE_IN_FRAMES = 45;
const FADE_OUT_FRAMES = 60;

export const Main: React.FC = () => {
	return (
		<>
			<Audio
				src={staticFile('bgm.mp3')}
				volume={(f) =>
					interpolate(
						f,
						[
							0,
							FADE_IN_FRAMES,
							MAIN_DURATION_IN_FRAMES - FADE_OUT_FRAMES,
							MAIN_DURATION_IN_FRAMES,
						],
						[0, BGM_VOLUME, BGM_VOLUME, 0],
						{extrapolateRight: 'clamp'},
					)
				}
			/>
			<Series>
			<Series.Sequence durationInFrames={150}>
				<Intro />
			</Series.Sequence>

			<Series.Sequence durationInFrames={240}>
				<CauseGrid />
			</Series.Sequence>

			<Series.Sequence durationInFrames={90}>
				<SectionTitle
					prefix="咱先来"
					title={'看看这伤\n有多重'}
					accentColor="#F9A825"
					bgColor="#FFFDE7"
					nurseSpeech="别慌 先看伤"
					nurseMood="caring"
				/>
			</Series.Sequence>
			{degrees.map((d) => (
				<Series.Sequence key={d.degreeNumber} durationInFrames={180}>
					<DegreeCard {...d} />
				</Series.Sequence>
			))}

			<Series.Sequence durationInFrames={90}>
				<SectionTitle
					prefix="说点真心话"
					title={'这些土方法\n咱真别信'}
					accentColor="#D32F2F"
					bgColor="#FFEBEE"
					nurseSpeech="坑过不少人"
					nurseMood="concerned"
				/>
			</Series.Sequence>
			{wrongs.map((w) => (
				<Series.Sequence key={w.name} durationInFrames={150}>
					<WrongDetail {...w} />
				</Series.Sequence>
			))}

			<Series.Sequence durationInFrames={240}>
				<WhyCool />
			</Series.Sequence>

			<Series.Sequence durationInFrames={90}>
				<SectionTitle
					prefix="划重点啦"
					title={'5 步急救法\n冲 脱 泡 盖 送'}
					accentColor="#00B4D8"
					bgColor="#E0F7FA"
					nurseSpeech="跟我一起记"
					nurseMood="cheer"
				/>
			</Series.Sequence>
			{steps.map((s) => (
				<Series.Sequence key={s.number} durationInFrames={450}>
					<Step {...s} />
				</Series.Sequence>
			))}

			<Series.Sequence durationInFrames={300}>
				<BlisterCare />
			</Series.Sequence>

			<Series.Sequence durationInFrames={90}>
				<SectionTitle
					prefix="还有这几种"
					title={'碰到这些\n要特别注意'}
					accentColor="#7B1FA2"
					bgColor="#F3E5F5"
					nurseSpeech="这几种要留心"
					nurseMood="urgent"
				/>
			</Series.Sequence>
			{specials.map((s) => (
				<Series.Sequence key={s.title} durationInFrames={300}>
					<SpecialCase {...s} />
				</Series.Sequence>
			))}

			<Series.Sequence durationInFrames={360}>
				<Recovery />
			</Series.Sequence>

			<Series.Sequence durationInFrames={300}>
				<Outro />
			</Series.Sequence>
			</Series>
		</>
	);
};

const introDuration = 150;
const causeDuration = 240;
const degreesDuration = 90 + degrees.length * 180;
const wrongsDuration = 90 + wrongs.length * 150;
const whyCoolDuration = 240;
const stepsDuration = 90 + steps.length * 450;
const blisterDuration = 300;
const specialsDuration = 90 + specials.length * 300;
const recoveryDuration = 360;
const outroDuration = 300;

export const MAIN_DURATION_IN_FRAMES =
	introDuration +
	causeDuration +
	degreesDuration +
	wrongsDuration +
	whyCoolDuration +
	stepsDuration +
	blisterDuration +
	specialsDuration +
	recoveryDuration +
	outroDuration;
