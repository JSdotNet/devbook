# Annotations

```meta
date: 2026-09-30
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/building-blocks/devbook.md#annotation", ".devbook/arc42/building-blocks/devbook-collaboration.md", ".devbook/arc42/building-blocks/devbook-collaboration.md#dependencies", ".devbook/arc42/08-crosscutting-concepts.md#extension-namespace", ".devbook/arc42/adr/chapter-schema.md", ".devbook/arc42/adr/plugin-boundaries.md"]
c4: ["marketplace.devbook.annotation", "marketplace.devbook.fence-writer"]
c4-touches: ["marketplace.devbook-collaboration.finding"]
```

A review note is a fenced `annotation` block in the chapter, beside the passage it comments
on, and the fence — its schema, its only writer `annotations.mjs`, its lifecycle open →
resolved → gone, and the sweep — is `devbook`'s. It reaches the five devbook folders and
nothing else. The gate that shows a chapter with its open notes and writes `status: approved`
is `devbook-collaboration:chapter-approve`, in the review plugin and not the engine, and it
reads the chapter rather than the derived index. Only an open `kind: question` blocks; a
`flag` is shown first and never blocks. Where a review stands is the chapter's `status` and its
open fences, and no field of its own; who owes the next move lives in the pull request or the
tracker. The review plugin ships its five skills and nothing else: no rule, no install, no
hook, no stamp.

## Why

```meta
```

**The fence is the foundation's.** `devbook-collaboration` first recorded a comment as one
single-line `ext` finding, because the fence was designed as an L0 feature and L0 had not built
it: building it from a layer above would put a schema element into `devbook`'s files, and a
threaded store inside `ext` would rival a mechanism already designed. Once `devbook` shipped
the fence, the premise was gone and the findings migrated — one fence per finding, placed
against the chapter, `author` unknown. Two things arrived with the fence that a key could not
do: an open question on an `approved` chapter fails the check, and a resolved note has to be
swept.

**The sweep is `devbook`'s too.** A repository that never installs the review plugin still
gets notes — in an editor, in a pull request — and still needs them swept; a foundation whose
lifecycle needs an extension to finish is the shape a layered stack avoids. The sweep is
chapter-scoped, so the list is one a person can read before the delete. Promotion of a note to
tracked work is nobody's yet: its vocabulary lives in `delivery`'s engine contract, which
`devbook-collaboration` may not name, so it belongs in `delivery` or a bridge.

**The folders, and nothing else.** A fence in a rule, a resource, or `AGENTS.md` is parsed,
counted, and warned about by nothing. An instruction file is reviewed as code, in the pull
request; widening the walk would mean deciding what a chapter is in a file with no `meta`
block, and would put a reviewer's note into a file a host injects into every matching session.
A fence after a `mermaid` block annotates the diagram, because position is the anchor.

**The gate lives where the writer is.** The design put the gate in the engine, reading the
derived index. But the decision is written into the chapter as devbook's own rung, and the
engine reads that rung and never writes it — a gate in the engine would write three devbook
fields from a plugin that claims to know none of devbook's schema. And a chapter is approved
outside a run more often than inside one: an engine gate decides *this run continuing*, not the
chapter's standing. The gate reads the chapter because it loads it anyway and every fact it
needs is in that one file; the nightly index is exactly the copy missing the notes written a
minute ago. The index is for reads that span chapters.

**A flag never blocks.** An unanswered question is a hole in the chapter and outranks
`status`, which is devbook's rule; a comment, a suggestion, or a flag is a remark about a
chapter that stands. Making a flag block from the review plugin would change what a devbook
field means from one layer up. A stricter chapter gate would be a committed switch under
`components.collaboration` that only ever tightens, and nobody has asked for one.

**Review state is not a field.** The triad — `review`, `reviewer`, `review-at` — lived in the
`ext` namespace until 2026-09-17 and in devbook's schema after it, mirroring the approval
record. Contract 21 removes it, on a request from Budgetbeheer, the one repository that used
the review pass in earnest. A chapter ready to read but not yet agreed is a rung on the status
ladder, so a review field beside `status` said the chapter's stage twice: Budgetbeheer wrote
`status: review` until adoption, the check rejected it, and the only spelling the check then
took was `status: draft` with `review: requested` — the first one wrong. `changes-requested`
and `cleared` were a cached copy of what the open fences already say, which the check then had
to reconcile against them. And who owes the next move is workflow state: in the chapter, every
reassignment was a content diff on text that did not change, where the pull request, the
queue, or the tracker holds it for free. The decision records stay, because an approval and an
acceptance have to travel with the content and lapse with it; a pending review does not.
Moving the triad out of `ext` was still right — a field nobody validated was worse than either
— and what the move took with it stays gone: the collaboration rule, its install, its stamp,
and its hook. Independence from devbook was asked for and declined: every skill reads a `meta`
block, writes through the fence writer, or writes the rung, and a collaboration plugin over
arbitrary Markdown would rebuild devbook's schema inside itself.

## Rejected

```meta
```

- A threaded store inside the `ext` namespace, and building the fence from L1.
- The gate in the flow engine, reading `_meta/annotations.json`.
- A folder-wide sweep, and a lint that reports fences outside the folders — the second is the
  answer when someone first wants to annotate a rule.
- `kind: flag` as a blocker, or a reviewer's choice of kind as a gate.
- Review state in the `ext` namespace, and a collaboration plugin independent of devbook.
- Review state as fields in devbook's schema — the triad, from 2026-09-17 to contract 21.

## History

```meta
```

| Date | Change | Why |
| --- | --- | --- |
| 2026-09-30 | Accepting a change owes an `aligned` verdict only for a delta whose target `verify-change` covers. A step is `done` per its workflow, not only by a merge. | A delta against a decision or debt record or a prose chapter has no code to be measured against, and requiring one made such a change impossible to accept. |
| 2026-09-28 | On a change the review is the whole change: proposal and every delta with their open notes, one decision per gate on `proposal.md`, and an open question anywhere in the change blocks either rung. Chapter rungs stay for work outside the lane. | — |
| 2026-09-28 | `review`, `reviewer`, `review-at` leave devbook's schema. Contract 21, migration `021-no-review-triad`. | A review in progress is `status` plus the open fences, and who owes the next move lives in the pull request or the tracker. |
| 2026-09-17 | `review`, `reviewer`, `review-at` move from `ext` into devbook's schema; the review plugin ships skills only. | — |
| 2026-09-14 | `flag` is read by the gate: shown first, named as raised since the approval, never blocking. | — |
| 2026-09-14 | The chapter gate is `devbook-collaboration:chapter-approve` and reads the chapter, not the index. | — |
| 2026-09-09 | The sweep is `devbook:annotation-sweep`, chapter-scoped; promotion to a work item is unbuilt on purpose. | — |
| 2026-09-09 | A fence outside the five folders is inert; a fence after a `mermaid` block annotates the diagram. | — |
| 2026-09-09 | The review plugin's `ext` findings migrate to fences; the `ext` namespace keeps three keys. | — |
| 2026-09-04 | `devbook` ships the fence: schema, parse, lint, `_meta/annotations.json`, one writer. | — |
| 2026-09-04 | A comment is one single-line `ext` finding until L0 builds the fence. | — |
