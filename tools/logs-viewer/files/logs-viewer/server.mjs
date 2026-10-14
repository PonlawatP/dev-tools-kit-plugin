// Live viewer for .logs/*.log (written by _tools/logs.sh). Serves index.html and
// streams appended bytes over SSE. Localhost only. Run: node _tools/logs-viewer/server.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.resolve(here, '../../.logs');
const port = Number(process.env.LOGS_PORT || 8199);
const INITIAL_TAIL = 64 * 1024;
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;

const pos = new Map(); // service -> bytes already streamed
const clients = new Set();
const send = (res, data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
const broadcast = (data) => clients.forEach((res) => send(res, data));

function readRange(file, from, to) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(to - from);
    fs.readSync(fd, buf, 0, buf.length, from);
    return buf.toString('utf8').replace(ANSI, '');
  } finally {
    fs.closeSync(fd);
  }
}

function services() {
  if (!fs.existsSync(logDir)) return [];
  return fs.readdirSync(logDir).filter((f) => f.endsWith('.log')).map((f) => f.slice(0, -4));
}

function tick() {
  for (const svc of services()) {
    const file = path.join(logDir, `${svc}.log`);
    const size = fs.statSync(file).size;
    const prev = pos.get(svc);
    if (prev === undefined) {
      pos.set(svc, size); // first sight: new clients get the tail on connect
      broadcast({ svc, reset: true, text: readRange(file, Math.max(0, size - INITIAL_TAIL), size) });
    } else if (size < prev) {
      pos.set(svc, size); // service restarted, log was emptied
      broadcast({ svc, reset: true, text: readRange(file, 0, size) });
    } else if (size > prev) {
      pos.set(svc, size);
      broadcast({ svc, text: readRange(file, prev, size) });
    }
  }
}

http
  .createServer((req, res) => {
    if (req.url === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      for (const svc of services()) {
        const file = path.join(logDir, `${svc}.log`);
        const size = fs.statSync(file).size;
        send(res, { svc, reset: true, text: readRange(file, Math.max(0, size - INITIAL_TAIL), size) });
      }
      clients.add(res);
      req.on('close', () => clients.delete(res));
    } else if (req.url === '/parse.mjs') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end(fs.readFileSync(path.join(here, 'parse.mjs')));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(here, 'index.html')));
    }
  })
  .listen(port, '127.0.0.1', () => console.log(`logs viewer: http://localhost:${port}`));

setInterval(tick, 500);
