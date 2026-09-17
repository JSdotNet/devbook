# Plugin Authoring

```meta
type: features
```

> What this context lets a maintainer do, in the language of [domain.md](domain.md#ubiquitous-language) rather
> than in file paths. Four features, and each is a thing a host or a consuming repository
> can observe.

**This context keeps `features.md` rather than `skills.md`, because it ships no skills** — it
is the only context here that is not a plugin. What it offers is a way of authoring, and the
chapters below are features of that.

## Author an Asset

```meta
type: feature
related: [".devbook/domain/plugin-authoring/domain.md#agent", ".devbook/domain/plugin-authoring/domain.md#skill", ".devbook/domain/plugin-authoring/domain.md#plugin-rule", ".devbook/domain/plugin-authoring/domain.md#hook"]
```

Write one file that both hosts load: an agent, a skill, an instruction file, or a hook. The
value is a single copy per asset — nothing to keep two variants of, nothing that drifts.

### Author for Both Hosts

```meta
type: sub-feature
related: [".devbook/arc42/adr/hosts.md"]
```

Carry both hosts' tool ids in one allowlist, pin only a model both accept, and restate in
prose what one host ignores: handoff targets, and the paths of the instruction files a host
does not apply by itself.

### Stay Within Budget

```meta
type: sub-feature
related: [".devbook/arc42/tdr/1-body-budgets-unenforced.md"]
```

Keep an asset short enough that a model attends to all of it, and say why in the file when it
must be longer. The budget triggers a disclosure decision; it is not a gate. `AUTHORING.md`
holds the budgets and the kinds that are long by nature.

## Package a Plugin

```meta
type: feature
related: [".devbook/domain/plugin-authoring/domain.md#plugin", ".devbook/arc42/05-building-block-view.md#plugin-folder"]
```

Group assets that belong together into one folder a host can install on its own.

### Declare the Manifests

```meta
type: sub-feature
```

Ship the Claude manifest and the Copilot manifest, agreeing on name, version, and
description. A plugin ships the manifest of every host that can load something in it, so a
plugin whose whole payload belongs to one host ships that host's alone.

### Declare a Dependency

```meta
type: sub-feature
related: [".devbook/domain/plugin-authoring/domain.md#layer", ".devbook/arc42/adr/plugin-boundaries.md"]
```

Name the lower layer a plugin cannot work without, with a version range, so the host makes an
illegal combination unreachable. A role, a tracker, or a surface is never declared; it is
bound per repository or resolved from the live tool list.

## Offer a Plugin

```meta
type: feature
related: [".devbook/domain/plugin-authoring/domain.md#marketplace", ".devbook/arc42/05-building-block-view.md#marketplace-root"]
```

List a plugin once in the marketplace so a host can offer it. A folder that is not listed does
not exist as far as a host is concerned, which is what keeps a Copilot-only profile out of
Claude's catalogue.

## Materialize a Component

```meta
type: feature
related: [".devbook/domain/plugin-authoring/domain.md#stamp", ".devbook/domain/plugin-authoring/domain.md#migration"]
```

Copy a plugin's inert payload into a consuming repository, record what landed in that
repository's stamp, and carry it forward with runnable migrations rather than prose notes.

### Stamp the Repository

```meta
type: sub-feature
```

Write the component's own key in the stack config — plugin and contract version, adopted
features, every copied file with its hash, the migration ledger — and never another
component's.

### Migrate a Contract

```meta
type: sub-feature
```

Ship each breaking change as an immutable, idempotent migration whose `--check` says whether
work remains. The ledger decides whether it runs, never a version comparison.
