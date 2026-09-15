# 67. The Converters Are Three Skills Named After OpenSpec's Verbs

```meta
date: 2026-09-15
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/20-budgets-are-disclosure-triggers-not-gates.md", ".devbook/domain/devbook/domain.md#spec-converter", ".devbook/domain/devbook/skills.md#sync-specs", ".devbook/domain/devbook/flow.md"]
```

The ten `to-spec-<kind>` and `from-spec-<kind>` skills become three — `sync-specs`,
`propose-change`, and `verify-change` — and the kind stops being part of the name. A skill is
now a direction; the kind is read off the chapter's `type`, or off the file where `.arc42` and
`.design` define none, and what a kind needs is one file under `assets/spec-kinds/`, read by
all three.

**The names are [OpenSpec's](https://openspec.dev/docs/skills).** `sync-specs` is what OpenSpec
calls the move where the specs catch up with what is true; `propose` is what it calls producing
the proposal without applying it; `verify-change` is its audit of an implementation against what
was agreed. Those are the three moves this plugin makes, and borrowing the vocabulary of the
tool most people will have met first costs nothing and saves a reader one translation. The
`-change` suffix on two of the three follows OpenSpec's own pattern of naming the object where
the verb alone is ambiguous, and `propose-change` rather than the bare `propose` because the
output here is a change brief and never a chapter.

**Why the kind left the name.** Ten skills carried one procedure ten times. The direction was
the same across five kinds — resolve the counterpart, read code and tests, reach a verdict,
write or brief or stop — and the kind-specific part was a mapping table and a handful of rules,
which each pair restated from its two ends: the evidence column when capturing, the
requirements column when proposing. That made twenty half-mappings where five whole ones would
do, and every change to the shared procedure was a change owed in ten files. A skill per
direction with the kind in a shared file is the shape the content had all along.

**Why a third skill.** Both directions already opened with the same resolve-and-verdict step
and stopped on `aligned`; a pass that only wanted the verdict had to invoke a skill that might
write. `verify-change` is that step on its own — the report table and nothing else — and it is
the honest answer to "is this chapter still true", which was the most common reason to reach
for the converters and the one neither name described.

**What does not change.** The aggregate is still the unit, briefed and captured whole; a domain
service is still its own kind; the feature kind still runs the application when capturing, and
only then. The protocol in `assets/code-sync-protocol.md` is unchanged in substance and gains
one column. `propose-change` keeps `disable-model-invocation`: a brief is asked for, never
volunteered.

Consequence: [record 20](20-budgets-are-disclosure-triggers-not-gates.md)'s row for the
converters moves from the skills to the kind files, which are the assets that are long by kind
now — a mapping stated by half is still wrong, and it is stated once. The three skills sit at
or near the forty-line budget. A consumer invoking a `to-spec-*` or `from-spec-*` name finds it
gone; `UPGRADING.md` says what to call instead, and nothing in a repository's devbook folders
moved, so no migration ships.
