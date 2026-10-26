# Chapter Schema

```meta
date: 2026-10-08
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/building-blocks/devbook.md", ".devbook/arc42/08-crosscutting-concepts.md#devbook-folder", ".devbook/arc42/adr/annotations.md", ".devbook/arc42/adr/checks-and-indexes.md", ".devbook/arc42/adr/releases.md"]
c4: ["marketplace.devbook.chapter", "marketplace.devbook.meta-block", "marketplace.devbook.devbook-folder"]
c4-touches: ["marketplace.devbook-collaboration.approval", "marketplace.devbook-collaboration.acceptance"]
```

A devbook is five folders of Markdown chapters under one parent — `.devbook/arc42`,
`.devbook/domain`, `.devbook/tech`, `.devbook/design`, `.devbook/ai` — and nowhere else, each
addressable heading carrying a fenced `meta` block. `status` is one field with one ladder per
folder; on `domain/`'s ladder alone sit two decision rungs — `approved`, with `approved-by`,
`approved-at`, and an optional `approved-hash` fingerprinting what was approved, and
`accepted` above it, carrying the same three for the build that satisfies the chapter and
keeping the approval record it stands on; and the three editorial folders rest at `active` by
omitting the field. That ladder is a default: a repository declares its own transitional rungs
per folder, file glob, and block level in `.devbook/statuses.json`, and the resting value, the
decision rungs, and a stated rating stay devbook's. A bounded
context opens with `context.md` — its boundary, the `feature-flag` and `setting` chapters its
capabilities are switched by, and its actors and dependencies until they outgrow the file —
describes its skills or its features, states what they guarantee in `requirements.md` and
what its aggregates enforce in the invariants subpage of their domain page, says who acts with `user`, `organisation`, `technical`
chapters, and keeps its vocabulary in `domain.md`: a term is a chapter or an `aliases` entry on
the chapter it names. Which way a sync unit and its code flow is `sync` in the `meta` block of
a folder overview, a `context.md`, a context page, or the unit's root chapter, nearest wins and
`report` when none says. The rule files under
`plugins/devbook/rules/` are the specification; this record is why it has the shape it has.

