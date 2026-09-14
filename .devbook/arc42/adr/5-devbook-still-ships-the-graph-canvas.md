# 5. devbook Still Ships the Graph Canvas

```meta
date: 2026-09-03
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/domain/plugin-authoring/domain.md#surface", ".devbook/arc42/adr/2-one-folder-per-plugin.md"]
```

The layered design puts the five folder-writing skills — one per adopted folder — in
`devbook-flows`, an L2b bridge depending on both `devbook` and `delivery`, and the graph
renderer in `devbook-graph`, an L3 surface. The flows have moved; the canvas has not.

**The flow half is closed.** The five folder-writing skills are now `flow-domain`,
`flow-tech`, `flow-design`, `flow-arc42-content`, and `flow-ai` in `devbook-flows`, which
declares both dependencies and is demoted without either. The sixth the design named was for
`.backlog`, which is gone, so it was not carried over and has nothing to write. Their dashboard references became the
surface contract, and each declares its own documentation/config tier, because the engine
never enumerates a skill in a layer above it. `devbook` now names no flow by name: its
converters resolve the write path — repo-native skill, folder flow, `flow-fallback`, or the
instruction files — through one section of `assets/code-sync-protocol.md`. Superseded on
2026-09-07: the five flows moved again, into `delivery` itself, and the bridge is gone — see
[Flows Belong to Delivery](34-flows-belong-to-delivery.md).

**The canvas half is not, and the reason is an import boundary rather than a rename.** The
extension was renamed `knowledge-canvas` → `devbook-canvas` ahead of the move, because a name
is free to change before anything resolves it, and again to `devbook-graph` on 2026-09-07 for
the same reason — see [the decision](36-devbooks-canvas-carries-no-surface-word.md). But it imports
`graph.mjs`, `outline.mjs`, and `metadata.mjs` out of `tools/devbook-meta/` by relative path —
deliberately, so the rendered graph and the committed index are the same code — and those
three paths are what a lift breaks. So that move is not a move plus a manifest: the generator
modules have to become something a separate plugin can import first. `devbook` still imports
nothing from the canvas, which is the direction that matters for L0.

Consequence: `devbook` is L0-clean on the skill side and can now be installed alone, which the
five dashboard-referencing skills previously made untrue. It still ships a surface inside its
own folder, so the claim that a surface is never packaged with what it renders stays
unenforced here. Close it by lifting `devbook-graph` into its own plugin once the generator
modules have a published shape to import.
