import { defineConfig } from '@playwright/test';
import * as path from 'path';
const { ROLES, BASE_URL } = require('./roles.cjs');

// One `npx playwright test` invocation = one session with its own timestamped output dir, so
// videos/screenshots from different runs never overwrite each other. E2E_SESSION_LABEL adds a
// readable suffix: session-results/<timestamp>_<label>/.
// Playwright re-imports this file in every worker process; cache the timestamp in process.env
// (workers inherit it) so one invocation does not split across several directories.
const timestamp = process.env.E2E_SESSION_TIMESTAMP ?? new Date().toISOString().replace(/[:.]/g, '-');
process.env.E2E_SESSION_TIMESTAMP = timestamp;
const SESSION_LABEL = process.env.E2E_SESSION_LABEL ? `${timestamp}_${process.env.E2E_SESSION_LABEL}` : timestamp;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  outputDir: path.join(__dirname, 'session-results', SESSION_LABEL),
  use: { baseURL: BASE_URL, trace: 'retain-on-failure', video: 'on', headless: false },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // No `dependencies: ['setup']` on purpose: it would re-run every login on each run. Run
    // `npm run setup` once (or when a session expires); role projects reuse .auth/<role>.json.
    ...ROLES.map((r: { slug: string }) => ({ name: r.slug, use: { storageState: `.auth/${r.slug}.json` } }))
  ]
});
