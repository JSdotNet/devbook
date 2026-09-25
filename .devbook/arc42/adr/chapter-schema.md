# Chapter Schema

```meta
date: 2026-09-18
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/building-blocks/devbook.md", ".devbook/arc42/08-crosscutting-concepts.md#devbook-folder", ".devbook/arc42/adr/annotations.md", ".devbook/arc42/adr/checks-and-indexes.md", ".devbook/arc42/adr/releases.md"]
```

A devbook is five folders of Markdown chapters under one parent — `.devbook/arc42`,
`.devbook/domain`, `.devbook/tech`, `.devbook/design`, `.devbook/ai` — and nowhere else, each
addressable heading carrying a fenced `meta` block. `status` is one field with one ladder per
folder; on `domain/`'s ladder alone sit two decision rungs — `approved`, with `approved-by`,
`approved-at`, and an optional `approved-hash` fingerprinting what was approved, and
`accepted` above it, carrying the same three for the build that satisfies the chapter and
keeping the approval record it stands on; and the three editorial folders rest at `active` by
omitting the field. A bounded
context opens with `context.md` — its boundary, the `feature-flag` and `setting` chapters its
capabilities are switched by, and its actors and dependencies until they outgrow the file —
describes its skills or its features, states what they guarantee in `requirements.md` and
what its aggregates enforce in the invariants subpage of their domain page, says who acts with `user`, `organisation`, `technical`
chapters, and keeps its vocabulary in `domain.md`: a term is a chapter or an `aliases` entry on
the chapter it names. The rule files under
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

**The rungs are `domain/`'s.** They record that a person agreed the model, and then that
what was built satisfies it — a question asked of the model and of nothing else here. An
`arc42/` chapter records a standing structure; a `tech/` or `ai/` chapter carries a rating,
and a decision rung written into that field replaces the rating with something unrelated and
unrecoverable. `approved` sat on all five ladders from contract 6 because adding it once was
cheaper than deciding where it belonged, and nothing outside `domain/` ever used it. Deciding
is contract 13, and it is breaking, so migration 013 takes the record off and names the
`tech/` and `ai/` chapters whose rating no script can restore.

**`accepted` is a second rung, not a second field on the first.** It answers a different
question — the specification is right, versus what was built satisfies it — usually asked of a
different person on a different day, so folding it into `approved` would lose which of the two
a chapter has. Stacking it keeps one lifecycle state per chapter, the property the rung was
chosen for: an accepted chapter keeps its approval record and both come off together, because
a build was accepted against the text that was approved. Which pull request delivered it stays
in the tracker; the chapter records that a person decided, not how the work arrived.

**The lapse is computed, not remembered.** The rung already claimed the content had not
changed since `approved-at`, and nothing could establish it: git answers per file, so a chapter
in a busy file reads as stale and one in a quiet file reads as current, which the review queue
had to say out loud every time it reported. `approved-hash` fingerprints the block a reader
would say they read, excluding the `meta` blocks because the value lives in one and the
`annotation` fences because a note is not a content change. It stays optional: a repository
that omits it is exactly where it was, and one that writes it gets the check instead of the
habit.

**Three folders rest at `active`.** In `domain/`, `arc42/`, and `design/` the value records
how settled the writing is, and nearly every chapter sits at `active` permanently; written out,
it is a line that says nothing and the few moving chapters hide inside it. In `tech/` and `ai/`
the value is a rating whose purpose is to be stated, and an absent one is indistinguishable
from `candidate`. An explicit `active` is reported as a warning, never rejected.

**A context describes its skills.** When the product is procedures, `skills.md` takes the place
of `features.md` — one or the other, both `type: feature`, because a skill is a feature and a
second vocabulary would make every graph consumer branch on a filename.

