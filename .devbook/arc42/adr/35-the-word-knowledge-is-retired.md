# 35. The Word Knowledge Is Retired

```meta
date: 2026-09-07
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/domain/plugin-authoring/domain.md", ".devbook/arc42/adr/25-devbook-payload-named-after-its-plugin.md", ".devbook/arc42/adr/59-the-design-artifacts-are-no-longer-cited.md", ".devbook/arc42/11-risks-and-technical-debt.md"]
```

*Knowledge* is not a term here any more, in prose or in identifiers. The folders are **devbook
folders**, what they hold is a **chapter**, what `_meta/graph.json` derives is the **reference
graph**, and a review note that has not settled is **unsettled content** rather than
"not established knowledge".

[Devbook Payload Named After Its Plugin](25-devbook-payload-named-after-its-plugin.md) renamed every
`knowledge-` identifier and kept the English word. That half-measure was the problem: a reader
met "the knowledge folders" in the same paragraph as `devbook-meta` and had to work out that
the two named one thing. A convention that has a name does not also need a common noun standing
in for it, and the leftover word made the marketplace descriptions, the session-start hook, and
the instruction file headings read as if a second subsystem existed.

One place keeps the old spelling on purpose, and it is not the term: the pre-rename **payload
paths** — `.github/tools/knowledge-meta/`, `.github/workflows/knowledge-meta*.yml`,
`.github/instructions/knowledge-*.instructions.md`, `build/Update-KnowledgeIndex.ps1` — and the
plugin name `knowledge-base` they came from. These name files that exist on disk in
already-synced repositories, so the technical debt record in
[chapter 11](../11-risks-and-technical-debt.md), the `006-drop-backlog` migration that matches
both workflow spellings, and the decision above all keep them. Erasing them would break the
migration and lose the record of what has to move.

A second exception stood here until 2026-09-09: the external design artifact **Knowledge Base
Internals 2.0**, cited by title in `AGENTS.md`, where a citation carries its target's name.
[59](59-the-design-artifacts-are-no-longer-cited.md) retired that citation along with the other
five, so the exception went with it.

Consequence: a grep for the word finds only the payload paths, and finding it anywhere else is
a bug.
