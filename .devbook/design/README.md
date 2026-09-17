# Design

```meta
status: draft
index: root
```

Design guidance for the surfaces this repository's plugins render. Both chapters below now
have an implementation. The dashboard stays `draft` because the intent was written first so
the shipped surface would be reviewed against something other than itself, and that review has
not happened yet.

## Dashboard

```meta
status: draft
related: [".devbook/ai/02-deliver.md#flow-skills"]
```

The run surface a flow reports into: stages, their state, and the evidence attached to each.
It sits beside a conversation rather than replacing it, so it stays readable at sidebar width,
survives the viewer's light and dark theme, and never becomes the only place a result is
recorded.

`delivery-surface-dashboard` is the implementation, and the last of those three is the one it is built
around: every run produces its file artifacts whether or not anything renders them, and
`export_report` writes the run out to a file that outlives the page.

The theme rule is where a review should start, because the surface answers it in two different
ways. The dashboard shell takes the host's own tokens with light fallbacks under
`color-scheme: light dark`, so it follows the viewer. The diagram and document viewers do not:
they are hard-coded dark, down to the Mermaid theme, and a light-themed host renders a dark
panel beside a light conversation. One of the two is wrong and it is the second.

The headless case belongs to the same design and has no visual answer at all:
`delivery-surface-collector` records the same run with nothing to look at, which is what a scheduled
run needs. A design for a run surface that only works when someone is watching it is
incomplete.

## Canvas

```meta
related: [".devbook/domain/plugin-authoring/domain.md#surface", ".devbook/arc42/05-building-block-view.md#plugin-folder"]
```

The rendered view of something already true in the repository — a graph, a diagram, a document.
A canvas is a projection: it reads generated or checked-in content and never becomes the source
of it, so a viewer can be absent without anything being lost.

`devbook-graph` renders `_meta/graph.json` from the same graph module the generator writes it
with, which is what makes the live view and the committed index unable to disagree — a second
implementation of the projection would be a second thing to keep true.

`delivery-surface-canvas` applies the same rule to a diagram and a document: it renders the source that
was written to the file artifact, never a regenerated or reinterpreted version of it, and
stores nothing. One copy of each page, and now one transport reading it: it served the same
pages over MCP as well until it became canvas-only, and collapsing to one removed a thing to
keep true rather than adding one.
