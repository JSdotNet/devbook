# Kind: building-block

What `capture-specs`, `apply-change`, and `verify-change` need to know about the
building block view that `assets/code-sync-protocol.md` does not already say.
The protocol carries the resolution ladder, the evidence rules, the five
verdicts, the status rules, the brief contract, and the report table; this file
carries the kind.

| | |
|---|---|
| Chapters | The whole view, or one `##` section of it — a single container, or one level of decomposition; or one block's own file, whole or one `##` section of it. The workspace comes with every run, per **The workspace is part of the kind** |
| File | `.devbook/arc42/05-building-block-view.md`, or `.devbook/arc42/building-blocks/<slug>.md` for a block the view keeps in its own file, per `devbook-arc42.md`; and `.devbook/arc42/workspace.dsl` with the files it includes from `c4/` |
| Folder rule | `devbook-arc42.md`, with `devbook-chapter-metadata.md` |
| Context to load | The view as it stands, the workspace, and `03-context-and-scope.md` for the system boundary; `.devbook/domain/context-map.md` only for bounded-context alignment; when applying, `09-architecture-decisions.md` for the decisions that constrain the structure |
| Plan target | A chapter of the `arc42/` folder, drafted to its rule, and the workspace's DSL, both delivered in the capture plan, per **The capture plan** in the protocol and **The workspace is part of the kind** below |
| Index scope | `--scope arc42` |
| Extra input | Level depth: default to level 1 (containers) and level 2 (the blocks inside them that carry real responsibility) |

## `arc42/` differs from `domain/`

- **No `type` field.** `arc42/` defines no value set; setting `type` is reported
  as a warning. The heading level already distinguishes chapter from section.
- **No `depends-on`.** Architecture chapters describe standing structure, not
  sequenced work. Cross-references use `related`.
- **The top-level chapter's `meta` block doubles as the file-level block.** An
  `arc42/` file is exactly one top-level chapter — never add a second block.
- The status ladder is `draft`, `proposed`, `active`, `deprecated`. There is no
  `approved` or `accepted` rung in `arc42/` — the two decision rungs are
  `domain/`'s. A structural change is expensive to reverse, so the gate's
  confirmation below `active` matters here.

If `arc42/` does not exist, stop and adopt it through `devbook:update`, or `devbook:init` where devbook has no stamp yet. Create the file
only when the chapter will have real content — the folder rules forbid
scaffolding an empty placeholder.

This view is the second rung of counterpart resolution for every other kind: an
accurate one is what lets a pass narrow to one project when `domain.md` has no
alias, so keeping it current has value beyond the chapter itself.

## The workspace is part of the kind

`.devbook/arc42/workspace.dsl` is the only place a block's element, its relationships, and
its views are defined, per **C4 model** in `devbook-arc42.md`, so every building-block run
reads it beside the chapters and reaches its verdicts over both. A chapter and the workspace
that disagree are drift like any other: the chapter's row names the workspace identifier or
view key it disagrees with.

- **`code` is the first rung.** A block file's `code` folders are the one link from a chapter
  to a code path the schema carries, and the checker warns when one is gone. Read them before
  rung 2 of the protocol's ladder; fall through to it only when the block has none.
- **A `code` folder that does not exist is drift.** `code-ahead` when the block's code
  resolves elsewhere by the ladder — the plan moves the entry; `spec-ahead` when nothing
  implements the element and the block is agreed; `unresolved` otherwise.
- **A code project no element covers is drift.** A level 1 or level 2 unit from the mapping
  below that sits under no block's `code` folder and matches no element is `code-ahead`
  against the workspace, whatever the chapters say. A `person`, a `softwareSystem` other than
  this one, and an element tagged `External` have no code here and are never reported.
- **A dependency the workspace does not draw is drift.** An observed edge with no
  relationship is `code-ahead`; a relationship with no edge is `spec-ahead` where the
  element is agreed, and a relationship drawn in the opposite direction is a `conflict`.
- **No workspace yet.** With `arc42/` adopted and no `workspace.dsl`, the run's one finding
  is `code-ahead` against the file: the plan drafts it whole, and `devbook:update` runs the
  migration that converts Mermaid architecture fences.

A capture plan drafts DSL as well as chapters. Its delta for the workspace is keyed by element
identifier or view key instead of heading — `ADDED`, `MODIFIED` with the current statement
beside the drafted one, or `REMOVED` — in the hierarchical form, each element with its
one-line `description` and no `properties`. A drafted view names the chapter section that
embeds it, per the rule's view-kind table, and a drafted block file names its element in `c4`
and its folders in `code`. Write mode carries the `ADDED` and `MODIFIED` statements into the
workspace with the chapters, and the check resolves every identifier and embed after them.

