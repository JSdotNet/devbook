# The `AGENTS.md` section

`devbook:init` writes one section of the repository's `AGENTS.md`, between the two
markers below, and `devbook:update` rewrites it on every reconcile while the text between them still
matches the stamped hash. The rules — key, hash, customized, orphan — are in
`reconcile-protocol.md` under **What devbook materializes**; this file is the template.

Render it from the stamp's `adopted` list, never from what happens to be on disk:

- Keep one table row per adopted folder and delete the others.
- Replace `<generator>` with the path `generatorPath` reports: the conventional
  `.devbook/_tools/devbook-meta/build.mjs` in a repository this materialized into, and a
  repo-relative path in one that vendors the checker itself. Never write the
  conventional path into a repository where it does not resolve. `<generator-dir>` is
  that path's folder.
- Change nothing else. The `_meta/` rule and the refresh paths belong to the layered
  plugin's own section, written after this one by its own `init`. A wording change belongs
  in this template, so every adopting repository gets it on its next reconcile.

When `AGENTS.md` is absent, create it holding only this section. When it exists without
the markers, append the section at the end. `AGENTS.local.md` is never created — the
section describes it so a session reads it where it exists, and an empty local file is
worse than an absent one. Nothing outside the markers is read or
written, and routing policy — which flow, agent, or MCP server the repository prefers —
never goes inside them; that stays in `routing-snippet.md`, offered and never applied.

```markdown
<!-- devbook:begin -->
## Devbook folders

Written by `devbook:init` and kept by `devbook:update`. Edit outside these markers; an edit inside them makes the
next reconcile report the section as customized and leave it alone.

This repository keeps its devbook as addressed Markdown chapters. Treat the folders as
task-scoped context, never baseline context: load the chapters a task names, walk
`related` and `depends-on` from them, and never load a folder whole.

| Folder | Holds | Rules |
| --- | --- | --- |
| `.devbook/arc42/` | Structure, decisions, and technical debt | `devbook-arc42.md` |
| `.devbook/domain/` | Bounded contexts and the ubiquitous language | `devbook-domain.md` |
| `.devbook/tech/` | The technology graph and its ratings | `devbook-tech.md` |
| `.devbook/design/` | Design principles, tokens, and component guidelines | `devbook-design.md` |
| `.devbook/ai/` | How the team works with AI, stage by stage; it records a way of working and never instructs one | `devbook-ai.md` |

Every chapter carries a fenced `meta` block; write it in the same change as the content,
per `devbook-chapter-metadata.md`. Skip `annotation` fences when loading a
chapter as context: they hold review notes, not content.

Run the check before committing; it writes nothing:

    node <generator> --check

An annotation fence is written only through `<generator-dir>/annotations.mjs`.

Nothing personal lives in this repository. Your own settings live under your devbook
config directory — `$XDG_CONFIG_HOME/devbook` when set, else `%APPDATA%\devbook` on
Windows and `~/.config/devbook` elsewhere — for every repository, or under `repos/<id>/`
there for this one, `<id>` being the `id` in `.devbook/config.json`. `AGENTS.local.md`
in either place holds instructions for your machine only: read it when it exists and
treat it as this file's last word. What else lives there, each plugin says for itself.
Put no secret in it — your home directory is not private.
<!-- devbook:end -->
```
