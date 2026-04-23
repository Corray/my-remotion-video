import {expect, test} from '@playwright/test';

// Full end-to-end is verified in tests/e2e/studio-chat-flow.spec.ts (T203).
// This file is intentionally scoped to a smoke check against a running studio
// so we can gate it with test.describe.skip when the server is not up.
const STUDIO_UP = Boolean(process.env.E2E_STUDIO);

test.describe('TerminalPanel smoke (requires running studio)', () => {
	test.skip(!STUDIO_UP, 'Set E2E_STUDIO=1 with `npm run studio` running');

	test('terminal panel is mounted on the page', async ({page}) => {
		await page.goto('/');
		await expect(page.getByTestId('terminal-panel')).toBeVisible();
	});

	test("after generate click, terminal shows 'started' event line", async ({
		page,
	}) => {
		await page.goto('/');
		await page
			.getByPlaceholder(/场景/)
			.fill('一个旋转的红色圆圈，5 秒');
		await page.getByRole('button', {name: '生成'}).click();
		await expect(
			page.getByTestId('terminal-line-started').first(),
		).toBeVisible({timeout: 30_000});
	});
});
