import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	test: {
		include: [
			'server/**/*.test.ts',
			'app/**/*.test.{ts,tsx}',
			'tests/**/*.test.{ts,tsx}',
		],
		exclude: ['**/node_modules/**', 'tests/e2e/**', '.worktrees/**'],
		// Per-file env via globs: React component tests get DOM, server tests stay node.
		environmentMatchGlobs: [
			['app/**/*.test.{ts,tsx}', 'happy-dom'],
			['tests/**/*.dom.test.{ts,tsx}', 'happy-dom'],
		],
	},
});
