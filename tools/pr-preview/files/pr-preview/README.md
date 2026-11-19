# pr-preview

Write a PR body in Markdown, preview it as GitHub would show it (tables, checkboxes, mermaid
sequence diagrams), then use the same `.md` as the `gh pr create` body.

```sh
cp _tools/pr-preview/pr-body.template.md /tmp/my-pr.md          # fill it in
_tools/pr-preview/build.sh /tmp/my-pr.md [/tmp/other-pr.md ...]  # one tab per file
xdg-open _tools/pr-preview/out/preview.html
gh pr create --base <base> --title "<type(scope): subject>" --body-file /tmp/my-pr.md
```

- `<!-- Title: ... -->` / `<!-- Branch: ... -->` on top drive the preview header; GitHub hides them.
- Other `<!-- ... -->` placeholders show grey italic in the preview so unfilled spots stand out.
- Adapt the template's sections to the project once, at install time.
- Screenshots: the `e2e` tool's `pr-screenshots` skill.
- Needs network for the marked + mermaid CDN scripts. `out/` is gitignored.
