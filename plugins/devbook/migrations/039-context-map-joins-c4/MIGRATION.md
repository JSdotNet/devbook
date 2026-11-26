# 039 — the context map joins the C4 workspace

```meta
contractVersion: 39
appliesTo: [domain]
breaking: yes
```

## What

Contract 39 drops `.devbook/domain/context-map.md`. Which contexts there are, how each ships,
how they relate, and which subdomain each serves are the C4 workspace's, and each `context.md`
names the element that hosts its context in `c4`. This migration moves the map:

| From the map | Lands in |
| --- | --- |
| A `bounded-context` section's `deployment: service` | A `container` for the context in the software system, unless one with its name exists |
| A `bounded-context` section's `deployment: module` | A `component` for the context in the container its building block names in `c4`, unless one with its name exists |
| A `## Subdomain landscape` row | The context's element tagged `Core`, `Supporting`, or `Generic` |
| A `## Context map` table row or Mermaid flowchart edge | A relationship between the two contexts' elements, its description opening with the DDD pattern: `"Customer/Supplier: reads the order total"` |
| `## Published languages`, `## Strategic rules` | Sections of `.devbook/arc42/08-crosscutting-concepts.md`, their links rewritten from there |

A relationship table is one with a downstream column (`Downstream`, `Consumer`, `From`, …) and
an upstream one (`Upstream`, `Supplier`, `To`, …); a pattern and a description column are read
when present. A Mermaid edge is read as its source using its target, and the report asks for
each direction to be checked.

Then, in every `domain/` file, it deletes `deployment` from every block, printing each value it
took off, and adds `c4: [<element>]` to each `context.md` that has none: the element above, else
one named after the context, else the element its building block names. Across `.devbook/` and
every open change under `openspec/changes/`, never `archive/`, it rewrites each `meta` reference
and Markdown link that names the map: a context's section lands on its `context.md`, a moved
section on its chapter 8 section, and the rest on `05-building-block-view.md`, else
`03-context-and-scope.md`, else chapter 8. It deletes the map last. A workspace that does not
exist yet is created first.

A context section's prose is not carried, beyond its first sentence describing a new element:
`context.md` states the boundary. The report prints each paragraph it leaves, a section it does
not move, a subdomain name the tag replaces, and a context with nothing to name in `c4`. Two
contexts that land in one element, or one inside the other's, get no relationship between
them and only the first one's class, and the report names each for a person to split.

## Before you run it

Adopt `arc42/` first where the map or a `deployment` exists: there is nowhere else for them to
go. A host that draws the map from the Markdown — the Backlog app's context map view — reads it
for the last time before this runs, and has to read the workspace instead.

The run is all or nothing. A relationship naming a context no element stands for, a `module`
whose building block names no container, a `service` with no single software system to hold it,
or a `## Context map` section it cannot read stops it with a `blocked` line and writes nothing.
Settle each by hand in the workspace, delete what you moved, and run it again.

## Why

The map and the workspace both drew the contexts and their relationships, and the map also
restated how each ships beside the building block that ships it. The two were kept equal by
hand, and the pairing check only held `deployment` equal between the map and `context.md`. One
folder now keeps the fact: `arc42/` ranks first, per "One folder keeps a fact" in
`devbook-writing.md`. The record is `.devbook/arc42/adr/chapter-schema.md` in the marketplace.

## What breaks

The checker reports a file typed `context-map`, a chapter typed `bounded-context`, and a
`deployment` field as errors naming this migration. `domain/` has no root document, so its
contexts sort by name, and the graph drops the pairing check between the map and `context.md`.
After the run none is left.

## How to verify

```bash
node migrate.mjs --check
```

Exits `0` when no `context-map.md` is left, no `domain/` block carries `deployment`, and no
reference names the map, and `1` while any remains or the run is blocked, listing each. Drop the
flag to apply; a second run changes nothing. Both forms take `--root <path>`, defaulting to the
working directory.
