# Multi-account E2E harness

Standalone Playwright project (own `package.json`, outside the app repos) that logs in once per
role, saves each session as `.auth/<role>.json`, and records every run (video + step screenshots).

## Setup

```bash
cd _tools/e2e
npm install && npx playwright install chromium
cp .env.example .env      # set E2E_BASE_URL, E2E_ROLES and <ROLE>_EMAIL/_PASSWORD
```

Adapt `tests/login.cjs` to the app's real login form - it is the only file that knows it.

## Sessions

```bash
npm run setup                                  # log in every role, save .auth/<role>.json
npx playwright test --project=setup -g admin   # just one role
npx playwright test --project=admin            # run tests as a saved role
```

Run `setup` again only when a session has expired. Role projects reuse the saved files.

## Recordings

Each invocation writes to `session-results/<timestamp>[_<E2E_SESSION_LABEL>]/` (video always,
trace on failure, step screenshots via `captureStep(page, testInfo, 'NN-label')`).

## Ad-hoc checks in one long-lived browser

`node scripts/browser-host.mjs <role> <path>` keeps one headed browser open on CDP `:9333`,
re-logs in inline if needed, and saves the rotated session every 15s. See the
`e2e-browser-verify` skill for the attach/check/close flow.

## Credentials

`.env`, `.auth/` and `session-results/` are gitignored. Never commit them or paste credentials
into chat/PRs.
