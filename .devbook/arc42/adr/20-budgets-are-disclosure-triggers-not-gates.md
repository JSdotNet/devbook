# 20. Budgets Are Disclosure Triggers, Not Gates

```meta
date: 2026-09-05
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/tdr/1-body-budgets-unenforced.md", ".devbook/domain/plugin-authoring/features.md#stay-within-budget", ".devbook/arc42/adr/4-no-generated-sync-layer.md"]
```

[Debt record 1](../tdr/1-body-budgets-unenforced.md) measured the body budgets at eleven percent
compliance and recommended restoring the disclosure rule `CLAUDE.md` had dropped in the port.
This is that remediation, and one step past it.

The budget stays, as what the authoring rule — `spec-conciseness.instructions.md` then,
`AUTHORING.md` since — already calls it: the trigger for
a disclosure decision, not a hard limit. Past it, an author moves on-demand reference behind a
pointer, splits the asset by branch, or states why it must be long. The step past the record's
recommendation is where the reason is stated for the assets that are long by kind rather than
by accident:

| Kind | Why it exceeds by nature |
| --- | --- |
| `flow-*`, `phase-*`, `fleet-*`, `schedule-*` skills | A staged procedure is read once per run and every stage of it is safety-critical prose — gate wording, what a stage returns, what happens when a step fails — which the terseness rule exempts. |
| `assets/spec-kinds/<kind>.md`, read by `sync-specs`, `apply-change`, and `verify-change` — the `to-spec-*` and `from-spec-*` skills until [record 69](69-the-converters-are-three-skills-named-after-openspec.md) | Each carries the full mapping between one chapter kind and code, and a mapping stated by half is wrong. |
| A plugin rule (`devbook-*.md`) and a `resources/` contract (`surface-contract.md`, `flow-*.md`, `schedule-catalog-contract.md`) — `*.instructions.md` when this was written | A schema or a contract is the single source the conciseness rule tells everything else to point at; it cannot itself be a pointer. |
| The `flow-runner` agent | It is a session's main loop and carries its own invocation contract. |

For those kinds the reason is stated here, once, and not repeated at the top of a hundred
files. The record's own evidence supports the split: the plugin that owns the rule meets it at
a median of 28 lines, and the four that miss it by four to ten times are exactly the ones made
of staged procedures and contracts. Everything else over budget — at the time, a specialist's
how-to skills, the pull-request lane, the two profile skills — is owed a trim or a reason line
in the file, and `tools/check-assets.mjs --budgets` is the list.

Consequence: the number in `AGENTS.md` is a review prompt and not a gate the checker fails on.
An asset that grows past its budget is asked what it disclosed and why, not refused. The debt
record moves to `in-progress` rather than `resolved`, because the assets outside the four
kinds have not yet said why. If the table ever needs a fifth row, the budget is the wrong tool
for that kind and should say so.
