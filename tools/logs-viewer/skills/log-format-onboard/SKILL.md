---
name: log-format-onboard
description: Analyze a dev service's log (.logs/<svc>.log) and add or adjust record types/colors in the logs viewer so its lines are categorized instead of falling into the "app"/"tool" catch-alls. Use when a service is started through _tools/logs.sh for the first time, a service's log format changes, or the viewer shows a pile of uncolored/uncategorized lines.
---

All classification lives in ONE file: `_tools/logs-viewer/parse.mjs`. The viewer page
(`index.html`) and the agent CLIs (`query.mjs`, `analyze.mjs`) all import it, so a rule added
there shows up everywhere. Do not duplicate rules anywhere else.

## Steps

1. **Get a real log.** The service must have run via `logs.sh` (`.logs/<svc>.log` non-empty).
   If it is missing, say so - never invent the format.
2. **Run the coverage report:** `node _tools/logs-viewer/analyze.mjs <svc> --top 15`.
   It prints counts per category, the catch-all `app`/`tool` patterns (context | message with
   ids/numbers normalized), and which context landed in which category.
3. **Look at raw samples** of anything suspicious
   (`sed 's/\x1b\[[0-9;]*[A-Za-z]//g' .logs/<svc>.log | sed -n '1,60p'`, or
   `query.mjs <svc> --cat all --full --max 20`). Decide per pattern:
   - Structurally different format (no `[ts] LEVEL:` header, other level names, JSON lines,
     multi-line stack traces)? -> step 4a.
   - Same format, new kind of record (cache, scheduler, websocket, message bus)? -> step 4b.
4. **Edit `parse.mjs`:**
   - **a. New record structure:** extend `HEADER` / `KV` / `feedLine` (record start, continuation
     lines, key lines such as context/message/statusCode/traceId). Keep the state model:
     one record = header line + following lines.
   - **b. New type:** add ONE entry to `TYPES` (`{ cat, color, test, dim?, hide? }`). `test` is a
     function of the record (`r.ctx`, `r.head`, `r.msg`, `r.level`, `r.status`); order matters,
     first match wins; `app` is the fallback; `hide: true` for noisy types. The viewer builds its
     filter chip, stripe color and hide rule from this list - no CSS or HTML edit needed.
   - Prefer matching on `ctx` (logger context) or a stable message prefix over broad regexes.
     Derive from the log, never from a single sample line; do not hardcode ids/hosts.
   - err/warn come from the log level (not `TYPES`); http 4xx/5xx colors are in `index.html` CSS.
5. **Verify:** re-run `analyze.mjs <svc>` (the pattern should leave the catch-all), then
   `node _tools/logs-viewer/query.mjs <svc> --cat <newcat> --max 5`. If the page changed, restart
   `node _tools/logs-viewer/server.mjs` and look at the page.
6. **Report:** format differences found, rule(s) added, before/after category counts.

## Starter types

http (access lines `METHOD /path`), cache (`*Cache*` contexts / `cache: hit|miss`), app
(fallback), sql (`prisma:query` blocks), boot (NestJS bootstrap contexts, hidden), tool (column-0
text outside records: compiler, bundler, node warnings, hidden). Add the project's own types
below as you onboard services.
