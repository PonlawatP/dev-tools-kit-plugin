// Shared log-record parser: used by the browser viewer (served at /parse.mjs) and query.mjs.
// A record starts at a "[ts] LEVEL:" header (or prisma:query); following lines belong to it.
// SQL continuation lines sit at column 0, so after prisma:query everything is SQL until the next header.

const BOOT = /^(InstanceLoader|RouterExplorer|RoutesResolver|NestFactory|NestApplication|NestMicroservice)$/;
const HTTP = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) \S+/;
const HEADER = /^\[\d{4}-\d\d-\d\d ([\d:.]+)\]\s+(\w+):?\s*(.*)$/;
const KV = /^\s+"?(\w+)"?:\s*(.*?),?\s*$/;
const UUID = /^[0-9a-f-]{36}$/i;
const DROP = /^(AND|OR|NOT|NULL|TRUE|FALSE|WHERE|ON|SELECT|WHEN|THEN|ELSE)$/i;

// Record types, in match order (first matching `test` wins; no `test` = assigned elsewhere or fallback).
// Starter rules (NestJS + Prisma style logs). To support a new log format: add ONE line here
// (see .claude/skills/log-format-onboard).
//   color - tag/stripe color in the viewer   dim - also dim the message   hide - hidden by default
// err/warn are not types: they come from the log level and are never hidden.
export const TYPES = [
  { cat: 'http', color: '#5aa9ff', test: (r) => HTTP.test(r.head || r.msg) },
  { cat: 'cache', color: '#4ec9b0', test: (r) => /Cache/.test(r.ctx) || /\bcache: (hit|miss)\b/.test(r.head || r.msg) },
  { cat: 'app', color: 'var(--fg)' }, // fallback
  { cat: 'sql', color: '#6b7385', dim: true }, // assigned by line shape (prisma:query)
  { cat: 'boot', color: '#4d5566', dim: true, hide: true, test: (r) => BOOT.test(r.ctx) },
  { cat: 'tool', color: '#6f8fb3', dim: true, hide: true }, // assigned by line shape (column-0 text outside records)
];
export const CATS = TYPES.map((t) => t.cat);

const base = (id) => id.replace(/"/g, '').split('.').pop();
const uniq = (a) => [...new Set(a)];
const cap = (a, n) => a.slice(0, n).join(', ') + (a.length > n ? ` +${a.length - n}` : '');

// Heuristic one-liner for a SQL text: op + tables + where columns + order + limit.
export function summarizeSql(sql) {
  const q = sql.replace(/\s+/g, ' ').trim();
  if (!q) return '';
  const word = q.split(' ')[0].toUpperCase();
  const op = /^SELECT COUNT\(/i.test(q) ? 'COUNT' : /^SELECT EXISTS/i.test(q) ? 'EXISTS' : word;
  const tables = uniq([...q.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+((?:"?\w+"?\.)*"?\w+"?)/gi)].map((m) => base(m[1])).filter((t) => !/^(SELECT|LATERAL|UNNEST|VALUES)$/i.test(t)));
  const where = q.split(/\bWHERE\b/i).slice(1).join(' ');
  const cols = uniq([...where.matchAll(/(?<![\w".:])("?[A-Za-z_]\w*"?(?:\."?\w+"?)*)\s*(?:[=<>!]|(?:IN|LIKE|ILIKE|IS)\b)/gi)].map((m) => base(m[1])).filter((c) => !DROP.test(c)));
  const order = q.match(/\bORDER BY\s+((?:"?\w+"?\.)*"?\w+"?)/i);
  return [
    `${op} ${cap(tables, 3)}`.trim(),
    cols.length && `where ${cap(cols, 4)}`,
    order && `order ${base(order[1])}`,
    /\bLIMIT\b/i.test(q) && 'limit',
  ].filter(Boolean).join(' | ');
}

export function categorize(r) {
  if (r.cat === 'sql' || r.cat === 'tool') return r.cat;
  if (/^(ERROR|FATAL)$/i.test(r.level)) return 'err';
  if (/^WARN/i.test(r.level)) return 'warn';
  return TYPES.find((t) => t.test?.(r))?.cat ?? 'app';
}

export const recMessage = (r, sqlSummary = true) =>
  r.cat === 'sql' && sqlSummary ? summarizeSql(r.sql) || r.head : r.head || r.msg;

function newRecord(level, time, head, cat = '') {
  return { level, time, head, cat, ctx: '', msg: '', trace: '', status: 0, sql: '', lines: [] };
}

// Feed one line into `state` (any object; keeps state.cur). Returns { rec, isNew } or null for blank lines.
export function feedLine(state, line) {
  if (!line.trim()) return null;
  const h = line.match(HEADER);
  if (h) {
    state.cur = newRecord(h[2], h[1], h[3]);
    state.cur.cat = categorize(state.cur);
    return { rec: state.cur, isNew: true };
  }
  if (line.startsWith('prisma:query')) {
    const r = (state.cur = newRecord('', '', line.slice(12).trim(), 'sql'));
    r.sql = line.slice(12);
    r.lines.push(line);
    return { rec: r, isNew: true };
  }
  const c = state.cur;
  if (c && (c.cat === 'sql' || /^\s/.test(line))) {
    c.lines.push(c.cat === 'sql' ? line : line.trim());
    if (c.cat === 'sql') {
      c.sql += '\n' + line;
      if (!c.head) c.head = line.trim(); // raw SQL starts on the line after prisma:query
    } else {
      const m = line.match(KV);
      if (m) {
        const val = m[2].replace(/^"|"$/g, '');
        if (m[1] === 'context') c.ctx = val;
        else if (m[1] === 'message') c.msg = val;
        else if (m[1] === 'statusCode') c.status = Number(val);
        else if ((m[1] === 'traceId' || m[1] === 'id') && UUID.test(val)) c.trace = val; // request id shared across services when they propagate it
      }
      c.cat = categorize(c);
    }
    return { rec: c, isNew: false };
  }
  state.cur = newRecord('', '', line.trim(), 'tool');
  return { rec: state.cur, isNew: true };
}
