import { Page, TestInfo } from '@playwright/test';

// Screenshots a meaningful step in a test. testInfo.outputPath() automatically nests inside that
// test's own subfolder of the current session's outputDir (session-results/<timestamp>/...) -
// so the screenshot lands right next to that test's auto-recorded video, no manual path plumbing.
export async function captureStep(page: Page, testInfo: TestInfo, label: string) {
  await page.screenshot({ path: testInfo.outputPath('steps', `${label}.png`), fullPage: true });
}
