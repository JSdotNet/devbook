# 70. The Overlay Has Three Layers, Keyed by a Committed Id

```meta
date: 2026-09-15
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/40-the-overlay-may-add-a-gate-and-never-remove-one.md", ".devbook/arc42/adr/10-one-config-file-two-kinds-of-key.md", ".devbook/arc42/adr/11-the-stack-config-lives-in-devbook.md", ".devbook/domain/devbook-config/domain.md#machine-overlay"]
```

`.devbook/config.local.json` gains two layers beneath it, both outside every clone of the
repository: `<config dir>/config.local.json` for this user in every repository, and
`<config dir>/repos/<id>/config.local.json` for this user in the repository whose committed
`.devbook/config.json` carries that `id`. `<config dir>` is `$XDG_CONFIG_HOME/devbook` when
set, else `%APPDATA%\devbook` on Windows and `~/.config/devbook` elsewhere. The three merge
over the committed file in that order, the later winning, each under
[record 40's rules](40-the-overlay-may-add-a-gate-and-never-remove-one.md) — `gates` append at
every layer, the same keys are refused at every layer, and `id` joins the refused list because
it is what found the overlay.

The problem is the worktree. A gitignored file is in no commit, so a fresh worktree starts
without one, and a session in it runs at the team's defaults — full QA, the full retry budget,
no personal checkpoint — without saying so. That is the cost the overlay exists to avoid,
silently reinstated by the one workflow this repository's own sessions use for every change.

Two placements were considered for the escape. Resolving the overlay from the main worktree
via `git rev-parse --git-common-dir` keeps one location and needs no id, but it is still
inside a clone: `git clean -x` takes it, a re-clone loses it, and a second clone of the same
repository cannot share it. Keying a file outside the clone on the checkout path is what
Claude Code does for its own project state, and it splits worktrees exactly the way the
gitignored file does — this repository's worktrees each get a path-derived key of their own.
A committed id is the only key that survives a move, a re-clone, and a worktree alike, which
is the pattern OpenSpec's stores use: the repository commits a name, the machine maps it.

`id` is not a setting. It sits beside the four engine keys of
[record 10](10-one-config-file-two-kinds-of-key.md), is validated by the same schema, and
configures nothing; its only reader is the checker resolving the repository layer. A
repository without one loses that layer and nothing else, which is why no migration ships and
the plugin stays at its version: an added field with a safe default, per `AGENTS.md`.

The location is XDG rather than `~/.claude/` because the reader is `check.mjs`, which Copilot
runs as readily as Claude does, and a host's folder is one host's. The fleet sweep store stays
under `~/.claude/issue-sweep/`: that is one host's session state, not configuration, and the
inconsistency is noted rather than resolved.

Consequence: the stack report names every layer it finds and which keys each touches, and
flags a config without an `id`. `devbook-config:setup` writes the id for a new repository; an
existing one adds it by hand and never renames it — a renamed id orphans every machine's
`repos/<old>/` folder with no way to say so. The `AGENTS.md` section devbook renders now
names all three places for `AGENTS.local.md` and `config.local.json` alike, so a session in a
worktree reads the machine's instructions where the checkout has none.
