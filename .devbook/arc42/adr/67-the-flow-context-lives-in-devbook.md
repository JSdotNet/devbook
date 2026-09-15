# 67. The Flow Context Lives in devbook

```meta
date: 2026-09-15
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#stack-config", ".devbook/arc42/adr/11-the-stack-config-lives-in-devbook.md", ".devbook/arc42/adr/41-a-session-start-hook-fires-only-where-the-repository-adopted-the-plugin.md"]
```

**Superseded, 2026-09-15** by [The start Skill Holds the Runtime Facts](68-the-start-skill-holds-the-runtime-facts.md):
the file is retired, so where it lived no longer matters. The rule it applied — a file both
hosts read lives in neither host's folder — stands, and record 11 still carries it.

The optional flow context file is `.devbook/flow-context.md`. It was `.claude/flow-context.md`,
and the folder was wrong for the reason [the config move](11-the-stack-config-lives-in-devbook.md)
already gave: `.claude/` is one host's folder, and a file both hosts read does not belong in
either one's. The config left `.github/` on that rule; the context file stayed behind in the
other host's folder, which is the same mistake with the hosts swapped.

It lands beside `.devbook/config.json` rather than anywhere else because the two are read by
the same runner at the same moment and answer neighbouring questions — the config says which
provider starts the application and how deep QA may go, the context file says what the
application is and where it answers. A repository that wants to find one wants to find the
other. `.devbook/` now holds two non-chapter files instead of one; the folder's meaning is the
same as record 11 left it, the chapters plus the wiring, and `devbook:install` still owns
nothing in it but the chapter folders.

**The path is a convention, not a slot change.** `repo-flow-context` still resolves to the
file by convention or to whatever a repository binds, so a binding to the old path keeps
working and is now merely redundant. Records [41](41-a-session-start-hook-fires-only-where-the-repository-adopted-the-plugin.md),
[46](46-the-engine-owns-the-capture-contract-the-repository-owns-the-procedure.md), and
[56](56-payload-only-components-carry-no-contract-version.md) name the old path as it stood
when they were taken; none of them turned on where the file was, so none is superseded.

Consequence: **a repository that authored the file in `.claude/` has a context file nothing
reads.** There is no fallback, for the reason record 11 refused one — two supported paths is
two places for a repository to disagree with itself. The failure is loud rather than silent:
`devbook-config`'s report names the old file while it exists, and `devbook-config:update`
triggers on it. `delivery` ships no migration folder by design
([56](56-payload-only-components-carry-no-contract-version.md)), and this file is the
repository's own authoring rather than something an install materialized, so the move is one
`git mv` the report asks for rather than a ledger entry. The session-start hook keeps the old
path as a third existence probe, per record 41: a probe is not a supported path, and a
repository that has not moved the file yet should not also lose its routing context.