## Mapping

| Chapter element | Evidence when capturing | What building it requires |
|---|---|---|
| Level 1 blocks | The deployable or independently runnable units: solution-level projects producing an executable or a service, an Aspire AppHost's registered resources, compose services | Each documented unit existing and running independently |
| Level 2 blocks | The modules inside each level 1 block that carry a distinct responsibility and that other blocks depend on as a unit: projects, top-level namespaces, feature folders | Each documented module existing as a unit others depend on |
| Responsibilities | What each block owns, from its public surface and what depends on it — not from its name | Each block owning what the chapter assigns it, and not owning what it assigns elsewhere |
| Interfaces | How a block is reached: HTTP routes, gRPC services, message contracts consumed and published, public library API, injected abstractions crossing the block line | The documented reach path existing |
| Dependencies between blocks | Project and package references, container registrations, client instantiations — the actual edges, in their actual direction | Only the documented edges, in the documented direction — check every current reference crossing a block line |
| Elements | A `container` per level 1 block and a `component` per level 2 block in the workspace, each with a one-line `description`; the block's file names its element in `c4` and its folders in `code` | Each element's `code` folders existing and holding the block |
| Views | The container view embedded in chapter 5 and a block's component view in its own file, as `![…](c4:<key>)`; relationships are the observed dependencies, with what each does and over what technology | The real dependency graph matching the workspace's relationships |
| Bounded-context alignment | Which `domain/` context each block belongs to, where the mapping is clean — a `related` reference, not a restatement | — |

Prefer diagrams over prose; the folder rules say so. Record dependency
**direction** from the references, not from the intended layering: a block that
depends upward is exactly the finding this view exists to surface, and a diagram
redrawn to look correct hides it. Link ADR and TDR content under `.devbook/arc42/adr/`
and `.devbook/arc42/tdr/`; never copy it.

## Capturing — `capture-specs`

Read the solution and project files, the project and package references, the
container registrations, the public API surfaces, and any AppHost or compose
file declaring the runnable units. Mine the tests: architecture tests are the
most direct statement of intended dependency direction, and comparing them
against the real reference graph surfaces the discrepancies to record; the test
project structure shows where responsibility boundaries fall; contract tests
name the interfaces a block genuinely exposes.

Settle level 1 from what runs independently and level 2 from what other blocks
depend on as a unit — a project nothing depends on separately is not a level 2
block, whatever its name — and stop decomposing where the blocks stop having
distinct responsibilities. Draft with no `type` and no `status`. Draft each
block's element, and its relationships from the edges that exist, in their
direction, and note where an edge contradicts the intended layering. Embed the
view; never draw the blocks in a Mermaid fence.

## Applying — `apply-change`

A structural brief's invariants are almost entirely about **dependency
direction** — which block may reference which. The acceptance checks are mostly
negative and mechanical: block A does not reference block B, nothing outside
block C reaches its internals, the reference graph has no cycle — assertable by
an architecture test or a reference check, and what keeps the structure from
eroding after the change lands. State each documented edge as a positive check
and each absent edge as a negative one, plus the no-cycle check. Name every
block by its workspace identifier, and every new folder as the block's `code`
will list it.

A move or a split is `change to existing behaviour`, and the brief lists the
current locations of everything that must move — "extract the module" without
the list is not actionable. Ubiquitous language: the block names the chapter
uses and the `domain/` terms the blocks align with, so a new project or
namespace is named as the architecture names it. Out of scope: behaviour
changes of any kind (say explicitly that behaviour is unchanged), the deployment
topology in `07-deployment-view.md`, package or version choices, and other
sections of the view.

## Do not

- Do not set `type`, add `depends-on`, or add a second file-level `meta` block.
- Do not redraw a dependency edge or a relationship to match the intended layering.
- Do not draw a block, its relationships, or a runtime flow between blocks in Mermaid, or
  put a code path or prose in the workspace.
- Do not restate ADR or TDR content, or `tech/` package and version facts.
- Do not scaffold an empty chapter.
- Do not brief a behaviour change alongside a structural one, or omit the
  negative dependency checks.
- Do not choose the project layout, folder names, or refactoring order.
- Do not brief deployment topology — no kind covers it; route it through the
  `arc42/` flow — or package and version changes, which go through the
  repository package-update workflow and are recorded in `tech/`.
