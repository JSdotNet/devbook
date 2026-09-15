# 71. The start Skill Holds the Runtime Facts

```meta
date: 2026-09-15
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#stack-config", ".devbook/arc42/05-building-block-view.md#host-slots", ".devbook/arc42/adr/46-the-engine-owns-the-capture-contract-the-repository-owns-the-procedure.md", ".devbook/arc42/adr/70-the-flow-context-lives-in-devbook.md", ".devbook/domain/delivery/dependencies.md"]
```

The flow context file is retired, together with the `repo-flow-context` slot. A repository
declares how its application starts, where it answers, what a healthy start looks like, and
where a test credential lives in the `start` skill it already owns — `.agents/skills/start.md`,
seeded by `delivery:install` — and declares that there is nothing to start by binding
`extensions.app.start` to `null`.

The file had eight sections, and reading them one by one is what retired it. Three were
already answered elsewhere and said so themselves: `## QA Depth` yielded to `policy.qa.depth`,
`## MCP Servers` was "informational only" beside `.mcp.json` and `bindings["delivery.mcp"]`,
and `## Repo-Native Flow Skills` named skills the picker "still discovers normally". One
line, `**Runnable application:** none`, spelled in Markdown what the config already spells as
`null` — deliberately unbound, somebody decided no. What remained was the genuine content —
the AppHost, the command, the readiness signals, the entry points, the credential pointer —
and every one of them is a fact the `start` procedure consumed in its next line: the command
it runs, the signals it waits for, the URL it opens, the pointer it follows to sign in. Two
files, one of which existed to be read by the other, with a rule for which wins when they
disagree.

**Why the skill and not the config.** The facts are data — a path, a command, three URLs —
and a `runtime` key was the obvious other home. It was refused on the engine's own line:
configuration chooses among behaviour the engine implements, and how one product's
application comes up is prose the repository owns, which is the whole reason `start` is
seeded rather than configured
([46](46-the-engine-owns-the-capture-contract-the-repository-owns-the-procedure.md) for
`capture`, and the README for both). A readiness signal or a credential pointer is a
sentence; a stage judges it, it does not switch on it. The config keeps its four keys, and
the forty places that say "four" stay true.

**What a provider that is not `start` gets.** When `app.start` is bound to a plugin — an
Aspire runner, say — the flow-runner names the `start` file to it and to QA Validation as the
repository's declared facts, and the `app.start` result carries base URLs and a health
verdict forward as its contract already said. The runner reads nothing itself; a run with no
`start` file discovers, as it did with no context file.

Consequence: **a repository that authored the file has one nothing reads, and a repository
that bound the slot fails the check.** Neither is silent. `devbook-config`'s report names a
`flow-context.md` at either path it ever lived at, and an unknown slot key is rejected by
name. The `start` seed gained four sections, so a copy a repository never edited is replaced
on the next reconcile, and an edited one is reported as customized and left for its owner
to extend. `delivery` ships no migration folder, by
[56](56-payload-only-components-carry-no-contract-version.md); the report and the check are
the instruction. [70](70-the-flow-context-lives-in-devbook.md) moved the file that morning
and is superseded by this the same day — the rule it moved under is record 11's and stands.
