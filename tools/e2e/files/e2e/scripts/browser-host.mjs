// Long-lived headed browser for ad-hoc verification of a running dev app.
//
// Usage (cwd = _tools/e2e):
//   node scripts/browser-host.mjs <role-slug> <target-path>     e.g. admin /settings
//
// - Opens ONE browser with CDP on :$E2E_CDP_PORT (default 9333) and keeps it open until killed.
// - If .auth/<role>.json has expired it logs in inline once (tests/login.cjs), then goes to
//   <target-path> itself - do not rely on the app redirecting back after login.
// - Refresh tokens often rotate on use, so the session is saved back over .auth/<role>.json
//   every 15s and on shutdown. Never load a session without saving it back.
//
// Check scripts attach instead of launching:
//   const b = await chromium.connectOverCDP('http://127.0.0.1:9333');
//   const p = b.contexts()[0].pages()[0];   // no baseURL here - use absolute URLs for goto
//   ...; process.exit(0);                     // detach only - do not call b.close()
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import roles from '../roles.cjs';
import auth from '../tests/login.cjs';

const CDP_PORT = Number(process.env.E2E_CDP_PORT || 9333);
const [slug, target = '/'] = process.argv.slice(2);
const account = slug && roles.role(slug);
if (!account) {
  console.error(`usage: node scripts/browser-host.mjs <role-slug> <target-path>  (roles: ${roles.ROLES.map((r) => r.slug).join(', ')})`);
  process.exit(1);
}
const authFile = path.resolve('.auth', `${slug}.json`);

const ctx = await chromium.launchPersistentContext(path.resolve('.auth', `.chrome-profile-${slug}`), {
  headless: false,
  baseURL: roles.BASE_URL,
  viewport: { width: 1600, height: 1000 },
  args: [`--remote-debugging-port=${CDP_PORT}`]
});
if (fs.existsSync(authFile)) await ctx.addCookies(JSON.parse(fs.readFileSync(authFile, 'utf8')).cookies);
const page = ctx.pages()[0] ?? (await ctx.newPage());
const save = () => ctx.storageState({ path: authFile }).catch(() => {});

await page.goto(target, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
if (auth.onLoginPage(page)) {
  console.log('session expired - logging in inline');
  await auth.login(page, account.email, account.password);
  await page.waitForURL((u) => !u.pathname.startsWith(auth.LOGIN_PATH), { timeout: 15000 });
  await page.goto(target, { waitUntil: 'domcontentloaded' });
}
await save();
console.log('READY', page.url(), `(CDP :${CDP_PORT})`);

setInterval(save, 15000);
const shutdown = async () => {
  await save();
  await ctx.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
