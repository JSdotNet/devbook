# Devbook Derived

```meta
index: root
type: domain
related: [".devbook/domain/context-map.md#devbook-derived", ".devbook/arc42/adr/77-the-tooling-is-devbook-deriveds.md", ".devbook/domain/devbook/domain.md"]
```

What this context is responsible for: that the convention [Devbook](../devbook/domain.md)
states is enforced, and that what can be derived from the chapters is derived once, the same
way, wherever it is read.

Inside the boundary: the checker and the generator — one program over one parsed corpus —
the fence writer that is the only thing allowed to edit an annotation, the canvas that
renders the graph from the same modules, the refresh paths, and the install that puts all
of it into a repository.

Outside it: what a chapter must contain, what a reference is, what a fence means — every
rule it enforces is devbook's, stated in prose there and implemented here. This context
adds no field to the schema and owns no folder; a repository that adopts devbook without it
has readable, addressed Markdown and no gate.

## Index Generator

```meta
type: domain-service
related: [".devbook/domain/devbook-derived/domain.md#derived-index", ".devbook/domain/devbook/domain.md#reference-graph", ".devbook/arc42/adr/53-the-hard-gate-runs-the-schema-validator.md"]
```

Walks the corpus once and projects it per scope, emitting the reference graph, the outline, and
the annotation index for the repository and for each adopted folder. It is the only writer of
`_meta/`, and the only thing that decides whether a problem is an error or a warning: an
unresolved reference fails, a heading with no block is reported and tolerated. Every
per-block rule reaches the gate through the schema validator the graph build calls per file
(`unit:node:plugins/devbook-derived/tools/devbook-meta/schema-gate.test.mjs`).

Invocation semantics: command-invoked, and scheduled — `--check` runs in CI on every pull
request and the daily `devbook-check` schedule opens a pull request when the output moved.

## Canvas

```meta
type: domain-service
aliases: [devbook-graph, reference graph canvas]
related: [".devbook/domain/devbook-derived/domain.md#index-generator", ".devbook/domain/plugin-authoring/domain.md#surface", ".devbook/arc42/adr/5-devbook-still-ships-the-graph-canvas.md", ".devbook/arc42/adr/36-devbooks-canvas-carries-no-surface-word.md"]
```

Two Copilot canvases over the same modules the generator writes with: the reference graph,
rebuilt from disk on open so it can never show a stale index, with a node inspector that
lists a chapter's test links and the command that runs each; and one chapter beside its
parsed block and a metadata lint. It reads the Markdown, never `_meta/`, and writes nothing.

Packaged with the generator rather than lifted into a surface plugin of its own, because the
two are one tool over one parser — the closure of
[record 5](../../arc42/adr/5-devbook-still-ships-the-graph-canvas.md)'s question.

## Fence Writer

```meta
type: domain-service
aliases: [annotations.mjs]
related: [".devbook/domain/devbook/domain.md#annotation", ".devbook/arc42/adr/60-the-annotation-lifecycle-ends-in-devbook.md"]
```

`annotations.mjs`: `list`, `add`, `reply`, `resolve`, `sweep`, as a CLI and as the same
five functions in-process. It is the only writer of an annotation fence anywhere — devbook's
`annotation-sweep` and every `devbook-collaboration` skill go through it — and its edits are
surgical, so a field a later version adds survives a write by one that does not know it.
It never commits: adding a note dirties a tracked file, and that is the caller's to review.

## Ubiquitous Language

```meta
type: ubiquitous-language
related: [".devbook/domain/devbook/domain.md#ubiquitous-language"]
```

> One term of its own. Everything else it speaks — chapter, address, reference, fence,
> adoption, stamp — is devbook's or the kernel's, and is defined there.

### Derived Index

```meta
type: term
date: 2026-09-08
aliases: [_meta, generated index, build output]
related: [".devbook/domain/devbook-derived/domain.md#index-generator", ".devbook/arc42/adr/29-automation-owns-the-_meta-refresh.md"]
```

Anything under a `_meta/` folder: the graph, the reading order, and the annotation index,
emitted deterministically so a clean `git diff` proves they are current.

A session never reads one as a source of fact and never regenerates one. Two branches that each
touch one chapter both rewrite the same JSON, and the conflict is only resolvable by re-running
the generator — so the refresh belongs to automation, and the check that runs in a session
writes nothing.
