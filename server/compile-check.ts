import ts from 'typescript';

export type CompileCheckResult =
	| {ok: true}
	| {ok: false; errors: string[]};

/**
 * Syntactic + lightweight semantic check on a generated TSX file.
 * Uses ts.transpileModule which parses and checks for syntactic diagnostics —
 * fast (single-digit ms) and catches most LLM mistakes: unclosed JSX, bad
 * imports, malformed expressions, stray commas, etc.
 */
export function compileCheck(tsxContent: string): CompileCheckResult {
	const result = ts.transpileModule(tsxContent, {
		compilerOptions: {
			jsx: ts.JsxEmit.Preserve,
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.ESNext,
			strict: false,
			isolatedModules: true,
		},
		reportDiagnostics: true,
	});

	const errors = (result.diagnostics ?? []).filter(
		(d) => d.category === ts.DiagnosticCategory.Error,
	);

	if (errors.length === 0) return {ok: true};

	const messages = errors.map((d) => {
		const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
		if (d.file && typeof d.start === 'number') {
			const {line, character} = d.file.getLineAndCharacterOfPosition(d.start);
			return `[${line + 1}:${character + 1}] ${msg}`;
		}
		return msg;
	});

	return {ok: false, errors: messages};
}

/**
 * Structural check: ensures the tsx actually exports `metadata` and
 * `Composition`, since transpile-level errors won't catch missing exports.
 */
export function validateExports(tsxContent: string): CompileCheckResult {
	const missing: string[] = [];
	if (!/export\s+const\s+metadata\s*[:=]/.test(tsxContent)) {
		missing.push('缺少 `export const metadata = {...}`');
	}
	if (
		!/export\s+const\s+Composition\s*[:=]/.test(tsxContent) &&
		!/export\s+function\s+Composition/.test(tsxContent)
	) {
		missing.push('缺少 `export const Composition` 或 `export function Composition`');
	}
	if (missing.length === 0) return {ok: true};
	return {ok: false, errors: missing};
}
