---
name: devbook-arc42
description: Structure and authoring rules for the arc42 architecture documentation folder.
---

# Architecture documentation (`.arc42`)

`.arc42` holds arc42-structured architecture documentation for the system:
context, building blocks, runtime views, cross-cutting concerns, and
architecture decisions, at the level of the whole system or a major
deployable unit.

## Context-loading policy

- `.arc42` is **not** baseline repository context. Load it only for architecture,
  ADR, blueprint, TDR, or explicit arc42 tasks, normally after routing through the
  repository's architecture flow or an architecture specialist agent.
- When `.arc42` is needed as task context, load only the relevant chapter(s) or
  sections instead of reading the whole folder by default.
- For non-architecture implementation or documentation tasks, consult `.arc42`
  only when the user asks for architecture context or when the work depends on a
  specific documented constraint, decision, runtime view, deployment view, or
  glossary entry.

## Relationship to other devbook folders

- `.domain` describes *what the domain is* (bounded contexts, aggregates,
  ubiquitous language). `.arc42` describes *how the system is built and runs*
  (containers, deployment, quality attributes, decisions).
- `.design` describes *how the product looks and behaves for the user* (UX
  principles, design tokens, interaction and accessibility rules). Channel and
  stack facts stay in `.arc42`; `.design` links to them.
- Architecture Decision Records referenced from arc42 sections should stay
  aligned with ADRs already tracked by the repository's authoritative guidance
  source; do not duplicate ADR content here — link to it instead.
- Local ADRs and TDRs (decisions/debt specific to this system, not covered by
  an org-level ADR) live under `.arc42/adr/` and `.arc42/tdr/` respectively,
  and are linked from `09-architecture-decisions.md` /
  `11-risks-and-technical-debt.md` rather than restated there.

## Structure

Use the standard arc42 chapter set as individual files (create files only
when a chapter has real content — do not scaffold empty placeholders):

```
.arc42/
  01-introduction-and-goals.md
  02-constraints.md
  03-context-and-scope.md
  04-solution-strategy.md
  05-building-block-view.md
  06-runtime-view.md
  07-deployment-view.md
  08-crosscutting-concepts.md
  09-architecture-decisions.md   (links out to ADRs, doesn't restate them)
  10-quality-requirements.md
  11-risks-and-technical-debt.md (links out to TDRs)
  12-glossary.md
  adr/                           (Architecture Decision Records)
  tdr/                           (Technical Debt Records)
```

## Folder rules

These rules describe the persisted shape of `.arc42` assets only. Authoring
workflow, routing, and cross-document governance are handled by separate
instructions.

- Keep the glossary aligned with the ubiquitous language defined per bounded
  context in `.domain`.
- Prefer diagrams (Mermaid) over long prose for building-block and runtime
  views.
- Each file's top-level chapter, and any independently trackable ## section
  inside it, must carry the metadata block described in
  `devbook-chapter-metadata.md` (status — optional here, see
  below — cross-folder tags, issue link) — required for the derived index and
  graph tooling. There is no `depends-on` field in `.arc42` —
  architecture chapters describe standing structure, not sequenced work;
  cross-references use `related` instead.
- Because an `.arc42` file is always exactly one top-level chapter, that
  chapter's metadata block also serves as the file's file-level metadata
  block described in `devbook-chapter-metadata.md`
  — do not add a second, duplicate block for the file.
- The metadata block's `status` field uses `draft`, `proposed`, `active`, or
  `deprecated` in this folder. Architecture documentation describes a
  standing decision/structure, not a task, so there is no `done`.
- On top of that ladder sits the shared `approved` rung, defined once in
  `devbook-chapter-metadata.md`: a person approved this chapter,
  recorded with `approved-by` and `approved-at`. It is written explicitly, never
  rested at, and comes off the moment the content changes.
- **`active` is this folder's resting value, so it is written by omitting the
  field.** State `status` only while the chapter is in transition (`draft`,
  `proposed`) or carries a standing warning (`deprecated`). A standing structure
  is settled by definition, so `active` is where nearly every chapter here ends
  up permanently, and stating it turns the field into noise the few moving
  chapters hide behind. Writing `status: active` explicitly is reported.
- **Chapters are ordered by their number, not by their filename string.** The
  `<NN>-` prefix supplies it, so `10-quality-requirements.md` sorts after
  `09-architecture-decisions.md` rather than after `01-…`. Only add an explicit
  `number` field when a file's name cannot carry the number.
- **ADRs and TDRs are numbered records with a date.** Number them in the
  filename (`7-use-postgres.md`) or, where the filename is a plain slug, in a
  `number` field — either way the number is what orders the folder, so an
  unpadded 10 still follows 7. Give each one a `date` for the day the decision
  was taken or the debt logged; it is content, not a modification timestamp.
- **Give `adr/` and `tdr/` an index document.** Neither folder has a root
  document by convention, so mark the one that introduces the set — usually
  `README.md` — with `index: root` and it sorts first. Without it the folder is
  a bare numbered list.

## Template

```markdown
# <NN>. <Chapter Name>

\`\`\`meta
status: draft
\`\`\`

Chapter content.

## <Section Name>

\`\`\`meta
status: draft
\`\`\`

Section content.
```

`related` and `issue` are omitted above rather than written empty, per the
omit-when-empty rule; add them when they carry a value. Once a chapter settles,
its `status: draft` line comes out too and the fence is left empty — keep the
fence, it is what makes the heading an addressable chapter.
