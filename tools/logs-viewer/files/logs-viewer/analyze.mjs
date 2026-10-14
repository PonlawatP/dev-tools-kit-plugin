#!/usr/bin/env node
// Coverage report for one service log: how the shared parser categorizes it and which
// catch-all records (app/tool) still look like a pattern worth its own category/rule.
//   node _tools/logs-viewer/analyze.mjs <svc> [--top N]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feedLine, recMessage } from './parse.mjs';

const logDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.logs');
const args = process.argv.slice(2);
const ti = args.indexOf('--top');
const top = ti >= 0 ? Number(args.splice(ti, 2)[1]) : 12;
const svc = args[0];
if (!svc) { console.error('usage: analyze.mjs <svc> [--top N]'); process.exit(2); }
const file = path.join(logDir, `${svc}.log`);
if (!fs.existsSync(file)) { console.error(`no log: ${file}`); process.exit(1); }

const text = fs.readFileSync(file, 'utf8').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
const state = {};
const recs = [];
for (const line of text.split('\n')) {
  const res = feedLine(state, line);
  if (res?.isNew) recs.push(res.rec);
}

const byCat = {};
recs.forEach((r) => { byCat[r.cat] = (byCat[r.cat] || 0) + 1; });
console.log(`## ${svc}: ${recs.length} records`);
console.log('by category:', Object.entries(byCat).map(([k, v]) => `${k}=${v}`).join('  '));

// Shape = context + message with ids/numbers normalized, so repeats collapse into one pattern.
const shape = (r) => `${r.ctx || '-'} | ${(recMessage(r) || r.lines[0] || '').replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, '<uuid>').replace(/\d+/g, 'N').slice(0, 80)}`;
for (const cat of ['app', 'tool']) {
  const groups = new Map();
  for (const r of recs.filter((x) => x.cat === cat)) {
    const k = shape(r);
    const g = groups.get(k) || { n: 0, sample: r };
    g.n++;
    groups.set(k, g);
  }
  console.log(`\n### catch-all "${cat}" patterns (${groups.size}) - candidates for a rule`);
  [...groups.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, top).forEach(([k, g]) => {
    console.log(`${String(g.n).padStart(5)}  level=${g.sample.level || '-'}  ${k}`);
  });
}

const contexts = {};
recs.forEach((r) => { if (r.ctx) contexts[`${r.ctx} -> ${r.cat}`] = (contexts[`${r.ctx} -> ${r.cat}`] || 0) + 1; });
console.log('\n### contexts and the category they landed in');
Object.entries(contexts).sort((a, b) => b[1] - a[1]).slice(0, top * 2).forEach(([k, v]) => console.log(`${String(v).padStart(5)}  ${k}`));
