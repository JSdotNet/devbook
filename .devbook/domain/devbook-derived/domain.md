# Devbook Derived

```meta
index: root
type: domain
related: [".devbook/domain/context-map.md#devbook-derived", ".devbook/arc42/adr/79-the-checker-is-devbooks-the-committed-index-is-derived.md", ".devbook/domain/devbook/domain.md#index-generator"]
```

What this context is responsible for: that a repository which keeps the derived `_meta/`
indexes in its tree has them current on the default branch and never regenerated in a
session.

Inside the boundary: the refresh paths — the on-demand script, the nightly workflow, the
drift warning — the rule that says where a derived artifact lives and what its envelope
is, and the install that puts them in a repository.

Outside it: the checker that computes what these files hold, the fence writer, the canvas —
all [Devbook](../devbook/domain.md)'s. This context computes nothing: it asks devbook's
`build.mjs` to write, with the one flag nothing in devbook passes, and a repository that
does not enable it has the full check and no derived file.

## Refresh

```meta
type: domain-service
aliases: [Update-DevbookIndex, nightly refresh, drift warning]
related: [".devbook/domain/devbook/domain.md#index-generator", ".devbook/arc42/adr/29-automation-owns-the-_meta-refresh.md", ".devbook/domain/devbook-derived/skills.md#install"]
```

The three ways a committed index gets rewritten, and the only three: `build/Update-DevbookIndex.ps1`
on demand, reporting which files moved; the nightly workflow on the default branch, opening
one pull request when anything did; and the pull-request drift workflow, which warns and never
fails. Each passes `--write` to devbook's checker at `.devbook/_tools/devbook-meta/build.mjs`.
A session is not a fourth way.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| Nothing writes a derived artifact but `build.mjs --write`, and nothing in devbook passes the flag | `build.mjs` | `unit:node:plugins/devbook/tools/devbook-meta/layout.test.mjs` |
| A drifted index warns a pull request and never fails it | `devbook-meta-drift.yml` | untested |
| The nightly refresh opens one pull request when the output moved and nothing when it did not | `devbook-meta-nightly.yml` | untested |


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
