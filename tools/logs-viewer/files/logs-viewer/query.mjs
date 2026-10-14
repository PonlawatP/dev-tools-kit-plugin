#!/usr/bin/env node
// One-line-per-record view of .logs/*.log for agents (same parser as the viewer page).
//   node _tools/logs-viewer/query.mjs [svc ...] [--since-mark] [--cat err,warn,http,app,sql,boot,tool|all]
//                                     [--trace <id-or-prefix>] [--full] [--max N]
// Default categories: err, warn, http, app (sql/boot/tool are noisy; ask for them explicitly).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feedLine, recMessage, CATS } from './parse.mjs';

const logDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.logs');
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
const flag = (name) => { const i = args.indexOf(name); return i >= 0 && args.splice(i, 1).length > 0; };
const catArg = opt('--cat') || 'err,warn,http,app';
const trace = opt('--trace');
const max = Number(opt('--max') || 200);
const sinceMark = flag('--since-mark');
const full = flag('--full');
const want = new Set(catArg === 'all' ? ['err', 'warn', ...CATS] : catArg.split(','));
const all = fs.existsSync(logDir) ? fs.readdirSync(logDir).filter((f) => f.endsWith('.log')).map((f) => f.slice(0, -4)) : [];
const svcs = args.length ? args : all;

for (const svc of svcs) {
  const file = path.join(logDir, `${svc}.log`);
  if (!fs.existsSync(file)) { console.log(`## ${svc}: no log file`); continue; }
  let buf = fs.readFileSync(file);
  if (sinceMark) {
    const off = Number(fs.existsSync(path.join(logDir, `${svc}.offset`)) ? fs.readFileSync(path.join(logDir, `${svc}.offset`), 'utf8') : 0);
    buf = buf.subarray(off > buf.length ? 0 : off); // log shorter than the mark = service restarted
  }
  const state = {};
  const recs = [];
  for (const line of buf.toString('utf8').replace(ANSI, '').split('\n')) {
    const res = feedLine(state, line);
    if (res?.isNew) recs.push(res.rec);
  }
  const shown = recs.filter((r) => want.has(r.cat) && (!trace || r.trace.startsWith(trace)));
  console.log(`## ${svc}: ${shown.length}/${recs.length} records`);
  for (const r of shown.slice(-max)) {
    const t = r.trace ? ` #${r.trace.slice(0, 8)}` : '';
    console.log(`${(r.time || '').padEnd(12)} ${r.cat.padEnd(4)} ${recMessage(r)}${t}`);
    if (full) r.lines.forEach((l) => console.log(`    ${l}`));
  }
  if (shown.length > max) console.log(`(showing last ${max} of ${shown.length}; use --max)`);
}
