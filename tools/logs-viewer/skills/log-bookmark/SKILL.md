---
name: log-bookmark
description: Bookmark a dev service's log before an action (API call, E2E run, trigger), then read only the logs written after it as one-line records. Use whenever an action's effect must be checked in a local dev service's logs.
---

Dev services started through `_tools/logs.sh run <svc> <cmd...>` (usually from IDE tasks such as
`.vscode/tasks.json`) mirror output to `.logs/<svc>.log`. Each (re)start archives the previous log
to `.logs/history/<svc>-<timestamp>.log.gz` (kept 14 days) and begins an empty log.

1. Before the action: `_tools/logs.sh mark <svc>` for each service involved.
2. Run the action.
3. After: `node _tools/logs-viewer/query.mjs <svc ...> --since-mark` - one line per record
   (`time cat message #trace8`), same parser as the viewer page (types: see `TYPES` in
   `parse.mjs`). Default categories are err, warn, http, app; add `--cat sql`, `--cat all`,
   `--full` (record detail lines), `--trace <id|prefix>` (follow one request across services),
   `--max N` (default 200, newest kept).
4. Raw text if the parser looks wrong: `_tools/logs.sh since <svc>`. Older runs:
   `zcat .logs/history/<svc>-<ts>.log.gz`.

Typical flow: query the entry service `--cat http,err,warn`, pick the failing request's `#trace`,
then `query.mjs --trace <id> --cat all --full` (no service args = all services).

If `.logs/<svc>.log` is missing or empty, the service was not started through `logs.sh` (or has
not logged yet) - say so; do not guess.

<!-- Project notes (which services have logs, trace id propagation) go below this line. -->
