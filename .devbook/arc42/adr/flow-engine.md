# Flow Engine

```meta
date: 2026-09-15
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#roles-and-services", ".devbook/arc42/05-building-block-view.md#stack-config", ".devbook/arc42/08-crosscutting-concepts.md#extension-point", ".devbook/arc42/08-crosscutting-concepts.md#gate", ".devbook/arc42/08-crosscutting-concepts.md#tracker", ".devbook/arc42/08-crosscutting-concepts.md#role", ".devbook/arc42/08-crosscutting-concepts.md#mcp-server", ".devbook/arc42/building-blocks/delivery.md#pull-request-lane", ".devbook/arc42/adr/configuration.md", ".devbook/arc42/adr/plugin-boundaries.md"]
```

`delivery` is a flow engine: four flows named for what changes — `flow-code`, `flow-spec`,
`flow-update-packages`, `flow-project` — over a closed set of eleven extension points, seven
services and four chores, that a repository fills and never extends. Everything a flow talks to
outside the engine is a binding resolved at run time — a tracker, a role, an MCP server, a
surface — never a dependency, and never named by its provider inside a skill. The runner
prepends Update Base to every run, holds every gate, and commits at the handback. `verify` is
the spec check after the pull request; `validate` is the build and the suites.

## Why

```meta
```

**The point set is closed.** Configuration chooses among behaviour the engine implements. A
stage is a prompt, not a program, so a per-repository stage DSL either drops the prose or buries
paragraphs in JSON, and re-creates once per repository the drift that merging 27 duplicated
skills removed. A repository that needs a different shape writes a repo-native `flow-*` skill,
which takes precedence and still reuses the phases. A new point is added here, deliberately, or
not at all — `verify` was added and `docs.update` removed in one change, and the count held.
The points, the gates, the config, the host slots, and the surface capability are one contract
file, because a run reads them all at the same moment.

**A binding, not a name.** The closing phase is Work Item Update, not GitHub Issue Update:
GitHub issues, Jira tickets, and Markdown chapters are three implementations of `find_item`,
`read_item`, `create_item`, `comment`, `transition`, and `link_change`. The same rule reaches
a skill's own id and its commands — the two pickup skills name the operations, and the
pull-request lane states the `pr-lane` slot read before its first command and what unbound
means. MCP servers bind per point in `bindings["delivery.mcp"]`, resolved from the live tool
list at the stage that uses them, one reported once and the stage continuing without it; keyed
by point because the set is closed and a stage name is a skill's own. Roles are seven and
closed: `docs` joined because the documentation phase ran in nine flows with no owner a
repository could point at.

**Flow control lives in one place per run.** Personal Validation's review handoff is a
`phase-*` skill, because it is a procedure every flow runs identically and it loads late; the
gate — approve, revise, decline — stays with the runner, because a skill that could record an
approval is a second place. Raising a pull request is a phase and not a skill: one command over
arguments the run computed, and the `deliver` service point is the seam a repository binds for
a different shape. Update Base is prepended by the runner rather than named in each flow, since
the opening phase is identical everywhere and the closing tier is not; it rebases while the
branch is private, blocks on a conflict, never stashes, and honestly skips. With
`policy.commit.at: gate` the handback is the commit point — one commit per validation round,
never amended — so a reviewer reads what the user was asked to approve.

**The engine owns the capture contract; the repository owns the procedure.** The evidence rules
lived in an external QA plugin, so the phase that guarantees evidence could only hope one was
installed. `resources/capture-contract.md` holds with no QA plugin bound, and an unavailable
capture marks the stage `blocked`. Capture is not an extension point — the guardrail is as
strong either way and adding a point later is easy. How one product's application comes up is
prose, seeded as `start` and `capture` skills under `.agents/skills/` that the repository edits.

**Four flows, named for what changes.** Sixteen names drew lines the bodies did not: the three
`create-*` flows were `flow-feature` with a stage added, the five folder flows shared four
stages line for line, and each escalated to the other when Scope Discovery found the request was
"really" another kind. The kind is settled inside the flow; the folder still picks the role and
the role the model. There is no fallback because nothing is left to fall through, and the folder
flows restate none of devbook's rules — they load the repository's own instruction files.

**Verification, not Documentation Update.** Build & Test, QA, and the point behind them answer
*does it run*; nothing answered *is it what we agreed*. `verify` is that check, one verdict per
item — `aligned`, `spec-ahead`, `code-ahead`, `conflict`, `unresolved` — after the pull request,
report-only, so a `spec-ahead` row is new work and never a loop back into implementation. It
replaces the phase that asked the runner to judge staleness with no evidence and then commit onto
a branch a reviewer was reading. The word follows OpenSpec's `verify-change`, which devbook's
own audit already used.

## Rejected

```meta
```

- A per-repository stage definition in config, and an open point set.
- Recording `gh` as the lane's assumed provider, or `capture` as a twelfth point.
- The gate as a skill; a commit per implementation pass; Update Base named per flow; merge
  instead of rebase on a private branch.
- Verification between QA and the gate: a gate input in a phase with no way to act on it,
  leaving the documentation refresh in place beside it.
- A `create-pull-request` skill: one command per host, and the file that goes stale first.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-15 | Sixteen flows become four, named for what changes; no fallback flow. |
| 2026-09-15 | `verify` is the spec check after the pull request; Build & Test serves `validate`; Documentation Update and `docs.update` removed. |
| 2026-09-09 | The pull-request skills read the `pr-lane` slot and say what unbound means. |
| 2026-09-09 | No `create-pull-request` skill; the phase opens the PR with the host's action or `gh`. |
| 2026-09-09 | The Personal Validation handoff is `phase-personal-validation`; the gate stays with the runner. |
| 2026-09-09 | `docs` is the seventh role, closing the set. |
| 2026-09-08 | The engine owns the capture contract; `start` and `capture` are seeded to the repository. |
| 2026-09-07 | MCP servers bind per point in `bindings["delivery.mcp"]`; no flow stops for MCP setup. |
| 2026-09-07 | Every run opens with Update Base, prepended by the runner. |
| 2026-09-07 | `policy.commit.at: gate` makes the handback the commit point. |
| 2026-09-03 | The tracker is a binding: Work Item Update, six operations, no provider in a phase or skill name. |
| 2026-09-03 | Points, gates, config, slots, and the surface capability in one contract file. |
| 2026-09-03 | Eleven extension points, closed; a repository writes a repo-native flow for another shape. |
