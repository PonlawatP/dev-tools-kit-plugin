#!/bin/sh
# Render one or more PR-body .md files into a single GitHub-like HTML preview (one tab per file).
# Usage: _tools/pr-preview/build.sh <a.md> [b.md ...]   -> writes _tools/pr-preview/out/preview.html
set -e
[ $# -gt 0 ] || { echo "usage: $0 <pr-body.md> [...]" >&2; exit 1; }
DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$DIR/out"
python3 - "$DIR" "$@" <<'PY'
import os, sys
d, files = sys.argv[1], sys.argv[2:]
def block(f):
    name = os.path.splitext(os.path.basename(f))[0]
    body = open(f).read().replace('</script', '<\\/script')
    return '<script type="text/markdown" data-name="%s">%s</script>\n' % (name, body)
blocks = ''.join(block(f) for f in files)
out = os.path.join(d, 'out', 'preview.html')
open(out, 'w').write(open(os.path.join(d, 'template.html')).read().replace('<!--MD_BLOCKS-->', blocks))
print(out)
PY