**Behaviour is chapters, not prose and not a table.** The rules an aggregate guaranteed lived
in an `### Invariants` table with an `Evidence` column, and what a feature promised lived in
its prose. Both cost the same thing: a rule could not carry a status, a test link, an
annotation, or a scenario, because only a chapter can, and a table cell reading `untested` was
standing in for the `tests` field the schema already had. One rule per chapter fixes all of it
at once, and the two files are where those chapters go. The heading shape is OpenSpec's —
`### Requirement:`, `#### Scenario:` — kept deliberately, so a tool that reads OpenSpec reads
devbook's requirement blocks without being taught them — the `### Invariant:` heading and the
grouping of requirements under a feature are devbook's, and a bridge maps those two; it is the one place this convention
accepts a kind prefix in a heading, and it is bought by an external format rather than by
taste. The words are not OpenSpec's throughout: a *requirement* is a promise to someone
outside the model and keeps that name, an *invariant* is what a type guarantees and takes
DDD's, because the aggregate is what answers for it. That split is not decoration — it decides
which file a rule sits in, and with it the level that proves the rule, which is why `e2e`
against a requirement and `unit` against an invariant are checkable at all. Both checks warn
rather than fail: an error would push people back to prose, where nothing reports anything,
and that is the state this decision exists to leave. Contract 14 adds only values, so nothing
written before it stops validating and no migration is owed; the table stays legal and
converting one is editorial work, because no script can write the scenarios that make the move
worth doing.

**An invariant is a claim, not a scenario.** Contract 14 gave both behaviour kinds `#### Scenario:`
cases. On an invariant they were noise: Given/When/Then in the aggregate's event terms restated
a rule like "the start date is not after the end date" three times over, and the `unit` test in
`tests` already names the case. Contract 18 takes them off: an `### Invariant:` is one claim in
the domain's words, the rejection code in parentheses where the type has one, an optional
sentence of why, and `Enforced at:`. Only a requirement is warned for having no scenario, and
its scenarios stay, because OpenSpec reads them and a promise to someone outside the model is
checked by a case. Scenarios already under an invariant are tolerated rather than stripped: the
text is the author's, and dropping it by script would lose what no one asked to lose. The same
contract titles the behaviour files by kind — `# Requirements`, `# Invariants` — where every
other `domain/` file carries the context name, because a menu that lists pages by title showed
the context three times with nothing to tell them apart; `018-behaviour-titles` retitles them.
Both came from a consumer's pilot, which ran them first as local deviations.

**Invariants are a subpage of their domain page.** Contract 14 gave invariants a file of their
own, `invariants.md`, which split on its own schedule as `invariants.<name>.md`, so the rules
of an aggregate and the aggregate could sit in files that no longer matched. Contract 17 names
the file after the page instead: `domain.invariants.md` holds the rules of the aggregates on
`domain.md`, and `domain.order.invariants.md` those of the aggregate split out to
`domain.order.md`. The name is the pairing, the file reads directly after its page, and
splitting an aggregate out moves its rules with it. A trailing `.invariants` types the file
`invariants`, the one place a filename suffix sets the kind rather than narrowing the scope;
the graph build warns when a chapter's aggregate is on another page. Requirements keep
`requirements.md` and do not follow: a requirement pairs with a feature, a feature lives in
`features.md` or `skills.md`, and a subpage there would rename nothing a reader looks for.
The asymmetry is deliberate and revisited only if requirements start pairing with domain
chapters. The old names validate with a warning for one release, and
`017-invariants-under-domain` moves them, because a moved path is broken in every repository
until a script moves it.

**A file splits by its chapter.** `domain.md`, `features.md` or `skills.md`, `requirements.md`,
`model.md`, and
`flow.md` each grow with the context, and a reader looking for one aggregate should not have
to load every aggregate to find it. `<file>.<name>.md` — `domain.order.md`,
`features.checkout.md`, `model.order.md`, `flow.flow-code.md` — holds one chapter of the file
it is named after, carries that file's `type`, and keeps the chapter's heading and block as
they stood, so the address changes and nothing else does. The generator reads a split file
directly after its base, or in the base's slot when every chapter has moved out; `domain.md`
alone can never be dropped, because it holds the shared groupings that belong to no single
aggregate, and `context.md` does not split, because it is the root and small by construction. Flows split first, on 2026-09-08; the other
four followed once the same pressure showed up in `domain.md`. A split file is a new path with
a safe default — an unsplit context reads exactly as before — so it ships no migration.

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
the dependency tables, because one relationship described in two places is one description
that goes wrong.

