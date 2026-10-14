# devbook-collaboration

Review, comment, and hand-off workflows over [devbook](../devbook) chapters.

An L1 extension: it depends on `devbook` and nothing else, and it owns no
schema and no state. A review in progress is the chapter's `status` and its
open `annotation` fences — devbook's own device, one finding per fence beside
the passage it is about — and who owes the next move lives in the pull request
or the tracker, never in the chapter. The only fields it writes are devbook's
approval and acceptance rungs. It ships five skills and the one read-only
script the queue runs on: no rule, no install, no hook, and no entry in the
stamp. Enable it and the five skills are there; a repository that never
enables it reviews the same way by hand.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `devbook-collaboration` with `/plugin`. `devbook` is a declared
dependency, so the host installs and enables it alongside. There is nothing to
install into the repository.

## The pass

One chapter moves through five skills. Only a decision leaves a field behind:

| Skill | Who runs it | Leaves behind |
|---|---|---|
| `chapter-handoff` | The author | Nothing in the chapter. A brief naming the reviewer, to send through the pull request or the tracker |
| `chapter-review` | The reviewer | One annotation fence per finding. Any left open is changes requested; none is cleared |
| `chapter-approve` | Whoever approves | devbook's `status: approved` with `approved-by` and `approved-at`, and no resolved note left on the chapter. Or, on an approval a person will not let stand over what was raised since it, the rung lifted over the open notes |
| `chapter-accept` | Whoever accepts the built work | devbook's `status: accepted` with `accepted-by`, `accepted-at`, and `accepted-hash`, beside the approval record it stands on. Or, where the build does not satisfy the chapter, one annotation fence per gap and the rung left at `approved` |
| `chapter-review-queue` | Anyone | Nothing. It reads the folders and reports what is waiting — including an approval objected to since it was signed, and work awaiting acceptance |

Sweeping the answered notes is `devbook:annotation-sweep`, before the branch
merges. It is devbook's, because the fence is.

Approval is devbook's own field and keeps devbook's meaning. Both decision
rungs live on `domain/`'s ladder and on a change's `proposal.md`, so
`chapter-approve` and `chapter-accept` run on model chapters and on changes;
the review pass itself runs anywhere.

## On a change

A change under `openspec/changes/<name>/` goes through the same five skills
as one unit, per devbook's `devbook-changes.md`: its `proposal.md` and every
delta under `devbook-delta/` are shown together with their open notes, one
decision is taken, and it is written once, on `proposal.md`, with a hash that
covers the whole change. The chapters the deltas target get no rung — their
`change` provenance points at the archived proposal. `chapter-accept` on a
change also refuses until every step in `tasks.md` is done — every task
ticked in a commit — and the last `verify-change` verdict is
`aligned` for every delta it can verify, and devbook's
`delta.mjs --apply` refuses to merge a change that is not accepted. Deciding a
chapter outside a change is unchanged.
This plugin never
writes a rung without a person choosing it in that session, and sweeps the
answered notes in the same change: an approved chapter carries the decision,
not the road to it. Acceptance is the same field one rung up, and the same rule:
`approved` says the specification is right, `accepted` says what was built
satisfies it, and neither is ever written from a summary or from silence.

## The findings

One objection is one [annotation fence](../devbook/rules/devbook-annotations.md)
in the chapter body, beside the passage it is about — devbook's own device, so
this plugin adds nothing to reach it:

```annotation
kind: question
author: @jsdotnet
date: 2026-09-03
quote: refunds are accepted within 30 days
body: The 30-day window has no tests entry. Which test proves it?
```

`kind: question` is the one that blocks a decision: devbook reads an open
question as *this chapter is not agreed*, whatever `status` says, and its check
refuses an approval standing over one. `kind: flag` is the one the approver
reads first: the gate shows open notes flags-first and, on a chapter already
approved, names every note dated after `approved-at` as raised since the
approval — a reason to lift it, never a block. Every write goes through
devbook's `.devbook/_tools/devbook-meta/annotations.mjs`; nothing here writes a
fence itself, and the gate reads the chapter rather than the derived
index, so a note written on the branch a minute ago is already in front of the
person.

The reason the fence and the rungs are devbook's and not this plugin's is
`.devbook/arc42/adr/annotations.md`.

## The queue

[`scripts/review-queue.mjs`](scripts/review-queue.mjs) is what `chapter-review-queue`
runs, so the sort is deterministic rather than a model's reading of a table:

```bash
node scripts/review-queue.mjs --root <repository> [--json]
```

It reads `adopted` from devbook's stamp in `.devbook/config.json`, or the folders on
disk where there is none, and every open `openspec/changes/<name>/` but `archive/`. Of
each chapter it reads the `meta` and `annotation` fences and nothing else, never
`_meta/`, and sorts it into the first matching row of its `ROWS` table; a change is one
row over its proposal and every delta. A lapse is decided against `approved-hash` or
`accepted-hash` where the rung carries one, exactly, and otherwise against the last
commit over the chapter's heading range, and each row says which method answered. It
parses through the repository's own `.devbook/_tools/devbook-meta/` — the copy
`devbook:update` keeps — so its fingerprint is the value `chapter-hash.mjs` prints and
the check compares. It writes nothing, and exits `1` where those tools are missing.
