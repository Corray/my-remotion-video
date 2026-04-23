import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	testMatch: /.*\.spec\.ts$/,
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: {...devices['Desktop Chrome']},
		},
	],
	// The studio is launched by `npm run studio` during local E2E.
	// Later tasks (T203) will add `webServer` to auto-spawn it; for T000 we
	// don't start anything so the smoke test can run without the studio.
});
