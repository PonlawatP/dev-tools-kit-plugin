#!/usr/bin/env bash
# Read-only service inspector for remote envs (wraps rs.sh).
#   svc.sh <env> ps
#   svc.sh <env> logs <service> [tail=200] [since=]   e.g. since=30m
#   svc.sh <env> env  <service>
# Runtime per env from ./.env:
#   SSH_<ENV>_RUNTIME=docker (default) | k8s
#   SSH_<ENV>_NAMESPACE=<ns>                 k8s only
#   SSH_<ENV>_KUBECTL="sudo -n kubectl"      k8s only, default "kubectl"
set -euo pipefail
dir=$(cd "$(dirname "$0")" && pwd)
set -a; . "$dir/.env"; set +a
env=${1:?env}; cmd=${2:?cmd}; svc=${3:-}; tail=${4:-200}; since=${5:-}
[[ -z $svc || $svc =~ ^[a-z0-9-]+$ ]] || { echo "bad service name" >&2; exit 2; }
[[ $tail =~ ^[0-9]+$ ]] || { echo "bad tail" >&2; exit 2; }
[[ -z $since || $since =~ ^[0-9]+[smhd]$ ]] || { echo "bad since" >&2; exit 2; }
key=SSH_$(echo "$env" | tr 'a-z-' 'A-Z_')
runtime=$(eval "echo \${${key}_RUNTIME:-docker}")

if [[ $runtime == k8s ]]; then
  ns=$(eval "echo \${${key}_NAMESPACE:-default}")
  k="$(eval "echo \${${key}_KUBECTL:-kubectl}") -n $ns"
  case $cmd in
    ps)   r="$k get pods -o wide" ;;
    logs) r="$k logs deploy/$svc --all-containers --tail=$tail ${since:+--since=$since}" ;;
    env)  r="$k exec deploy/$svc -- env | sort" ;;
  esac
else
  case $cmd in
    ps)   r='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"' ;;
    logs) r="docker logs --tail $tail ${since:+--since $since} $svc 2>&1" ;;
    env)  r="docker inspect $svc --format '{{range .Config.Env}}{{println .}}{{end}}' | sort" ;;
  esac
fi
exec "$dir/rs.sh" "$env" "${r:?unknown cmd}"
