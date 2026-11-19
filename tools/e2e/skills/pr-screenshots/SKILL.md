---
name: pr-screenshots
description: Capture screenshots of a frontend change in the running dev app and put them in the PR's "Screenshots" section. Use when opening or updating a frontend PR (pairs with the `pr-body` skill), or when the user asks for PR screenshots / "แคปจอใส่ PR". Writes a shot spec, runs `_tools/e2e/scripts/pr-shots.mjs` on the e2e browser host, uploads to the repo's `pr-assets` branch, and fills the PR body.
---

# pr-screenshots

Screenshots for a frontend PR body, taken from the real dev app (`E2E_BASE_URL` in
`_tools/e2e/.env`). Builds on `e2e-browser-verify` (browser host, sessions, re-login) - its rules
all apply. All commands below run with cwd = `_tools/e2e`.

## 1. Pick the shots (from the diff, not from memory)

- `git diff --stat <base>...HEAD` plus the PR body's "Changes by module": **one shot per
  user-visible module**, captioned with that module's name. Skip pure refactors, hooks,
  i18n-only and test files.
- Find each page's route in the app's router - do not guess URLs.
- Show the new state: open the tab/modal/menu the change lives in, with enough data that the
  feature is visible. Prefer `clip` on the card that changed when the page is mostly unrelated.
- Use the role that would really see it (a slug from `E2E_ROLES`).
- Ask the user if a shot needs data that does not exist on the dev env - do not create real
  records (mail sends, alerts, payments) just to make a screenshot.

## 2. Write the spec and shoot

The spec lives in a scratch dir (not committed). Format is documented at the top of
`scripts/pr-shots.mjs`:

```json
{ "pr": 42, "shots": [
  { "name": "settings-logo", "caption": "Settings - custom logo",
    "path": "/settings", "steps": [{ "click": "text=Layout" }],
    "waitFor": "text=Logo height", "clip": "css=.card >> nth=0" } ] }
```

```bash
node scripts/browser-host.mjs <role> /     # run in background, wait for READY
node scripts/pr-shots.mjs <spec.json>      # -> session-results/pr-<n>/NN-<name>.png + shots.json
```

- **Look at every PNG** before using it: wrong tab, spinner, empty table, open tooltip or a
  toast over the change = fix the spec and re-run. A `FAIL` line or exit 1 means that shot is
  missing; "session expired" = restart browser-host (it re-logs in).
- If a browser host is already running and you did not start it, it may be another agent's -
  ask before attaching.
- Language: the app's default locale; add a second-locale shot only if the change is
  locale-specific.
- Close the browser host when every shot is good (`pkill -TERM -f '^node scripts/browser-host'`).

## 3. Upload and fill the PR body

```bash
scripts/upload-shots.sh <repo-dir> session-results/pr-<n>   # prints Markdown
```

- **Ask before the first upload in a session**: it pushes to the shared orphan `pr-assets`
  branch (images only, git plumbing - the working tree and current branch are untouched). If the
  user says no, give them the folder path to drag the PNGs into the GitHub editor instead.
- Paste the printed Markdown into the PR body's `## Screenshots` section, rebuild the preview
  (`pr-body` skill), then `gh pr edit <n> --body-file <body.md>`.
- Images in a private repo render only for signed-in users with repo access - expected.
- Never screenshot real personal data, tokens or credentials - blur with a
  `{ "css": "table tbody td:nth-child(3) { filter: blur(6px) }" }` step, clip around it, or skip.
- A selector like `table tbody tr` as `waitFor` can match a row in a hidden tab panel and time
  out - wait on text only the target tab shows instead.
