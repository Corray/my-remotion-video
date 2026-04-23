import {expect, test} from '@playwright/test';

// Full end-to-end flow: 生成 → 观察 started → 中断 → 反馈 → 新轮 tsx_written → 渲染。
// Requires a running `npm run studio` + at least one model key configured.
// Gate with E2E_STUDIO so CI and unrelated test runs don't block on it.
const STUDIO_UP = Boolean(process.env.E2E_STUDIO);

test.describe('studio-chat full flow (requires running studio + model key)', () => {
	test.skip(!STUDIO_UP, 'Set E2E_STUDIO=1 with `npm run studio` running');

	test('generate → cancel → feedback → render', async ({page}) => {
		await page.goto('/');

		// 1) Submit an initial scene.
		await page
			.getByPlaceholder(/场景/)
			.fill('一个旋转的红色圆圈，总时长 5 秒');
		await page.getByRole('button', {name: /生成/}).click();

		// 2) Terminal should show activity (started line).
		await expect(
			page.getByTestId('terminal-line-started').first(),
		).toBeVisible({timeout: 30_000});

		// 3) Click cancel while generating.
		const cancelBtn = page.getByTestId('cancel-btn');
		await expect(cancelBtn).toBeEnabled({timeout: 30_000});
		await cancelBtn.click();

		// Status should flip to cancelled and a cancelled line should appear.
		await expect(page.getByTestId('terminal-line-cancelled')).toBeVisible({
			timeout: 30_000,
		});
		// Q2: scene text preserved on cancel.
		await expect(page.getByPlaceholder(/场景/)).toHaveValue(/圆圈/);

		// 4) Submit feedback.
		const feedbackTa = page.getByTestId('feedback-textarea');
		await feedbackTa.fill('改成蓝色背景');
		await page.getByTestId('feedback-send-btn').click();
		await expect(
			page.getByTestId('terminal-line-user_feedback').first(),
		).toBeVisible({timeout: 15_000});

		// 5) After feedback a new turn should produce tsx_written eventually.
		await expect(
			page.getByTestId('terminal-line-tsx_written').first(),
		).toBeVisible({timeout: 120_000});

		// 6) After 'ready', render button should become clickable.
		await expect(page.locator('.status.ready')).toBeVisible({
			timeout: 120_000,
		});
	});
});
