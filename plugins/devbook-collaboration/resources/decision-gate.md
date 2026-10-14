---
name: decision-gate
description: The gate both recorded decisions on a devbook chapter or change follow — approval and acceptance alike. What a decision is, where it may be written, its three outcomes, why silence never decides, and how its fingerprint is taken and lifted.
---

# Decision gate

`chapter-approve` and `chapter-accept` each record one decision a person makes in the session:
`approved` says the specification is right, and `accepted` says what was built satisfies it.
Each skill is the one place its rung is written, and the rung is never written without a person
choosing it in this session. Both skills follow this file at every step.

## Where a decision may be written

Both rungs sit on `domain/`'s ladder and on a change's `proposal.md`, and nowhere else, per
`devbook-chapter-metadata.md`. Asked to record one on any other chapter, say so and stop:
writing it there fails devbook's check. A target under `openspec/changes/<name>/` is a change,
and the skill's *On a change* section applies.

`status` and the record fields beside it — `approved-by`, `approved-at`, `approved-hash`,
`accepted-by`, `accepted-at`, `accepted-hash` — are devbook's, defined in
`devbook-chapter-metadata.md`. A finding is an annotation fence, per `devbook-annotations.md`.
The chapter carries no review state of its own: its open fences are what the review left.

## Show, then say what stands in the way

Show the thing being decided itself, never a summary of it, because a summary is not what is
being approved or accepted. Then state plainly every condition in the skill's own table. Only
the rows the skill names as blocking stop the decision; every other row is something the person
weighs. State them, and let the person choose.

## Three outcomes, and no default

Ask for the decision and wait for it. Each gate has three outcomes: one records the rung; one
sends the work back, writing each objection as one annotation fence with `--author` set to the
person who raised it; and decline. Declining leaves the chapter exactly as it is and records
nothing on it, because a chapter nobody decided on is the ordinary case. Report the reason to
the user and stop.

The record names the person who just chose the outcome — never the reviewer by default, and
never you. Write the rung and its whole record in one change, and never one without the other:
devbook's check reports either half left alone.

## Silence never decides

Never infer a decision from silence, from a cleared review, from a green suite, from a merged
pull request, or from the chapter or the work looking finished. Never decide on your own
judgment, however clear the chapter or however green the suite. If nobody answers — an
unattended run, a scheduled job — stop and report the chapter as awaiting the decision. That is
the whole point of the gate.

Never record a decision to unblock a flow or to close a work item. An undecided chapter parks
the run, and that is the designed outcome, not a failure to route around.

## The fingerprint

A decision is of what was read. Take its hash from
`node .devbook/_tools/devbook-meta/chapter-hash.mjs <path#slug>` — or `chapter-hash.mjs
openspec/changes/<name>` for a change — and never compute it yourself. A stored hash equal to
the fresh one means the content is unchanged; a different one means the decision has lapsed.
Write the hash with every new record. Leave it out only where the repository's other decided
chapters deliberately carry none, and say so; a change always carries it. Where a chapter
carries no hash, say that you are reading the file's history rather than the chapter's content,
and that a chapter in a busy file reads as changed when it is not.

When the content changed after a decision, the rung is no longer true and comes out: drop
`status` back to the chapter's ordinary rung, delete the record's fields in the same change, and
say what changed since. An acceptance stands on the approval, so lifting the approval lifts the
acceptance with it. Never decide again in the same breath: a new decision over new content
starts at the skill's first step.
