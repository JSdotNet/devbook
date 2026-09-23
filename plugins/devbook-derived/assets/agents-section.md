# The `AGENTS.md` section

`devbook-derived:init` writes one section of the repository's `AGENTS.md`, between the
two markers below and after devbook's own section, and rewrites it on every run while the
text between the markers still matches the stamped hash. The marker rules — key, hash,
customized — are devbook's, in its `assets/reconcile-protocol.md` under **What devbook
materializes**; this file is the template.

Render it from devbook's stamp, never from disk:

- Replace `<generator>` with devbook's materialized checker, `.devbook/_tools/devbook-meta/build.mjs`,
  or a repo-relative path in a repository that vendors it. Never write a path that does not
  resolve.
- Keep the `<refresh>` sentence that matches what was materialized. A repository holding
  `build/Update-DevbookIndex.ps1` gets both refresh paths:

      Refresh them with `./build/Update-DevbookIndex.ps1`, or let the scheduled job
      reconcile the default branch.

  One that ships no `build/` keeps a single path, and a session is not it:

      Never regenerate or commit them in a session — the scheduled job owns that refresh.

- Change nothing else. A wording change belongs in this template.

```markdown
<!-- devbook-derived:begin -->
## Devbook tooling

Written by `devbook-derived:init` and kept by `devbook-derived:update`. Edit outside these markers.

Files under any `_meta/` folder — `.devbook/_meta/` and one per adopted folder — are
generated tool input, written by `<generator> --write`. Never read one as a source of
fact and never hand-edit one. <refresh> Fix what devbook's check reports in the source
Markdown; the check itself is in devbook's section above.
<!-- devbook-derived:end -->
```
