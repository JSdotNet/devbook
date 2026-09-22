# devbook-collaboration

Review, comment, and hand-off workflows over [devbook](../devbook) chapters.

An L1 extension: it depends on `devbook` and nothing else, and it owns no
schema and no state. What it remembers
about a chapter is devbook's own review triad — `review`, `reviewer`,
`review-at` in that chapter's `meta` block, validated by the check — and a
finding is one of devbook's own `annotation` fences, beside the passage it is
about. It ships five skills and
nothing else: no rule, no install, no hook, and no entry in the stamp. Enable
it and the five skills are there; a repository that never enables it can still
write the three fields by hand and is held to the same rules.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `devbook-collaboration` with `/plugin`. `devbook` is a declared
dependency, so the host installs and enables it alongside. There is nothing to
install into the repository.

## The pass

One chapter moves through five skills, and the state it carries always says who
owes the next move:

| Skill | Who runs it | Leaves behind |
|---|---|---|
| `chapter-handoff` | The author | `review: requested` and the reviewer's name, plus a brief to send |
| `chapter-review` | The reviewer | One annotation fence per finding, and `review: changes-requested`, or `review: cleared` with none open |
| `chapter-approve` | Whoever approves | devbook's `status: approved` with `approved-by` and `approved-at` — and no review state and no resolved note left on the chapter. Or, on an approval a person will not let stand over what was raised since it, the rung lifted and `review: changes-requested` |
| `chapter-accept` | Whoever accepts the built work | devbook's `status: accepted` with `accepted-by`, `accepted-at`, and `accepted-hash`, beside the approval record it stands on. Or, where the build does not satisfy the chapter, one annotation fence per gap and the rung left at `approved` |
| `chapter-review-queue` | Anyone | Nothing. It reads the folders and reports what is waiting — including an approval objected to since it was signed, and work awaiting acceptance |

Sweeping the answered notes is `devbook:annotation-sweep`, before the branch
merges. It is devbook's, because the fence is.

Approval is devbook's own field and keeps devbook's meaning. This plugin never
writes it without a person choosing it in that session, and clears the review
triad in the same change: an approved chapter carries the decision, not the
road to it. Acceptance is the same field one rung up, and the same rule:
`approved` says the specification is right, `accepted` says what was built
satisfies it, and neither is ever written from a summary or from silence.

## The state

Three fields, and no fourth: a finding is not state. All three are defined in
devbook's `devbook-chapter-metadata.md`, beside the approval triad they mirror.

| Field | Value |
|---|---|
| `review` | `requested` · `changes-requested` · `cleared` |
| `reviewer` | One handle, name, or role |
| `review-at` | `YYYY-MM-DD` |

```meta
status: draft
review: changes-requested
reviewer: @jsdotnet
review-at: 2026-09-03
```

Devbook's check holds the three to their meaning: written together or not at
all, `changes-requested` over at least one open note, `cleared` over none, and
none of them left on an approved chapter.

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

The reason the state is devbook's and not this plugin's is
`.devbook/arc42/adr/annotations.md`.
