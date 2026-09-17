# Chapter Schema

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/domain/devbook/domain.md", ".devbook/domain/plugin-authoring/domain.md#devbook-folder", ".devbook/arc42/adr/annotations.md", ".devbook/arc42/adr/checks-and-indexes.md", ".devbook/arc42/adr/releases.md"]
```

A devbook is five folders of Markdown chapters under one parent — `.devbook/arc42`,
`.devbook/domain`, `.devbook/tech`, `.devbook/design`, `.devbook/ai` — and nowhere else, each
addressable heading carrying a fenced `meta` block. `status` is one field with one ladder per
folder; `approved` is a rung on top of every ladder, with `approved-by` and `approved-at`
beside it, and the three editorial folders rest at `active` by omitting the field. A bounded
context describes its skills or its features, says who acts in `actors.md` — `user`,
`organisation`, `technical` — and keeps its vocabulary in `domain.md`: a term is a chapter or
an `aliases` entry on the chapter it names, and there is no `naming.md`. The rule files under
`plugins/devbook/rules/` are the specification; this record is why it has the shape it has.

## Why

```meta
```

**One layout.** The convention first permitted two — five root dot-folders or all five under
`.devbook/` — and the generator understood only the flat one, so a nested address resolved to
nothing; the first real run over this repository's nested folders found eleven defects nothing
had reported. Reading both layouts was the fix for a week, and it had to be amended twice, each
time for a place that spelled the five folders literally and got one layout wrong — the rule
globs, then the CI path filter — and each time invisibly, because a glob matching nothing is
indistinguishable from a quiet branch. One layout makes every one of those a single spelling
and that class of defect unwritable. `.devbook/` is where the config and the tooling already
were; the parent carries the hidden-directory signal once, the five folders under it carry no
dot, in prose as on disk, and the rollup moves from the repository root to `.devbook/_meta/`.

**`approved` is a rung, not a field.** A chapter has one lifecycle state. A boolean beside
`status` would let a chapter claim `draft` and approved at once, which is the ambiguity the gate
exists to remove. The rung is one constant appended to each ladder, so reversing it is a
migration and not a rewrite; every consuming repository's schema assumes this shape.

**Three folders rest at `active`.** In `domain/`, `arc42/`, and `design/` the value records
how settled the writing is, and nearly every chapter sits at `active` permanently; written out,
it is a line that says nothing and the few moving chapters hide inside it. In `tech/` and `ai/`
the value is a rating whose purpose is to be stated, and an absent one is indistinguishable
from `candidate`. An explicit `active` is reported as a warning, never rejected.

**A context describes its skills.** When the product is procedures, `skills.md` takes the place
of `features.md` — one or the other, both `type: feature`, because a skill is a feature and a
second vocabulary would make every graph consumer branch on a filename. `flow.<name>.md` splits
one flow out of `flow.md`.

**A term is a chapter or an alias.** Twenty-eight of seventy-three terms in a `naming.md` were
restatements of a chapter in the same context: a glossary listing the names the aggregates
carry is a second copy of the model in a file nobody opens while editing the model. So the
synonyms sit on the chapter — `## Order` with `aliases: [OrderRoot]` *is* the term — and only a
term with no chapter to sit on becomes a `term` chapter under `## Ubiquitous Language` in
`domain.md`. Keeping `naming.md` as a choice cost every rule, converter, and resolution rung a
branch, so the file kind is gone: contract 10, with migration `010-terms-live-in-domain-md`.

**Who works with a context is an actor.** `features.md` named "the case worker" and nothing
defined the term; a consuming repository filled the gap with three incompatible shapes. The
first answer, `stakeholders.md`, took the wrong word: a stakeholder is anyone with an interest,
and readers filed the funder and the regulator there, who act on nothing. `actors.md` holds who
issues a command — a `user` with an account and a `role` the authorization layer checks, an
`organisation` the context acts toward, a `technical` actor that triggers a use case from
outside — so the scheduler and the inbound callback are named somewhere. A persona is a UX
archetype and belongs in `design/`. Another context or a system is a dependency and stays in
`dependencies.md`, because one relationship described in two places is one description that
goes wrong.

## Rejected

```meta
```

- Two supported layouts, and a flat layout at the repository root.
- A separate `approved` boolean beside `status`; `status` required or optional everywhere.
- `naming.md` kept as an optional file kind.
- *Stakeholder* as the umbrella; a `personas.md`; a second classifier beside `type`.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-17 | `stakeholders.md` becomes `actors.md` with `user`, `organisation`, `technical` and a `role` field. |
| 2026-09-17 | `naming.md` is no longer a file kind; a term is a chapter or an alias. Contract 10, migration 010. |
| 2026-09-17 | One layout under `.devbook/`, dotless folder names, the rollup at `.devbook/_meta/`. |
| 2026-09-09 | `stakeholders.md` joins the starter set with `type: actor` and `type: party`. |
| 2026-09-09 | `status` optional in `domain/`, `arc42/`, and `design/`; required in `tech/` and `ai/`. |
| 2026-09-08 | `skills.md` beside `features.md`, `flow.<name>.md` per flow, `naming.md` optional with terms in `domain.md`. |
| 2026-09-04 | The generator resolves both layouts and errors on a repository holding both. |
| 2026-09-03 | `approved` is a status rung with `approved-by` and `approved-at`. |
| 2026-09-03 | Two layouts, flat or nested, never mixed. |
