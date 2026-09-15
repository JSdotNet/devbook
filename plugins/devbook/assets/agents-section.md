# The `AGENTS.md` section

`devbook:install` writes one section of the repository's `AGENTS.md`, between the two
markers below, and rewrites it on every reconcile while the text between them still
matches the stamped hash. The rules — key, hash, customized, orphan — are in
`reconcile-protocol.md` under **What devbook materializes**; this file is the template.

Render it from the stamp's `adopted` list, never from what happens to be on disk:

- Keep one table row per adopted folder and delete the others.
- Replace `<prefix>` with `.` in the flat layout and `.devbook/` in the nested one —
  the generator reports which layout it found on every run.
- Replace `<generator>` with the path `generatorPath` reports: the conventional
  `.devbook/_tools/devbook-meta/build.mjs` in a repository this materialized into, and a
  repo-relative path in one that vendors the generator itself. Never write the
  conventional path into a repository where it does not resolve.
- Keep the `<refresh>` sentence that matches what was materialized. A repository holding
  `build/Update-DevbookIndex.ps1` owes contributors both refresh paths, per
  `devbook-derived-artifacts.md`:

      Refresh them with `./build/Update-DevbookIndex.ps1`, or let the scheduled job
      reconcile the default branch.

  One that ships no `build/` keeps a single path, and a session is not it:

      Never regenerate or commit them in a session — the scheduled job owns that refresh.

- Change nothing else. A wording change belongs in this template, so every adopting
  repository gets it on its next reconcile.

When `AGENTS.md` is absent, create it holding only this section. When it exists without
the markers, append the section at the end. `AGENTS.local.md` is never created — the
section describes it so a session reads it where it exists, and an empty local file is
worse than an absent one. Nothing outside the markers is read or
written, and routing policy — which flow, agent, or MCP server the repository prefers —
never goes inside them; that stays in `routing-snippet.md`, offered and never applied.

```markdown
<!-- devbook:begin -->
## Devbook folders

Managed by `devbook:install`. Edit outside these markers; an edit inside them makes the
next reconcile report the section as customized and leave it alone.

This repository keeps its devbook as addressed Markdown chapters. Treat the folders as
task-scoped context, never baseline context: load the chapters a task names, walk
`related` and `depends-on` from them, and never load a folder whole.

| Folder | Holds | Rules |
| --- | --- | --- |
| `<prefix>arc42/` | Structure, decisions, and technical debt | `devbook-arc42.md` |
| `<prefix>domain/` | Bounded contexts and the ubiquitous language | `devbook-domain.md` |
| `<prefix>tech/` | The technology graph and its ratings | `devbook-tech.md` |
| `<prefix>design/` | Design principles, tokens, and component guidelines | `devbook-design.md` |
| `<prefix>ai/` | How the team works with AI, stage by stage; it records a way of working and never instructs one | `devbook-ai.md` |

Every chapter carries a fenced `meta` block; write it in the same change as the content,
per `devbook-chapter-metadata.md`. Skip `annotation` fences when loading a
chapter as context: they hold review notes, not content.

Files under any `_meta/` folder are generated tool input. Never read or hand-edit them.
<refresh> Run the check before committing:

    node <generator> --check

Two files here are yours alone, gitignored and absent by default. `AGENTS.local.md`
holds instructions that apply on your machine only; read it when it exists and treat
it as this file's last word. `.devbook/config.local.json` overlays the committed
stack config the same way. Never commit either, and put no secret in them — gitignored
is not private.
<!-- devbook:end -->
```
