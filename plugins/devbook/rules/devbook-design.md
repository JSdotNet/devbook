---
name: devbook-design
description: Structure and authoring rules for the design devbook folder, holding UX principles, design tokens, interaction guidelines, accessibility rules, and component-library decisions.
---

# Design documentation (`design/`)

`design/` holds the product's design and UX guidelines: principles, design
tokens, typography and layout rules, interaction guidelines, accessibility
requirements, and the component-library recommendation per channel.

It is guideline-level only. Concrete artifacts produced *from* these
guidelines — wireframes, user flows, prototypes, screenshots — are not stored
here. The agreed screens of a bounded context are its demos, in
`.devbook/domain/<context>/*.demo.html`, per `devbook-domain.md`.

The one HTML file `design/` holds is `demo-template.html`: the template every
demo is built on, beside the tokens and guidelines it is built from. It changes
through the same flow as any other `design/` file, carries no `meta` block, and
has no reading position. The change that edits it runs
`node .devbook/_tools/devbook-meta/demo-template.mjs --refresh`, which re-stamps
its begin marker and rewrites every demo's managed region from it; the check
reports a demo left on an earlier version, and fails on a region edited by hand.
The region is outside every fingerprint, so the refresh lifts no approval.

## Authoritative source

When the repository has an authoritative design source (a design-system MCP
server, a published style guide, or a design-tokens package), that source wins
and `design/` **materializes** it into the repository so the product has a
stable, reviewable, offline copy:

- Token names and values are written out concretely, not linked to only.
- When a chapter restates upstream guidance, keep it short and prescriptive; do
  not copy long-form documentation into the folder.
- If the authoritative source is unavailable, state in the affected chapter
  that it could not be verified, and note the gap there.

When no upstream source exists, `design/` is itself authoritative and its
chapters carry the rationale directly.

## Where a fact lives

Which folder keeps a fact, and how a task loads one, is "One folder keeps a fact" in
`devbook-writing.md`. `design/` ranks second, after `arc42/`. Load it for design and UX
work, and for UI work that touches visual design, interaction, editing, or accessibility.

- Link to `arc42/` for UI behaviour, a channel, or a stack fact it states, and never
  restate it here.
- `component-libraries.md` keeps the adopted library and the reason for it. The
  library's `tech/` chapter holds its version and rating and links here.
- A design requirement covers only what a component keeps on its own. A rule it
  shares with a domain requirement stays in `domain/`, and the design chapter links to it.
- A work item links to the `design/` chapter it realizes through `related`.

## Structure

Create files only when a topic has real content — do not scaffold empty
placeholders.

```
.devbook/design/
  README.md                  (index + headline principles)
  design-principles.md
  color-scheme.md            (palette + semantic tokens)
  typography-and-layout.md
  interaction-guidelines.md  (feedback, motion, input affordances)
  accessibility.md
  component-libraries.md     (per-channel recommendation + rationale)
  demo-template.html         (optional: the template every demo is built on)
```

Add a file only when a topic genuinely does not belong to an existing one, and
register it in `README.md`'s index in the same change. Reading order needs no
declaration: `README.md` is `design/`'s root document and is read first, then the
files in the order shown in the tree above, with anything extra sorted by
filename after them. See `devbook-chapter-metadata.md`.

## Folder rules

- **Record the product's own standing design constraints as rules here.** A
  constraint that holds for the whole product (for example a single fixed theme,
  an always-on autosave model, or a canonical content format) belongs in the
  relevant chapter as a prescriptive rule, so no guideline, mock, or example can
  quietly contradict it. Ground such a constraint in `arc42/` when it also has
  an architectural cause, and link rather than restate.
- Rules must be prescriptive and testable. Prefer tables, token names, and
  explicit thresholds over prose.
- Design tokens are declared once in `color-scheme.md` and
  `typography-and-layout.md`; other files reference token names instead of
  repeating raw values.
- **Every pointer-only interaction has a keyboard equivalent.** Drag-and-drop,
  hover-revealed affordances, and gesture shortcuts must be fully operable
  without a pointer.
- Cross-channel guidance states the shared rule first, then per-stack mapping —
  it does not fork into unrelated per-stack designs.
- `component-libraries.md` records the adopted library per channel with its
  rationale, a comparison table, and known gaps. It does not add or pin
  dependencies; dependency changes go through the repository's package-update
  workflow, and the version lands in `tech/`.
- Keep all `design/` content in English.

## Requirements

A rule a component either keeps or breaks — a keyboard path, a token it must
consume, an accessibility threshold — is a `### Requirement:` chapter under that
component's own chapter, `type: requirement`, one SHALL sentence, with
`#### Scenario:` cases beneath it and `tests` naming what proves it. The reason
is `devbook-domain.md`'s: the heading shape is OpenSpec's, so a tool that reads
OpenSpec reads these rules without being taught anything.

```markdown
### Requirement: Reorder by keyboard

\`\`\`meta
type: requirement
tests: e2e:playwright:tests/sortable.spec.ts#reorders by keyboard
\`\`\`

The sortable list SHALL let every item be moved without a pointer.

#### Scenario: Move an item down

- **Given** an item that is not the last one has focus
- **When** the person presses Alt+ArrowDown
- **Then** the item moves one place down and keeps focus
```

A design requirement is proved `e2e`: the rendered component driven by
keyboard or pointer, or compared by a visual test. A requirement with no
scenario, or whose `tests` reach no `e2e`, is reported as a coverage warning.
A requirement that no longer holds is removed by a change's `REMOVED` delta.
Guidance a component cannot break on its own — a principle, a rationale, a
comparison — stays prose in the component chapter.

## Metadata

Every `design/` file and every `##` chapter carries a metadata block per
`devbook-chapter-metadata.md`.

A block carries no `status`: a merged guideline is agreed and binding for
implementation. A guideline that is no longer to be followed is removed by a
change's `REMOVED` delta, per `devbook-changes.md`; one still being written is
an open change, not a chapter here.

`type` is `requirement` on a requirement chapter and absent everywhere else, so
a guideline's block ends up empty. **Keep the empty `meta` fence** — it
is what makes the heading an addressable chapter, and deleting it drops the
chapter out of the derived graph and out of every reference pointing at it.

`design/` defines no folder-specific relation fields — use `related` only.
