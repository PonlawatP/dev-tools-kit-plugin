---
description: Scaffold a project-only dev tool in _tools/<name>/ with a paired skill in .claude/skills/<name>/
argument-hint: <kebab-name> "<what it does>"
---

For tools that only make sense in this project (fire a test event, call an internal bridge,
edit a project doc). Reusable tools belong in the kit, not here.

1. Agree on a kebab-case name and one-sentence description with the user (from `$ARGUMENTS`).
2. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/tools-kit.mjs" new <name> --description "<text>" --root <project root>`.
   It refuses if the tool or skill already exists.
3. Build the tool in `_tools/<name>/` following the kit's conventions:
   - plain scripts (bash or node, no new dependency unless needed); secrets in a gitignored
     `.env` next to it with a committed `.env.example`
   - read-only by default; anything that writes to shared systems needs a dry-run flag
4. Fill the skill: a description that says *when* to use it (that is what triggers it), the exact
   commands, and the rules an agent must follow (what needs approval, what never to print).
5. Run the tool once (dry-run if it writes) and report the real output.
