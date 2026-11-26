---
name: devbook-tech
description: Structure and authoring rules for the technology devbook folder, holding the project's technology graph of platforms, runtimes, frameworks, libraries, packages, services, and tools.
---

# Technology documentation (`tech/`)

`tech/` is the durable record of **which technologies this project itself is
built with, and how they depend on each other** — the technology graph: what it
builds on, at which version and rating, and what depends on what. A product
that models technologies as a domain concept keeps that model in `domain/`.

## Where a fact lives

Which folder keeps a fact, and how a task loads one, is "One folder keeps a fact" in
`devbook-writing.md`. `tech/` ranks third: it links to `arc42/` and `design/`. Load the
relevant layer files for stack, dependency, upgrade, or technology-selection work.

- A **Why** an ADR backs is one clause and a link to it. Which choice is an ADR's
  and which a `tech/` chapter's is the test under "Decision records" in
  `devbook-arc42.md`. `alternatives` stays on the chapter either way.
- An AI tool's chapter holds its version and rating only and states no usage;
  `ai/` keeps how it is used and points here with `depends-on`.
- A UI component library's chapter holds its version and rating and links to
  `component-libraries.md` in `design/`, which keeps the adopted library and why.

## Structure

`tech/` contains one root graph artifact plus one file per technology layer.
Choose layers that match how the system is actually split — by deployable
channel, by tier, or by service — and keep the set small.

```
.devbook/tech/
  technology-graph.md   # root: layers, graph diagram, how to read it
  shared.md             # cross-layer technologies (formats, protocols, contracts)
  <layer>.md            # one file per layer, e.g. backend.md, web.md, desktop.md
  tooling.md            # development, AI, build, CI/CD, and governance tooling
  _meta/graph.json      # derived: generated reference graph, never hand-edited
  _meta/index.json      # derived: generated reading outline, never hand-edited
```

Add a new layer file only when a technology genuinely does not belong to an
existing layer, and register it in `technology-graph.md`'s layer table in the
same change. Reading order needs no declaration: `technology-graph.md` is read
first, then `shared.md`, then the layer files alphabetically, then `tooling.md`
last — the order shown in the tree above. See
`devbook-chapter-metadata.md`.

## File responsibilities

- **technology-graph.md** — Root strategic view of the whole stack.
  - Lists the layers and what each layer file covers.
  - Renders the technology graph as a Mermaid diagram (nodes = technologies,
    edges = `depends-on`).
  - Explains the rating ladder and how to read/extend the graph.
  - Its `##` sections do **not** carry per-chapter metadata blocks; the file
    carries a file-level block only (same rule as `.devbook/domain/context-map.md`).
  - It is `tech/`'s root document, so it is the first file read in the folder.
- **`_meta/*.json`** — Derived, generated indexes for this folder.
  Never hand-edited; the rule for them comes with the layered plugin that commits the
  index, and the output shape is in the devbook-meta tooling README
  (`.devbook/_tools/devbook-meta/README.md`).
- **`<layer>.md`** — One `## <Technology Name>` chapter per technology used (or
  under consideration) in that layer. Each chapter is an addressable node in
  the graph and carries a chapter metadata block.

## Technology chapter template

```markdown
## <Technology Name>

\`\`\`meta
rating: candidate
type: framework
version: "9.0"
depends-on: [".devbook/tech/shared.md#net-runtime"]
related: [".devbook/arc42/04-solution-strategy.md#technology-choices"]
\`\`\`

One or two sentences: what it is used for in this project.

- **Used for** — the concrete responsibility it carries here.
- **Why** — the decisive reason it was picked, in one sentence, or one clause and
  a link where an ADR holds it.
- **Alternatives** — what else was considered, if the choice is still open.
```

Keep chapters short. A technology chapter is a graph node with just enough
context to be understood, not a design document.

## Metadata fields

`tech/` uses the common fields from
`devbook-chapter-metadata.md` (`rating` and `type` required; `related` and
`tests` optional) plus the folder-specific fields below.

### rating

Maturity of the technology **in this project**, on a tech-radar-style ladder:

| Value | Meaning |
|---|---|
| `candidate` | Named as the intended choice, not yet validated by real use. |
| `trial` | Being tried out in a limited, reversible way. |
| `adopted` | In active use and the default choice for its role. |
| `hold` | Kept but no longer expanded; avoid new usage. |
| `retired` | No longer used; kept for history. |

Early in a project most entries are legitimately `candidate`. The ladder is
fixed; no repository configuration narrows or widens it.

**`rating` is required on every `tech/` block, with no value to omit.** A rating
is a decision the branch makes, and being stated is its entire purpose: a
technology nobody has rated is not thereby `candidate`, and a radar assembled
from omissions renders blank. `adopted` is the most common value precisely
because it is the interesting one. The field was spelled `status` until
contract 38; the `038-workflow-state-leaves-the-chapter` migration renames it.

What kind of technology the chapter describes. Required on every technology
chapter. One of: `language`, `runtime`, `framework`, `library`, `package`,
`tool`, `service`, `platform`, `protocol`, `format`, `plugin`, `skill`, `agent`.
The last three are the `ai/` words and mean the same thing: a technology that is
a Claude Code plugin, skill, or agent. `tech/` registers and rates it; `ai/`
records how it is used.

This field was previously called `kind`. The old name still parses, so an
existing `tech/` folder keeps working after a generator sync, but it reports a
warning — rename it to `type`.

### Folder-specific fields

- **version** (optional) — the pinned or targeted version, as a quoted string
  (e.g. `"9.0"`, `"^5.2"`). Omit when no version is committed to yet.
- **depends-on** (optional) — list of `<path>#<heading-slug>` references to
  other `tech/` chapters this technology sits on top of. These are the edges of
  the technology graph.
- **alternatives** (optional) — list of plain-string names that were considered
  instead. Like `domain/`'s `aliases`, this is a plain-string list, **not** a
  reference field.

Omit every optional field that has no value (no `related: []`, no
`version: null`).

## Authoring guidance

- Every technology appears exactly **once**, in the layer that owns it. If two
  layers use the same technology, document it in `shared.md` and point at it
  with `depends-on` from the layer chapters.
- `depends-on` must reference an existing `tech/` chapter; the check warns on one that
  points elsewhere. Do not point it at `arc42/`/`domain/` — use `related` for those.
- Keep `technology-graph.md`'s Mermaid diagram in sync with the `depends-on`
  edges in the layer files whenever a node or edge is added, removed, or
  renamed, and run the check in the same change:
  `node .devbook/_tools/devbook-meta/build.mjs --scope tech --check`.
- Do not add a new metadata field without updating this file (folder-specific)
  or `devbook-chapter-metadata.md` (universal) first — the visualization
  tooling depends on a fixed schema.
