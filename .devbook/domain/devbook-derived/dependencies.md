# Devbook Derived

```meta
type: dependencies
related: [".devbook/domain/context-map.md#devbook-derived", ".devbook/domain/devbook/dependencies.md", ".devbook/arc42/adr/77-the-tooling-is-devbook-deriveds.md"]
```

> What this context depends on and who depends on it. It is an L1 extension: exactly one
> declared dependency, on the convention it enforces, and nothing below it names it.

## Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| [Devbook](../devbook/dependencies.md) | Customer-Supplier, declared `devbook >=1.1.0 <2.0.0` | Reads `adopted` and the layout from devbook's stamp; parses every chapter against the schema devbook states | The `meta` block schema and chapter addressing, `devbook-chapter-metadata.md` | Every rule it enforces is devbook's. The constant that stamps the contract version lives here and moves with devbook's schema. |
| Plugin Authoring | Shared Kernel | Plugin folder, two manifests, the `rules/` folder its install delivers, the `components.derived` stamp | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | It is packaged, installed, and stamped like every other plugin here. |
| Copilot Extension SDK | Conformist | `extensions/devbook-graph/`, registering two canvases | `copilot-extension.json` | The graph canvas is a host capability this context uses and does not define. |
| Claude Code and Copilot Plugin APIs | Conformist | Manifests, one install skill, the hook pair, and the rule wrappers its install writes | Each host's own schemas | The `_meta/` rule has to fire when either host opens a derived file, which only a materialized wrapper achieves. |
| A consuming repository | Customer-Supplier, this context supplying | `devbook-derived:install` materializes the tool, both workflows, the refresh script, the rule trio, and its own marker-fenced section of `AGENTS.md`; the stamp under `components.derived` records it | The materialized paths, above all `.devbook/_tools/devbook-meta/` | The tool only exists where it was installed, and devbook's skills name that path. |

## Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| [Devbook](../devbook/dependencies.md) | Conformist, reversed — through `AGENTS.md`, never by name | `devbook:install`, the converters, and `prose-check` run "the check the repository's `AGENTS.md` names"; this context's own section of that file is what names it | The marker-fenced `AGENTS.md` section this context writes | That the section is present and names the check. Absent, devbook's skills report no check and continue. |
| [Devbook Collaboration](../devbook-collaboration/dependencies.md) | Customer-Supplier, declared | Writes every finding through `annotations.mjs` | The fence writer's verbs | That the writer is the only one, so a fence it wrote is one devbook's rules recognise. |
| [Delivery Schedule](../delivery-schedule/dependencies.md) | Separate Ways | The `devbook-check` and `tech-update` catalog entries target `check` and `tech-update` here and require this plugin beside devbook | The skill names alone | Nothing but the names: a target whose plugin is not enabled is reported and skipped. |
| [Devbook Config](../devbook-config/dependencies.md) | Conformist, read-only | Reads `components.derived` and invokes `devbook-derived:install` during a fan-out, after devbook's | The stamp shape and the install skill's name | That the stamp exists and keeps its shape; it writes none of it. |
| The Backlog desktop app, outside this repository | Conformist | Reads `_meta/index.json` and `_meta/graph.json` off disk | The derived-artifacts envelope and `schemaVersion` | That the files are committed and current on the default branch — which is what the nightly refresh is for. |

## Notes

- **Nothing below names this context.** devbook's skills reach the check through the
  repository's `AGENTS.md`, which this context's install writes its own section of; the
  skills that run a tool directly — `check`, `annotation-sweep`, `tech-update` — live here.
  The layer inversion [record 77](../../arc42/adr/77-the-tooling-is-devbook-deriveds.md)
  first accepted is gone with them.
- **A missing tool degrades; it never fails a load.** A repository with devbook and without
  this plugin gets its rules, its `AGENTS.md` section, and no gate — the same position it is
  in before any install runs.
