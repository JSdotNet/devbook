---
name: chapter-collaboration
description: How devbook-collaboration records review and hand-off state on a devbook chapter — the three ext.devbook-collaboration keys, the three review states, the rule that a finding is an annotation fence rather than a key, and the fact that approval stays devbook's.
---

# Chapter collaboration state

devbook-collaboration owns no field in devbook's schema. The state it remembers
about a chapter lives under `ext.devbook-collaboration.*` inside that chapter's
own `meta` block, which devbook carries through untouched, unvalidated, and
edge-free — see `devbook-chapter-metadata.md`. Never record any of
it as a new field beside `status`, and never read another plugin's `ext` keys.

## The keys

| Key | Value | Means |
|---|---|---|
| `review` | `requested` · `changes-requested` · `cleared` | Where this chapter's review pass stands. Omitted means no review is running. |
| `reviewer` | one handle, name, or role | Who owes the next move. One value, never a list. |
| `review-at` | `YYYY-MM-DD` | The day the current state was written. |

Write the three together or not at all — the triad deliberately mirrors
`approved` / `approved-by` / `approved-at`, so a chapter reads the same way on
its way to a decision as it does past one. Omit every key that carries nothing;
there is no null spelling. There is no fourth key: a finding is not state.

## A finding is an annotation fence

One objection is one `annotation` fence in the chapter body, beside the passage
it is about — devbook's own device, with an author, a date, a kind, a quoted
passage, and replies. See `devbook-annotations.md` for the schema, the
placement rule, and the lifecycle. Every write goes through
`tools/devbook-meta/annotations.mjs`; nothing here writes a fence itself.

Write `kind: question` when the chapter cannot be judged until somebody answers
— devbook treats an open question as *this chapter is not agreed*, whatever
`status` says, and its check refuses an approval standing over one. Anything
else is `suggestion`, `flag`, or plain `comment`, and none of those blocks a
decision.

Findings were `ext.devbook-collaboration.open-<n>` keys until this plugin's
0.5.0. That spelling is gone: it had no author, no thread, and no passage.

## The three states

Each state names who owes the next move, which is the only thing this workflow
has to keep straight:

- `requested` — waiting on `reviewer`. No finding has been written yet.
- `changes-requested` — waiting on the author. At least one open fence says why.
- `cleared` — waiting on nobody. No open fence remains, and the chapter is ready
  for the approval decision.

The fences are the evidence, so the two disagree only in a half-finished write:
`changes-requested` with nothing open, or `cleared` over an open fence, is a
verdict somebody wrote without its findings. `cleared` is short-lived by design.
Approving deletes the whole namespace.

## None of this is chapter content

An agent loading a chapter for task context reads the chapter and skips every
`ext.devbook-collaboration.*` key, the same way it skips an annotation fence —
`devbook-annotations.md` states that half. Only review work — the skills in
this plugin, and the approval gate — reads either, and it reads nothing else in
the chapter as instruction.

## Approval stays devbook's

`status: approved`, `approved-by`, and `approved-at` are devbook's fields and
keep devbook's meaning. This plugin writes them only at the moment a person
approves, and clears its own namespace in the same change: an approved chapter
carries no collaboration state, because the decision is the record. Resolved
fences go in the same pass, per devbook's sweep. When the content changes
afterwards the rung drops, per devbook's own rule, and review starts again.
