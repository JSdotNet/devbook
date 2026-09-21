# Devbook Procedures

```meta
type: domain
related: [".devbook/domain/context-map.md#devbook-procedures", ".devbook/domain/devbook-procedures/context.md", ".devbook/arc42/adr/install.md"]
```

## Procedure

```meta
type: aggregate
aliases: [procedure skill, repository skill, seeded skill]
related: [".devbook/domain/devbook-procedures/domain.md#goal", ".devbook/domain/devbook-procedures/skills.md#install", ".devbook/domain/plugin-authoring/domain.md#plugin-rule"]
```

One of four named things a repository knows how to do and a plugin cannot: `start`, `show`,
`capture`, `debug`. In a repository it is three files — the body at
`.agents/skills/<name>.md`, and a wrapper per host at `.claude/skills/<name>/SKILL.md` and
`.github/skills/<name>/SKILL.md` — and one stamp entry per file under
`components.devbook-procedures.materialized`. The body is seeded once and is the
repository's from its first edit: a hash matching no shipped release marks it `managed:
false`, reported on every reconcile and never overwritten. The wrappers stay managed. A name
in the stamp's `adopted` list is a procedure the repository has; one dropped from the list
orphans its three files, reported and never deleted.

`show` is the one procedure that names two others: it invokes `start` and `capture` by name
and stops when either is absent. None is a dependency of anything.

## Goal

```meta
type: value-object
related: [".devbook/domain/devbook-procedures/domain.md#procedure", ".devbook/domain/context-map.md#published-languages"]
```

The one sentence a procedure must satisfy whatever its body says: what a caller gets back.
`start` leaves the application running and reports the command, the health verdict, and the
entry points; `show` puts the branch's feature in front of a reviewer with evidence cited by
path; `capture` returns one file per checkpoint and per failure, under the worktree root, the
form named honestly; `debug` names a cause and proves it, doing the debugging itself and
leaving nothing behind. It is the `goal` field of the plugin's seed, rendered into both
wrappers above the pointer, and refreshed on every upgrade. A repository edits the body to
meet it and never edits it.
