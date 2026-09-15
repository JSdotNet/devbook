# 67. The Converters Are Three Skills Named After OpenSpec's Verbs

```meta
date: 2026-09-15
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/20-budgets-are-disclosure-triggers-not-gates.md", ".devbook/arc42/adr/34-flows-belong-to-delivery.md", ".devbook/arc42/tdr/6-sync-specs-borrows-a-name-openspec-uses-for-something-else.md", ".devbook/domain/devbook/domain.md#spec-converter", ".devbook/domain/devbook/skills.md#sync-specs", ".devbook/domain/devbook/flow.md"]
```

The ten `to-spec-<kind>` and `from-spec-<kind>` skills become three — `sync-specs`,
`apply-change`, and `verify-change` — and the kind stops being part of the name. A skill is
now a direction; the kind is read off the chapter's `type`, or off the file where `.arc42` and
`.design` define none, and what a kind needs is one file under `assets/spec-kinds/`, read by
all three.

**The names are [OpenSpec's](https://openspec.dev/docs/skills), where the match is real.**
OpenSpec's `apply-change` is the one skill of its twelve that writes source: it takes the
planned tasks and implements them. That is what `from-spec-<kind>` was for — an agreed chapter
becomes code — so it takes the name. OpenSpec's `verify-change` audits an implementation
against what was agreed and is report-only; the resolve-and-verdict step both directions here
already opened with is the same audit, so it takes that name and becomes a skill of its own.
OpenSpec's `propose` was considered for the spec-to-code direction and rejected: there it
*produces* the spec delta from an idea, and here the chapter is the input, so the name would
read backwards to exactly the reader it was meant to help. The third name, `sync-specs`, is
approximate — OpenSpec has no skill that reads code to update specs, its `sync-specs` merges
deltas a proposal already wrote — and [debt record 6](../tdr/6-sync-specs-borrows-a-name-openspec-uses-for-something-else.md)
holds the alternative, `capture-specs`, for later.

**Why the kind left the name.** Ten skills carried one procedure ten times. The direction was
the same across five kinds — resolve the counterpart, read code and tests, reach a verdict,
write or brief or stop — and the kind-specific part was a mapping table and a handful of rules,
which each pair restated from its two ends: the evidence column when capturing, the
requirements column when applying. That made twenty half-mappings where five whole ones would
do, and every change to the shared procedure was a change owed in ten files. A skill per
direction with the kind in a shared file is the shape the content had all along.

**`apply-change` hands the brief to a flow, and that reverses a rule.** `from-spec-<kind>`
emitted its change brief and stopped, and the protocol, `flow.md`, and every kind said so:
no skill here names a code-side flow, and which flow picks a brief up is the user's decision.
The name `apply-change` promises implementation, and a skill that stops one step short of its
name is the misnomer this decision exists to remove. So the brief now goes where the chapter
goes: the spec-side write already resolves through a repo-native `flow-*` skill, then the
engine's `flow-<folder>`, then directly — and the code-side write resolves the same way, a
repo-native flow first, then the engine's flow for the change category (`flow-feature` for new
functionality and a change to existing behaviour, `flow-bug` for a defect), and nowhere when
no engine is installed, which is where the old behaviour survives as the last rung. The brief
is unchanged and is the flow's approved specification. What
[record 34](34-flows-belong-to-delivery.md) protects still holds: devbook ships no flow, the
brief reaches a flow as ordinary input, and no flow knows these skills exist.

**What does not change.** The aggregate is still the unit, briefed and captured whole; a domain
service is still its own kind; the feature kind still runs the application when capturing, and
only then. `apply-change` still edits no source or test tree itself and keeps
`disable-model-invocation`: implementation is asked for, never volunteered.

Consequence: [record 20](20-budgets-are-disclosure-triggers-not-gates.md)'s row for the
converters moves from the skills to the kind files, which are the assets that are long by kind
now — a mapping stated by half is still wrong, and it is stated once. The three skills sit at
or near the forty-line budget. A consumer invoking a `to-spec-*` or `from-spec-*` name finds it
gone; `UPGRADING.md` says what to call instead, and nothing in a repository's devbook folders
moved, so no migration ships.
