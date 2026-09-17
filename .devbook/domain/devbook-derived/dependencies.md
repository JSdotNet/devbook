# Devbook Derived

```meta
type: dependencies
related: [".devbook/domain/context-map.md#devbook-derived", ".devbook/domain/devbook/dependencies.md", ".devbook/arc42/adr/79-the-checker-is-devbooks-the-committed-index-is-derived.md"]
```

> What this context depends on and who depends on it. It is an L1 extension: exactly one
> declared dependency, on the convention whose checker it asks to write.

## Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| [Devbook](../devbook/dependencies.md) | Customer-Supplier, declared `devbook >=1.1.0 <2.0.0` | Passes `--write` to `.devbook/_tools/devbook-meta/build.mjs` from its refresh script and both workflows; reads `adopted` from devbook's stamp | The checker's CLI and the derived-artifacts envelope it writes | It computes nothing itself. Every byte under `_meta/` is devbook's checker's output, asked for with the one flag nothing in devbook passes. |
| Plugin Authoring | Shared Kernel | Plugin folder, two manifests, the `rules/` folder its install delivers, the `components.derived` stamp | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | It is packaged, installed, and stamped like every other plugin here. |
| Claude Code and Copilot Plugin APIs | Conformist | Manifests, one install skill, the hook pair, and the rule wrappers its install writes | Each host's own schemas | The `_meta/` rule has to fire when either host opens a derived file, which only a materialized wrapper achieves. |
| GitHub Actions | Conformist | The nightly refresh and the drift warning are workflows | The host's workflow schema | Refresh on a schedule needs a scheduler, and a pull-request warning needs a runner; without Actions the on-demand script is the only path. |
| A consuming repository | Customer-Supplier, this context supplying | `devbook-derived:install` materializes the script, both workflows, the rule trio, and its own marker-fenced section of `AGENTS.md`; the stamp under `components.derived` records it | The materialized paths | The committed index exists only where it was asked for. |

## Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| [Delivery Schedule](../delivery-schedule/dependencies.md) | Separate Ways | `schedule-devbook-check` refreshes the committed indexes where this plugin materialized the refresh path, and skips the step where it did not | The refresh script's path | Nothing but the path: absent, the run fixes Markdown only. |
| [Devbook Collaboration](../devbook-collaboration/dependencies.md) | Separate Ways | `chapter-review-queue` prefers the committed indexes and scans when there are none | The derived-artifacts envelope | Nothing: the scan fallback is the contract. |
| [Devbook Config](../devbook-config/dependencies.md) | Conformist, read-only | Reads `components.derived` and invokes `devbook-derived:install` during a fan-out, after devbook's | The stamp shape and the install skill's name | That the stamp exists and keeps its shape; it writes none of it. |
| The Backlog desktop app, outside this repository | Conformist | Reads `.devbook/_meta/index.json` and `graph.json` off disk | The derived-artifacts envelope and `schemaVersion` | That the files are committed and current on the default branch — which is what the nightly refresh is for. |

## Notes

- **Nothing below names this context.** devbook's checker takes a `--write` flag and devbook
  never passes it; that flag is the entire seam, and it runs upward only.
- **A missing refresh degrades; it never fails a load.** A repository without this plugin has
  the full check and no derived file; the schedule's daily run fixes Markdown and refreshes
  nothing.
