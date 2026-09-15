# 72. verify Is the Spec Check, and Build & Test Is validate

```meta
date: 2026-09-15
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/9-the-point-set-is-closed.md", ".devbook/arc42/adr/69-the-converters-are-three-skills-named-after-openspec.md", ".devbook/arc42/adr/34-flows-belong-to-delivery.md", ".devbook/arc42/adr/50-personal-validation-is-a-phase-skill-and-the-gate-is-not.md", ".devbook/domain/delivery/flow.md", ".devbook/domain/delivery/domain.md#extension-point", ".devbook/domain/devbook/skills.md#verify-change"]
```

The service point Build & Test serves — the build and the suites, looping with `implement`
under a retry budget — is `validate`, not `verify`. `verify` is a new point, the twelfth in the
closed set and the seventh service: **Spec Verification**, a phase the code-modifying tier runs
after QA Validation and before Personal Validation, which checks the change set against the
specification the run built on and returns one verdict per item — `aligned`, `spec-ahead`,
`code-ahead`, `conflict`, `unresolved` — with the evidence that settles it.

**The two words were doing one job, and the job that had no word was the one that mattered.**
Build & Test, QA Validation, and the point behind them all answer *does it run*: green build,
passing suites, a healthy application, scenarios with evidence. None of them answers *is it
what we agreed*. A run could take an approved specification in at Stage 1, build something
adjacent to it, pass every suite, and reach the gate with the person the only check left —
and the handoff gave that person the code review and the QA evidence, which are answers to the
first question again. OpenSpec draws the line the same way: `apply-change` implements, and
`verify-change` audits the implementation against what was agreed, report-only.
[Record 69](69-the-converters-are-three-skills-named-after-openspec.md) took that name for
devbook's own audit a week ago, so `verify` in this marketplace already meant the spec check
everywhere except in the engine, where it meant the build. Renaming the build point is the
cheaper of the two ways to stop the word meaning two things, and *validate* is what the phase
beside it was already called.

**It sits last before the gate, and it repairs nothing.** The verdict is what the person
decides on, so it is reached before Personal Validation and never after it — a `spec-ahead`
row found after the pull request is open is the drift Documentation Update exists to prevent,
one phase too late. And it is report-only, as devbook's skill is: the phase is `done` whatever
the verdicts say, edits no source, test, or chapter, and never loops back to Implementation.
`implement` and `validate` stay the run's only cycle; a verdict becomes work through `revise`
at the gate, which carries the person's notes and is bounded by the revise budget, rather than
through a second cycle with a budget of its own. The alternative — a `verify` failure re-opening
`implement` the way a red build does — was rejected because a spec verdict is a judgment, not a
test result: `code-ahead` is often the right outcome, and `conflict` is by definition the case
nobody should resolve by picking a side.

**The engine names no provider, and devbook's skill is the obvious binding.** The point has no
default provider: unbound, the flow-runner reaches the verdicts itself against the run's own
specification record — the `spec` stage's output and the acceptance criteria Scope Discovery
derived — with the reading delegated to a read-only sub-agent, per the delegation order.
[Record 34](34-flows-belong-to-delivery.md) still holds: `delivery` names no devbook skill, so
`devbook:verify-change` appears only where a repository binds it — this repository's config, and
the template as a sample value beside the two devbook chores it already names. The documentation
tier does not run the phase: a chapter is the specification, so there is nothing for it to be
checked against.

**Why a point and not a chore.** A chore may not change an outcome, and this one must: its
verdict table is part of what the mandatory gate presents, and the handoff skill of
[record 50](50-personal-validation-is-a-phase-skill-and-the-gate-is-not.md) lists it beside the
code review and the QA review. [Record 9](9-the-point-set-is-closed.md) said a point is added
to the closed set deliberately or not at all; this is the first addition since the set was
declared, and the reason is that no provider, gate, or policy switch could put an answer to
*is it what we agreed* in front of the person at the gate.

Consequence: `extensions.validate`, `policy["validate.retryBudget"]`,
`bindings["delivery.mcp"].validate`, and a gate `at: "validate"` replace the `verify` spellings,
and `delivery`'s `UPGRADING.md` carries the table — with the warning that three of the four old
spellings are now valid keys naming the new point, so a stale binding is silently a different
binding. No migration ships: the plugin is installed nowhere but here, whose config moved in the
same commit, and `delivery` has no migration ledger yet — the first consumer install is where
[record 64](64-1-0-0-is-the-first-release.md)'s obligation starts to bite. Every code-modifying
flow's `start_run` stage list gains the stage; `flow-phases.md` defines it in full, and no phase
skill is added, so the manifests still count three. The model category is its own, resolved to
`opus`: calling drift `aligned` ships a wrong pull request.
