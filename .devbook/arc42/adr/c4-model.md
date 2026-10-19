# C4 Model

```meta
date: 2026-10-20
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/building-blocks/devbook.md#c4-model", ".devbook/arc42/building-blocks/devbook-derived.md#view-renderer", ".devbook/arc42/adr/chapter-schema.md", ".devbook/arc42/adr/checks-and-indexes.md"]
```

An arc42 folder's architecture is one Structurizr DSL workspace, `.devbook/arc42/workspace.dsl`,
and it is the only place an architecture element or view is defined. Chapters show its views
by an image embed addressed `c4:<view key>`, records and building blocks name its elements in
`meta`, Mermaid draws only state and flow inside one element, and `devbook-derived` renders
every view to a committed SVG for readers without a C4-aware viewer.

The choice in full:

- **One workspace per repository.** `.devbook/arc42/workspace.dsl`, Structurizr DSL, with
  `!identifiers hierarchical` required. It may `!include` files under `.devbook/arc42/c4/`, so
  a large model splits by building block, and nothing outside that folder.
- **A chapter embeds a view.** `![Containers](c4:containers)` shows the view keyed
  `containers`, the same image-embed form as `shot:` and `scenario:`. Each view kind belongs to
  a chapter, and each view is embedded in exactly one section:

  | View kind | Embedded in |
  | --- | --- |
  | `systemLandscape`, `systemContext` | `03-context-and-scope.md` |
  | `container`, `component` | `05-building-block-view.md` or a `building-blocks/<slug>.md` |
  | `dynamic` | `06-runtime-view.md` or a building block's `## Runtime` |
  | `deployment` | `07-deployment-view.md` |

- **Records and blocks name elements.** Two `meta` fields, in `arc42/` and `domain/` alike,
  list bare workspace identifiers: `c4` for the elements a chapter is about, `c4-touches` for
  the ones its consequences name but its decision is not about. A `building-blocks/<slug>.md`
  links its element with `c4` and lists its repository-relative code folders in `code`.
- **Mermaid stays inside one element.** A state machine or a flow inside one element keeps its
  Mermaid fence. Any diagram between elements is a view.
- **The SVG is a committed copy.** `devbook-derived` renders every view to
  `.devbook/arc42/_meta/c4/<view key>.svg` on its scheduled refresh, with a renderer that has
  no dependency outside the plugin. The embed stays `c4:<key>`, and the SVG sits beside it.
- **Debt records gain a severity and a ladder.** A TDR carries `severity` (`low`, `medium`,
  `high`, `critical`) and a status ladder of its own — `identified`, `planned`, `in-progress`,
  `resolved` — resting at `identified`. The `## History` table header of a decision record is
  fixed as `Date | Change | Why`.

## Why

```meta
```

**Two notations drew the same system and agreed on nothing.** In Backlog, the first
repository to need a model, Mermaid `C4Context` and `C4Container` fences and Archify specs each
drew the context and containers in their own chapter, and no element in one was the element in
another. A container renamed in 05 stayed
under its old name in 03 and 07, and no check could say so, because a fence is a picture and
not a model. One workspace makes every view a projection of the same elements, so a rename is
one edit and a view that names a missing element fails.

**The embed reuses the form that already counts.** devbook's diagram count already reads an
image embed, and `shot:` and `scenario:` already address a picture by a key the checker
resolves. `c4:<key>` joins them, so a chapter that embeds a view counts as one with a diagram
and an unknown key is a broken reference like any other.

**A view belongs to the chapter that documents it.** arc42 already assigns each level of
structure to a chapter: context to 03, building blocks to 05, runtime to 06, deployment to 07.
Mapping view kinds onto those chapters, and allowing each view in one section, means a view
has one home, and the checker can report a view embedded twice or nowhere.

**Identifiers in `meta` make the model navigable both ways.** A record that names
`backlog.cloud` in `c4` is found from the element, and the reverse direction — an element's
records, chapters, and code — is derived from those edges, never stored. Bare identifiers
suffice because a repository has exactly one model. `code` sits on the building block and not
in the workspace, because the block is the chapter that already documents the element's code.

**Mermaid keeps what C4 has no form for.** A state machine, a lifecycle, or an algorithm's
flow lives inside one element and has no C4 view. Between elements, a fence would bring back
the second notation this decision removes.

**A reader without a C4 viewer still sees a picture.** GitHub renders neither the DSL nor a
`c4:` address. A committed SVG per view keeps the repository readable on its own, and
rendering on the scheduled refresh keeps it out of every session, the same way the committed
index is kept, per [checks and indexes](checks-and-indexes.md).

**Debt needs an order and a state.** A TDR held only `number` and `date`, so a reader could
not tell which item mattered most or whether anyone had started on it. `severity` orders the
set, and a ladder of its own keeps a debt's progress apart from a chapter's approval rungs. A
fixed History header lets a reader show a concern's decisions in order across every record.

## Rejected

```meta
```

- **A ```` ```c4 ```` fence with a `view:` line.** GitHub shows it as a code block, and the
  diagram count does not read it. The image embed degrades to alt text instead.
- **DSL `properties` for an element's code folders.** c4hero drops properties when it saves
  the workspace, so the folders would be lost the first time someone edited the model there.
- **An embed that points at the SVG path.** The view key would hide inside a generated path
  under `_meta/`, and a chapter would depend on a file a session never writes.
- **Rendering with the Structurizr CLI.** It needs a Java runtime outside the plugin, on every
  machine and runner that refreshes the index.
- **Forbidding all Mermaid in arc42.** State and flow inside one element have no C4 form, and
  moving them into prose and tables loses what the diagram showed.

## History

```meta
```

| Date | Change | Why |
| --- | --- | --- |
| 2026-10-20 | One Structurizr workspace per repository, views embedded by `c4:<key>` in the chapter that owns their kind, `c4`, `c4-touches`, and `code` in `meta`, Mermaid only inside one element, a committed SVG per view rendered by `devbook-derived`, and TDR `severity` and status with a fixed History header. | Mermaid and Archify drew the same system twice with nothing to check them against each other, and the Backlog app needs one model to navigate. |
