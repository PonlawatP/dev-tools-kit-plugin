---
description: Install chosen dev tools (e2e, logs-viewer, ssh) and their paired skills into this project's _tools/ and .claude/skills/
argument-hint: [tool ...] e.g. "e2e ssh"; empty = ask which ones
---

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/tools-kit.mjs" list --root <project root>` (the project
   root is the git top-level or workspace root the user works from; ask if unclear). It reports
   each kit tool, its paired skills, whether it is already installed, and project-only tools.

2. Pick the tools: from `$ARGUMENTS` if given, otherwise ask the user (multi-select, one option per
   kit tool with its description; mark already-installed ones). Do not install anything unasked.

3. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/tools-kit.mjs" install <tool...> --root <project root>`.
   It never overwrites; `skipped` lists files that already exist. If the user wants those replaced,
   show what differs first and only then re-run with `--force`.

4. Walk through each installed tool's `setup` steps from the report, adapted to this project:
   - read the project to fill config (dev URL/port, login page, how services start, IDE tasks)
   - ask the user for anything secret (credentials, hosts, passwords) - never invent, print, or
     commit them; they go only in the tool's gitignored `.env`
   - put project-specific notes at the bottom of the installed skill, not in the kit
   - make sure `.env`, `.auth/`, `.logs/` and recordings are gitignored before anything is written

5. Verify what can be verified without credentials (e.g. `npx playwright test --list` in
   `_tools/e2e`, `bash -n` on scripts, `node _tools/logs-viewer/query.mjs` once a service logged),
   then report: tools installed, files created/skipped, setup steps done vs left for the user.

Project-only tools are made with `/tools-new`, not added to the kit.
