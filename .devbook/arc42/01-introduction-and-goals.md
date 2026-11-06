# Introduction and Goals

```meta
number: 1
related: [".devbook/arc42/08-crosscutting-concepts.md"]
```

This repository, `devbook`, packages the devbook convention and the delivery flow as plugins
served from one marketplace, `jsdotnet-devbook`. The plugins hold the agents, skills, instruction
files, and hooks that do the work. The repository is named for the convention that every plugin
here reads from or writes into. The marketplace name is a separate key that follows the
repository name by rule: see [the releases record](adr/releases.md).

This folder holds chapters 1, 3, 5, 6, 8, 9, 11, and 12 and three record folders, and no others. A chapter is written when it has content, not to complete the set. This repository has no
runtime of its own, so the deployment and quality-scenario chapters would describe hosts it does
not own. The goals below and [chapter 8](08-crosscutting-concepts.md) carry constraints and
solution strategy. The numbering is kept so a later chapter lands in its place.

Each plugin is one building block with its own file under
[`building-blocks/`](building-blocks/README.md). Chapter 8 holds the language every block is
written in, and the [glossary](12-glossary.md) holds the terms one block owns.

## Quality Goals

```meta
```

| Goal | What it rules out |
| --- | --- |
| One authored copy per asset | A Claude variant and a Copilot variant of the same agent, drifting apart. |
| Every dependency is declared | A plugin silently needing a sibling installed. Naming its layer is fine; the host enforces it. |
| An asset earns every line | Prose that restates the model default, or a rule stated in two files. |
| A loaded asset works | A manifest or frontmatter shape one host rejects at load time. |
| A person sees at a glance what something is about | A chapter, reply, question, or notification that needs reading through before its subject is clear. |

## Stakeholders

```meta
```

The maintainer authors and releases. Anyone who adds the marketplace consumes it, on either
host, with no expectation that they read this repository first.
