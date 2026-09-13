# Devbook

```meta
type: dependencies
related: [".devbook/domain/context-map.md#devbook", ".devbook/arc42/adr/34-flows-belong-to-delivery.md", ".devbook/arc42/tdr/4-delivery-depends-on-devbook.md"]
```

> What this context depends on and who depends on it. It is an L0 foundation: its
> `dependencies` array is empty, and every relationship below is either a conformance to
> something outside the marketplace or a downstream consumer reaching in.

## Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| Plugin Authoring | Shared Kernel | The plugin folder shape, the two manifests, the stamp, the migration folder | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | It is packaged as a plugin like everything else here, and the kernel is what "packaged" means. |
| Claude Code Plugin API | Conformist | Manifest, skill discovery, `hooks/hooks.json`, and the `.claude/rules/` wrapper the install writes | The host's own schemas | The host decides what loads; this context writes to the shape and has no say in it. |
| Copilot Plugin API | Conformist | Manifest, `hooks.json`, and the `.github/instructions/` wrapper the install writes | The host's own schemas | Same relationship, second reader. Both hosts ignoring unknown keys is what lets one rule body serve two wrappers. |
| Copilot Extension SDK | Conformist | `extensions/devbook-graph/`, registering two canvases | `copilot-extension.json` | The graph canvas is a host capability this context uses and does not define. |
| A consuming repository | Customer-Supplier, this context supplying | `devbook:install` materializes rules, wrappers, workflows, tooling, and one marker-fenced section of `AGENTS.md`; the stamp under `components.devbook` records it | Contract version, migration ids, the `meta` schema | The convention only exists where it has been installed, and the stamp is the record of what landed. |

## Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| [Devbook Collaboration](../devbook-collaboration/dependencies.md) | Customer-Supplier, declared | `ext.devbook-collaboration.*` keys in a chapter's own block; annotation fences written through `annotations.mjs`; writes devbook's `approved` rung | The `ext` namespace, the annotation fence, and the `status` ladder | That `ext.*` is carried through untouched and unvalidated, that a fence keeps its schema and its open/resolved/gone lifecycle, and that `approved`, `approved-by`, and `approved-at` keep their meaning. |
| [Delivery](../delivery/dependencies.md) | **Undeclared** — see [debt record 4](../../arc42/tdr/4-delivery-depends-on-devbook.md) | Five folder flows name the folders, restate three schema rules, and run this context's generator at the path the install writes it to | None declared, on either side | Folder names, the generator's payload path, and the contract version — none of which it pins. |
| [Delivery Schedule](../delivery-schedule/dependencies.md) | Separate Ways | Two catalog entries name `devbook-check` and `devbook-tech-update` as targets | The skill names alone | Nothing but the names. A target whose plugin the repository has not enabled is reported and skipped, never scheduled. |
| [Devbook Config](../devbook-config/dependencies.md) | Conformist, read-only | Reads which folders are adopted, in both layouts, and this context's stamp in the stack config | The stack config schema and the folder layout | That the two layouts stay detectable and the stamp keeps its shape. It writes none of it. |
| Both hosts, at read time | Conformist, reversed | A materialized rule fires when either host opens a matching chapter | The wrapper each host reads | That the glob in the wrapper resolves in the consuming repository, which is the whole reason the rule is installed rather than shipped. |

## Notes

- **The undeclared row is the one that matters.** `delivery` cannot be declared a dependent
  without demoting all twenty-four of its skills wherever this context is absent, and cannot be
  left silent without the next payload-path rename landing the way `.backlog` did. The debt
  record holds the four remediation options; the first — name the coupling in prose and stop
  restating this context's rules — is the one to take.
- **Nothing here names a flow.** This context ships the shape and the check; how a chapter
  change is carried is the engine's, and the two meet only in a repository that installed both.
- The graph canvas lives inside this plugin and imports the generator's modules by relative
  path. No host resolves the two together, so that is a source coupling to undo rather than a
  dependency to declare — see
  [the decision](../../arc42/adr/5-devbook-still-ships-the-graph-canvas.md).
- Every relationship above degrades rather than fails. A host that cannot load the extension
  loses the canvas, a repository that has not run the install still has readable Markdown, and
  a consumer of the `ext` namespace that is not installed leaves keys that parse and mean
  nothing.
