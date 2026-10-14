#!/usr/bin/env node
// Install reusable dev tools (+ their paired skills) into a project, or scaffold a project-only tool.
//   tools-kit.mjs list [--root DIR]                     kit tools + what the project already has (JSON)
//   tools-kit.mjs install <tool...> [--root DIR] [--force]
//       copies tools/<tool>/files/** -> DIR/_tools/ and tools/<tool>/skills/* -> DIR/.claude/skills/
//       existing files are skipped (reported), never overwritten unless --force
//   tools-kit.mjs new <name> [--root DIR] [--description TEXT]
//       scaffolds DIR/_tools/<name>/README.md + DIR/.claude/skills/<name>/SKILL.md (project-only tool)
// DIR defaults to the current directory.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'tools');
const NAME = /^[a-z0-9][a-z0-9-]*$/;

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
const flag = (name) => { const i = args.indexOf(name); return i >= 0 && args.splice(i, 1).length > 0; };
const root = path.resolve(opt('--root') || '.');
const force = flag('--force');
const description = opt('--description');
const [cmd, ...names] = args;
const out = (o) => console.log(JSON.stringify(o, null, 2));
const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

const kitTools = () => fs.readdirSync(KIT).filter((t) => fs.existsSync(path.join(KIT, t, 'tool.json'))).sort();
const meta = (t) => JSON.parse(fs.readFileSync(path.join(KIT, t, 'tool.json'), 'utf8'));
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

// Copy every file under src into dest, keeping relative paths and the executable bit.
function copyTree(src, dest, report) {
  if (!fs.existsSync(src)) return;
  for (const file of walk(src)) {
    const target = path.join(dest, path.relative(src, file));
    const rel = path.relative(root, target);
    if (fs.existsSync(target) && !force) { report.skipped.push(rel); continue; }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
    fs.chmodSync(target, fs.statSync(file).mode);
    report.created.push(rel);
  }
}

function list() {
  const toolsDir = path.join(root, '_tools');
  const present = fs.existsSync(toolsDir) ? fs.readdirSync(toolsDir) : [];
  const kit = kitTools().map((t) => {
    const top = fs.readdirSync(path.join(KIT, t, 'files'));
    return { name: t, description: meta(t).description, skills: meta(t).skills, installed: top.every((f) => present.includes(f)) };
  });
  const owned = new Set(kitTools().flatMap((t) => fs.readdirSync(path.join(KIT, t, 'files'))));
  out({ root, kit, projectOnly: present.filter((f) => !owned.has(f) && !f.startsWith('.')) });
}

function install() {
  if (!names.length) fail(`name at least one tool: ${kitTools().join(', ')}`);
  const unknown = names.filter((n) => !kitTools().includes(n));
  if (unknown.length) fail(`unknown tool(s): ${unknown.join(', ')} (available: ${kitTools().join(', ')})`);
  out(names.map((t) => {
    const report = { tool: t, created: [], skipped: [], setup: meta(t).setup };
    copyTree(path.join(KIT, t, 'files'), path.join(root, '_tools'), report);
    copyTree(path.join(KIT, t, 'skills'), path.join(root, '.claude', 'skills'), report);
    return report;
  }));
}

function scaffold() {
  const [name] = names;
  if (!name || !NAME.test(name)) fail('usage: new <kebab-case-name> [--description TEXT]');
  const dir = path.join(root, '_tools', name);
  const skill = path.join(root, '.claude', 'skills', name, 'SKILL.md');
  if (fs.existsSync(dir) || fs.existsSync(skill)) fail(`_tools/${name} or its skill already exists`);
  const desc = description || `TODO: what ${name} does and when an agent should use it`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'README.md'), `# ${name}\n\n${desc}\n\nProject-only tool (not part of dev-tools-kit). Keep secrets in a gitignored .env next to it.\n`);
  fs.mkdirSync(path.dirname(skill), { recursive: true });
  fs.writeFileSync(skill, `---\nname: ${name}\ndescription: ${desc}\n---\n\n# ${name}\n\nTool: \`_tools/${name}/\`.\n\n## Usage\n\n## Rules\n`);
  out({ created: [path.relative(root, path.join(dir, 'README.md')), path.relative(root, skill)] });
}

if (cmd === 'list') list();
else if (cmd === 'install') install();
else if (cmd === 'new') scaffold();
else fail('usage: tools-kit.mjs <list|install|new> ...');
