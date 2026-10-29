# Annotations

```meta
date: 2026-10-29
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/building-blocks/devbook.md#annotation", ".devbook/arc42/building-blocks/devbook-collaboration.md", ".devbook/arc42/building-blocks/devbook-collaboration.md#dependencies", ".devbook/arc42/08-crosscutting-concepts.md#extension-namespace", ".devbook/arc42/adr/chapter-schema.md", ".devbook/arc42/adr/chapter-schema.md#branch-true-devbook", ".devbook/arc42/adr/plugin-boundaries.md"]
c4: ["marketplace.devbook.annotation", "marketplace.devbook.fence-writer"]
c4-touches: ["marketplace.devbook-collaboration.finding"]
```

A review note is a comment thread in each host, anchored to the chapter address, and never
text in the chapter. spec-manager keeps it in its `CommentThread` table and Backlog in its
annotation store, beside the workflow state each keeps for the same subject. A tool reads,
posts, and resolves a note through `devbook.decision@1`, the capability group `devbook` owns.
Only an open `kind: question` blocks approval of a change proposal, and a `flag` never blocks.
`chapter-review` moves into `devbook` and posts its findings through the group, and
`devbook-collaboration` retires, per [the chapter schema record](chapter-schema.md#branch-true-devbook).

The `annotation` fence retires with it. Each host imports the open fences by reading the
repository's Markdown on its default branch, with the parser it already has. The devbook
migration then strips every fence and writes no export file. `annotations.mjs`,
`annotation-sweep`, and the check's fence rules go once every host has imported the notes.
Until then the fence stands as it was built. It is `devbook`'s schema in the five devbook
folders alone, and `annotations.mjs` is its only writer. A note in it is open, then resolved,
then swept.

## Why

```meta
```

**A note is workflow, not content.** A note is about a review, and it changes on the review's
schedule. In the chapter, every note written, answered, or swept was a commit that changed no
content. A note written on a feature branch was invisible on `main` until merge, so a branch
was ahead of or behind its own review. The [branch-true decision](chapter-schema.md#branch-true-devbook)
takes workflow state out of git, and the notes on a subject belong beside its state.

**The hosts already keep threads.** spec-manager has `CommentThread` and Backlog has
`IDevbookAnnotationStore`, each holding comments of its own. Beside the fence, a chapter's
notes lived in two places that nothing kept level. Each host now keeps its own notes, as it
keeps its own state, and the two may differ.

**The group is `devbook`'s.** With `devbook-collaboration` retired, the contract that reads
and resolves a note needs an owner below both hosts and below every skill that posts one.
`devbook` already owns the schema and the chapter fingerprint. A skill in `devbook` names a
capability group, never a tool, so a lower layer still names no higher one. With no tool bound,
`chapter-review` reports its findings and writes nothing.

**The import reads the Markdown.** Both hosts already parse the fences on the default branch,
which is where the devbook states what is true. An export file would be a second format to
version for a single run, written outside the repository where nobody reviews it.

**A flag never blocks.** An unanswered question is a hole in the change, and approving over
it would agree to text nobody has finished. A comment, a suggestion, or a flag is a remark about
text that stands. A stricter gate would be a host's setting that only ever tightens, and nobody
has asked for one.

**Review state is not a field.** The triad — `review`, `reviewer`, `review-at` — lived in the
`ext` namespace until 2026-09-17 and in devbook's schema until contract 21, on a request from
Budgetbeheer. A review field beside `status` said the chapter's stage twice, and
`changes-requested` and `cleared` were a cached copy of what the open notes already said. Who
owes the next move is workflow state, held in the pull request, the queue, or the tracker. The
branch-true decision applies the same reason to the notes and the rungs themselves.

## Rejected

```meta
```

- Keeping the fence as the source, with each host mirroring it: every note stays a commit
  that changes no content.
- Moving the notes in a later proposal than the state, which would leave an open question
  blocking a rung no chapter carries any more.
- A migration that exports every open note to a JSON file for a host to import.
- `devbook.decision@1` owned by a host, or by `devbook-collaboration`, which would leave
  `chapter-review` naming a higher layer.
- A threaded store inside the `ext` namespace, and building the fence from L1.
- The gate in the flow engine, reading `_meta/annotations.json`.
- A folder-wide sweep, and a lint that reports fences outside the folders.
- `kind: flag` as a blocker, or a reviewer's choice of kind as a gate.
- Review state in the `ext` namespace, and a collaboration plugin independent of devbook.
- Review state as fields in devbook's schema — the triad, from 2026-09-17 to contract 21.

## History

```meta
```

| Date | Change | Why |
| --- | --- | --- |
| 2026-10-29 | A review note is a comment thread in each host, read, posted, and resolved through `devbook.decision@1`, which `devbook` owns. The fence retires: each host imports the open fences from the default branch, and the migration strips them. `chapter-review` moves into `devbook` and `devbook-collaboration` retires. Decided, not yet built. | A note is workflow state, and a branch's devbook states only what is true of its code. |
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
