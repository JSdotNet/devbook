# Annotations

```meta
date: 2026-09-14
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/domain/devbook/domain.md#annotation", ".devbook/domain/devbook-collaboration/domain.md", ".devbook/domain/devbook-collaboration/dependencies.md", ".devbook/domain/plugin-authoring/domain.md#extension-namespace", ".devbook/arc42/adr/chapter-schema.md", ".devbook/arc42/adr/plugin-boundaries.md"]
```

A review note is a fenced `annotation` block in the chapter, beside the passage it comments
on, and the fence — its schema, its only writer `annotations.mjs`, its lifecycle open →
resolved → gone, and the sweep — is `devbook`'s. It reaches the five devbook folders and
nothing else. The gate that shows a chapter with its open notes and writes `status: approved`
is `devbook-collaboration:chapter-approve`, in the review plugin and not the engine, and it
reads the chapter rather than the derived index. Only an open `kind: question` blocks; a
`flag` is shown first and never blocks.

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
tracked work is nobody's yet: its vocabulary lives in `delivery`'s surface contract, which
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

## Rejected

```meta
```

- A threaded store inside the `ext` namespace, and building the fence from L1.
- The gate in the flow engine, reading `_meta/annotations.json`.
- A folder-wide sweep, and a lint that reports fences outside the folders — the second is the
  answer when someone first wants to annotate a rule.
- `kind: flag` as a blocker, or a reviewer's choice of kind as a gate.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-14 | `flag` is read by the gate: shown first, named as raised since the approval, never blocking. |
| 2026-09-14 | The chapter gate is `devbook-collaboration:chapter-approve` and reads the chapter, not the index. |
| 2026-09-09 | The sweep is `devbook:annotation-sweep`, chapter-scoped; promotion to a work item is unbuilt on purpose. |
| 2026-09-09 | A fence outside the five folders is inert; a fence after a `mermaid` block annotates the diagram. |
| 2026-09-09 | The review plugin's `ext` findings migrate to fences; the `ext` namespace keeps three keys. |
| 2026-09-04 | `devbook` ships the fence: schema, parse, lint, `_meta/annotations.json`, one writer. |
| 2026-09-04 | A comment is one single-line `ext` finding until L0 builds the fence. |
