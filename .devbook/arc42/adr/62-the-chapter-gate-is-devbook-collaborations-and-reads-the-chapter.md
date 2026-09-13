# 62. The Chapter Gate Is devbook-collaboration's, and It Reads the Chapter

```meta
date: 2026-09-14
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/7-approved-is-a-status-rung.md", ".devbook/arc42/adr/19-a-role-plugin-holds-no-flow-control.md", ".devbook/arc42/adr/29-automation-owns-the-_meta-refresh.md", ".devbook/arc42/adr/50-personal-validation-is-a-phase-skill-and-the-gate-is-not.md", ".devbook/arc42/tdr/4-delivery-depends-on-devbook.md", ".devbook/arc42/tdr/5-derived-index-is-not-optional.md", ".devbook/domain/devbook-collaboration/domain.md#approval", ".devbook/domain/devbook-collaboration/dependencies.md"]
```

The gate that shows a chapter with its open notes, takes approve, revise, or decline from a
person, and writes `status: approved` is `devbook-collaboration:chapter-approve`, in the L1
extension. It is not in the flow engine, and it reads the chapter rather than the derived
`_meta/annotations.json`.

The annotation design intended otherwise. It put the gate in the engine, reading the derived
index the way any consumer of generated output does, so that devbook would learn nothing about
the gate and the engine nothing about devbook's schema; `annotations-index.mjs` named "the
approval gate rendering the objections raised since `approved-at`" as one of the index's
readers. This repository built the gate in L1 and never said why. Two reasons, in the order
they decide it.

**The gate writes what it decides, and the engine may not write it.**
[Record 7](7-approved-is-a-status-rung.md) puts the decision in the chapter, as devbook's own
`status: approved` with `approved-by` and `approved-at`. Delivery reads that rung and never
writes it — [its dependency table](../../domain/devbook-collaboration/dependencies.md) has the
two contexts at Separate Ways for exactly that reason, and the coupling delivery already has to
devbook is logged as [debt](../tdr/4-delivery-depends-on-devbook.md), not something to add to.
A gate in the engine would either write three devbook fields from the plugin that claims to
know none of devbook's schema, or decide in one layer and write in another across a boundary the
two never cross. Deciding and recording the decision is one operation, and it lives where the
writer is.

**A chapter is approved outside a run more often than inside one.** An engine gate attaches to
a point in a run: the `spec` approval gate shows the run's artifact and records `approval` in
run context, which is a decision about *this run continuing*, not about the chapter's standing
in the repository. A reviewer approving a specification in an editor session, or after reading
a pull request, is in no run at all. [Record 19](19-a-role-plugin-holds-no-flow-control.md)
and [record 50](50-personal-validation-is-a-phase-skill-and-the-gate-is-not.md) keep a run's
gate in one place per run; record 7 keeps a chapter's decision in one place per chapter. Those
are two places, deliberately, because they decide two different things.

**What follows for the derived index.** The gate reads the chapter through
`annotations.mjs list`, not `_meta/annotations.json`. It has to load the chapter anyway — the
first step shows the chapter itself, because a person cannot approve what they have not read —
and every fact the gate needs is in that one file: each note's `date`, `kind`, and `status`,
and the chapter's own `approved-at`. An index over the corpus buys nothing for a one-chapter
read, and it costs the freshness rule: the index is refreshed by the nightly schedule
([record 29](29-automation-owns-the-_meta-refresh.md)), so the notes a reviewer wrote a minute
ago on this branch are exactly the ones it lacks, and the derived-artifacts convention would
have the consumer stat the chapter and re-read it — the read it already does. The index is for
the reads that span chapters: `chapter-review-queue`, a badge on a graph node, an inbox. So the
first in-repository consumer that [debt record 5](../tdr/5-derived-index-is-not-optional.md)
waits for is not this one, and that record says so.

Consequence: the engine shows no chapter's notes at its own gates, and learns nothing new. Where
a run's output is a chapter, the flow's Check & Review stage runs devbook's `--check`, which is
what reports an approval standing over an open question; the run's gate then decides the run.
Where a run builds *from* a chapter, devbook's own `from-spec-<kind>` reads the chapter's status
and stops on an open question, so the objection reaches the person before the build rather than
through the engine.
