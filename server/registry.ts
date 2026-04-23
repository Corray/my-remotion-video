import fs from 'node:fs/promises';
import path from 'node:path';
import {GENERATED_DIR, GENERATED_INDEX} from './paths.js';

const HEADER = `// AUTO-GENERATED FILE - DO NOT EDIT BY HAND.
// Rewritten by server/registry.ts whenever a new composition is generated.
import type {ComponentType} from 'react';
`;

const TYPE_DEF = `
export type GeneratedComp = {
	id: string;
	component: ComponentType<Record<string, unknown>>;
	durationInFrames: number;
	fps: number;
	width: number;
	height: number;
};
`;

export async function rewriteGeneratedIndex(): Promise<void> {
	const entries = await fs.readdir(GENERATED_DIR, {withFileTypes: true});
	const tsxFiles = entries
		.filter((e) => e.isFile() && e.name.endsWith('.tsx'))
		.map((e) => e.name.replace(/\.tsx$/, ''))
		.sort();

	const imports = tsxFiles
		.map((jobId, i) => `import * as _mod${i} from './${jobId}';`)
		.join('\n');

	const items = tsxFiles
		.map(
			(_, i) =>
				`\t{id: _mod${i}.metadata.id, component: _mod${i}.Composition as ComponentType<Record<string, unknown>>, durationInFrames: _mod${i}.metadata.durationInFrames, fps: _mod${i}.metadata.fps, width: _mod${i}.metadata.width, height: _mod${i}.metadata.height},`,
		)
		.join('\n');

	const content = `${HEADER}${imports ? imports + '\n' : ''}${TYPE_DEF}
export const GENERATED_COMPS: GeneratedComp[] = [
${items}
];
`;

	await fs.writeFile(GENERATED_INDEX, content, 'utf8');
}

export async function writeGeneratedComposition(
	jobId: string,
	tsxContent: string,
): Promise<string> {
	const file = path.join(GENERATED_DIR, `${jobId}.tsx`);
	await fs.writeFile(file, tsxContent, 'utf8');
	await rewriteGeneratedIndex();
	return file;
}

export async function removeGeneratedComposition(jobId: string): Promise<void> {
	const file = path.join(GENERATED_DIR, `${jobId}.tsx`);
	try {
		await fs.unlink(file);
	} catch {
		/* ignore */
	}
	await rewriteGeneratedIndex();
}
