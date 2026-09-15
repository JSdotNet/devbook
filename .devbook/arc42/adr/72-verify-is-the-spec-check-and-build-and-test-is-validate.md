# 72. verify Is the Spec Check, and Build & Test Is validate

```meta
date: 2026-09-15
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/9-the-point-set-is-closed.md", ".devbook/arc42/adr/69-the-converters-are-three-skills-named-after-openspec.md", ".devbook/arc42/adr/34-flows-belong-to-delivery.md", ".devbook/arc42/adr/49-the-role-set-has-seven-members.md", ".devbook/arc42/adr/64-1-0-0-is-the-first-release.md", ".devbook/domain/delivery/flow.md", ".devbook/domain/delivery/domain.md#extension-point", ".devbook/domain/devbook/skills.md#verify-change"]
```

The service point Build & Test serves — the build and the suites, looping with `implement`
under a retry budget — is `validate`, not `verify`. `verify` is a service point of its own,
and the phase behind it, **Spec Verification**, takes the place Documentation Update held: after
Create Pull Request and before Work Item Update, in the code-modifying tier. It checks the
change set against the specification the run built on and the governed chapters the change set
touches, and returns one verdict per item — `aligned`, `spec-ahead`, `code-ahead`, `conflict`,
`unresolved` — with the evidence that settles it and what each row calls for. Documentation
Update, the `docs.update` chore point, and `policy.phases.documentationUpdate` are gone; the
point set has seven services and four chores, eleven as before.

**The two words were doing one job, and the job that had no word was the one that mattered.**
Build & Test, QA Validation, and the point behind them all answer *does it run*: green build,
passing suites, a healthy application, scenarios with evidence. None of them answers *is it
what we agreed*. OpenSpec draws the line the same way: `apply-change` implements, and
`verify-change` audits the implementation against what was agreed, report-only.
[Record 69](69-the-converters-are-three-skills-named-after-openspec.md) took that name for
devbook's own audit, so `verify` in this marketplace already meant the spec check everywhere
except in the engine, where it meant the build. Renaming the build point is the cheaper of the
two ways to stop the word meaning two things, and *validate* is what the phase beside it was
already called.

**It replaces Documentation Update because it answers the same question better.** That phase
asked the flow-runner to *decide whether documentation is now stale* by comparing the landed
change set against everything the repository governs, with nothing to compare it to but its own
judgment — then to write, commit, and push onto a branch a reviewer may already be reading,
under four bullets of rules about not rewriting its history. A verdict per item against a
specification and a chapter is that decision with evidence, and a report needs none of the
commit rules: the phase edits nothing and commits nothing, so the pull-request branch is exactly
as the reviewer found it. A `code-ahead` row is what "the documentation is stale" was trying to
say, and now says which chapter and why; the chapter change itself is work for the flow that
owns the folder, which is where [record 34](34-flows-belong-to-delivery.md) put it. The `docs`
role of [record 49](49-the-role-set-has-seven-members.md) stays, for the stages that still name
it; the chore point that came with it goes, because a chore may not change an outcome and this
one must produce the outcome the reviewer reads. A repository that bound `docs.update` moves
the entry to `flow.end`, as this one does.

**It runs after the pull request, not before the gate.** The verdict lands in the pull request
body and the work item comment, which is where a reviewer looks, and the run is past its gate
when it is produced — so a `spec-ahead` row is new work with its own scope and never a loop
back into Implementation. That keeps `implement` and `validate` the run's only cycle, and keeps
the phase what devbook's skill is: a report. The alternative placement, between QA Validation
and Personal Validation so the person decides with the verdict in hand, was built and set aside
the same day: it made the verdict a gate input in a phase that had no way to act on it, and it
left the documentation refresh in place — two phases asking one question.

**The engine names no provider, and devbook's skill is the obvious binding.** The point has no
default: unbound, the flow-runner reaches the verdicts itself, with the reading delegated to a
read-only sub-agent per the delegation order. `delivery` still names no devbook skill;
`devbook:verify-change` appears only where a repository binds it — this repository's config, and
the template as a sample value beside the devbook chores it already names. The documentation
tier does not run the phase: a chapter is the specification, so there is nothing to verify it
against.

[Record 9](9-the-point-set-is-closed.md) said a point is added deliberately or not at all; this
is one added and one removed, and the count is unchanged.

Consequence: `extensions.validate`, `policy["validate.retryBudget"]`,
`bindings["delivery.mcp"].validate`, and a gate `at: "validate"` replace the `verify` spellings;
`extensions.verify`, `bindings["delivery.mcp"].verify`, and a gate `at: "verify"` now mean the
spec check; `docs.update` is rejected as an unknown key, and `phases.specVerification` replaces
`phases.documentationUpdate`. The plugin stays at 1.0.0 and `UPGRADING.md` carries no entry:
1.0.0 is installed nowhere but here, whose config moved in the same commit, so this lands in the
baseline the way [record 64](64-1-0-0-is-the-first-release.md) folded everything before it, and
no migration ships. Every code-modifying flow's `start_run` stage list swaps the stage;
`flow-phases.md` defines it in full, and no phase skill is added, so the manifests still count
three. The model category is its own, resolved to `opus`: calling drift `aligned` leaves a wrong
pull request open.
