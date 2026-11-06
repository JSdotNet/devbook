# Design

```meta
index: root
```

This is design guidance for the surfaces this repository's plugins render. Both chapters below have
an implementation. The dashboard stays `draft` because the intent was written first, so the shipped
surface would be reviewed against something other than itself. That review has not happened yet.

## Dashboard

```meta
related: [".devbook/ai/02-deliver.md#flow-skills"]
```

A flow reports into this run surface: stages, their state, and the evidence attached to each. It
sits beside a conversation rather than replacing it. So it stays readable at sidebar width, survives
the viewer's light and dark theme, and never becomes the only place a result is recorded.

`delivery-surface-dashboard` is the implementation, built around the last of those three. Every run
produces its file artifacts whether or not anything renders them, and `export_report` writes the run
out to a file that outlives the page.

A review should start at the theme rule, because the surface answers it in two different ways. The
dashboard shell takes the host's own tokens with light fallbacks under `color-scheme: light dark`, so
it follows the viewer. The diagram and document viewers do not. They are hard-coded dark, down to the
Mermaid theme, and a light-themed host renders a dark panel beside a light conversation. The second
is wrong.

The headless case belongs to the same design and has no visual answer. `delivery-surface-collector`
records the same run with nothing to look at, which is what a scheduled run needs. A design for a run
surface that only works when someone is watching it is incomplete.

## Canvas

```meta
related: [".devbook/arc42/08-crosscutting-concepts.md#surface", ".devbook/arc42/05-building-block-view.md#plugin-folder"]
```

A canvas renders something already true in the repository: a graph, a diagram, a document. It is a
projection: it reads generated or checked-in content and never becomes the source of it, so a viewer
can be absent without anything being lost.

`devbook-graph` renders the reference graph with the same graph module devbook's checker uses, loaded
from its materialized path. So the live view, the check, and the committed index cannot disagree. A
second implementation of the projection would be a second thing to keep true.

`delivery-surface-canvas` applies the same rule to a diagram and a document: it renders the source
written to the file artifact, never a regenerated or reinterpreted version, and stores nothing. It
keeps one copy of each page, and now one transport reads it. It served the same pages over MCP as well
until it became canvas-only, and collapsing to one removed a thing to keep true rather than adding one.
