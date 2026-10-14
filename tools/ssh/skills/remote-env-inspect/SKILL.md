---
name: remote-env-inspect
description: Read logs, pod/container status, and environment variables of a service on this project's remote envs (hosts in _tools/ssh/.env). Use when asked to check logs, why a service fails/times out on a remote env, or what env a deployed service has.
---

# Remote env inspect

Read-only wrapper: `_tools/ssh/svc.sh <env> <ps|logs|env> [service] [tail=200] [since]`.
Env names, hosts, runtime (`docker` or `k8s` + namespace) come from `_tools/ssh/.env`
(gitignored; see `.env.example`). Never print or commit passwords, and never install keys on
the remote (`authorized_keys`) unless the user asks.

```bash
_tools/ssh/svc.sh <env> ps                       # run first if unsure of service names
_tools/ssh/svc.sh <env> logs <service> 300 30m   # last 300 lines, within 30m
_tools/ssh/svc.sh <env> env <service>
```

Rules:
- Before reading env vars or logs, confirm the env holds no real/production data, or that the
  user allowed it. Fill in the table below once confirmed.
- Pipe output through `grep`/`jq` locally instead of reading whole dumps.
- Anything beyond read (restart, scale, edit) needs explicit user approval; arbitrary commands
  go through `_tools/ssh/rs.sh <env> '<cmd>'`.

| env | host | runtime | data | notes |
|---|---|---|---|---|
| (fill in) | | docker / k8s | mock / real | |
