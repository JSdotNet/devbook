# Introduction and Goals

```meta
number: 1
related: [".devbook/arc42/08-crosscutting-concepts.md"]
```

This repository, `devbook`, packages the devbook convention and the delivery flow — the agents,
skills, instruction files, and hooks that do the work — as plugins served from one
marketplace, `jsdotnet-devbook`. The repository is named for the convention that every plugin
here reads from or writes into; the marketplace name is a separate key that follows the
repository name by rule — [the releases record](adr/releases.md).

This folder holds chapters 1, 3, 5, 6, 8, 9, 11, and 12 and three record folders, and no
others: a chapter is written when it has content, not to complete the set. There is no runtime
of this repository's own here, so the deployment and quality-scenario chapters would describe
hosts it does not own; constraints and solution strategy are carried by the goals below and by
[chapter 8](08-crosscutting-concepts.md). Each plugin is one building block with its own file
under [`building-blocks/`](building-blocks/README.md), the language every block is written in
is chapter 8, and the terms one block owns are the [glossary](12-glossary.md). The numbering
is kept so a later chapter lands in its place.

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
