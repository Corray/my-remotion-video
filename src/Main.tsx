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
	},
];

const wrongs: WrongDetailProps[] = [
	{
		emoji: '🧴',
		name: '涂牙膏',
		reason: '粘附创面难清洗\n掩盖病情 · 增加感染',
	},
	{
		emoji: '🍶',
		name: '抹酱油',
		reason: '高盐刺激创面\n容易感染 · 影响医生判断',
	},
	{
		emoji: '🧊',
		name: '敷冰块',
		reason: '已损伤皮肤会被冻伤\n让病情雪上加霜',
	},
	{
		emoji: '👕',
		name: '强撕衣物',
		reason: '粘连的衣物会带下皮肤\n加重创伤 · 扩大面积',
	},
];

const steps: StepProps[] = [
	{
		number: 1,
		character: '冲',
		title: '冷水冲洗',
		tips: [
			'用流动的自来水，15-20 分钟',
			'水温 15-20℃ 最佳，不要过冷',
			'目的：带走皮肤残余热量',
		],
		emoji: '💧',
		accentColor: '#00B4D8',
		bgColor: '#E0F7FA',
	},
	{
		number: 2,
		character: '脱',
		title: '小心脱衣',
		tips: [
			'冲洗降温后再脱衣物',
			'衣物粘住皮肤：用剪刀剪开',
			'绝不强行撕扯，防止皮肤撕脱',
		],
		emoji: '👕',
		accentColor: '#F57C00',
		bgColor: '#FFF3E0',
	},
	{
		number: 3,
		character: '泡',
		title: '冷水浸泡',
		tips: [
			'浸泡在 15-20℃ 冷水中',
			'持续 10-30 分钟',
			'目的：缓解疼痛 · 减轻肿胀',
		],
		emoji: '🪣',
		accentColor: '#06A77D',
		bgColor: '#E8F5E9',
	},
	{
		number: 4,
		character: '盖',
		title: '清洁覆盖',
		tips: [
			'用干净纱布或毛巾覆盖',
			'不要涂抹任何药膏 / 食物',
			'避免伤口二次污染',
		],
		emoji: '🩹',
		accentColor: '#8E44AD',
		bgColor: '#F3E5F5',
	},
	{
		number: 5,
		character: '送',
		title: '及时就医',
		tips: [
			'面积大于手掌 · 立即送医',
			'水泡破溃 · 深度烫伤 · 送医',
			'儿童 / 面部 / 关节烫伤 · 送医',
		],
		emoji: '🚑',
		accentColor: '#E63946',
		bgColor: '#FFEBEE',
	},
];

const specials: SpecialCaseProps[] = [
	{
		emoji: '👶',
		tag: '特殊情况 1',
		title: '儿童烫伤',
		instructions: [
			'皮肤薄 · 同面积损伤更重',
			'照样先 "冲脱泡盖"',
			'面积 >5% · 一律送医',
			'警惕脱水和休克',
		],
		urgency: '尽快就医',
		accentColor: '#E91E63',
		bgColor: '#FCE4EC',
	},
	{
		emoji: '🧪',
		tag: '特殊情况 2',
		title: '化学烫伤',
		instructions: [
			'大量清水持续冲 20-30 分钟',
			'不要用所谓 "中和剂"',
			'注意保护自己不要接触',
			'带上化学品标签一起就医',
		],
		urgency: '务必就医',
		accentColor: '#7B1FA2',
		bgColor: '#F3E5F5',
	},
	{
		emoji: '⚡',
		tag: '特殊情况 3',
		title: '电烫伤',
		instructions: [
			'先切断电源再施救',
			'表面轻 · 内部往往重',
			'可能伴有心律失常',
			'一律送医 · 做心电图',
		],
		urgency: '立即就医',
		accentColor: '#FF6F00',
		bgColor: '#FFF3E0',
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
					prefix="第 一 步"
					title={'先判断\n烫伤程度'}
					accentColor="#F9A825"
					bgColor="#FFFDE7"
					nurseSpeech="别慌 先判断"
				/>
			</Series.Sequence>
			{degrees.map((d) => (
				<Series.Sequence key={d.degreeNumber} durationInFrames={180}>
					<DegreeCard {...d} />
				</Series.Sequence>
			))}

			<Series.Sequence durationInFrames={90}>
				<SectionTitle
					prefix="重 要 提 醒"
					title={'这些土方法\n千万别用'}
					accentColor="#D32F2F"
					bgColor="#FFEBEE"
					nurseSpeech="坑了不少人！"
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
					prefix="正 确 的"
					title={'5 步急救法\n冲 脱 泡 盖 送'}
					accentColor="#00B4D8"
					bgColor="#E0F7FA"
					nurseSpeech="跟我一起记！"
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
					prefix="不 一 样 的"
					title={'特殊情况\n特殊处理'}
					accentColor="#7B1FA2"
					bgColor="#F3E5F5"
					nurseSpeech="这几种要注意"
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
