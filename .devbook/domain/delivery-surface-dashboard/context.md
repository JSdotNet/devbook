# Delivery Surface Dashboard

```meta
index: root
type: context
related: [".devbook/domain/context-map.md#delivery-surface-dashboard", ".devbook/arc42/adr/surfaces.md"]
```

What this context is responsible for: that a run is visible while it happens, that what it shows
was measured rather than claimed, and that uninstalling it costs a view and never a capability.

Inside the boundary: the run store, the three pages, the telemetry the hooks capture, and the
report exported at the end. It answers all three capability groups of the surface contract.

Outside it: what produced the run. This context knows nothing about flows, gates, or extension
points — it receives lifecycle calls, and whoever made them resolved its tool names by pattern
from the live tool list. It declares no dependency and names no engine.

## Dependencies

What this context depends on and who depends on it. It declares no dependency in either
direction — a surface is not a layer, and nothing may declare one.

### Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| [Delivery](../delivery/context.md#dependencies) | Conformist to a Published Language | Implements the tool names of all three capability groups, and nothing else | `resources/surface-contract.md`: `delivery.surface.lifecycle@1`, `.render@1`, `.export@1` | Declaring exactly the contract's names is what makes one implementation substitutable for another. Declaring more would end that. |
| Plugin Authoring | Shared Kernel | Plugin folder, two manifests, marketplace entry, `mcp/<server>/`, `hooks/hooks.json` | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | It is packaged like everything else here. |
| Model Context Protocol | Conformist | One MCP server, started on the first tool call, plain Node with no npm dependencies | The protocol's own schemas | The transport is how a caller reaches it at all. |
| MCP Apps | Conformist, optional | Pages read as `ui://` resources and rendered inline where the host implements it | The MCP Apps resource shape | Where it is absent, the same file is served on a loopback origin — which is what the bridge exists for. |
| The host's command hooks | Conformist, host-specific | `hooks/hooks.json`, a hook reading a tool-event payload and writing the run store | The host's own hook schema | Measuring requires reading an event and writing a file, which a prompt hook cannot do. There is no root `hooks.json` beside it, structurally rather than by omission. |
| The local filesystem, outside the repository | Conformist | One JSON file per run, keyed by worktree path, root overridable | Its own store layout | A run must survive a session restart and must never appear in `git status`. |

### Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| Whatever drives a run | Customer-Supplier, this context supplying | Tool names matched by pattern from the live tool list, never by one spelling | The three capability groups | That each group is resolved separately, and that this one answers all three. It names no caller and no caller names it. |
| [Fleet](../fleet/context.md#dependencies), [Delivery Schedule](../delivery-schedule/context.md#dependencies) | Customer-Supplier, this context supplying | The same lifecycle calls, from unattended sessions | The same contract | The same. Both follow the engine's reporting contract and treat no surface bound as normal. |
| [Devbook Config](../devbook-config/context.md#dependencies) | Conformist, read-only | Reports whether this plugin is installed, enabled, and at what version | The marketplace entry and the manifest | Nothing but the name and version. |

### Notes

- **A surface is never a dependency in either direction.** The thing being rendered knows no
  surface exists, and this context knows nothing about what produced its input. Whichever tool
  opens it resolves it at run time, and **none answering is a normal outcome** — it costs a view,
  never a capability.
- **Substitutability is per capability group, not per host.** The three groups are resolved
  separately, so a caller finds the ones this context answers and looks elsewhere — or nowhere —
  for the rest.
- **The telemetry dependency is the one asymmetry, and it is a column rather than a group.** A
  Copilot run bound to this plugin gets the same lifecycle tools and the same panels with the
  numbers absent rather than wrong. Nothing in the contract names telemetry, which is what keeps
  the asymmetry from costing a capability group.
- **Namespacing is a matching problem, not a naming one.** The tools surface with a
  plugin-namespaced prefix when installed as a plugin and a bare one from a repository's own MCP
  configuration; a consumer matches by pattern and never by one spelling.
