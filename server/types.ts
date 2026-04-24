export type JobStatus =
	| 'generating'
	| 'ready'
	| 'rendering'
	| 'rendered'
	| 'cancelled'
	| 'error';

export type AssetInfo = {
	originalName: string;
	filename: string;
	staticPath: string;
	mimeType: string;
	sizeBytes: number;
};

export type CompositionMeta = {
	durationInFrames: number;
	fps: number;
	width: number;
	height: number;
};

export type ConversationRole = 'user' | 'assistant';

export type ConversationTurn = {
	role: ConversationRole;
	content: string;
	tsxPath?: string;
	ts: number;
};

export type ErrorStage = 'provider' | 'compile' | 'filesystem' | 'internal';

type EventBase = {ts: number; turn: number};

export type StudioEvent =
	| (EventBase & {type: 'started'})
	| (EventBase & {
			type: 'done';
			meta: CompositionMeta;
			summary: string;
	  })
	| (EventBase & {type: 'cancelled'; by: 'user'})
	| (EventBase & {type: 'error'; stage: ErrorStage; message: string})
	| (EventBase & {type: 'thinking'; delta: string})
	| (EventBase & {type: 'token'; delta: string})
	| (EventBase & {type: 'tool_call_start'; name: string})
	| (EventBase & {type: 'tool_args_delta'; delta: string})
	| (EventBase & {type: 'tool_call_done'})
	| (EventBase & {
			type: 'compile_check';
			ok: boolean;
			errors?: string[];
	  })
	| (EventBase & {type: 'retry'; attempt: number; reason: string})
	| (EventBase & {type: 'tsx_written'; path: string})
	| (EventBase & {type: 'user_feedback'; content: string});

export const EVENT_RING_CAP = 500;

export type Job = {
	id: string;
	status: JobStatus;
	scene: string;
	assets: AssetInfo[];
	modelId?: string;
	attempts?: number;
	meta?: CompositionMeta;
	summary?: string;
	error?: string;
	renderProgress?: number;
	mp4Path?: string;
	conversation: ConversationTurn[];
	events: StudioEvent[];
	/** Monotonic count of events ever appended (NOT limited by ring cap). */
	eventsTotalCount: number;
	turn: number;
	createdAt: number;
	updatedAt: number;
};
