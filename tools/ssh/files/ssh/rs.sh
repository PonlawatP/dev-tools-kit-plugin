#!/usr/bin/env bash
# Usage: rs.sh <env> [command...]   (no command = interactive shell)
# Hosts come from ./.env (gitignored), one block per env name (upper-cased, '-' -> '_'):
#   SSH_<ENV>_HOST=user@host
#   SSH_<ENV>_PASS=...        optional; set = password auth via sshpass (nothing is installed
#                             on the remote), unset = your normal ssh keys/agent
set -euo pipefail
dir=$(cd "$(dirname "$0")" && pwd)
set -a; . "$dir/.env"; set +a

env=${1:-}
key=SSH_$(echo "$env" | tr 'a-z-' 'A-Z_')
host=$(eval "echo \${${key}_HOST:-}")
[[ $env =~ ^[a-z0-9-]+$ && -n $host ]] || { echo "usage: $0 <env> [command...]  (env needs ${key}_HOST in .env)" >&2; exit 2; }
shift
pass=$(eval "echo \${${key}_PASS:-}")

# ControlMaster: authenticate once, later calls reuse the socket for 10 min
opts=(-o StrictHostKeyChecking=accept-new -o ControlMaster=auto -o ControlPersist=10m -o "ControlPath=/tmp/rs-ssh-%r@%h")
if [[ -n $pass ]]; then
  export SSHPASS=$pass
  exec sshpass -e ssh "${opts[@]}" "$host" "$@"
fi
exec ssh "${opts[@]}" "$host" "$@"
