# Devbook Derived

```meta
index: root
type: domain
related: [".devbook/domain/context-map.md#devbook-derived", ".devbook/arc42/adr/81-the-checker-is-devbooks-the-committed-index-is-derived.md", ".devbook/domain/devbook/domain.md#index-generator"]
```

What this context is responsible for: that a repository which keeps the derived `_meta/`
indexes in its tree has them current on the default branch and never regenerated in a
session.

Inside the boundary: the refresh paths — the `refresh` skill, the on-demand script, the
nightly workflow, the drift warning — the canvas that draws the graph live, the rule that
says where a derived artifact lives and what its envelope is, and the install that puts them
in a repository.

Outside it: the checker that computes what these files hold, and the fence writer — both
[Devbook](../devbook/domain.md)'s. This context computes nothing: it asks devbook's
`build.mjs` to write, with the one flag nothing in devbook passes, and its canvas loads
devbook's modules at their materialized path. A repository that does not enable it has the
full check and no derived file.

## Refresh

```meta
type: domain-service
aliases: [Update-DevbookIndex, nightly refresh, drift warning]
related: [".devbook/domain/devbook/domain.md#index-generator", ".devbook/arc42/adr/29-automation-owns-the-_meta-refresh.md", ".devbook/domain/devbook-derived/skills.md#install"]
```

The ways a committed index gets rewritten, and the only ways: the `refresh` skill, when a
person asks for this branch to be current; `build/Update-DevbookIndex.ps1` on demand,
reporting which files moved; the nightly workflow on the default branch, opening one pull
request when anything did; and the pull-request drift workflow, which warns and never fails.
Each passes `--write` to devbook's checker at `.devbook/_tools/devbook-meta/build.mjs`. A
flow, or a chapter edit, is never one of them.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| Nothing writes a derived artifact but `build.mjs --write`, and nothing in devbook passes the flag | `build.mjs` | `unit:node:plugins/devbook/tools/devbook-meta/layout.test.mjs` |
| A drifted index warns a pull request and never fails it | `devbook-meta-drift.yml` | untested |
| The nightly refresh opens one pull request when the output moved and nothing when it did not | `devbook-meta-nightly.yml` | untested |


## Canvas

```meta
type: domain-service
aliases: [devbook-graph, reference graph canvas]
related: [".devbook/domain/devbook/domain.md#index-generator", ".devbook/domain/devbook-derived/domain.md#refresh", ".devbook/domain/plugin-authoring/domain.md#surface", ".devbook/arc42/adr/5-devbook-still-ships-the-graph-canvas.md", ".devbook/arc42/adr/36-devbooks-canvas-carries-no-surface-word.md"]
```

Two Copilot canvases over devbook's own modules: the reference graph, rebuilt from disk on
open so it can never show a stale index, with a node inspector that lists a chapter's test
links and the command that runs each; and one chapter beside its parsed block and a metadata
lint. It reads the Markdown, never `_meta/`, and writes nothing.

It bundles no parser. It loads `graph.mjs`, `outline.mjs`, and `metadata.mjs` from
`.devbook/_tools/devbook-meta/` — the path devbook's install materializes — at runtime, and
from `plugins/devbook/tools/devbook-meta/` in the repository that vendors them; absent both,
it names `devbook:install` and draws nothing. That runtime load is the "published shape to
import" [record 5](../../arc42/adr/5-devbook-still-ships-the-graph-canvas.md) waited for,
and what closes it.

## Ubiquitous Language

```meta
type: ubiquitous-language
related: [".devbook/domain/devbook/domain.md#ubiquitous-language"]
```

> One term of its own. Everything else it speaks — chapter, reference graph, outline,
> adoption, stamp — is devbook's or the kernel's, and is defined there.

### Derived Index

```meta
type: term
date: 2026-09-08
aliases: [_meta, generated index, build output]
related: [".devbook/domain/devbook/domain.md#index-generator", ".devbook/domain/devbook-derived/domain.md#refresh", ".devbook/arc42/adr/29-automation-owns-the-_meta-refresh.md"]
```

Anything under a `_meta/` folder: the graph, the reading order, and the annotation index,
emitted deterministically so a clean `git diff` proves they are current.

A session never reads one as a source of fact and never regenerates one. Two branches that each
touch one chapter both rewrite the same JSON, and the conflict is only resolvable by re-running
the generator — so the refresh belongs to automation, and the check that runs in a session
writes nothing.
