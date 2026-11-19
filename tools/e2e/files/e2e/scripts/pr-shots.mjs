// Take the screenshots for a PR's "Screenshots" section from a JSON spec.
// Attaches to the running browser-host (CDP :$E2E_CDP_PORT, default 9333) - start that first.
//
// Usage (cwd = _tools/e2e):  node scripts/pr-shots.mjs <spec.json>
//
// spec.json:
// {
//   "pr": 42,                                       // output dir = session-results/pr-<pr>/
//   "viewport": { "width": 1600, "height": 1000 },  // optional
//   "shots": [
//     { "name": "settings-logo", "caption": "Settings - custom logo",
//       "path": "/settings",                        // app path, joined to E2E_BASE_URL
//       "steps": [ { "click": "text=Layout" }, { "wait": 800 } ],  // optional, run in order
//       "waitFor": "text=Logo height",              // optional selector to wait for before the shot
//       "clip": "css=.card >> nth=0",               // optional: shoot one element instead of the page
//       "fullPage": false }
//   ]
// }
// Steps: {click|hover: sel} {fill: [sel, value]} {press: key} {wait: ms} {goto: path}
//        {css: "..."} - inject a style, e.g. blur personal data: "td:nth-child(3) { filter: blur(6px) }"
// Writes <NN>-<name>.png plus shots.json (name, caption, file) for upload-shots.sh.
// A shot whose page lands on E2E_LOGIN_PATH (default /login) fails as "session expired".
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import roles from '../roles.cjs';

const CDP_PORT = Number(process.env.E2E_CDP_PORT || 9333);
const LOGIN_PATH = process.env.E2E_LOGIN_PATH || '/login';
const specFile = process.argv[2];
if (!specFile) {
  console.error('usage: node scripts/pr-shots.mjs <spec.json>');
  process.exit(1);
}
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const outDir = path.resolve('session-results', `pr-${spec.pr ?? 'draft'}`);
fs.mkdirSync(outDir, { recursive: true });

const b = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
const p = b.contexts()[0].pages()[0];
p.setDefaultTimeout(8000);
if (spec.viewport) await p.setViewportSize(spec.viewport);
const open = (to) => p.goto(new URL(to, roles.BASE_URL).href, { waitUntil: 'networkidle' }).catch(() => {});

const runStep = async (s) => {
  if (s.goto) await open(s.goto);
  else if (s.click) await p.locator(s.click).first().click();
  else if (s.hover) await p.locator(s.hover).first().hover();
  else if (s.fill) await p.locator(s.fill[0]).first().fill(s.fill[1]);
  else if (s.press) await p.keyboard.press(s.press);
  else if (s.wait) await p.waitForTimeout(s.wait);
  else if (s.css) await p.addStyleTag({ content: s.css });
};

const manifest = [];
let failed = 0;
for (const [i, shot] of spec.shots.entries()) {
  const file = `${String(i + 1).padStart(2, '0')}-${shot.name}.png`;
  try {
    await open(shot.path);
    if (new URL(p.url()).pathname.startsWith(LOGIN_PATH)) throw new Error('session expired - restart browser-host');
    for (const s of shot.steps ?? []) await runStep(s);
    if (shot.waitFor) await p.locator(shot.waitFor).first().waitFor();
    await p.mouse.move(0, 0); // drop stray hover/tooltip
    await p.waitForTimeout(500);
    const opts = { path: path.join(outDir, file), animations: 'disabled', timeout: 15000 };
    if (shot.clip) await p.locator(shot.clip).first().screenshot(opts);
    else await p.screenshot({ ...opts, fullPage: !!shot.fullPage });
    manifest.push({ name: shot.name, caption: shot.caption ?? shot.name, file });
    console.log('OK  ', file);
  } catch (e) {
    failed++;
    console.log('FAIL', file, e.message.split('\n')[0]);
  }
}
fs.writeFileSync(path.join(outDir, 'shots.json'), JSON.stringify(manifest, null, 2));
console.log('OUT', outDir, `(${manifest.length} ok, ${failed} failed)`);
process.exit(failed ? 1 : 0); // detach only - never b.close(), the browser-host owns the browser