A proposed change to those folders is the one devbook content outside the parent: it lives in
`openspec/changes/<name>/` as a `type: change` proposal at `status: proposed` and one delta
per file it touches, at that file's path under `devbook-delta/`, until `delta.mjs --apply`
merges the deltas one heading level up, stamps `change` on every chapter it touched, and moves
the folder to `archive/`. The path is OpenSpec's, because its CLI resolves `changes/` nowhere
else, per [the devbook-openspec building block](../building-blocks/devbook-openspec.md#constraints).

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

**The rungs are `domain/`'s, and a change's.** They record that a person agreed the model,
and then that what was built satisfies it — a question asked of the model and of nothing else
here. A change to the devbook under `openspec/changes/` asks the same question of itself, so its
`proposal.md` carries both rungs for the whole change, with a fingerprint over the proposal and
every delta; the chapters it merges into get none, and keep their own for work outside a change.
Recording the decision once per change rather than on every chapter a delta touches is what
lets `domain/` keep its rungs with no migration. An
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

**The transitional rungs are the repository's.** A consumer's functional team reviews a domain
chapter before it is agreed and wanted that visible as `status: review`; its viewer already
offered `review`, `ready`, `changed`, and `planned` from a `.devbook/statuses.json` it kept for
its status picker, and the check rejected all four, so a value picked in the viewer failed CI.
Which rungs a chapter passes through on its way to settled is a team's choice; what devbook has
to own is the mechanism — the resting value written by omission, the two decision rungs and
their records, a rating that is always stated. So the ladder is configuration and the
mechanism is not: a rule lists the rungs a person writes, devbook adds `approved` and
`accepted` to every `domain/` rule, and listing the resting value, a decision rung, or a rung
off the `tech/` or `ai/` rating ladder is a configuration error. A rating ladder may only
narrow, because its five words are the one adoption vocabulary a reader learns across
repositories and a radar draws. The file is the viewer's, adopted rather than duplicated: one
file is what keeps the check and the picker from disagreeing, so the check reads its
`folders.<folder>.rules` — tried in order, first match by glob and `scope` wins — and leaves
every other key, and every folder that is not devbook's, to whoever else reads it. A
configuration error is reported once on the file, and the offending value is dropped while
the rest of the rule stands, so one bad line does not fail every chapter it touches. Contract
20, additive: no file, or no rule for a block, is the built-in ladder, and no migration is
owed.

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
sentence of why, and `Enforced at:`. Only a requirement is warned for having no scenario —
never one at `status: deprecated`, a withdrawn promise with no case left to exercise — and
its scenarios stay, because OpenSpec reads them and a promise to someone outside the model is
checked by a case. Scenarios already under an invariant are tolerated rather than stripped: the
text is the author's, and dropping it by script would lose what no one asked to lose. The same
contract titles the behaviour files by kind — `# Requirements`, `# Invariants` — because a
menu that lists pages by title showed the context three times with nothing to tell them apart;
`018-behaviour-titles` retitles them. Both came from a consumer's pilot, which ran them first
as local deviations.

**A journey is a chapter of `scenarios.md`, not a page of its own.** Contract 30 wrote each
end-to-end journey as a file typed `scenario`, named after it, beside the chapter it showed. A
journey proves requirements, often of several features at once, so it belongs with them: since
contract 32 it is a `##` chapter typed `scenario` in its bounded context's `scenarios.md`, or a
split `scenarios.<name>.md` holding one subject's journeys, its `###` headings the parts. As a
chapter it is addressed like any other, `<scenarios file>#<journey>`, so any number of features
and requirements point at it through `related`, and `Proved by:` names a part from the
requirement's folder. Every journey and part anchor is unique in its file, which retires the
stem register: the address is the identity. A journey sits in the context holding most of the
requirements it proves, and its runs sit beside the file in `scenarios/<journey>/`, so the walk
and its evidence read together; profiles and data sets stay in `.devbook/scenarios/`, because
every context shares them. `032-scenarios-md` folds the pages of 31 into `scenarios.md` and
moves every reference, run, and spec header with them, and the signature's canonical text did
not move, so no spec needs re-deriving.

**A title names what the page holds.** Contract 18 fixed the menu for two files and left the
cause in place for every other: `domain.md`, `actors.md`, each split, each flow still carried
the context name, so a context of seventy files listed the same word seventy times, and a
viewer that labels and sorts pages by title — the consumer's spec-manager does — could not be
read. The consumer had already stopped following it, titling by kind and by subject. The folder
names the context, so the title is spent on the page: `context.md` by the context, because the
context is what it holds; every other base file by its kind; a split file by the chapter it
holds, a `requirements.<name>.md` included — titled by kind, every entry listed under
`requirements.md` read `Requirements`; a page the convention does not name by its subject; `context-map.md` by the product as
before. It ships no contract and no migration. A title is not an address — an anchor is a
slug of a `##` heading and never of the `#` — and the check reads no title, so a file titled
the old way validates and resolves exactly as before; retitling is editorial, done when the
file is next touched. The generator's file label keeps its `(<kind>)` suffix, which now tells
a split from its base where it once told the context's files from each other.

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

**A shared type's rules pair with its grouping.** Contract 14 let an invariants chapter pair
with an `aggregate` or a `domain-service`, and nothing else. A value object or enum more than
one aggregate uses lives under `## Shared Value Objects` or `## Shared Enums` on `domain.md`
precisely because it belongs to no aggregate, so its own rules — an IBAN normalised and
MOD-97-checked in its constructor — had nowhere to pair: a consumer pinned them under one
aggregate that happened to use the type, where a reader meets context-wide rules as that
aggregate's, and another context in the same repository recorded none. Contract 19 adds the two
grouping kinds to the pairing, and nothing more. `entity` and `value-object` stay out: an owned
type's rules already sit under the aggregate that owns it, and a pairing of their own would give
one rule two homes. The placement warning needs no change, because the groupings live on
`domain.md`, which never splits, so their chapter can only sit in `domain.invariants.md`. Only
widening what `related` may name, it owes no migration.

**A design component's rules are requirements.** `design/` defined no `type`, so a rule a
component keeps or breaks — every item movable by keyboard, every colour from a declared token
— sat in a table or in prose, where nothing warned when no test proved it and a tool that reads
OpenSpec could not find it. Contract 22 gives `design/` one chapter value, `requirement`: a
`### Requirement:` under the component's own chapter, with `#### Scenario:` cases, for the same
reason `domain/` has it. It is proved `e2e` — the rendered component driven, or a visual
comparison — and the coverage warning holds it there; `integration`, which `domain/` allows for
a policy no user triggers, is no proof here, because a component rule is always one someone
sees. Every other `design/` chapter stays untyped, so `type` is optional in this one folder:
the value marks out rules rather than classifying guidelines, and requiring it everywhere would
invent kinds heading level already carries. Nothing written under 21 stops validating, so no
migration is owed.

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

**The eight loop words became a seven-stage delivery path with three layers beneath it.** The
DevOps loop's eight words placed a usage by the tool's lifecycle, not by the question the work
answers, so `build` and `test` split one session's check in two and `monitor` repeated
`operate`; and the usages that run under every stage — the worktree, the rules, the run limits,
the scheduled upkeep — had no stage to sit at and were filed at whichever one was nearest. The
path is `decide`, `specify`, `code`, `verify`, `integrate`, `release`, `operate`: the first four
before the pull request, in the author's session, the last three after it, and `operate` feeding
`decide`. Beneath it sit `thread` (spec ↔ code), `upkeep`, and `harness`, written in a `layer`
field; a chapter carries `stage`, `layer`, or both. Both vocabularies stay fixed for the reason
the eight were. Four fields came with them because the three views read them: `substage`, a
`<stage>/<word>` entry in the repository's own words under a stage the chapter lists, since
where a stage splits is the repository's to say; `feeds`, a labelled reference to the chapter
this one hands work to, resolved like `related` and drawn as an arrow, since a hand-off is a
different edge from a support link; `evidence`, one of `recorded`, `partial`, `fired`, `none`;
and the **Moves up when** bullet on every `trial` or `candidate` chapter, so a rating below
`adopted` names the event that would move it. A missing **Moves up when** warns, like a missing
placement, so a folder keeps validating while it is filled in. Unlike the first placement, the
old words map onto the new ones, so the rename ships its own migration.

**The sync direction is chapter metadata, at four levels, nearest wins.** The sweeps that keep
chapters and code aligned need to know, per unit, which side is the truth: the agreed chapter
(`push`), the code (`pull`), whichever the verdict says (`sync`), neither but report (`report`),
or neither and stay out (`off`). The first draft kept that as a map in `.devbook/config.json`,
which put a property of the model in a file the model's reviewers never read and the chapter
viewers never show. As a field it is reviewed with the chapter, shown by every tool that already
reads `meta` blocks, and checked by the one checker. It is a devbook field, not an
`ext.delivery-schedule.*` key: `ext` is carried unvalidated, so a misspelt value would silently
mean `report`, and the converters that honour it — `capture-specs`, `apply-change`,
`verify-change` — are devbook's. Four levels — folder overview, `context.md`, context page, the
unit's root chapter — let a whole context follow the code while one aggregate's agreed model
leads it, without writing the value on every chapter. A chapter a unit owns (an entity, value
object, enum, domain event, invariant, requirement, sub-feature, or term) refuses it, as do
`requirements*.md` and `*.invariants.md`, which hold only such chapters: they are captured and
briefed with their unit, and half a unit cannot go the other way. A value no unit inherits is a
warning, which covers an `actors.md` holding only organisations. For the same grouping a
`domain-event` names the aggregate or domain service that raises it in `related`, because the
Trigger names it only in prose; it is a warning so a corpus written before keeps passing. The
fingerprints already exclude `meta` blocks, so a flip lapses no approval. Contract 25, additive:
absent means `report`, today's behaviour, and no migration is owed.

**A user and a technical actor are sync units; an organisation is not.** Contract 25 accepted
`sync` on `actors.md` while no converter covered an actor, so the value did nothing. The
`actor` kind closes that: a `user` or `technical` chapter roots a unit of its one chapter, and
the converters pair it with what represents it in code — the role or claim `role` spells, the
policies that admit it, and for a `technical` actor the client registration, service account,
or job and callback registration it authenticates with. Those counterparts sit in the
authorization layer and not under a type name, so the kind climbs its own rungs before the
protocol's. An `organisation` is the context's counterparty, modelled and never authenticated:
nothing in code represents it, so it roots no unit, `sync` on one stays refused as no level,
and an `actors.md` of organisations only keeps the warning. A guard admitting more than an
actor's chapter grants is a `conflict` and never `code-ahead`, because capturing it would write
a privilege into the record on the strength of the code that leaked it. The actor chapter is
the whole unit: the `## Rights` matrix is the file's, read per actor column, and a rule about
rights is a requirement its feature owns. Contract 28, additive, no migration.

**A diagram is a view, not a unit.** `model.md`, `flow.md`, and their splits draw what other
chapters claim. A class diagram's ownership, cardinalities, and id-only references are the
aggregate's consistency boundary and relationships. A state machine is the aggregate's
lifecycle, which the aggregate kind already verifies transition by transition. A sequence
across aggregates is a domain service's coordination or a feature's requirement, proved by its
unit or e2e test. A `flow.<name>.md` beside a skill is the other half of that skill's chapter.
A `flow` kind would give each of those claims a second owner and so two verdicts for one
transition, which the sync unit's roll-up could settle only by joining the flow to every
aggregate it walks: a group that grows with the diagram rather than with the rule, and the
merge the feature unit was kept out of for the same reason. So neither file has a converter
kind, a sync unit, or a place for `sync`; their `##` sections keep no blocks, and a sweep
reads them as context and never writes them. The cost is that a diagram can go stale beside a
chapter that is right: no verdict reports it, and `prose-check` skips Mermaid fences. Closing
that is a reading change — a unit's verify pass loading the diagrams that name it — and never
a kind.

## Rejected

```meta
```

- Two supported layouts, and a flat layout at the repository root.
- A separate `approved` boolean beside `status`; `status` required or optional everywhere.
- The status ladder under `components.devbook` in `.devbook/config.json`: a stamp is written
  by the install skill alone, and authored policy inside it would be rewritten by the next
  reconcile. A ladder that may widen `tech/` or `ai/`, or make `active` a rung to write; a
  configured ladder that can drop the decision rungs.
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
- Titling every `domain/` file by its context and exempting more files one by one, as contract
  18 did for two; a context-qualified title (`# Order Management — Domain`), which repeats what
  the folder says; a migration retitling every file, which would rewrite authored text to fix
  what no check reads.
- The sync direction as a map under `components.schedule` in `.devbook/config.json`, or as an
  `ext.delivery-schedule.sync` key; a direction on owned chapters; a single folder-wide switch
  with no closer override.
- An `organisation` as an actor unit, which would give the sweeps a chapter nothing in code
  can confirm; the `## Rights` matrix as a unit of its own, which would split one actor's rights
  from the actor; and a policy or client chapter type beside the actor, a second record of who.
- A `flow` kind, whether its own unit or joined to the aggregates it walks; a `model` kind;
  `sync` on `model.md`, `flow.md`, or their splits.
- A subfolder per aggregate, or a split-file `type` of its own: a subfolder is a second
  layout rung for every consumer to resolve, and a new `type` a second vocabulary for the
  same kind of document.
- A journey per file kept beside `requirements.md` — `requirements.<name>.scenarios.md` — or
  in a `scenarios/` subfolder: the first ties a journey to one feature's requirements when it
  walks through several, and the second is a layout rung no other kind has. One base file with
  splits is the shape every other behaviour file already has.
- A journey's `flags` accepting a boolean `setting` chapter: the setup hook sets a flag
  and a setting through different methods, and a `setting`'s `default` is free-form, so no
  check could tell a boolean one apart without splitting settings by the shape of their value.

## History

```meta
```

| Date | Change | Why |
| --- | --- | --- |
| 2026-10-22 | A `feature` or `sub-feature` chapter may carry `playthrough`, the demo walkthrough its page shows playing a whole journey end to end, and a `demo-model` walkthrough may be that playthrough, with `journey` and a `part` and `step` per step. Contract 36, no migration: both are added fields with a safe default. | The page needed one place to say which walk to show, read where the checker and the index already read. |
| 2026-10-22 | An `ai/` chapter is placed on the seven-stage delivery path — `decide`, `specify`, `code`, `verify`, `integrate`, `release`, `operate` — or on the `thread`, `upkeep`, or `harness` layer beneath it, with `substage`, `feeds`, `evidence`, and a **Moves up when** bullet on a `trial` or `candidate` chapter. The eight loop words are errors. Contract 35, `035-delivery-path-stages`, which maps the loop's words onto the path and adds none of the new fields. | The loop's words placed a usage by tool lifecycle; the path places it by the question the work answers, and the layers hold what runs under every stage. |
| 2026-10-20 | A journey is a `##` chapter typed `scenario` in its bounded context's `scenarios.md` or a split `scenarios.<name>.md`, its `###` parts owing no block; a whole file typed `scenario` is an error. Addressed `<scenarios file>#<journey>`, so features and requirements point at it through `related`; every journey and part anchor is unique in its file, retiring the stem register; `Proved by:` names `<scenarios file>#<part>` from the requirement's folder, `scenario:` images name the file from `.devbook/domain/`, and runs sit beside the file. Contract 32, `032-scenarios-md`; the signature's canonical text is unchanged. | — |
| 2026-10-19 | A scenario page lives in the bounded context of the requirements it proves, no longer beside the chapter it demonstrates: a page is evidence for requirements, so it belongs with them, and a journey across contexts goes to the context holding most of the requirements whose cases point at its parts, any of them on a tie. The check warns on a page placed elsewhere. No contract, no migration: nothing narrows, and a misplaced page moves by hand on the warning, its stem and run folder unchanged. | A warning, not an error, because a page with no `Proved by:` yet has no home to compute. |
| 2026-10-19 | The change folder is checked but no longer graphed: no proposal or delta is a node, so a delta may name a chapter only its own change adds. A devbook chapter's `related`, `depends-on`, or prose link into `openspec/changes/` is an error. Contract 31, no migration: no chapter shape moves. | A change points at the devbook, never the reverse. |
| 2026-10-14 | An inline Given/When/Then case under a requirement, in a bounded context that already has a scenario page, is listed at `info` as a candidate to move into a part — the report the scenario page's plan named and its first release left out. Not a warning. No contract, no migration: nothing narrows and no shape changes. | Inline stays valid for a requirement with no journey yet, and a corpus already carrying hundreds of warnings would only grow. |
| 2026-10-12 | A scenario page's `flags` stays limited to `feature-flag` chapters. A switch a product models as a `setting` goes under `settings` as `<chapter>=true` or `=false`, and the check names that entry when `flags` points at a `setting`. No contract change: only a message and the rule's text move. | — |
| 2026-10-08 | The scenario page: a `domain/` file typed `scenario`, in a bounded context at any depth, is one end-to-end journey whose `##` parts owe no block and stay addressable. Its `status` is absent, `draft`, or `proposed`; it carries no `tests`, since the page is the test; its stem is unique across the corpus; its steps open with a bold Given, When, Then, or And. The six setup fields — `start`, `actor`, `data`, `profile`, `flags`, `settings` — are legal there alone and resolve against the chapters and `.devbook/scenarios/profiles.json`. A requirement's `#### Scenario:` may hold one `Proved by: <page>.md#<part>` line instead of its steps, which derives its `e2e` entry, and a part no case names is reported. `shot:` and `scenario:` images are no diagrams. Contract 30, additive, no migration. | — |
| 2026-10-06 | The `actor` converter kind: a `user` or `technical` chapter roots a sync unit, paired through its `role`, the policies admitting it, and a `technical` actor's client registration, so a `sync` value on `actors.md` is inherited. An `organisation` roots no unit. A grant wider than the chapter is a `conflict`. Contract 28, additive, no migration. | — |
| 2026-10-06 | `model.md`, `flow.md`, and their splits stay context: no converter kind, no sync unit, no `sync`. No contract, no migration. | Every claim they draw belongs to an aggregate, domain service, feature, or skill chapter that has a kind. |
| 2026-10-02 | A `requirement` at `status: deprecated` is no longer warned for having no `#### Scenario:`. The level warning on the `tests` it names still applies. No contract, no migration: a warning narrows and no shape changes. | It records a withdrawn promise, which has no case left to exercise. |
| 2026-10-01 | `sync` — `push`, `pull`, `sync`, `report`, `off` — on `domain/`, `arc42/`, and `design/` blocks says which way a sync unit and its code flow, set on a folder overview, a `context.md`, a context page, or a unit's root chapter, nearest wins, `report` by default. Refused on owned chapters and owned-only pages; a value no unit inherits is warned; a `domain-event` is warned when its `related` names no raiser. Contract 25, additive, no migration. | — |
| 2026-09-28 | A change's `proposal.md` carries `approved` and `accepted` with their six fields, for the whole change: the hash covers the proposal and every delta, and `delta.mjs --apply` merges only an accepted change over its current hash, writing no rung onto the chapters it lands in and lifting one it makes stale. Approval lives in both places — chapter rungs for work outside the lane, the proposal's for a change — so `domain/` keeps its rungs and no migration is owed. Contract 24, additive. | — |
| 2026-09-28 | The change folder, `openspec/changes/`, is a folder kind stamped as `changes`: each change's `proposal.md` is `type: change` at `status: proposed` with a `category`, each file under `devbook-delta/` a delta the checker resolves through `delta.mjs`, and `archive/` is never indexed. `change` is legal on any chapter as the merge's provenance. The folder sits outside `.devbook/`; the rungs above `proposed` wait for the decision on where approval lives. Contract 23, additive, no migration. | The OpenSpec spike found its CLI fixes the path. |
| 2026-09-28 | `design/` gains one chapter type, `requirement`: a rule a component keeps or breaks is a `### Requirement:` with `#### Scenario:` cases under the component's chapter, warned when its `tests` reach no `e2e`. Every other `design/` chapter stays untyped. A `#### Scenario:` directly under a requirement no longer warns for having no block. Contract 22, additive, no migration. | — |
| 2026-09-28 | Each folder's `status` ladder is a built-in default. A repository declares its own transitional rungs per folder, file glob, and block level in `.devbook/statuses.json`, first matching rule wins; the resting value stays written by omission, `approved` and `accepted` stay `domain/`'s whatever the file says, and `tech/` and `ai/` may only narrow their rating ladder. A configuration error is reported once on the file. Contract 20, additive, no migration. | — |
| 2026-09-28 | A `requirements.<name>.md` is titled by the feature it holds, like every other split, instead of `# Requirements`. `requirements.md` and the invariants subpages keep their kind. No contract; `018-behaviour-titles` now titles a split by its first `##` heading, so it no longer undoes the change. | Under `requirements.md` in a menu every split read `Requirements`. |
| 2026-09-27 | An invariants chapter may pair with the `## Shared Value Objects` or `## Shared Enums` grouping; owned entities and value objects keep their rules under their aggregate. Contract 19, additive, no migration. | A shared type's own rules sit in `domain.invariants.md` beside it instead of under an aggregate that uses it. |
| 2026-09-26 | A `domain/` file's title names what the page holds: `context.md` the context, every other base file its kind, a split file its chapter, an unnamed page its subject, `context-map.md` the product. The context-name title is no longer the rule. No contract, no migration: the check reads no title and an anchor never derives from one, so an old title validates. | — |
| 2026-09-25 | An `### Invariant:` carries no `#### Scenario:` — a claim, its rejection code, and `Enforced at:`, proved by its `unit` test; a missing scenario warns on a requirement only, and one an older invariant carries is tolerated. `requirements.md` is titled `# Requirements` and an invariants subpage `# Invariants`. Contract 18, migration 018, which retitles. | — |
| 2026-09-25 | Invariants are a subpage of their domain page: `domain.invariants.md`, and `domain.<name>.invariants.md` beside a split `domain.<name>.md`, typed `invariants` by the trailing suffix and read directly after the page. A chapter whose aggregate sits on another page is a warning; the old `invariants.md` and `invariants.<name>.md` validate with a warning for one release. Requirements keep `requirements.md`. Contract 17, migration 017. | — |
| 2026-09-24 | A `bounded-context` chapter in `context-map.md` records how the context ships with `deployment`: `service`, a deployable of its own, or `module`, inside a modular monolith. The context's `context.md` carries the same value on its file-level block, and where the chapter's `related` names that file the graph build holds the two equal. The host is named through `related` to its building block, never a second field. Contract 16, additive, no migration. | — |
| 2026-09-22 | A bounded context states behaviour in `requirements.md` and `invariants.md`, one rule per chapter: `### Requirement:` in OpenSpec's heading shape with DDD's word kept for `### Invariant:`, `#### Scenario:` cases under each, `Enforced at:` on an invariant, and the aggregate's `### Invariants` table retired into them. A rule's `related` is held to the prose chapter it belongs to; its level of proof — `e2e` for a requirement, `unit` for an invariant — and a missing scenario are coverage warnings. Contract 14, additive, no migration. | — |
| 2026-09-22 | `accepted` is a rung above `approved`, with `accepted-by`, `accepted-at`, and `accepted-hash`, standing on the approval record it keeps; `approved-hash` makes a lapsed approval a check result; both rungs and their six fields are `domain/`'s alone; a bounded context may carry a page the convention does not name, typed by its own filename. Contract 13, migration 013. | — |
| 2026-09-18 | An `ai/` chapter is placed on the DevOps loop by its own `stage`, from the fixed eight; a file places nothing; the tool edge is `depends-on` only; `date` is the rating day. | — |
| 2026-09-18 | `context.md` is a context's root with `feature-flag` and `setting` chapters; `feature-flag` on a feature is a reference and `setting` joins it; actors and dependencies live there until they outgrow it. Contract 11, migration 011. | — |
| 2026-09-18 | `domain`, `features`, `skills`, and `model` split by chapter as `flow` already did; a split file reads after its base. | — |
| 2026-09-17 | `stakeholders.md` becomes `actors.md` with `user`, `organisation`, `technical` and a `role` field. | — |
| 2026-09-17 | `naming.md` is no longer a file kind; a term is a chapter or an alias. Contract 10, migration 010. | — |
| 2026-09-17 | One layout under `.devbook/`, dotless folder names, the rollup at `.devbook/_meta/`. | — |
| 2026-09-09 | `stakeholders.md` joins the starter set with `type: actor` and `type: party`. | — |
| 2026-09-09 | `status` optional in `domain/`, `arc42/`, and `design/`; required in `tech/` and `ai/`. | — |
| 2026-09-08 | `skills.md` beside `features.md`, `flow.<name>.md` per flow, `naming.md` optional with terms in `domain.md`. | — |
| 2026-09-04 | The generator resolves both layouts and errors on a repository holding both. | — |
| 2026-09-03 | `approved` is a status rung with `approved-by` and `approved-at`. | — |
| 2026-09-03 | Two layouts, flat or nested, never mixed. | — |
