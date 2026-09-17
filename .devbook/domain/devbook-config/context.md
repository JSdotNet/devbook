# Devbook Config

```meta
index: root
type: context
related: [".devbook/domain/context-map.md#devbook-config", ".devbook/arc42/adr/plugin-boundaries.md"]
```

What this context is responsible for: that a repository's stack configuration exists before
anything installs itself, that it can be moved forward in one run, and that every answer it gives
about the stack names the file it came from.

Inside the boundary: the four engine-owned keys of the stack config, the read-only report behind
every fact, the scope verdict that decides what an update touches, and the drift report against
the adoption record.

Outside it: every `components.<name>` stamp, which belongs to that component's own install skill;
the schema of the four keys, which is [Delivery](../delivery/domain.md)'s; and writing a chapter,
which is a flow's. This context names every plugin in the marketplace and declares none.

## Dependencies

What this context depends on and who depends on it. It names every plugin in the marketplace and
its `dependencies` array is empty — devbook included. That is the whole shape of it.

### Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| [Delivery](../delivery/context.md#dependencies) | Conformist, and the only writer | Writes `bindings`, `extensions`, `policy`, `gates`; validates with the engine's own checker | `resources/config.schema.json` | The four keys are the engine's schema and this context's to write. It conforms to a shape it does not own. |
| [Devbook](../devbook/context.md#dependencies) | Conformist, read-only | Reads which folders are adopted under `.devbook/`, and invokes `devbook:install` during setup and update | The folder layout, and the install skill's name | It is named for the folder it writes into, not for a plugin it needs. One it names but cannot find is reported as not installed. |
| [Devbook Derived](../devbook-derived/context.md#dependencies), [Delivery Schedule](../delivery-schedule/context.md#dependencies) | Conformist, read-only | Reads their stamps and invokes their install skills during a fan-out | The stamp shape and each install skill's name | Every component's stamp stays with the component. This context decides *whether* an install runs and never what it does. |
| [Devbook Collaboration](../devbook-collaboration/context.md#dependencies) | Conformist, read-only | Reports whether it is installed and enabled | The marketplace entry and manifests | It has no stamp and no install; enabling it is the whole adoption. |
| [Fleet](../fleet/context.md#dependencies), the three surfaces | Conformist, read-only | Reports whether each is installed, enabled, and at what version | The marketplace entries and manifests | Naming a plugin is not depending on one. Every row degrades to `not installed`. |
| The host's own plugin state | Conformist, **and a known divergence** | Reads the host's config directory, its installed-plugin file, its marketplace clones, and three settings layers merged nearest-last | The host's own file layout | Where a plugin is installed and whether it is enabled is a fact about a host and nothing else, so an asset answering it either names those files or answers nothing. |
| Plugin Authoring | Shared Kernel | Plugin folder, two manifests, marketplace entry, `scripts/` run in place from the plugin root | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | It is packaged like everything else here. |

### Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| A repository being set up | Customer-Supplier, this context supplying | `.devbook/config.json`, written before any component installs itself | The engine's schema | That setup runs first and hands each component its own install skill. |
| [Devbook](../devbook/context.md#dependencies) and every other component, during a fan-out | Customer-Supplier, reversed — this context calling | Their own install skills, invoked with a scope verdict already resolved | Each install skill's name and its idempotence | That an install run twice is harmless, which is what makes a whole-stack update safe. |
| Nothing declares it | — | — | — | No manifest anywhere names this plugin, in either direction. |

### Notes

- **Naming every plugin and depending on none is the position, and it is deliberate.** A plugin it
  cannot find is reported as `not installed` — the same degrade-rather-than-fail shape the engine
  uses for an unbound role — which is what keeps this context outside the layer order rather than
  under it.
- **The host-path row is the one divergence, and it is recorded rather than hidden.** This is the
  only asset in the marketplace that still names a host's own files, after the two profile plugins
  were deleted for doing exactly that. A slot would be the clean fix, and the engine's closed set
  has no member for *where this host keeps its plugins*.
- **The other host's plugin state has never been written down here**, so its rows come back empty
  while the catalog half still answers. The report says which files it read and which were absent,
  which is what keeps an empty table legible rather than misleading.
- **It writes four keys and calls other people's install skills.** Everything else it does, it
  reads.
