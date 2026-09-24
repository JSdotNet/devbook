# Surfaces

```meta
date: 2026-09-24
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#surface-plugins", ".devbook/arc42/08-crosscutting-concepts.md#surface", ".devbook/tech/hosts.md#copilot-extension-sdk", ".devbook/arc42/adr/plugin-boundaries.md", ".devbook/arc42/adr/hosts.md"]
```

A surface is a viewer for a run: an MCP server named `delivery-surface-*`, resolved from the
live tool list in either host spelling, or a host canvas whose actions carry the contract's
operation names. The same names on a server with any other name are not a surface. Each
capability group binds to the first surface that answers it, in the order
`bindings["delivery.surface"]` gives — per machine through an overlay — or, unset,
alphabetically by server name with canvas actions last. A surface that answers `unavailable`
at open is skipped for the next, and a run with no surface bound produces its file artifacts
and continues. `delivery` ships none and the contract names none. Four plugins implement it
and none depends on the engine or on each other: `delivery-surface-dashboard` answers every
group, `delivery-surface-collector` lifecycle and export, `delivery-surface-backlog`
lifecycle — and export once the Backlog app lists it — by forwarding to the app, and
`delivery-surface-canvas` render, as Copilot canvas actions with no server. Each exposes
exactly the contract's tool names. `devbook`'s graph canvas is not a surface; it ships in
`devbook-derived` and loads the checker's modules from their materialized path.

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
rendering job. One run store per surface: two surfaces bound at once record a run twice,
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
spellings of the dashboard, collector, and Backlog surface ids, although the contract resolves
by pattern. An exact-match allowlist cannot hold a pattern, and an agent whose allowlist omits a
server cannot call it however correctly it resolved it — the ids are the permission that leaves
the contract something to resolve, not a second resolution rule. Another lifecycle surface is
unreachable until someone adds its two spellings, and that line is part of the new surface's
release. It closes when a host allows a prefix match in `tools`.

**A surface is plugged in by installing one, and the engine names none.** On 2026-09-22 the
contract named Backlog outright — a column in the capability table, first place in a fixed
priority order, and a surfacing shape only an application needed — and matched surfaces by
operation name alone. Both were wrong for the same reason: the engine named an
implementation, and any server answering `start_run` became a surface whether anyone chose it
or not, including Backlog's general `backlog` server, which is the tracker. The server name is
now the opt-in: a surface is a `delivery-surface-*` server, so registering the tracker never
binds a run and installing `delivery-surface-backlog` does. The order moved out of the
contract into config because which surface a person wants first is a fact about their
machine — the app they keep open — and not about the engine; the default is alphabetical
because a default that ranks implementations is the same naming by another route.

**Backlog is reached through a proxy plugin.** Backlog serves the lifecycle operations from
an MCP endpoint inside the running app (local ADR 0012 in `JSdotNet/Backlog`), on a port and
behind a token kept in the app's own `settings.json`. Neither host's HTTP server entry can
read a header from a file — Copilot's interpolates environment variables only — so a stdio
server that reads the file is the one shape that works on both, and the one every other
surface already has. It forwards and passes answers through, adding no guard of its own.

**Unavailable at open is a skip, not a failure.** A closed Backlog is the common case, not a
fault, and the contract's rule that an erroring operation blocks the run would have made an
unopened app stop every flow. So `open_dashboard` may answer `unavailable: true`, and the
caller tries the next surface. The rule is written for every surface; a surface that stops
answering after the run started on it is still a tooling failure, because the run already
lives there.

**`devbook-graph` is not a surface, and it left `devbook`.** It answers no operation group
and substitutes for nothing, so its name carries no surface word. It imported `graph.mjs`,
`outline.mjs`, and `metadata.mjs` by relative path — deliberately, so the rendered graph and
the committed index are the same code — and those imports kept it inside `devbook` until the
modules had a shape a separate plugin could reach. That shape is the materialized path
`.devbook/_tools/devbook-meta/`, loaded at runtime, so the canvas now ships with the committed
index in `devbook-derived` and `devbook` ships no surface at all.

## Rejected

```meta
```

- Porting the dashboard server into `delivery`.
- A shared run store across surfaces: a coupling between implementations meant to be swappable.
- The canvas keeping an MCP server beside the extension.
- Recording `gh` or any literal tool name as a surface's provider.
- An HTTP entry for Backlog's endpoint in a plugin's MCP configuration: the token is in a file,
  and neither host reads a header from one.
- A fixed priority order in the contract, and matching a surface by operation name alone.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-24 | Supersedes 2026-09-22: a surface is a `delivery-surface-*` server, the order is `bindings["delivery.surface"]` with an alphabetical default, `unavailable` at open skips to the next surface, and Backlog is reached through `delivery-surface-backlog`. The contract names no implementation. |
| 2026-09-22 | `backlog` joins the contract: a lifecycle surface inside a running application, first in the priority order, and a tracker provider. |
| 2026-09-17 | `devbook-graph` moves to `devbook-derived`, loading devbook's modules from the materialized path. |
| 2026-09-09 | The runner's allowlist names the two shipped servers' four ids, the one sanctioned exception to matching by operation name. |
| 2026-09-05 | `delivery-surface-canvas` drops its MCP half; the render group has one implementation per host. |
| 2026-09-03 | Each surface exposes exactly the contract's tool names; `workItem` and `approval.state` in the run schema. |
| 2026-09-03 | Three plugins implement `delivery.surface.*@1`; the collector is written here rather than ported. |
| 2026-09-03 | `delivery` ships no surface and no-ops when none answers. |
| 2026-09-03 | `devbook` keeps the graph canvas, blocked from lifting by its imports into the generator. |
