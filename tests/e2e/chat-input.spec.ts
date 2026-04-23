import {expect, test} from '@playwright/test';

const STUDIO_UP = Boolean(process.env.E2E_STUDIO);

test.describe('ChatInput smoke (requires running studio)', () => {
	test.skip(!STUDIO_UP, 'Set E2E_STUDIO=1 with `npm run studio` running');

	test('has cancel and feedback textarea elements', async ({page}) => {
		await page.goto('/');
		await expect(page.getByTestId('cancel-btn')).toBeVisible();
		await expect(page.getByTestId('feedback-textarea')).toBeVisible();
	});

	test('cancel button is disabled when job is not generating', async ({
		page,
	}) => {
		await page.goto('/');
		await expect(page.getByTestId('cancel-btn')).toBeDisabled();
	});
});
