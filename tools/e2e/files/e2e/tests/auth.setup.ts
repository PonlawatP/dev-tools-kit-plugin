import { test as setup } from '@playwright/test';
import * as path from 'path';
import { captureStep } from './utils/capture-step';
const { ROLES, AUTHENTICATED_PATH } = require('../roles.cjs');
const { login } = require('./login.cjs');

for (const role of ROLES) {
  setup(`authenticate as ${role.slug}`, async ({ page }, testInfo) => {
    // A role with no password yet is skipped, so placeholder roles do not break the whole run.
    setup.skip(!role.email || !role.password, `no credentials for "${role.slug}" in .env`);

    await login(page, role.email, role.password);
    await captureStep(page, testInfo, '01-login-submitted');
    await page.waitForURL((url) => url.pathname.startsWith(AUTHENTICATED_PATH), { timeout: 15000 });
    await captureStep(page, testInfo, '02-logged-in');

    await page.context().storageState({ path: path.resolve(__dirname, '..', '.auth', `${role.slug}.json`) });
    await page.waitForTimeout(1500); // let a human watching the headed browser see the final state
  });
}
