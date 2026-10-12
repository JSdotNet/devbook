---
name: devbook-changes
description: The change folder under openspec/changes/ — a proposed change to the devbook as a proposal, deltas at the path of each file they change, a solution, and tasks — with the gates its proposal records, the delta shape the merge in delta.mjs applies, and how a scenario page and its Proved by pointers change through it.
---

# The change folder

A proposed change to the devbook lives in `openspec/changes/<name>/`, a kebab-case name, until
`delta.mjs --apply` merges it and moves it to `openspec/changes/archive/<date>-<name>/`. The
path is OpenSpec's and fixed: its CLI resolves `changes/` only under a folder named
`openspec/`. Never read `archive/` as context — it is history, and the check never indexes it.

| File | Holds | Indexed |
|---|---|---|
| `proposal.md` | Why, scope, the chapters touched, one category | yes |
| `devbook-delta/<path>` | One delta per devbook file the change touches | yes |
| `devbook-delta/domain/<context>/*.demo.html` | A demo the change lands, replaced whole | no |
| `solution.md` | The chapters to load beyond the delta, then the approach | no |
| `tasks.md` | The steps, one pull request each | no |

## proposal.md

The file-level block is `type: change`, `status: proposed`, and `category` — one of `feature`,
`behaviour-change`, `defect`, because the category picks the flow that applies a step. Its
`##` sections — `Why`, `Scope`, `Chapters touched` by address — are sections and carry no
block. The change is decided as one, so both gates are recorded once, here: `approved`, then
`accepted`, with the six fields of `devbook-chapter-metadata.md` and both hashes always written.
The hash covers the proposal and every delta — `chapter-hash.mjs openspec/changes/<name>` — and
an open `kind: question` anywhere in the change is an error under either rung. The block may
also carry `demo`, per `devbook-chapter-metadata.md`, naming the screens the change is about.
`--apply` merges only an `accepted` change over its current hash, writes no rung onto a chapter it lands
in — `change` points at the archived proposal — and lifts a chapter's own rung it makes stale.

## A delta

A delta sits under `devbook-delta/` at the path of the file it changes below `.devbook/`:
`devbook-delta/arc42/09-decisions.md` changes `.devbook/arc42/09-decisions.md`. It opens with a
block holding exactly `change` — the change's folder name — and `delta`, then names chapters
by heading at their own level, each written by the target folder's rule and
`devbook-chapter-metadata.md`. Under each, `ADDED`, `MODIFIED`, and `REMOVED` sections hold
entries one level deeper, which the merge lands one level up:

- `delta: added` — each named chapter is new, with its block and any `ADDED` entries: a `#`
  chapter creates the file, a `##` one lands at its end. Anything deeper is an entry of its parent.
- `delta: modified` — each named chapter exists. `MODIFIED` may open with a `meta` block of
  fields to set, the rest kept; each of its entries replaces the section of that heading whole.
  `ADDED` entries are new sections; a `REMOVED` entry is a heading, removed with its subtree.
- `delta: removed` — each named chapter goes whole; a `#` chapter removes the file.

A paragraph is not addressable: change it by replacing its section. The delta's opening block
carries no status — a delta inherits everything through `change`. A change with no prose delta
still carries one delta, a placeholder holding only that block, because OpenSpec counts an
empty `devbook-delta/` as unfinished. The merge stamps `change: <name>` on every chapter block
it touched; `change` is provenance, written by the merge and never by hand.

Run `node .devbook/_tools/devbook-meta/delta.mjs --check <name>` after every edit to a delta: it
resolves each one to its target file and heading, lints the merged result, and then runs the
corpus-wide scenario rules over the devbook as the whole change would leave it.

## A scenario page

A scenario page is a delta like any `domain/` file, at its path:
`devbook-delta/domain/<context>/<journey>.md`. A new page is `delta: added` — its `#` title,
the file-level block with `type: scenario` and the setup fields, the lead, and each part as an
`ADDED` entry. A page that exists is `delta: modified` under its `#` title: a part is replaced
whole as a `MODIFIED` entry, never step by step, added under `ADDED`, or dropped under
`REMOVED`; a setup field changes in the block opening `MODIFIED`. A requirement the page
proves changes in its `requirements.md` delta, its `#### Scenario:` holding the one line
`Proved by: <page>.md#<part>` and no steps: behaviour is written once, in the page. The check
merges every delta of the change before it resolves a pointer, so one may name a page the same
change adds; a pointer naming no part, a stem another page holds, or a setup field that does
not resolve is reported against the delta that causes it.

## A demo

A change is one route for a demo, not the only one: `devbook-domain.md` lets its author land it
directly in a `flow-spec` pull request instead, and a demo with no delta is never a finding.
A proposal may contain a demo: a standalone prototype from `/prototype`, copied in as a delta at
the path where it lands — `devbook-delta/domain/ordering/features.demo.html` lands as
`.devbook/domain/ordering/features.demo.html` — and trimmed to the one variant agreed, per
`devbook-domain.md`. Its verdict — the question it was prototyped to answer, and the answer — is
recorded in the proposal's `Why`, never in the file. A demo delta is HTML, not Markdown: it has
no block and no `ADDED`/`MODIFIED`/`REMOVED` sections, and the merge replaces the target whole.
Revising a demo starts from a prototype of the current one, never from an edit in place.

## solution.md and tasks.md

`solution.md` opens with a file-level block holding `demo` when the approach is shown in one,
and none otherwise. It names, by address, the chapters a builder loads beyond the delta and
why each matters, then the approach. Nothing in it lands in the devbook: a decision the change makes is
a delta — under `devbook-delta/arc42/adr/` when it is architectural.

`tasks.md` is `## Step N — title` blocks, one pull request each. Each names the deltas it
delivers on a `delivers:` line by address — a scenario page by its delta's path, or one part
of it as `<path>#<part>` — and `owner: me` when a person does it. A prototype
is no step: it needs no change and no task, and enters a change only as a demo delta.
