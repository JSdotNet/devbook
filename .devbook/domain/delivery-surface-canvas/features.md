# Delivery Surface Canvas

```meta
type: features
related: [".devbook/domain/context-map.md#delivery-surface-canvas"]
```

> One capability group, whole, and nothing else. The absences below are as much a feature as the
> renders are.

**This context keeps `features.md` rather than `skills.md`, because it ships no skills** — two
canvas operations and nothing else.

## Render a Diagram

```meta
type: feature
related: [".devbook/domain/delivery-surface-canvas/domain.md#view"]
```

Show Mermaid source live and pannable, with an optional explanation panel beside it — C4,
sequence, state, deployment, aggregate, context map, domain-event flow, subdomain landscape,
wireframes, user flows. Whatever the source says, drawn.

### Drill Down and Step Back

```meta
type: sub-feature
related: [".devbook/domain/delivery-surface-canvas/domain.md#navigation-mode"]
```

`push` into a related diagram and walk back through the breadcrumbs; `replace` updates in place.
The history is the only thing this context remembers, and it dies with the panel.

## Render a Document

```meta
type: feature
related: [".devbook/domain/delivery-surface-canvas/domain.md#view"]
```

Show Markdown as formatted HTML, with the same push-and-replace navigation. Same viewer shape,
different content — which is why the two are one plugin rather than two.

## Stay a Preview

```meta
type: feature
related: [".devbook/domain/delivery-surface-canvas/domain.md#preview"]
```

Persist nothing. Render the same source that was written to disk; the file stays the source of
truth, and a rendered view nobody saved is not a record of anything.

This is what keeps the render group honest across all three implementations: a surface that
started storing what it drew would become a second, staler copy of the artifact — and the run
would then have two answers to what it produced.

## Declare Two Names

```meta
type: feature
related: [".devbook/arc42/adr/surfaces.md"]
```

Answer `render_diagram` and `render_markdown`, and nothing else. Viewer navigation and view
inspection are served over the extension's own origin rather than added as extra actions — a
surface that declares more than the contract stops being swappable for one that declares exactly
it.
