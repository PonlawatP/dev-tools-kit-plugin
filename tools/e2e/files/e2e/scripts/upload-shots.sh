#!/bin/sh
# Upload PR screenshots to the repo's orphan `pr-assets` branch and print the Markdown for the
# PR "Screenshots" section. gh has no image-attachment API, so images live in git instead.
# Uses a temp index + plumbing: never touches the repo's working tree or current branch.
#
# Usage (cwd = _tools/e2e): scripts/upload-shots.sh <repo-dir> <shots-dir>
#   <shots-dir> = output of scripts/pr-shots.mjs (has shots.json), e.g.
#   session-results/pr-42
# Images land at pr-assets:<shots-dir basename>/<file>. Pushing creates/updates a branch on the
# shared remote - confirm with the user first.
set -e
[ $# -eq 2 ] || { echo "usage: $0 <repo-dir> <shots-dir>" >&2; exit 1; }
REPO="$1"; SHOTS="$(cd "$2" && pwd)"; SUB="$(basename "$SHOTS")"
BRANCH=pr-assets
[ -f "$SHOTS/shots.json" ] || { echo "no shots.json in $SHOTS" >&2; exit 1; }
cd "$REPO"
SLUG="$(gh repo view --json nameWithOwner -q .nameWithOwner)"

export GIT_INDEX_FILE="$(mktemp)"
trap 'rm -f "$GIT_INDEX_FILE"' EXIT
rm -f "$GIT_INDEX_FILE"
PARENT=""
if git fetch -q origin "$BRANCH" 2>/dev/null; then
  PARENT="$(git rev-parse FETCH_HEAD)"
  git read-tree "$PARENT"
else
  git read-tree --empty
fi
for f in $(python3 -c "import json,sys;print(' '.join(s['file'] for s in json.load(open(sys.argv[1]))))" "$SHOTS/shots.json"); do
  git update-index --add --cacheinfo 100644 "$(git hash-object -w "$SHOTS/$f")" "$SUB/$f"
done
TREE="$(git write-tree)"
if [ -n "$PARENT" ] && [ "$TREE" = "$(git rev-parse "$PARENT^{tree}")" ]; then
  echo "(no change - already uploaded)" >&2
else
  COMMIT="$(git commit-tree "$TREE" ${PARENT:+-p "$PARENT"} -m "chore: screenshots for $SUB")"
  git push -q origin "$COMMIT:refs/heads/$BRANCH"
fi

python3 - "$SHOTS/shots.json" "https://github.com/$SLUG/blob/$BRANCH/$SUB" <<'PY'
import json, sys
shots, base = json.load(open(sys.argv[1])), sys.argv[2]
for s in shots:
    print(f"**{s['caption']}**\n\n<img src=\"{base}/{s['file']}?raw=true\" width=\"900\">\n")
PY