**A switch is a chapter, and the boundary is a file.** A feature could name its flag in a
`feature-flag` field and nothing could describe the flag — no default, no owner, no
retirement — because the field held a bare key and the catalog was assumed to live outside the
repository. A setting a person chooses in the product had no place at all. Both are
context-scoped, named in the ubiquitous language, and made addressable by a plain identifier,
which is what `role` already is for an actor; so they are chapters, `feature-flag` decided at
release from configuration and `setting` decided at runtime by whoever its `scope` names, each
carrying `key` as the code spells it, and the feature's field becomes a reference that resolves,
produces an edge — `gated-by` for a flag, `configured-by` for a setting — and is held to the
target's type. A setting that enables a capability is not a third type beside one that tunes it:
who decides is the distinction, on/off is a value, and the feature's `setting` reference is what
records that the capability hangs on it. The two are two types and one sync kind, `setting`,
because the evidence is the same read-and-branch and only who holds the key differs. They sit in `context.md`, which also takes the boundary prose `domain.md`
opened with — what the context is before what it models, read first — and the actor chapters
and dependency tables while they are small: a kind lives in its own file or in `context.md`,
never both, so a small context is three files in the outline instead of six, and a large one
splits without changing what any chapter is. Contract 11, with migration `011-context-md`.

**An `ai/` chapter is placed on the DevOps loop by its own `stage`, from a fixed vocabulary.**
The folder was already organised by the flow, but the placement was the file: a chapter sat
at whatever stage the file it was in was named after, the stage set was the repository's own,
and a tool drawing the flow had to read filenames and a table in `adoption-map.md` to know
what the stages were. That is linking by position, and it fails in both directions — a chapter
that applies at two stages has to be split or filed arbitrarily, and two repositories with
different stage sets draw two loops nobody can compare. So the link is metadata: every chapter
carries `stage`, a list of one or more of the loop's own eight words — `plan`, `code`,
`build`, `test`, `release`, `deploy`, `operate`, `monitor`, in that order, the first four the
dev half — and the file it sits in groups chapters for reading and places none of them, which
is why a file-level `stage` is an error. The vocabulary is fixed so that every repository
draws the same loop and an unused stage renders empty rather than disappearing. A `concept`
with no `stage` applies throughout and is drawn in the middle; any other chapter without one
is off the picture and is reported as a warning, not an error, so an existing folder keeps
validating while its chapters are placed. The field kept its name: `stage` already existed for
exactly this on `concepts.md` chapters, and a rename would have cost a migration to buy a
synonym. What did change is the value set — a `stage` authored under the old rule named one of
the repository's own stage files, and such a slug is an error now — and no script can map a
repository's slug to a loop word, so there is no migration to ship; the one `ai/` folder in
existence is this repository's, rewritten in the same change. Two things went from optional to the rule at the
same time, because the picture reads them: the tool under a usage is named in `depends-on`
and never `related`, since `depends-on` is the edge the picture draws the tool from and a
`related` entry into `tech/` resolves and draws nothing; and `date` on an `ai/` chapter is the
day the current rating was set, moved with `status`. A stage's own shading is derived — the
highest rung among the chapters at it — and authored nowhere. The tools a stage runs on that no
AI usage rests on are deliberately not in the picture: they are `tech/`'s, and a `stage` on a
`tech/` chapter would cross the one-way boundary between the two folders from the wrong side.

## Rejected

```meta
```

- Two supported layouts, and a flat layout at the repository root.
- A separate `approved` boolean beside `status`; `status` required or optional everywhere.
- `naming.md` kept as an optional file kind.
- *Stakeholder* as the umbrella; a `personas.md`; a second classifier beside `type`.
- Placing an `ai/` chapter by the file it sits in, with a `side` on each stage file and the
  file's `status` as the stage's rating — the shape this record's first draft took the same
  day; a repository-defined stage set; a `phase` field beside `stage`; a `stage` on `tech/`
  chapters; a `since` beside `date`; a structured `adopted-by`.
