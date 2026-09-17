---
name: devbook-naming
description: File and folder naming conventions inside devbook folders, including dot-prefixed specification areas and underscore-prefixed tool-interpreted data.
---

# File and folder naming in devbook folders

## Underscore prefix marks tool-interpreted data

Anything that exists **for tooling rather than for reading directly** carries a
leading underscore, so a human scanning a folder can tell specification from
machinery at a glance. Folders with a leading underscore are always machinery:
the checker and the tooling beside it, never content.

- **Tooling folders** are prefixed: `.devbook/_tools/` (the checker and the
  inventory scripts). Files *inside* such a folder are not prefixed again — the
  folder already carries the signal, so it is `_tools/devbook-meta/build.mjs`,
  never `_tools/_devbook-meta/`.
- **Tooling files** sitting alongside content are prefixed individually:
  `_template.md`, `_schema.json`.

Use the prefix when the asset is a template, a schema, a generated artifact,
input consumed only by a generator or viewer, or the generator. Do not use it for documents meant
to be read as content, even if tooling also parses them — the `.domain`,
`.arc42`, `.tech`, `.design`, and `.ai` Markdown files are read by both
humans and tooling and stay unprefixed.

## Dot prefix marks specification areas

Top-level devbook areas keep the leading-dot convention and are **not**
renamed: `.arc42/`, `.domain/`, `.tech/`, `.design/`, `.ai/`. The dot marks
a repository-level specification area; the underscore marks tool-interpreted
data within one. Folders with a leading dot are for specifications. Under the
nested layout the dot sits on the `.devbook/` parent alone and the five drop
theirs — `.devbook/domain/`, never `.devbook/.domain/`; see
`devbook-chapter-metadata.md`.

## No redundant suffixes

A name should not repeat what its location already says.

- Files within a bounded context are named after their role, not the context:
  `.domain/ordering/features.md`, not `.domain/ordering/ordering-features.md`.

## Casing

Use kebab-case for files and folders (`.domain/order-management/`,
`technology-graph.md`). Keep any casing that an external tool requires, such as
`README.md`.
