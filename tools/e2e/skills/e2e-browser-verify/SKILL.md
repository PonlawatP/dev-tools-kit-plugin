---
name: e2e-browser-verify
description: Verify a frontend change in the real running dev app with Playwright and the pre-authenticated role sessions in `_tools/e2e/.auth/`. Use whenever you need to confirm a UI change, reproduce a page crash or request loop, check tooltips/labels/filters, or take screenshots - before claiming a UI task is done. Covers session expiry (inline re-login), always saving the rotated session, and keeping one browser open for the whole check run instead of relaunching per check.
---

# e2e-browser-verify

Drive the running dev app as a real user with `_tools/e2e`. Base URL, roles and credentials
live in `_tools/e2e/.env`; the login form is described once in `_tools/e2e/tests/login.cjs`.
See `_tools/e2e/README.md` for the harness itself.

## Rules

1. **One browser for the whole check run.** Start it once with `scripts/browser-host.mjs` in the
   background, attach every check to it over CDP, and close it **only after every case you set
   out to verify is actually done.** Do not relaunch per check.
2. **Close it yourself when you are done.** Keeping it open for the user is a separate request.
3. **Sessions rotate.** Anything that loads `.auth/<role>.json` must save the new
   `storageState` back over the same file. `browser-host.mjs` does this every 15s and on SIGTERM.
4. **Expired session means log in inline, once.** Do not loop `npm run setup` and probe runs.
   Do not rely on the app redirecting back after login - `goto` the target page yourself.
   `browser-host.mjs` handles this.
5. **Someone else's browser.** If the CDP port is already in use, another agent may own that
   browser - ask before attaching or clicking.

## Flow

```bash
cd _tools/e2e
# 1. start once (run_in_background) and wait for the "READY <url>" line
node scripts/browser-host.mjs <role-slug> <target-path>
```

```js
// 2. each check: a throwaway .tmp.mjs inside _tools/e2e (so `playwright` resolves), delete after
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9333');
const p = b.contexts()[0].pages()[0];
p.setDefaultTimeout(8000); // fail fast instead of hanging to the shell timeout
// ... interact / assert / screenshot ...
process.exit(0); // detach only - never b.close() here
```

```bash
# 3. only after all cases pass (or you have reported what failed): close it (session is saved)
pkill -TERM -f '^node scripts/browser-host'
```

Anchor the pattern with `^node`. A bare `pkill -f scripts/browser-host.mjs` also matches the
shell running the command, because the pattern is in its command line, and kills it.

## Gotchas

- **CDP-attached pages have no `baseURL`.** Use absolute URLs.
- **Count requests to spot loops.** `p.on('request')` filtered on the API prefix, counted by
  method + path. The same query firing again and again usually means a render crash plus
  remount, so also collect `pageerror`.
- **Dev servers with HMR can serve a half-written file.** If a page throws `X is not defined`
  but the file on disk has the import, write each file in one go or `touch` it to re-transform.
- **Tooltips:** move the mouse away first and `scrollIntoViewIfNeeded` before hovering.
- Element screenshots can hang. Prefer `p.screenshot({ animations: 'disabled', timeout })` and
  `.catch()` it.

<!-- Project-specific gotchas (language switch, default landing page, ...) go below this line. -->
