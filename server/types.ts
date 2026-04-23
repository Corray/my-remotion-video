export type JobStatus =
	| 'generating'
	| 'ready'
	| 'rendering'
	| 'rendered'
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
	createdAt: number;
	updatedAt: number;
};
