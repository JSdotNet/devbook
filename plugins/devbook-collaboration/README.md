# devbook-collaboration

Review, comment, and hand-off workflows over [devbook](../devbook) chapters.

An L1 extension: it depends on `devbook` and nothing else. The state it
remembers about a chapter is three `ext.devbook-collaboration.*` keys in that
chapter's own `meta` block — the opaque namespace devbook carries through
untouched — and a finding is one of devbook's own `annotation` fences, beside
the passage it is about. It adds no field to devbook's schema and needs no
devbook release of its own. The one thing it puts in a repository is its own
rule, installed by
[`devbook-collaboration:install`](skills/install/SKILL.md) and stamped
under `components.collaboration`.

## Installation

```bash
claude plugin marketplace add JSdotNet/ai-agent-stack
```

Then enable `devbook-collaboration` with `/plugin`. `devbook` is a declared
dependency, so the host installs and enables it alongside.

## The pass

One chapter moves through four skills, and the state it carries always says who
owes the next move:

| Skill | Who runs it | Leaves behind |
|---|---|---|
| `chapter-handoff` | The author | `review: requested` and the reviewer's name, plus a brief to send |
| `chapter-review` | The reviewer | One annotation fence per finding, and `review: changes-requested`, or `review: cleared` with none open |
| `chapter-approve` | Whoever approves | devbook's `status: approved` with `approved-by` and `approved-at` — and no collaboration state and no resolved note left on the chapter |
| `chapter-review-queue` | Anyone | Nothing. It reads the folders and reports what is waiting |

Sweeping the answered notes is `devbook:annotation-sweep`, before the branch
merges. It is devbook's, because the fence is.

`devbook-collaboration:install` sits outside the pass: run it once when you enable the
plugin, and again after an upgrade. It installs `rules/chapter-collaboration.md`
as `.agents/rules/chapter-collaboration.md` with a wrapper per host beside it, so
both Claude Code and Copilot apply the contract when either opens a chapter —
rather than only when one of the four skills above names it by path.

Approval is devbook's own field and keeps devbook's meaning. This plugin never
writes it without a person choosing it in that session, and clears its own
namespace in the same change: an approved chapter carries the decision, not the
road to it.

## The state

Three keys, and no fourth: a finding is not state.

| Key | Value |
|---|---|
| `ext.devbook-collaboration.review` | `requested` · `changes-requested` · `cleared` |
| `ext.devbook-collaboration.reviewer` | One handle, name, or role |
| `ext.devbook-collaboration.review-at` | `YYYY-MM-DD` |

```meta
status: draft
ext.devbook-collaboration.review: changes-requested
ext.devbook-collaboration.reviewer: @jsdotnet
ext.devbook-collaboration.review-at: 2026-09-03
```

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
refuses an approval standing over one. Every write goes through devbook's
`tools/devbook-meta/annotations.mjs`; nothing here writes a fence itself.

The full contract — the three states, when a finding is a question rather than a
remark, and the rule that none of it is chapter content — is in
[`rules/chapter-collaboration.md`](rules/chapter-collaboration.md).
