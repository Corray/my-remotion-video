import {compileCheck, validateExports} from './compile-check.js';
import {getProvider} from './providers/index.js';
import type {GenerateInput, GenerateResult} from './providers/types.js';

export type GenerationAttempt = {
	attempt: number;
	ok: boolean;
	errors?: string[];
	tsxContent?: string;
};

export type GeneratedWithTrace = GenerateResult & {
	attempts: GenerationAttempt[];
};

function runChecks(tsx: string): string[] | null {
	const exportCheck = validateExports(tsx);
	if (!exportCheck.ok) return exportCheck.errors;
	const compile = compileCheck(tsx);
	if (!compile.ok) return compile.errors;
	return null;
}

export async function generateWithRetry(params: {
	modelId: string;
	input: Omit<GenerateInput, 'previousError' | 'previousAttempt'>;
	maxAttempts?: number;
}): Promise<GeneratedWithTrace> {
	const max = params.maxAttempts ?? 2;
	const registered = getProvider(params.modelId);
	if (!registered) {
		throw new Error(`未注册的模型: ${params.modelId}`);
	}

	const attempts: GenerationAttempt[] = [];
	let previousError: string | undefined;
	let previousAttempt: string | undefined;

	for (let i = 1; i <= max; i++) {
		const result = await registered.adapter(registered.entry, {
			...params.input,
			previousError,
			previousAttempt,
		});

		const errors = runChecks(result.tsxContent);
		if (!errors) {
			attempts.push({attempt: i, ok: true});
			return {...result, attempts};
		}

		attempts.push({
			attempt: i,
			ok: false,
			errors,
			tsxContent: result.tsxContent,
		});

		if (i === max) {
			throw new Error(
				`模型 ${params.modelId} 生成了 ${max} 次仍然编译不过。最后一次错误：\n${errors.join('\n')}`,
			);
		}

		previousError = errors.join('\n');
		previousAttempt = result.tsxContent;
	}

	throw new Error('unreachable');
}
