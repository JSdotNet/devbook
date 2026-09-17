# Surfaces

```meta
date: 2026-09-09
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#surface-plugins", ".devbook/domain/plugin-authoring/domain.md#surface", ".devbook/tech/hosts.md#copilot-extension-sdk", ".devbook/arc42/adr/plugin-boundaries.md", ".devbook/arc42/adr/hosts.md"]
```

A surface is a viewer for a run, resolved from the live tool list by matching the operation
names of `delivery.surface.*@1` — never by transport, never by literal tool name — and a run
with no surface bound produces its file artifacts and continues. `delivery` ships none. Three
plugins implement the contract and none depends on the engine or on each other:
`delivery-surface-dashboard` answers every group, `delivery-surface-collector` lifecycle and
export, `delivery-surface-canvas` render, as Copilot canvas actions with no server. Each
exposes exactly the contract's tool names. `devbook`'s own graph canvas is not a surface and
ships inside `devbook`.

## Why

```meta
```

**The engine owns no viewer.** The MCP server that backed the original dashboard stayed in
`JSdotNet/Copilot`; porting it into `delivery` would have made the engine own its own viewer,
which is the coupling the contract exists to prevent. Installing `delivery` alone gives no run
timeline, and that is the resting state.

**Three, because the third makes it a contract.** Two would ship a viewer; the moment a second
implementation exists, the split by operation group stops being a table and starts deciding
what a run gets. A caller resolves each group separately, so a repository with only the
collector records a run and renders nothing, and finds that out by the render names being
absent. The collector captures no telemetry and reports no token figures rather than a column of
zeroes; `export_report` writes Markdown only, because an HTML report with evidence inlined is a
rendering job. Three run stores, one per plugin: two surfaces bound at once record a run twice,
which is the price of no dependency in either direction.

**Only the contract's names.** An extra tool is one more thing a caller can depend on and the
first thing that makes one implementation not substitutable — a run calling `pop_view` works on
the dashboard and fails on the canvas. The same rule renamed `githubIssue` to `workItem` and
`approval.personalValidation` to `approval.state` in the run schema, so a surface can show a
run tracked in Jira or gated by any gate a repository adds.

**The canvas is an extension and nothing else.** It shipped both transports for two days; the
MCP half was a second implementation of the render group the dashboard already covers, kept for
a combination nobody with the dashboard has a reason to add. Removing 870 lines changed no
behaviour, and the contract now says explicitly that a surface may arrive as something other
than a server. The cost is that the canvas has no automated check.

**The runner names the servers it can reach.** `flow-runner`'s `tools` list carries both
spellings of the dashboard and the collector ids, although the contract forbids matching by
name. An exact-match allowlist cannot hold a pattern, and an agent whose allowlist omits a
server cannot call it however correctly it resolved it — the ids are the permission that leaves
the contract something to resolve, not a second resolution rule. A fourth lifecycle surface is
unreachable until someone adds its two spellings, and that line is part of the new surface's
release. It closes when a host allows a prefix match in `tools`.

**`devbook-graph` stays in `devbook`.** It imports `graph.mjs`, `outline.mjs`, and
`metadata.mjs` from `tools/devbook-meta/` by relative path — deliberately, so the rendered
graph and the committed index are the same code — and those paths are what a lift breaks. It
answers no operation group and substitutes for nothing, so it is not a surface and its name
carries no surface word. Lift it once the generator modules have a published shape to import.

## Rejected

```meta
```

- Porting the dashboard server into `delivery`.
- A shared run store across surfaces: a coupling between implementations meant to be swappable.
- The canvas keeping an MCP server beside the extension.
- Recording `gh` or any literal tool name as a surface's provider.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-09 | The runner's allowlist names the two shipped servers' four ids, the one sanctioned exception to matching by operation name. |
| 2026-09-05 | `delivery-surface-canvas` drops its MCP half; the render group has one implementation per host. |
| 2026-09-03 | Each surface exposes exactly the contract's tool names; `workItem` and `approval.state` in the run schema. |
| 2026-09-03 | Three plugins implement `delivery.surface.*@1`; the collector is written here rather than ported. |
| 2026-09-03 | `delivery` ships no surface and no-ops when none answers. |
| 2026-09-03 | `devbook` keeps the graph canvas, blocked from lifting by its imports into the generator. |