- A `settings.md` beside the others, adding a file to every context's outline; a `boundary.md`
  name; keeping `feature-flag` a bare key and validating it against nothing; one chapter type
  with a `level` field, which would put the who-decides question on every flag; a
  `feature-setting` type for the setting that enables a capability, which would split settings
  by the shape of their value; folding `actors.md` and `dependencies.md` by migration, which is
  a reading and not a rewrite.
- A subfolder per aggregate, or a split-file `type` of its own: a subfolder is a second
  layout rung for every consumer to resolve, and a new `type` a second vocabulary for the
  same kind of document.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-25 | An `### Invariant:` carries no `#### Scenario:` — a claim, its rejection code, and `Enforced at:`, proved by its `unit` test; a missing scenario warns on a requirement only, and one an older invariant carries is tolerated. `requirements.md` is titled `# Requirements` and an invariants subpage `# Invariants`. Contract 18, migration 018, which retitles. |
| 2026-09-25 | Invariants are a subpage of their domain page: `domain.invariants.md`, and `domain.<name>.invariants.md` beside a split `domain.<name>.md`, typed `invariants` by the trailing suffix and read directly after the page. A chapter whose aggregate sits on another page is a warning; the old `invariants.md` and `invariants.<name>.md` validate with a warning for one release. Requirements keep `requirements.md`. Contract 17, migration 017. |
| 2026-09-24 | A `bounded-context` chapter in `context-map.md` records how the context ships with `deployment`: `service`, a deployable of its own, or `module`, inside a modular monolith. The context's `context.md` carries the same value on its file-level block, and where the chapter's `related` names that file the graph build holds the two equal. The host is named through `related` to its building block, never a second field. Contract 16, additive, no migration. |
| 2026-09-22 | A bounded context states behaviour in `requirements.md` and `invariants.md`, one rule per chapter: `### Requirement:` in OpenSpec's heading shape with DDD's word kept for `### Invariant:`, `#### Scenario:` cases under each, `Enforced at:` on an invariant, and the aggregate's `### Invariants` table retired into them. A rule's `related` is held to the prose chapter it belongs to; its level of proof — `e2e` for a requirement, `unit` for an invariant — and a missing scenario are coverage warnings. Contract 14, additive, no migration. |
| 2026-09-22 | `accepted` is a rung above `approved`, with `accepted-by`, `accepted-at`, and `accepted-hash`, standing on the approval record it keeps; `approved-hash` makes a lapsed approval a check result; both rungs and their six fields are `domain/`'s alone; a bounded context may carry a page the convention does not name, typed by its own filename. Contract 13, migration 013. |
| 2026-09-18 | An `ai/` chapter is placed on the DevOps loop by its own `stage`, from the fixed eight; a file places nothing; the tool edge is `depends-on` only; `date` is the rating day. |
| 2026-09-18 | `context.md` is a context's root with `feature-flag` and `setting` chapters; `feature-flag` on a feature is a reference and `setting` joins it; actors and dependencies live there until they outgrow it. Contract 11, migration 011. |
| 2026-09-18 | `domain`, `features`, `skills`, and `model` split by chapter as `flow` already did; a split file reads after its base. |
| 2026-09-17 | `stakeholders.md` becomes `actors.md` with `user`, `organisation`, `technical` and a `role` field. |
| 2026-09-17 | `naming.md` is no longer a file kind; a term is a chapter or an alias. Contract 10, migration 010. |
| 2026-09-17 | One layout under `.devbook/`, dotless folder names, the rollup at `.devbook/_meta/`. |
| 2026-09-09 | `stakeholders.md` joins the starter set with `type: actor` and `type: party`. |
| 2026-09-09 | `status` optional in `domain/`, `arc42/`, and `design/`; required in `tech/` and `ai/`. |
| 2026-09-08 | `skills.md` beside `features.md`, `flow.<name>.md` per flow, `naming.md` optional with terms in `domain.md`. |
| 2026-09-04 | The generator resolves both layouts and errors on a repository holding both. |
| 2026-09-03 | `approved` is a status rung with `approved-by` and `approved-at`. |
| 2026-09-03 | Two layouts, flat or nested, never mixed. |
