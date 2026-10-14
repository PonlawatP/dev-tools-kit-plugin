import { test, expect } from '@playwright/test';
import { captureStep } from './utils/capture-step';
const { SMOKE_PATH } = require('../roles.cjs');

// Proves a role's saved storageState still authenticates: a protected page must not bounce to login.
test('reused session stays authenticated on a protected route', async ({ page }, testInfo) => {
  await page.goto(SMOKE_PATH);
  await captureStep(page, testInfo, '01-protected-page');
  await expect(page).not.toHaveURL(/\/login/);
  await page.waitForTimeout(1500);
});
