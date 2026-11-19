---
name: pr-body
description: Write a pull request body from the project's template in `_tools/pr-preview/`, preview it as GitHub renders it (tables, checkboxes, mermaid), then open or update the PR with `gh pr create/edit --body-file`. Use whenever opening or updating a PR, writing a PR description, or when the user says "เปิด PR", "เขียน PR body", "PR template".
---

# pr-body

## Flow

1. Copy `_tools/pr-preview/pr-body.template.md` to a scratch file (never into the repo) and fill
   it from the real diff (`git diff --stat <base>...HEAD`), not from memory. Remove sections that
   do not apply (Screenshots for backend, Sequence for a one-file change).
2. `<!-- Title: ... -->` / `<!-- Branch: ... -->` on top drive the preview header; GitHub hides
   them. Leftover `<!-- ... -->` placeholders show grey italic in the preview - fill or delete.
3. `_tools/pr-preview/build.sh <body.md>` (several files = one tab each) and give the user the
   printed `preview.html` path.
4. `gh pr create --base <base> --head <branch> --title "<type(scope): subject>" --body-file <body.md>`
   (or `gh pr edit <n> --body-file <body.md>`). Pass the title yourself - the comment is not used.

## Rules

- Never add Co-Authored-By / "Generated with" / any attribution line to commits or PR bodies.
- `Related PR:` cross-links sibling PRs (backend <-> frontend, branch <-> release backport).
- "How it was tested" holds real output (test/typecheck/diff), not claims.
- Frontend PRs get screenshots before opening - `pr-screenshots` skill (`e2e` tool).

## Project notes

<!-- base branch, PR split policy, extra rules for this project -->
