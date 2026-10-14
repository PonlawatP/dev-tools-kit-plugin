#!/usr/bin/env bash
# Per-service dev log: archive (gzip) + reset on each start, tee while running,
# and mark/since bookmarks so only the logs produced after an action are read.
#   logs.sh run <svc> <cmd...>   start <cmd>, mirror output to .logs/<svc>.log
#   logs.sh mark <svc>           remember the current end of the log
#   logs.sh since <svc>          print (ANSI-stripped) log written after the mark
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
dir=${LOGS_DIR:-$root/.logs}
hist=$dir/history
mode=${1:?usage: logs.sh run <svc> <cmd...> | mark <svc> | since <svc>}
svc=${2:?service name}
shift 2
log=$dir/$svc.log
off=$dir/$svc.offset

case $mode in
run)
  mkdir -p "$hist"
  [ -f "$dir/.gitignore" ] || echo '*' > "$dir/.gitignore" # logs never get committed
  if [ -s "$log" ]; then gzip -c "$log" > "$hist/$svc-$(date +%Y%m%d-%H%M%S).log.gz"; fi
  : > "$log"
  rm -f "$off"
  find "$hist" -name "$svc-*.log.gz" -mtime +14 -delete
  "$@" 2>&1 | tee -a "$log"
  ;;
mark)
  wc -c < "$log" > "$off"
  ;;
since)
  start=$(cat "$off" 2>/dev/null || echo 0)
  size=$(wc -c < "$log")
  if [ "$size" -lt "$start" ]; then start=0; fi # log was reset by a restart
  tail -c +$((start + 1)) "$log" | sed 's/\x1b\[[0-9;]*[A-Za-z]//g'
  ;;
*)
  echo "unknown mode: $mode" >&2
  exit 2
  ;;
esac
