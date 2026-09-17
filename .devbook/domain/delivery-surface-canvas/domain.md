# Delivery Surface Canvas

```meta
type: domain
related: [".devbook/domain/context-map.md#delivery-surface-canvas", ".devbook/arc42/adr/surfaces.md"]
```

## View

```meta
type: aggregate
aliases: [render, panel content]
```

What is currently shown on a canvas, and the history behind it. It is the only aggregate here,
and it is deliberately ephemeral: a view is a preview of a file that already exists, so storing
one would create a second, staler copy of something one call can re-render.

The history is the only state that is not derivable from the current call, which is exactly why
the aggregate exists at all rather than the render being a pure function.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| Nothing is persisted; a view is re-rendered rather than restored | render | untested |
| Rendered source is the same source written to disk — the file stays the record | render | untested |
| `push` leaves a breadcrumb the Back button walks; `replace` updates in place and is the default | `render_diagram()`, `render_markdown()` | untested |
| The declared tool surface is exactly two names | extension start | untested |
| Navigation and view inspection are served over the extension's own origin, never as extra actions | page load | untested |
| The canvas server checks a per-instance token, because it outlives the panel that opened it | request handling | untested |

### Navigation Mode

```meta
type: enum
```

`push` or `replace`. `push` drills into a related view and leaves a breadcrumb; `replace` — the
default — updates what is on screen. Two values and no third: a mode that cleared the history
would make the Back button lie, and one that merged views would make the breadcrumb meaningless.

### Breadcrumb

```meta
type: entity
related: [".devbook/domain/delivery-surface-canvas/domain.md#view"]
```

One step in the history a `push` left behind, identified by its position. It exists so a
drill-down can be stepped back, and it dies with the panel — which is the whole extent of this
context's memory.

## Canvas Transport

```meta
type: domain-service
related: [".devbook/domain/delivery-surface-canvas/domain.md#canvas", ".devbook/tech/hosts.md#copilot-extension-sdk"]
```

Registers the two canvases, serves the viewer pages on a loopback origin at an ephemeral port,
and pushes view changes to the open page.

Invocation semantics: event-triggered — it starts when a canvas opens. It is a service rather
than behaviour on [View](#view) because it is the one part of this context that knows a host
exists, and keeping that knowledge in one place is what lets the viewers themselves stay plain
pages.

**This is the plugin's only transport, and it is why the contract matches operation names rather
than a transport.** The two operations arrive as canvas actions rather than namespaced tools, and
the surface contract is still satisfied — a surface is not required to be an MCP server.

## Ubiquitous Language

```meta
type: ubiquitous-language
```

> The terms this context owns that are not chapters above. A term naming an aggregate, service,
> event, or field carries its aliases on that chapter instead. The kernel vocabulary — surface,
> capability group, plugin — is defined once in [Plugin Authoring](../plugin-
> authoring/domain.md#ubiquitous-language).

### Canvas

```meta
type: term
date: 2026-09-08
aliases: [panel, extension canvas]
related: [".devbook/domain/delivery-surface-canvas/domain.md#canvas-transport", ".devbook/tech/hosts.md#copilot-extension-sdk"]
```

The host panel a viewer page is registered into, and this plugin's only transport. Two are
registered: one for diagrams, one for documents.

It is the reason the surface contract matches operation names and never a transport. These two
operations arrive as canvas actions rather than as namespaced tools, and the contract is still
satisfied — a surface is not required to be an MCP server.

### Preview

```meta
type: term
date: 2026-09-08
aliases: [live view, rendered artifact]
related: [".devbook/domain/delivery-surface-canvas/features.md#stay-a-preview"]
```

What every render here produces, and what none of them is allowed to stop being: a live view of a
file that already exists on disk.

Rendering the same source that was written, and storing none of it, is what keeps a surface from
becoming a second answer to what a run produced. A rendered view nobody saved is not a record of
anything.
