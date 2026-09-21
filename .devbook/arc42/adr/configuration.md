# Configuration

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#stack-config", ".devbook/arc42/08-crosscutting-concepts.md#stamp", ".devbook/arc42/building-blocks/devbook-config.md#engine-configuration", ".devbook/arc42/adr/flow-engine.md", ".devbook/arc42/adr/install.md"]
```

A repository's wiring is one committed file, `.devbook/config.json`: the engine's four keys —
`bindings`, `extensions`, `policy`, `gates` — beside every component's `components.<name>`
entry and a committed `id`. Unknown keys are rejected by name. A gitignored
`config.local.json` overlays the engine keys at three layers — the checkout, the user's devbook
config directory, and `repos/<id>/` under it — and may add a gate but never remove one. How
the application starts is not configuration: it is the repository's own `start` skill.

## Why

```meta
```

**One file.** The two halves are read by the same people at the same moment: whoever decides
which folders devbook adopts is deciding, in the same sitting, which tracker the flows post to.
Two files would give the repository two places to disagree with itself. Each component writes
only its own entry, and `policy` keys are closed enums with documented defaults, so an absent
key means the engine's choice and a hand edit is safe.

**Under `.devbook/`.** It was `.github/ai-agent-stack.json`, and `.github/` is one host's
folder — a file both hosts read belongs in neither's. `.devbook/` already holds the
repository's own account of how it works, of which the config is the machine-readable half.
Reading the path is not a dependency on the `devbook` plugin: `delivery` reads it whether or
not a single folder was adopted. There is no fallback path, deliberately; the guide's report
names the old file while it exists.

**The overlay may only tighten.** A gitignored file may not weaken what a reviewer sees:
`gates` append, `policy.pr.required`, `policy.qa.ceiling`, `policy.gate.personalValidation`
and `components` are refused, and the check validates the overlay alone and the merged result.
Trusting the overlay because its author could edit the committed file fails on visibility, not
capability — the committed edit shows in review and the overlay never does.

**Three layers, keyed by a committed id.** A gitignored file is in no commit, so a fresh
worktree ran at the team's defaults without saying so. A file outside the clone keyed on the
checkout path splits worktrees exactly as the gitignored one does; a committed `id` survives a
move, a re-clone, and a worktree alike, which is how OpenSpec's stores key a machine to a
repository. The location is `$XDG_CONFIG_HOME/devbook` rather than `~/.claude/`, because the
reader is `check.mjs` and Copilot runs it as readily as Claude. `id` configures nothing and is
never renamed — a renamed id orphans every machine's `repos/<old>/`.

**Runtime facts live in the `start` skill, not a `runtime` key.** The flow context file had
eight sections; three were answered by config and `.mcp.json`, one spelled `null` in Markdown,
and the rest were facts the `start` procedure consumed in its next line. Configuration chooses
among behaviour the engine implements, and how one product's application comes up is prose the
repository owns. Nothing to start is `extensions.app.start: null`.

**A component entry may be hand-written.** The dashboard computes a session title from
`components.delivery-surface-dashboard.sessionNaming.labels`; it materializes nothing and ships
no install skill, so an install skill whose only job is to copy one object would be ceremony.
The owner and the boundary are the same — nobody writes another component's entry. An overlay
cannot change the words, because a stamp is repo-scope and one committed vocabulary is what
makes two developers' session lists readable to each other.

## Rejected

```meta
```

- A second file for the engine keys, and a second supported path for the config.
- Resolving the overlay from the main worktree via `git rev-parse --git-common-dir`: still
  inside a clone, so `git clean -x` and a re-clone take it.
- A `runtime` key for the application's facts, and a per-user file for session-naming words.
- `.agents/` as the config's folder: it holds authored rules that get wrapped, and a file nothing
  wraps would be the odd one in it.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-17 | Session-naming labels configured in the dashboard's hand-edited component entry; `null` means no prefix. |
| 2026-09-15 | Overlay gains two layers under the devbook config directory, keyed by a committed `id`. |
| 2026-09-15 | The flow context file and the `repo-flow-context` slot retired; the `start` skill holds the runtime facts, and nothing to start is `app.start: null`. |
| 2026-09-15 | The flow context file moved from `.claude/` to `.devbook/` — superseded the same day by its retirement. |
| 2026-09-07 | `config.local.json` overlay: gates append, three policy keys and `components` refused. |
| 2026-09-07 | The file moves from `.github/ai-agent-stack.json` to `.devbook/config.json`, no fallback. |
| 2026-09-03 | One committed file holds the engine's four keys and every component's stamp. |
