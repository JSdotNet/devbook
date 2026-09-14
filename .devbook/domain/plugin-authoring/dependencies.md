# Plugin Authoring

```meta
type: dependencies
related: [".devbook/domain/context-map.md#plugin-authoring", ".devbook/tech/hosts.md#claude-code-plugin-api", ".devbook/tech/hosts.md#copilot-plugin-api"]
```

> What this context depends on and who depends on it. The hosts sit outside the boundary and
> are conformed to; the repositories that adopt a plugin sit outside it and are supplied.

## Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| Claude Code Plugin API | Conformist | Files read at load: `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `skills/`, `hooks/hooks.json` | The manifest schema `claude plugin validate --strict` enforces | The host decides what loads; this context has no say in the shape and writes to it. |
| Copilot Plugin API | Conformist | Files read at load: `.github/plugin/plugin.json`, `hooks.json`, `applyTo` globs, `handoffs` | The manifest and frontmatter shapes that host documents | Same host relationship, second reader. Both hosts ignoring unknown keys is what lets one file serve both. |

## Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| A consuming repository | Customer-Supplier, this context supplying | Install by `plugin@jsdotnet-devbook`; a install skill copies payload and writes the stamp under `components.<name>` in `.devbook/config.json` | Plugin name and version, the contract version, migration ids, the stack-config schema `delivery` ships | Names never renamed after release, migrations never rewritten, one component never writing another's key. |
| A specialist marketplace | Customer-Supplier, this context supplying | Role and service bindings a consuming repository writes in `.devbook/config.json`, naming a specialist plugin published elsewhere | The engine's closed point set and the provider-id form the schema accepts | Point names never renamed after release. Nothing here names a specialist, so a rename on their side costs a repository's binding, not an asset in this one. |
| Every other context in [the map](../context-map.md) | Shared Kernel | The plugin folder shape, the manifest pair, the marketplace entry, the layer order, the stamp, and the migration folder | [domain.md](domain.md#ubiquitous-language), and the checks in `tools/check-assets.mjs` | That the kernel changes rarely and never quietly: a change to any of the six lands in nine contexts at once, which is why none of them declares this one and all of them conform to it. |

## Notes

- Both outbound rows are Conformist by choice: there is no anti-corruption layer between an
  asset and its host because the asset *is* the host's format. The cost is paid in the
  authored file, see [One Authored Copy Per Asset](../../arc42/adr/3-one-authored-copy-per-asset.md).
- Nothing here depends on a host's runtime behaviour — how it ranks a skill, when it applies
  an instruction — which is what keeps the boundary in [domain.md](domain.md) honest.
