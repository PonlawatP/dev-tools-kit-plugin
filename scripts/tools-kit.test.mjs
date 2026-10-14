// node --test scripts/tools-kit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tools-kit.mjs');
const run = (root, ...a) => JSON.parse(execFileSync('node', [script, ...a, '--root', root], { encoding: 'utf8' }));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tools-kit-'));

test('install copies only the chosen tool + its skills, keeps exec bit, never overwrites', () => {
  const root = tmp();
  const [r] = run(root, 'install', 'ssh');
  assert.ok(r.created.includes('_tools/ssh/svc.sh'));
  assert.ok(r.created.includes('.claude/skills/remote-env-inspect/SKILL.md'));
  assert.ok(!fs.existsSync(path.join(root, '_tools/e2e')));
  assert.ok(fs.statSync(path.join(root, '_tools/ssh/rs.sh')).mode & 0o100);

  fs.writeFileSync(path.join(root, '_tools/ssh/rs.sh'), 'mine');
  const [again] = run(root, 'install', 'ssh');
  assert.equal(again.created.length, 0);
  assert.equal(fs.readFileSync(path.join(root, '_tools/ssh/rs.sh'), 'utf8'), 'mine');
});

test('list marks installed kit tools and project-only tools', () => {
  const root = tmp();
  run(root, 'install', 'logs-viewer');
  run(root, 'new', 'fire-alert', '--description', 'Fire a test alert');
  const l = run(root, 'list');
  assert.equal(l.kit.find((t) => t.name === 'logs-viewer').installed, true);
  assert.equal(l.kit.find((t) => t.name === 'e2e').installed, false);
  assert.deepEqual(l.projectOnly, ['fire-alert']);
  assert.match(fs.readFileSync(path.join(root, '.claude/skills/fire-alert/SKILL.md'), 'utf8'), /description: Fire a test alert/);
});
