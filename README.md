# dev-tools-kit

Reusable dev tools for any project, each shipped with the agent skill that knows how to use it.
Pick what a project needs at init; add tools that only make sense in one project next to them.

| tool | installs to | paired skills | what |
|---|---|---|---|
| `e2e` | `_tools/e2e/` | `e2e-browser-verify`, `pr-screenshots` | Playwright multi-account harness: per-role saved sessions, recorded runs, one long-lived CDP browser for ad-hoc checks, PR screenshots uploaded to a `pr-assets` branch |
| `logs-viewer` | `_tools/logs.sh`, `_tools/logs-viewer/` | `log-bookmark`, `log-format-onboard` | per-service dev logs with mark/since bookmarks, live browser viewer, one-line-per-record CLI |
| `pr-preview` | `_tools/pr-preview/` | `pr-body` | PR body template + GitHub-like HTML preview (tables, checkboxes, mermaid) used as the `gh pr create` body |
| `ssh` | `_tools/ssh/` | `remote-env-inspect` | ssh (key or sshpass) + read-only ps/logs/env for docker or k8s envs |

Skills install into the project's `.claude/skills/` so they travel with the repo.

## Install the plugin (Claude Code)

```bash
claude plugin marketplace add /path/to/dev-tools-kit
claude plugin install dev-tools-kit@dev-tools-kit
```

## Use

- `/tools-init [tool ...]` - choose tools, copy them in, then walk through each tool's setup
  (config from the project, secrets from you, all into gitignored `.env` files)
- `/tools-new <name> "<what it does>"` - scaffold a project-only tool `_tools/<name>/` + skill

The deterministic part is `scripts/tools-kit.mjs` (`list` / `install` / `new`), usable without
the plugin: `node scripts/tools-kit.mjs install e2e ssh --root ~/projects/foo`. `install` never
overwrites an existing file unless `--force`.

## Configuration per tool

- **e2e** - `_tools/e2e/.env`: `E2E_BASE_URL`, `E2E_ROLES=admin,viewer`, `<ROLE>_EMAIL/_PASSWORD`;
  the login form lives only in `tests/login.cjs`.
- **logs-viewer** - start services as `_tools/logs.sh run <svc> <cmd...>`; viewer on
  `LOGS_PORT` (8199). Record types are in `parse.mjs` (starter rules for NestJS + Prisma logs);
  the `log-format-onboard` skill extends them per service.
- **ssh** - `_tools/ssh/.env`: `SSH_<ENV>_HOST`, optional `SSH_<ENV>_PASS` (sshpass),
  `SSH_<ENV>_RUNTIME=docker|k8s`, `SSH_<ENV>_NAMESPACE`, `SSH_<ENV>_KUBECTL`.

## Adding a tool to the kit

`tools/<name>/tool.json` (`description`, `skills`, `setup` steps), `tools/<name>/files/**`
(copied into `_tools/`), `tools/<name>/skills/<skill>/SKILL.md`. Keep project data out: no hosts,
accounts, service names, or credentials - read them from `.env`.

## Test

`node --test scripts/*.test.mjs`
