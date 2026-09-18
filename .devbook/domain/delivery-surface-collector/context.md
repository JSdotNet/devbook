# Delivery Surface Collector

```meta
index: root
type: context
related: [".devbook/domain/context-map.md#delivery-surface-collector", ".devbook/arc42/adr/surfaces.md"]
```

What this context is responsible for: that a run nobody watched is still legible afterwards —
which stages ran, how many times, what a person decided at each gate, what the evidence was, and
whether the run was handed off or abandoned.

Inside the boundary: the run store, the handoff round trip a resumed session depends on, and the
Markdown report. It answers two of the three capability groups.

Outside it: rendering, deliberately, and everything about what produced the run. It declares no
dependency and names no engine.

## Dependencies

What this context depends on and who depends on it. Like every surface here, it declares
nothing and nothing declares it.

### Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| [Delivery](../delivery/context.md#dependencies) | Conformist to a Published Language | Implements the lifecycle and export tool names, and deliberately not the render ones | `resources/surface-contract.md`: `delivery.surface.lifecycle@1`, `.export@1` | Declaring exactly the names of the groups it answers is what makes it substitutable for another implementation of those groups. |
| Plugin Authoring | Shared Kernel | Plugin folder, two manifests, marketplace entry, `mcp/<server>/` | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | It is packaged like everything else here. |
| Model Context Protocol | Conformist | One MCP server over stdio, plain Node, no listening socket | The protocol's own schemas | The transport is how a caller reaches it. There is no page and no port. |
| The local filesystem, outside the repository | Conformist | One JSON file per run, keyed by worktree path, root overridable | Its own store layout | A run must survive a session restart and must never appear in `git status`. |

### Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| Whatever drives a run | Customer-Supplier, this context supplying | Tool names matched by pattern from the live tool list | The two groups it answers | That groups are resolved separately, so the missing render group is read as unanswered rather than as a broken surface. |
| [Delivery Schedule](../delivery-schedule/context.md#dependencies) | Customer-Supplier, this context supplying | Lifecycle calls from an unattended cloud session | The same contract | That a run recorded with nobody watching is readable afterwards — which is the case this implementation exists for. |
| [Fleet](../fleet/context.md#dependencies) | Customer-Supplier, this context supplying | Lifecycle calls from a worker session | The same contract | The same, per worker. Its own result files remain the source of truth for the sweep. |
| [Devbook Config](../devbook-config/context.md#dependencies) | Conformist, read-only | Reports whether this plugin is installed, enabled, and at what version | The marketplace entry and the manifest | Nothing but the name and version. |

### Notes

- **The absent render group is a declaration, not a gap.** A caller finds it unanswered and
  renders nowhere, rather than finding a stub that pretends to have shown someone something —
  which is the reason [the decision](../../arc42/adr/surfaces.md)
  forbids declaring a name you do not implement.
- **No telemetry dependency, and therefore no telemetry.** Nothing here observes a session, so
  there is no hook, no host-specific half, and no numbers — which also means this context works
  identically on both hosts, where the dashboard's capture does not.
- **No page, no port, no authentication question.** The whole HTTP surface the dashboard has to
  reason about does not exist here, which is most of why this implementation is the right one for
  a run nobody is watching.
- **A surface is never a dependency in either direction.** Nothing declares one, and none
  answering is a normal outcome.
