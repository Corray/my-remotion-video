import {expect, test} from '@playwright/test';

// Pure smoke test — does not require the studio to be running.
// Later tasks will add real e2e specs that launch the studio first.
test('playwright is wired up', () => {
	expect(1 + 1).toBe(2);
});
