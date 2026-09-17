# The `AGENTS.md` section

`devbook-derived:install` writes one section of the repository's `AGENTS.md`, between the
two markers below and after devbook's own section, and rewrites it on every run while the
text between the markers still matches the stamped hash. The marker rules — key, hash,
customized — are devbook's, in its `assets/reconcile-protocol.md` under **What devbook
materializes**; this file is the template.

Render it from devbook's stamp, never from disk:

- Replace `<generator>` with the materialized path, `.devbook/_tools/devbook-meta/build.mjs`,
  or a repo-relative path in a repository that vendors the tool itself. Never write a path
  that does not resolve.
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

Managed by `devbook-derived:install`. Edit outside these markers.

Files under any `_meta/` folder are generated tool input, written by
`<generator>`. Never read one as a source of fact and never hand-edit one.
<refresh> Fix what the check reports in the source Markdown, and run it before
committing:

    node <generator> --check

An annotation fence is written only through `.devbook/_tools/devbook-meta/annotations.mjs`.
<!-- devbook-derived:end -->
```
