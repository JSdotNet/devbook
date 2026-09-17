# Introduction and Goals

```meta
number: 1
related: [".devbook/domain/context-map.md#plugin-authoring"]
```

This repository, `devbook`, packages the devbook convention and the delivery flow — the agents,
skills, instruction files, and hooks that do the work — as plugins served from one
marketplace, `jsdotnet-devbook`. The repository is named for the convention that every plugin
here reads from or writes into; the marketplace name is a separate key that follows the
repository name by rule — [the releases record](adr/releases.md).

This folder holds chapters 1, 5, 9, and 11 and the two record folders, and no others: a
chapter is written when it has content, not to complete the set. There is no runtime here, so
the runtime, deployment, and quality-scenario chapters would describe hosts this repository does
not own; constraints, context, and solution strategy are carried by the domain folder's context
map and dependencies and by the goals below; cross-cutting concepts and the glossary are each
context's `domain.md`. The numbering is kept so a later chapter lands in its place.

## Quality Goals

```meta
```

| Goal | What it rules out |
| --- | --- |
| One authored copy per asset | A Claude variant and a Copilot variant of the same agent, drifting apart. |
| Every dependency is declared | A plugin that silently needs a sibling installed to work. One that names its layer is fine; the host enforces it. |
| An asset earns every line | Prose that restates the model default, or a rule stated in two files. |
| A loaded asset works | A manifest or frontmatter shape one host rejects at load time. |

## Stakeholders

```meta
```

The maintainer authors and releases. Anyone who adds the marketplace consumes it, on either
host, with no expectation that they read this repository first.
