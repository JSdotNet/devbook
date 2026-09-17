# Chapter Schema

```meta
date: 2026-09-09
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/domain/devbook/domain.md", ".devbook/domain/plugin-authoring/domain.md#devbook-folder", ".devbook/arc42/adr/annotations.md", ".devbook/arc42/adr/checks-and-indexes.md"]
```

A devbook is five folders of Markdown chapters, each heading that is addressable carrying a
fenced `meta` block, in one of two layouts — five root dot-folders or all five under
`.devbook/` — never mixed. `status` is one field with one ladder per folder; `approved` is a
rung on top of every ladder, with `approved-by` and `approved-at` beside it, and the three
editorial folders rest at `active` by omitting the field. A bounded context describes its
skills or its features, says who works with it in `stakeholders.md`, and keeps its terms in
`domain.md`. The rule files under `plugins/devbook/rules/` are the specification; this record
is why it has the shape it has.

## Why

```meta
```

**Two layouts, and the generator reads both.** The convention permitted the nested layout and
the generator understood only the flat one, so a `.devbook/domain/…` address resolved to
nothing. Folder resolution now strips an optional `.devbook/` and matches the five names either
way; a repository containing both layouts is an error, not half an index. The first real run
over this repository's nested folders found eleven defects nothing had reported — a convention
that cannot check the repository that ships it accumulates exactly that. What the fix did not
reach was every glob and path filter that spelled the flat names literally outside the
generator; each was found on its own, and a glob matching nothing is indistinguishable from a
quiet branch.

**`approved` is a rung, not a field.** A chapter has one lifecycle state. A boolean beside
`status` would let a chapter claim `draft` and approved at once, which is the ambiguity the gate
exists to remove. The rung is one constant appended to each ladder, so reversing it is a
migration and not a rewrite; every consuming repository's schema assumes this shape.

**Three folders rest at `active`.** In `.domain`, `.arc42`, and `.design` the value records
how settled the writing is, and nearly every chapter sits at `active` permanently; written out,
it is a line that says nothing and the few moving chapters hide inside it. In `.tech` and `.ai`
the value is a rating whose purpose is to be stated, and an absent one is indistinguishable
from `candidate`. An explicit `active` is reported as a warning, never rejected.

**A context describes its skills.** When the product is procedures, `skills.md` takes the place
of `features.md` — one or the other, both `type: feature`, because a skill is a feature and a
second vocabulary would make every graph consumer branch on a filename. `flow.<name>.md` splits
one flow out of `flow.md`. `naming.md` is optional: twenty-eight of seventy-three terms were
restatements of a chapter in the same context and folded to `aliases`, and the rest live under
`## Ubiquitous Language` in `domain.md` — a registry naming what the model already names is a
second copy, not a second view.

**A context says who works with it.** `features.md` named "the case worker" and nothing defined
the term; a consuming repository filled the gap with three incompatible shapes. `stakeholders.md`
carries `type: actor` — the EventStorming role that issues a command, which an invariant can
depend on — and `type: party`. A persona is a UX archetype and belongs in `.design`. Another
context or a system is a dependency and stays in `dependencies.md`, because one relationship
described in two places is one description that goes wrong.

## Rejected

```meta
```

- A separate `approved` boolean beside `status`.
- `status` required everywhere, or optional everywhere.
- A `personas.md` or a second `actors.md` file; a rename of `stakeholders.md`.
- A separate `type` for a skill chapter.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-09 | `stakeholders.md` joins the starter set with `type: actor` and `type: party`. |
| 2026-09-09 | `status` optional in `.domain`, `.arc42`, and `.design`; required in `.tech` and `.ai`. |
| 2026-09-08 | `skills.md` beside `features.md`, `flow.<name>.md` per flow, `naming.md` optional with terms in `domain.md`. |
| 2026-09-04 | The generator resolves both layouts and errors on a repository holding both. |
| 2026-09-03 | `approved` is a status rung with `approved-by` and `approved-at`. |
| 2026-09-03 | Two layouts, flat or nested, never mixed. |
