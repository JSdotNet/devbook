# Delivery Surface Canvas

```meta
index: root
type: context
related: [".devbook/domain/context-map.md#delivery-surface-canvas", ".devbook/arc42/adr/surfaces.md"]
```

What this context is responsible for: that a diagram or a document written to a file can be
looked at, live, beside the file — and that looking at it creates nothing anyone could mistake
for a record.

Inside the boundary: the two viewers, the navigation between views, and the transport that puts
them on a canvas panel.

Outside it: everything else. It tracks no runs, exports nothing, persists nothing, and knows
nothing about what produced the content it is handed. It answers one capability group and is the
one plugin here that ships a single host's manifest and takes no marketplace entry.

## Dependencies

What this context depends on and who depends on it. It is the one plugin here that ships a
single host's manifest and takes no marketplace entry, and the reason is in the first row.

### Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| Copilot Extension SDK | Conformist, and structurally | `extensions/delivery-surface-canvas/`, a `copilot-extension.json` and the module that registers two canvases | The host's extension shape | A canvas panel is the one thing this context needs, and only one host has one. That is why it carries no second manifest — there is nothing in it for the other host to install. |
| [Delivery](../delivery/context.md#dependencies) | Conformist to a Published Language | Implements the render group's two operation names, and nothing else | `resources/surface-contract.md`: `delivery.surface.render@1` | The contract matches operation names rather than a transport, which is exactly what lets a canvas satisfy it without being an MCP server. |
| Plugin Authoring | Shared Kernel, with one documented exception | Plugin folder and one manifest; **no marketplace entry** | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | A plugin ships the manifest of every host that can load something in it. Here that is one host, so the folder-shape rule is satisfied rather than broken. |
| The local loopback origin | Conformist | The viewer pages served at an ephemeral port, with a per-instance token, and view changes pushed to the open page | Its own transport | The canvas server outlives the panel that opened it, which is the one thing here that needs a token. |

### Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| Whatever renders a diagram or a document | Customer-Supplier, this context supplying | Two operations, resolved as a capability group | `delivery.surface.render@1` | That the group is resolved separately from the other two, so a caller can get render here and lifecycle nowhere. |
| Nothing else | — | — | — | No plugin declares it, nothing lists it, and no host installs it from this marketplace. |

### Notes

- **Being absent from the marketplace is the standing exception, and it is allowed on one test.**
  A plugin ships the manifest of every host that can load something in it; here that is one host,
  so this is the folder rule applied rather than waived — see
  [the decision](../../arc42/adr/surfaces.md).
  A plugin holding one host-only asset still ships both manifests.
- **It knows nothing about what produced its content**, and nothing knows it exists. It is
  resolved at run time like every surface, and none answering is a normal outcome.
- **It answers one group and is substitutable within it.** On the other host, the
  [dashboard](../delivery-surface-dashboard/context.md#dependencies) answers the same group — which is
  what makes this a second implementation rather than a host-specific fork.
- **It persists nothing, so it depends on no store and nobody depends on it for one.** The file
  the view previews is somebody else's record and stays the source of truth.
