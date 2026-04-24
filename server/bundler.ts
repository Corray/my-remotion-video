import path from 'node:path';
import fs from 'node:fs/promises';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {enableTailwind} from '@remotion/tailwind-v4';
import {OUT_DIR, REMOTION_ENTRY} from './paths.js';

let cachedServeUrl: string | null = null;
let bundlePromise: Promise<string> | null = null;

async function ensureBundle(): Promise<string> {
	if (cachedServeUrl) return cachedServeUrl;
	if (bundlePromise) return bundlePromise;

	bundlePromise = bundle({
		entryPoint: REMOTION_ENTRY,
		webpackOverride: enableTailwind,
	}).then((url) => {
		cachedServeUrl = url;
		bundlePromise = null;
		return url;
	});
	return bundlePromise;
}

export function invalidateBundle(): void {
	cachedServeUrl = null;
}

export async function renderComposition(params: {
	compositionId: string;
	jobId: string;
	onProgress: (progress: number) => void;
}): Promise<string> {
	await fs.mkdir(OUT_DIR, {recursive: true});

	// Bundle is invalidated whenever a new composition is generated (via jobs route),
	// so this rebuilds as needed.
	const serveUrl = await ensureBundle();

	const composition = await selectComposition({
		serveUrl,
		id: params.compositionId,
	});

	const outputLocation = path.join(OUT_DIR, `${params.jobId}.mp4`);

	await renderMedia({
		composition,
		serveUrl,
		codec: 'h264',
		outputLocation,
		onProgress: ({progress}) => {
			params.onProgress(progress);
		},
	});

	return outputLocation;
}
