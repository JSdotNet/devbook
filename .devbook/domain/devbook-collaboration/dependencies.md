# Devbook Collaboration

```meta
type: dependencies
related: [".devbook/domain/context-map.md#devbook-collaboration", ".devbook/domain/devbook/dependencies.md"]
```

> What this context depends on and who depends on it. It is an L1 extension: exactly one
> declared dependency, on the foundation whose namespace it stores its state in.

## Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| [Devbook](../devbook/dependencies.md) | Customer-Supplier, declared `devbook >=1.0.0 <2.0.0` | `ext.devbook-collaboration.*` keys in a chapter's own `meta` block | The [extension namespace](../plugin-authoring/domain.md#extension-namespace): keys carried through untouched, unvalidated, producing no edge | It has no store of its own. The state it remembers about a chapter is three keys in that chapter, which is what lets it release without a devbook release. |
| [Devbook](../devbook/domain.md#annotation) | Conformist, for the whole device | Writes findings through `tools/devbook-meta/annotations.mjs` | The [annotation](../devbook/domain.md#annotation) fence: its schema, its placement rule, and its open/resolved/gone lifecycle | A finding is devbook's device, not this context's. It reads the fences as the evidence a verdict stands on, and sweeping them is devbook's too — see [the annotations record](../../arc42/adr/annotations.md). |
| [Devbook](../devbook/domain.md#chapter) | Conformist, for one field | Writes `status: approved`, `approved-by`, `approved-at` directly | The shared `approved` rung and its two record fields | Approval is devbook's field and keeps devbook's meaning. This context runs the decision; it does not own the vocabulary. |
| Plugin Authoring | Shared Kernel | Plugin folder, two manifests, the `rules/` folder its install delivers, the `components.collaboration` stamp | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | It is packaged, installed, and stamped like every other plugin here. |
| Claude Code and Copilot Plugin APIs | Conformist | Manifests, skills, and the two rule wrappers its install writes | Each host's own schemas | Its contract has to fire when either host opens a chapter, which only a materialized wrapper achieves. |
| A consuming repository | Customer-Supplier, this context supplying | `devbook-collaboration:install` writes one rule plus a wrapper per host, stamped under `components.collaboration` | Rule name, contract version, the four `ext` keys | The contract is only applied where it was installed. |

## Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| [Devbook](../devbook/dependencies.md), as a reader | Conformist, reversed | Its check reads `status: approved` and reports an unsigned, undated, or orphaned approval | The three approval fields | That this context never writes the rung without both records, and never leaves them behind. |
| [Delivery](../delivery/dependencies.md) | Separate Ways | A flow's approval gate reads whether a chapter was agreed before building from it | The `approved` rung, read from the chapter | Nothing from this plugin. It reads devbook's field, which is why the two never name each other. |
| [Devbook Config](../devbook-config/dependencies.md) | Conformist, read-only | Reads `components.collaboration` to report scope and version | The stamp shape | That the stamp exists and keeps its shape; it writes none of it. |

## Notes

- **The `ext` namespace is the entire dependency, and it is deliberately inert.** Uninstall this
  plugin and the keys stay parseable, render as they always did, and mean nothing to anyone —
  which is what made the seam safe to reserve before anything needed it.
- **This context reads no other plugin's `ext` keys**, and nothing reads its own as if they were
  schema. An opaque namespace two plugins interpret has stopped being opaque.
- **Nothing declares this context.** It is above devbook in the layer order and below nothing,
  so no manifest anywhere names it — a repository that has not enabled it simply has no review
  state, and every chapter still reads correctly.
- **Promotion to a work item is not here, and the Separate Ways row above is why.** A note that
  has become tracked work should be promoted through `bindings["delivery.tracker"]`, but the
  operations, their resolution order, and the key naming them are declared in `delivery`'s own
  surface contract — a file this context may not point at. Restating it here is what the
  Separate Ways relationship exists to prevent, so promotion belongs in `delivery` or in a
  bridge allowed to name both. See
  [the annotations record](../../arc42/adr/annotations.md).
