# 037 — flows open the chapter of what moves

```meta
contractVersion: 37
appliesTo: [domain]
breaking: yes
```

## What

Before contract 37 a bounded context drew its lifecycles and processes on a page of their own:
`flow.md`, split as `flow.<name>.md`, typed `flow`. From 37 there is no flow page. A diagram
sits directly under the `meta` block of the chapter it draws, ahead of the prose, per
`devbook-domain.md`, and a file typed `flow` is an error.

Each section of a flow page is a unit: every `##`, and the content between the title and the
first `##`. This migration moves each unit under the `meta` block of its chapter, after any
annotation fences directly below that block, headed by a bold line carrying the section's
heading. It removes a page once every unit has moved, and rewrites every reference to it:

| From | To |
| --- | --- |
| A `related` or `depends-on` entry naming a section, quoted or not | The chapter it moved into; dropped when that is the chapter holding the block, or already listed |
| A prose link to a section, from any devbook folder or open change | The same chapter |
| A reference to the whole page, once every unit has moved | The chapter of its first unit, or `context.md` when every unit was dropped |
| A link inside a moved unit | Rebased to the chapter's folder; an in-page `#anchor` follows its unit |
| A `###` heading inside a unit | A bold line, since a chapter's sub-headings are chapters |
| The page's lead blockquote | Carried after its first unit's body, unless it is the `flow.md` template's |

A unit's chapter is decided in this order:

1. `--place <page>#<section>=<target>`, or `--place <page>=<target>` for every unit of a page.
   The target is a chapter address carrying a `meta` block, a file — the unit then lands before
   its first `##`, which in `context.md` is after the boundary — or `drop`. An answer whose
   target does not exist is refused, and the unit falls back to the steps below.
2. A split page whose `related` names one feature, skill, aggregate, entity, or domain service
   of the context, or whose name is that chapter's anchor.
3. The chapter of the context whose anchor equals the section's.
4. For a state diagram, the one aggregate, entity, value object, or enum whose name the heading
   carries; the longest name wins, and a tie decides nothing.

Every other unit is an `ask` line: the section, its diagram kind, up to six candidates — the
page's own `related` chapters, chapters its heading names, `context.md`, and for a sequence the
arc42 runtime view — and the `--place` flag that answers it. The table in `devbook-domain.md`
under *A flow opens the chapter of what moves* is what the answer follows.

## Who answers

The session running `devbook:update` does, per `assets/reconcile-protocol.md`: it puts each
`ask` to the person with its candidates, runs the migration again with every answer as a
`--place` flag, and repeats until no `ask` is left. A unit with no answer stays on its page, so
the page — and the exit code `1` — stays until the last one is answered. Answering
`context.md` for a process no chapter owns is legitimate; so is `drop` for a section that only
lists the other flows. A flow page in an open change is never rewritten: each run lists it, and
its diagrams are rewritten as deltas of the chapters they open by hand.

## Why

A picture says first what a chapter is about, and a lifecycle drawn on another page left the
aggregate's prose retelling it in words. Every claim a flow drew already belonged to an
aggregate, a domain service, a feature, or a skill — the reason a flow page never had a
converter kind — so the diagram moves to the one chapter a reader opens for it. The record is
`.devbook/arc42/adr/chapter-schema.md` in the marketplace.

## What breaks

A file typed `flow` is an error to the checker until this runs. A demo named for a flow page,
`flow.demo.html` or `flow.<name>.demo.html`, is no longer paired with a page: each run lists it,
and the chapters it shows name it with `demo`. A moved diagram's notes may now restate the
chapter's prose; the migration places them and never rewrites them, so the next edit of the
chapter through `flow-spec` is where the two merge. A repository without `domain/` adopted
records `not-applicable` in the ledger.

## Released in 1.31.0

Every plugin is `1.31.0`; contract 37 ships in it, and this is the one migration. The names a
consuming repository's plan writes against are the chapter anchors the `--place` answers name.

## Run it

```bash
node migrate.mjs --check
```

`--check` lists every move, every `ask`, and every page left in an open change, writes nothing,
and exits `1` while a flow page is left. Drop the flag to apply; an applying run exits `1` while
an `ask` is left and `0` once every page is gone. Running it twice changes nothing. Both forms
take `--root <path>`, defaulting to the working directory, and any number of `--place` flags.
