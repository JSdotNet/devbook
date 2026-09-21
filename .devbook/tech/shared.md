# Shared

```meta
status: adopted
```

Formats and protocols that cut across every layer: what an asset is written in, and how a
plugin ships tools rather than prose.

## Markdown

```meta
status: adopted
type: format
```

The canonical form of every asset and every chapter. A host reads the file as checked in, so
whatever a plain Markdown viewer shows is what the host gets.

## Model Context Protocol

```meta
status: adopted
type: protocol
related: [".devbook/arc42/08-crosscutting-concepts.md#mcp-server"]
```

How a plugin ships tools rather than prose. A plugin-provided server is namespaced by its
plugin, so the same server has two possible tool prefixes depending on how it was registered.

Two servers ship here, one per MCP-backed surface — the dashboard and the collector — each
hand-written against the stdio transport: newline-delimited JSON-RPC 2.0 on stdin and stdout,
no SDK and no dependency. The third surface, the canvas, reaches its host as two Copilot
extensions and ships no server at all.

## MCP Apps

```meta
status: trial
type: protocol
date: 2026-09-03
depends-on: [".devbook/tech/shared.md#model-context-protocol"]
related: [".devbook/arc42/05-building-block-view.md#surface-plugins"]
```

The MCP extension (SEP-1865) that lets a server hand the host a page to render inline in the
conversation instead of a link to open. `delivery-surface-dashboard` publishes its pages as `ui://`
resources and speaks the postMessage protocol from a small bridge script injected into the
page. `delivery-surface-canvas` did too until it became canvas-only, which leaves one user here.

`trial`, and reversibly so: it is negotiated at initialize, so a host that does not implement
it never reads the resources and the same pages are served over `127.0.0.1` instead. Nothing
depends on it being there, which is the only reason it is safe to use this early.
