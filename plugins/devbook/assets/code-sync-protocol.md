# Code sync protocol

Shared rules for the three skills that connect a repository's devbook folders
to its running code:

- **`capture-specs`** — something already exists in the application, the matching
  chapter is missing, thin, or stale, so read the implementation and plan the
  chapter.
- **`apply-change`** — a chapter is agreed but not built — merged, or in an open
  change a person has agreed — so turn it into a change brief and hand it to the
  flow that implements it.
- **`verify-change`** — report where the two stand, and write nothing.

Throughout this file and the files that load it, **capture** is what `capture-specs`
does and **apply** is what `apply-change` does. The names carry the endpoints;
these two words carry the action, and both spellings mean the same pass.

Each skill covers seven kinds — `aggregate`, `domain-service`, `feature`,
`setting`, `actor`, `building-block`, `design-component` — and `demo`, the click demo
a page carries, which rides with that page's unit and roots none of its own. None of
them restates this file. What
is specific to a kind lives once in `assets/spec-kinds/<kind>.md`: the chapters
and the file it covers, the `type` values, the folder rule, the spec-to-code
mapping, and what each direction does differently there.

## Why this is an asset and not an instruction

A rule declares the paths it governs, and `devbook:init` puts it in the
repository so both hosts apply it there. An honest `paths` list for these rules
would have to cover source and test trees — which would make the plugin speak in
every repository that has not adopted the devbook convention. This file is
therefore loaded on demand by the skills that need it, and the plugin stays
silent everywhere else.

## The two directions

| | `capture-specs` | `apply-change` | `verify-change` |
|---|---|---|---|
| Starting point | Implementation exists | Chapter merged, or an agreed open change | Both exist |
| Missing thing | The chapter | The implementation | The knowledge of which side moved |
| Reads | Source, tests, and the chapter as it stands | The chapter, plus code only to establish what is already there | Source, tests, and the chapter |
| Writes | Nothing by default: a capture plan, delivered to the person. In write mode, the plan's `code-ahead` entries, carried into the chapters | A change brief, handed to the code-side flow | The report table, and nothing else |
| Never | Writes a source or test file; writes a chapter outside write mode | Edits a source tree, a test tree, or the chapter's substance itself | Writes a chapter or a brief |

A single request often needs both directions, in sequence: `capture-specs` what is
built, a person carrying its plan into the chapter, then `apply-change` what the
corrected chapter now says is missing. Run them as two passes with the chapter
settled in between — never interleave them, or the chapter becomes both the
question and the answer. `verify-change` is the
pass that says which one a chapter needs, and it is what both of the others do
before they write.

## The sync unit

Each of the three skills also takes a **sync unit** or a **sync group** as its
scope, named by the unit's root chapter address. A unit is what one pass covers
and one pull request changes: an aggregate with everything it owns, the events it
raises, its invariants, and the requirements and terms that name it; a domain
service the same way; a feature with its sub-features and requirements; one
feature flag or setting; one user or technical actor; one building block file; one
component chapter; and one shared-types unit per context. A group is the units a requirement naming two
aggregates and no feature ties together, and is usually one unit. The rules are
"Sync units" in `devbook-chapter-metadata.md`.

Never work membership out by reading. List it:

```bash
node .devbook/_tools/devbook-meta/units.mjs --groups --json
```

Take the unit's or group's `chapters` as the scope, exactly. A chapter the tool
lists as an orphan is in no unit and is reported, never adopted into one. A group
the tool sets aside — past its chapter cap — is reported with
its reason and not acted on, and never split. A group is one run whatever kinds
its units carry: each chapter is read through its own kind's file, and the run
still ends in one table.

Feature flags and settings run as the `setting` kind, user and technical actors
as `actor`, and a shared-types unit as `aggregate`. A unit whose chapters pair or
name a demo reads the demo through `demo` beside its own kind.

**The roll-up.** A unit's verdict comes from its chapters', and a group's from
its units':

- Any `conflict` stops the whole group. Nothing in it is written until a person
  answers, however many of its other chapters are actionable.
- Otherwise the group is actionable in a direction when at least one chapter has
  that verdict, and the pass covers every chapter with that verdict at once.
  `aligned` and `unresolved` chapters are reported beside it and left alone.
- A group with both `code-ahead` and `spec-ahead` chapters is captured first and
  applied in a later pass, once the capture has landed — the two directions never
  share a pass, per the paragraph above.

**Which way.** A unit carries no direction. Which units a sweep levels, and
whether it carries code into chapters or chapters into code, is Backlog's,
stored per repository and folder; `devbook-verify` reports every unit and writes
nothing. A verdict no pass acts on — `conflict`, `unresolved`, any verdict in a
set-aside group — goes to a person.

## Counterpart resolution

Neither direction can start until the chapter and its code counterpart are
paired. Outside a building block there is deliberately **no metadata field
linking a chapter to a code path** — a path in a `meta` block rots on the first
refactor and gives no signal when it does. Resolution goes through naming instead, in this order. Stop at the
first rung that produces a single unambiguous match.

One link this schema does carry is `tests`, and the difference is the whole
reason it is allowed: a test identifier is *executable*, so an entry that stops
resolving fails a run instead of quietly pointing at nothing. It is a record of
what asserts a chapter, not a shortcut through the ladder below — a `tests`
entry names a test, and the counterpart still has to be resolved by naming. See
"Linking test cases" in `devbook-chapter-metadata.md`.

A building block's `code` is the other: the folders a `building-blocks/<slug>.md` file
lists are read before the building-block view, rung 2, and the checker warns on one that no
longer exists, so the rot this section guards against is reported. The building-block kind's
file says how.

1. **Aliases.** Read the chapter's own `aliases` field — a modelled concept
   carries its surface names on its own chapter — and, for a word that is not a
   chapter, the `term` chapter under `domain.md`'s `## Ubiquitous Language`
   grouping. Those entries are exactly the surface names the concept wears in
   code — class names, identifier names, snake_case id fields, a consumer
   context's local copy name. Search the repository for each alias. This is the
   intended path: `aliases` exists to make every synonym resolve back to one
   canonical concept.
2. **The `arc42/` building-block view.** When no chapter has an entry, or the
   kind is architectural rather than a domain term, read
   `.devbook/arc42/05-building-block-view.md`, the block's own file under
   `.devbook/arc42/building-blocks/` where the view keeps one (and
   `07-deployment-view.md` for runtime and hosting units). Those chapters name the modules, containers, and
   deployable units the code is organized into, and `workspace.dsl` names their
   elements, which narrows the search to one project or folder even when the
   type name itself differs.
3. **Observed naming convention.** Only when both rungs above come up empty,
   infer from the convention the repository visibly follows — the folder layout
   of the bounded context's sibling concepts, the suffix conventions on
   comparable types, the test file naming. State the inference and the evidence
   for it explicitly in the report.

When resolution lands on more than one candidate, or on none, the verdict is
`unresolved` (below). Do not pick the most plausible candidate silently, and do
not widen the chapter to cover several candidates at once.

When the counterpart resolves through rung 3 and the chapter has no `aliases`
entry for it yet, propose adding the discovered code name as one. That
turns a one-off inference into a durable pairing for the next pass. Propose it in
the plan — nothing here writes the alias onto the chapter.

The opposite drift is a dead alias: an `aliases` entry that matches no
identifier anywhere in the source tree — on any chapter but a `requirement` or
`invariant`, whose `aliases` are the codes the rule is cited by and name no
identifier by design (`devbook-domain.md`). A rename in code leaves one behind, and
a pairing the repository depends on — code in one language, chapters in
another — breaks without a sign. `verify-change` reports every dead alias in
scope as its own finding, whatever verdict the chapter reaches through its other
aliases or rungs: the chapter address, the alias, and a proposal to remove it or
correct it to the name the code now carries, under the report table (see
[Report table](#report-table)). It never edits `aliases`. The check lives in this
search and nowhere else: a language-agnostic identifier search in the
`devbook-meta` checker would be noisy and slow, so `build.mjs` takes no alias pass.

## Evidence rules

Only two things count as evidence about what the application does:

- **Code that executes.** Type and member declarations, constructors and
  factories, guard clauses and validation, state transitions, persistence
  mappings, event publication sites, dependency wiring, configuration that is
  actually read.
- **Tests that pass.** A test asserting a rule is the strongest available
  statement that the rule holds, and test names frequently carry the
  ubiquitous-language phrasing the chapter needs.

Nothing else does. In particular:

- **Never treat a comment as evidence.** A comment states an intention that may
  never have been implemented, or that was implemented and later changed.
- **Never treat a TODO, FIXME, HACK, or a commented-out block as evidence** — in
  either direction. A TODO is not a specification, and its absence is not proof
  that something is done.
- **Never treat a docstring, an XML doc comment, or a README as evidence of
  behaviour.** They may be used to find the counterpart; they may not be used to
  state what it does.
- **Never treat a skipped, ignored, or commented-out test as evidence.** A
  disabled test is a record of an intention, and a strong hint that the rule it
  asserts may not hold.
- **Do not infer a rule from a single call site.** One caller that happens to
  validate an input does not make the validation an invariant of the type; the
  invariant is what the type itself guarantees no matter who calls it.

When a rule is visible only in a comment or a disabled test, it is not captured
as fact. Record it as an open question in the chapter, or leave it out.

### Tests are first-class evidence, not a cross-check

Every level counts, read at the level the chapter's type calls for: `unit` tests
for what a type guarantees, an `### Invariant:`; `e2e` tests — `integration` for a
policy no user triggers — for what the product promises, a `### Requirement:`. A
pass that reads only unit tests leaves every requirement unproven.

A capture pass that reads only production code will systematically under-record
two things, and both are exactly what a chapter is for.

**Rules.** A guard clause tells you a rule exists; a test tells you what the
rule *is*. The values a test rejects, the exception it expects, and the
near-miss case it asserts is *allowed* pin down a boundary that the guard clause
alone leaves ambiguous. A passing test is the strongest statement available that
a rule holds right now.

**Language.** Test names are written by people describing behaviour rather than
naming types, so they carry the ubiquitous language more faithfully than the
production identifiers do. `CannotConfirmAnAlreadyCancelledOrder` hands you the
term, the transition, and the rule in one line. Prefer that phrasing over
paraphrasing the implementation — it is closer to how the domain talks.

Tests also enumerate things that are otherwise scattered: the legal and illegal
state transitions of a lifecycle, the equality and immutability semantics of a
value type, the trigger condition of an event (asserted raised on one path and
*not* raised on the adjacent one), and which parts of a capability anyone
considered worth pinning down.

Two absences carry information, and neither is evidence of behaviour:

- **No test for a rule** — record the rule from the code, but note it as thinly
  covered rather than stating it with the confidence of a tested one.
- **A disabled, skipped, or commented-out test** — not evidence at all, and a
  positive hint that the rule it asserts may not hold. Where a rule appears only
  in a disabled test, it is an open question, never a fact.

Reading the tests is a step in its own right in every direction, placed
immediately after reading the implementation. It is the step most easily skimped
and the one that most changes the quality of the resulting chapter.

### Record the tests you read, in `tests`

A capture pass has just done the work of finding which tests assert a chapter.
That finding is worth keeping, so put it in the chapter's `tests` field as
`<level>:<runner>:<selector>` entries — the format is in
`devbook-chapter-metadata.md`.

Two rules on top of the ones there:

- **Only the tests that actually assert the chapter.** A test read while tracing
  the counterpart, but which asserts something else, is not a link. `tests` is
  not a record of what the pass happened to open.
- **Never a disabled test.** The evidence rules above already refuse it as
  evidence; linking it would make the chapter look covered by the one test that
  asserts nothing.

A rule chapter sorts its own entries by the file it sits in: the `unit` tests
land on the `### Invariant:` chapters in the invariants subpage, the `e2e` ones — or
`integration`, for a policy no user triggers — on the `### Requirement:`
chapters in `requirements.md`. A pass that puts them on the wrong half is
reported as a coverage warning, which usually means the rule itself is filed on
the wrong side.

Entries go in with the drafted content, in the plan and nowhere else — a capture
pass writes no chapter file, and that includes this field.

An apply pass writes no `tests` entries: the tests in its brief do not exist yet.
Its acceptance checks are what those entries will name once someone has written
them, which is a reason to phrase each check as something a single test can
assert.

### A journey is evidence, not a kind

A journey — a `##` typed `scenario` in a scenarios file — has no file under
`assets/spec-kinds/`, roots no sync unit, and gets no verdict row of its own among the five.
It rides with the requirements whose `#### Scenario:` cases point at its parts with
`Proved by:`, the way a demo rides with its page.

- **What it adds.** A part's steps are the case's Given/When/Then, read through
  the pointer. The spec whose header line `// scenario: <scenarios file>#<journey>`
  names the journey is the requirement's `e2e` test, and the entry the check
  derives from the pointer is the one to read. A part's last run, in
  `<scenarios file without .md>/<journey>/run.json`, counts only when its signature
  matches the journey: a stale run, like a disabled test, is no evidence of
  behaviour.
- **Capture** drafts a case as `Proved by:` when a part already proves it, and
  inline Given/When/Then otherwise. It never drafts a journey and never writes
  `tests` on a requirement whose cases all point at parts.
- **Apply** quotes the part's steps as the case's acceptance check and names the
  derived spec as the test to make pass. It never edits the journey.
- **Verify** reads the derived spec and the last run as the requirement's `e2e`
  evidence. A part that fails is evidence against the requirement; a part no case
  points at is reported beside the table as unclaimed. Two findings more, for
  every journey a requirement in scope points at:
  - **`stale`** — the journey's signature no longer matches its run: the first
    field `.devbook/_tools/scenarios/signature.mjs <scenarios file>#<journey>`
    prints, a read that runs nothing, is not the `signature` in its `run.json`,
    or there is no `run.json`. Data sets hash from `.devbook/scenarios/data/`
    unless `playwright.config.ts` sets `scenarioFolder`; pass it as
    `--scenario-folder` whenever it is set. Listed after the report table, one row
    per journey with both signatures and `scenario-run` as the action, per
    [Report table](#report-table) — `scenario-derive` first when the spec's
    `// signature:` differs too. `stale` qualifies a run the way `unagreed`
    qualifies a verdict; it is not a sixth verdict.
  - **`spec-ahead`** — a part a case points at has no proof: no spec's
    `// scenario:` header names its journey, that spec has no `part` titled as the
    part's heading, or the current run records the part `not-run`, a step still
    held by `test.fixme()`. The requirement's row is `spec-ahead` — agreed and not
    proved — with `scenario-derive` as the action, or the held step to fill, then
    `apply-change` where the behaviour is unbuilt too.

## Drift verdict

Every run of any of the three skills ends in exactly one of five verdicts per
chapter in scope. For `verify-change` the verdict is the whole result, and the
"what to do" column below is what its report names rather than what it does.

| Verdict | Meaning | What to do |
|---|---|---|
| `aligned` | The chapter and the code say the same thing. | Report it and stop. No write in either direction. Say what was compared, so the pass is not repeated. |
| `code-ahead` | The code carries behaviour, structure, or language the chapter does not. | Capture: write the chapter from the code. Apply: stop — there is nothing to build; hand the scope to `capture-specs`. |
| `spec-ahead` | The chapter carries agreed content the code does not implement. | Apply: emit the change brief and hand it to the code-side flow. Capture: stop — the chapter is not stale, it is unbuilt; hand the scope to `apply-change`. |
| `conflict` | The chapter and the code make **incompatible** claims: a different invariant, a contradictory state transition, an event with a different meaning, a term used for two different concepts. | **Always stop and ask.** Never resolve a conflict by writing. |
| `unresolved` | The counterpart could not be paired, or the evidence is too thin to tell which side is ahead. | Stop. Report the resolution attempts, the candidates found, and what evidence would settle it. |

`conflict` is not a variant of `code-ahead`. Code being newer than a chapter
does not make code correct: an agreed invariant that the implementation violates
is a defect in the code at least as often as it is staleness in the chapter, and
only a person can say which. Present both readings side by side with their
evidence, name the decision that has to be made, and wait.

`unresolved` is likewise not a licence to guess. Report it as a finding — a
concept nobody can pair to code is itself worth knowing about.

## What is agreed

A block carries no status. A branch's devbook is true of that branch's code, so
**a chapter merged into the branch is agreed**: it is the model, and building
it is the point. Work someone is still deciding is never a chapter under
`.devbook/`. It is an open change under `openspec/changes/<name>/`, on any
branch, per `devbook-changes.md`, and that is where spec-ahead work lives before
it lands.

The rule underneath: **a change still being decided stays ahead until a person
says otherwise.** Nothing read from code may overwrite it, and nothing gets
built out of it.

A change is open against a chapter when a delta under
`openspec/changes/<name>/devbook-delta/` — never `archive/` — sits at the
chapter's file path and names the chapter's heading or one above it.
**`capture-specs` never plans over it**: it reports the change by name beside
what the code has, because the chapter's next content is already being decided
there.

To the other two, an open change is **pending truth** once a person has agreed
it — the host that keeps the proposal's state reports it `approved` or
`accepted` over its current fingerprint, through `devbook.decision@1` (the
devbook plugin's `resources/decision.md`). Name the host that answered. The
target is then the chapter as the delta would leave it, which
`delta.mjs --check <name>` merges in memory:

| The change | `verify-change` | `apply-change` |
|---|---|---|
| Agreed | Verdicts against chapter plus delta. A `code-ahead` the delta explains is reported as `covered by change <name>, step N` — the `tasks.md` step whose `delivers:` names it — and is not drift | Proceeds against chapter plus delta, one step at a time |
| Not agreed, its fingerprint moved since the decision, or no host bound | Verdicts against the chapter as it stands, marked `unagreed`, and names the change beside each verdict it touches | **Stops and confirms** before emitting a brief |

`unagreed` is a flag on a verdict, not a sixth verdict: the five above are still
the whole set, and the flag says only that the verdict was measured beside
something nobody has agreed to yet. Reading it as a statement about the model
is the mistake the flag exists to prevent.

**Capture decides nothing.** Finding an implementation is not agreement that
the implementation is the intended model, and a capture pass produces a plan
rather than a chapter, so — with the one exception in
[Carrying a plan in](#carrying-a-plan-in) — what the plan is worth is decided
when someone reviews and merges it, not by the pass that found the code. Never
propose removing a chapter because the code was deleted. Code being gone may
mean the model was abandoned, or may mean it regressed. Report it as
`code-ahead` with the removal as the finding, and let the person decide.

**Apply never builds an undecided change without confirmation.** Say what the
change claims, that it is not yet agreed, and ask whether to build it as
written or settle it first. Building from it silently turns an unreviewed
sketch into shipped behaviour.

**No skill here records a decision.** Approval and acceptance are the host's,
made by the person answering it there; capture and apply only read them.

## The capture plan

By default a capture pass writes nothing. Its whole result is a **capture plan**, delivered
to the person as a Markdown artifact, and what happens to it afterwards is theirs: they
carry it into the folder through whatever flow covers it, take part of it, or leave
it. Code is evidence, not agreement, and a pass that wrote the chapter would be
agreeing on the person's behalf. Write mode carries the plan in only where a person
approves the result afterwards, per [Carrying a plan in](#carrying-a-plan-in).

The plan has three parts.

1. **The drafts**, to the folder rule's template, as the kind's file says: the
   invariants the aggregate or domain service and its unit tests establish, each as
   one claim with its rejection code and its `Enforced at:` line, and the requirements
   the running product and its e2e tests establish, each as one SHALL sentence with its
   `#### Scenario:` cases — both with their `tests` entries. Every claim carries the evidence behind it: the declaration,
   guard clause, or passing test that settles it, named specifically enough to
   re-check. A rule nothing asserts is drafted and marked thinly covered.
2. **The delta**, which is how the drafts are arranged. One entry per heading in the
   target file, marked exactly one of:

   | Marker | Meaning |
   |---|---|
   | `ADDED` | The heading is not in the target file. The draft is its whole content. |
   | `MODIFIED` | The heading is there and says something the code contradicts or omits. Give the current text beside the drafted one, so the reader sees what changes. |
   | `REMOVED` | The heading is there and its counterpart is gone from the code. Never a deletion the pass performs — the evidence for the removal, and the question of whether the model was abandoned or regressed, is the entry. |

   By heading, against a named target file, so the plan is legible against the chapter
   it is about and stays legible when the chapter moves on before anyone reads it.
   The workspace is the one target not keyed by heading: its delta is by element
   identifier or view key, per the building-block kind's file.
3. **The report table**, as below, one row per chapter in scope, `aligned` rows
   included.

A plan never carries a field the schema moved to tooling, a review note, or an
edit to anything outside the headings it lists.

## Carrying a plan in

Two callers carry the plan in themselves, and the same rules bind both:

- **An unattended run** — a sweep, with nobody watching — on its own branch, landing it as a
  **draft pull request**. The draft is the person: nothing it carries counts as agreed until
  someone reviews and merges it. The sweep's own contract owns the branch, the body, and the
  labels.
- **Write mode** — `capture-specs` asked to write, which is how a `phase-spec-check` binding
  runs it — into the change set the caller is building. Personal Validation is the person:
  every chapter edit is listed beside the code, and a rejected one is reverted. Only
  `code-ahead` rows are carried, and only for the chapters the caller put in scope; every other
  verdict stays a row in the report.

This section owns what the carried chapters may say.

- **A carried chapter states nothing about its own standing.** No field says it
  is a draft or agreed: the draft pull request is what says nobody has agreed
  it yet, and merging it is the agreement.
- **`REMOVED` is never carried.** It stays a finding for a person.
- **Only the chapters the plan lists.** Nothing outside its headings, and no
  review note.
- **The workspace lands with its chapters.** A building block's DSL statements land with the
  chapters that embed or name them, and only the identifiers and view keys the plan lists.
  A `REMOVED` statement is never carried.
- **Each carried chapter with its `meta` block, written in the same edit**, per the folder
  rule and `devbook-chapter-metadata.md`, then [the check](#the-check), run by the carrier
  and passing. A failing check is fixed in the source Markdown or the run stops with its
  output; a failing chapter is never handed on.

The apply direction has the same shape: the brief goes to the resolver as its
specification, and the change lands as a draft pull request. "Stop and confirm"
has nobody to ask, so an open change that is not agreed is skipped and named in
the run's report, never built.

## Code-side writes: the change brief

### A brief covers both from scratch and update

An apply pass is **not** limited to greenfield work. It handles
the whole range of "the chapter says something the code does not do":

- **From scratch** — no counterpart exists at all. The chapter describes a
  capability, type, or event the application does not have in any form.
- **Update** — a counterpart exists and works, and the chapter asks it to do
  something different or more: an invariant it does not enforce, a payload field
  it does not carry, a transition it allows and should not, a primitive standing
  in where the chapter names a type.
- **Repair** — a counterpart exists, was believed to satisfy an agreed chapter,
  and does not.

Those three are exactly the change categories below, and counterpart resolution
is what picks between them: it runs before the brief is written precisely so the
pass knows which case it is in. This is why `apply-change` reads code at all —
not to change it, but to establish what is already there, so the brief asks only
for the delta. An apply pass that skipped that step would re-specify working
behaviour as though it were missing.

An update brief carries one thing a from-scratch brief does not: the list of
places the current behaviour lives. "Replace the primitive", "move the rule onto
the type", "add the field to the event" are not actionable without it, so the
kind files call that list out as required output.

### The brief itself

`apply-change` produces a **change brief** and hands it to the flow that
implements it, per **Where the code-side write goes** below. It does not choose
an implementation approach and does not itself touch a source or test tree: the
brief is the contract between the chapter and the flow, and the flow owns the
how.

The brief has five parts, and a change category.

**Change category** — exactly one:

| Category | When |
|---|---|
| `new functionality` | The chapter describes a capability, type, or event the application does not have in any form. |
| `change to existing behaviour` | The counterpart exists and works, and the chapter asks it to do something different or more. |
| `defect` | The counterpart exists and is supposed to already satisfy the chapter, but does not. Reach this only from a `spec-ahead` verdict on a merged chapter believed delivered — never from a `conflict`, which stops instead. |

**The five parts:**

1. **Outcomes** — what is true for the user or the system once this is built, in
   the domain's own language. Observable statements, not implementation steps.
   Where the chapter has a `requirements.md` half, they are its
   `### Requirement:` chapters, quoted as they stand: each is already one SHALL
   sentence about what the product promises, which is what an outcome is.
2. **Invariants** — the rules that must hold at all times afterwards, stated as
   the chapter states them. They come from the `### Invariant:` chapters in
   the invariants subpage, each with its `Enforced at:` line, reached from the
   aggregate or domain service the change touches. This is the part an
   implementer cannot recover from the code, and the part most often lost.
3. **Ubiquitous language** — the canonical terms this change must use, with the
   `aliases` from the chapters that map them onto existing code names. Naming an
   alias here is what stops a new implementation inventing a fourth synonym.
4. **Out of scope** — what this change deliberately does not do, including
   adjacent chapters that look related and are not. Written explicitly, because
   an unstated boundary is the one that gets crossed.
5. **Acceptance checks** — how to tell it is done, each one checkable against
   code or a test. Derived from the invariants and outcomes, phrased so a test
   can assert it. Where a requirement carries `#### Scenario:` cases, those *are*
   the acceptance checks — Given/When/Then is already one test's worth — so carry
   them rather than paraphrasing them into something weaker. An invariant's check
   is its claim and its rejection code: the violating case is refused with that
   code, and the case that honours it is not. Do not write the tests; state what
   they must establish.

A brief that cannot state its invariants or its acceptance checks is not ready.
That is an `unresolved` verdict on the chapter's own completeness — report the
gap rather than emitting a vague brief.

### Where the code-side write goes

An apply pass never edits a source or test tree itself; it hands the brief to whatever flow implements a change of its
category, resolved in this order:

1. **A repo-native `flow-*` skill** that covers the change category — it takes
   precedence over anything a plugin provides.
2. **The flow engine's own flow for the code**, when an engine is installed: `flow-code`,
   which derives its kind from the category — `defect` is its defect kind, the other two its
   feature kind. The brief is the flow's approved specification —
   its outcomes are the requested behaviour, its acceptance checks the
   acceptance criteria, its invariants the constraints its scope phase would otherwise
   derive.
3. **Nowhere**, when no flow engine is installed: stop with the brief, which is
   then the whole result, and say so. Which flow picks it up is the user's
   decision, made after reading it.

Name the rung that answered, once, in the report. The dependency stays one-way:
no flow knows these skills exist, and a brief reaches a flow as ordinary input.

## The check

Only a carrier of a capture plan writes a chapter, so only it runs the check: write mode
and an unattended run, after every carried chapter. Otherwise, where a capture plan would
add, rename, or re-link a chapter, it says so and names the check the person runs once
they have carried it in, at the scope of the folder that changed:

```bash
node .devbook/_tools/devbook-meta/build.mjs --scope <folder> --check
```

With no `--scope` when the plan touches more than one folder. If it reports
unresolved references or a schema violation, the fix is in the source Markdown;
`devbook:validate` explains anything that does not resolve from the message alone.
Never regenerate a committed `_meta/` index and never hand-edit one: where a
repository keeps them, their refresh is the layered plugin's own path, named in the
repository's `AGENTS.md`.

## Report table

All three skills close with the same table, one row per chapter or counterpart in
scope, so a run's outcome is legible without reading the prose.

| Chapter | Counterpart | Resolved via | Verdict | Evidence | Action |
|---|---|---|---|---|---|
| `.devbook/domain/order-management/domain.md#order` | `Order` in `src/Ordering.Domain/Order.cs` | term alias | `code-ahead` | Two guard clauses and 4 passing tests assert an invariant the chapter omits | `MODIFIED` in the capture plan: one `### Invariant:` chapter added |
| `.devbook/domain/order-management/domain.md#refund` | not found | — | `unresolved` | No alias, no building-block match, no comparable naming | Reported; needs a decision on whether the concept is built |

Column rules:

- **Chapter** — the `<path>#<heading-slug>` reference, or the bare `<path>` for
  a file-level finding. Never a heading title on its own.
- **Counterpart** — the code element and the file it lives in, or `not found`.
- **Resolved via** — which rung of counterpart resolution matched: a term
  alias, building-block view, observed convention, or `—`.
- **Verdict** — one of the five, spelled exactly as above.
- **Evidence** — what was read that settles it, specifically enough to re-check.
  Never "reviewed the code".
- **Action** — what was done or is being asked for. For `conflict` and
  `unresolved`, the action is the question being put to the user.

`verify-change` adds one column after **Verdict**, read from `units.mjs` and
never inferred:

- **Unit** — the root chapter address of the unit the chapter belongs to, or `—`
  for a chapter in no unit. A chapter in a set-aside group names why.

Report every chapter in scope, including the `aligned` ones. A pass that lists
only its findings does not tell the reader what was checked and found fine, so
the same ground gets re-covered next time.

`verify-change` follows the table with one row per dead alias, or the line
"No dead aliases." when the run found none:

| Chapter | Alias | Proposal |
|---|---|---|
| `.devbook/arc42/building-blocks/ordering.md#order` | `Bestelling` | No identifier matches; the class is now `Order`. Remove the alias, or correct it if a Dutch name is still meant to pair |

Where a requirement in scope points at a journey, `verify-change` then lists each
such journey's run, or the line "No journeys." when none is pointed at:

| Journey | Journey signature | Run signature | Run | Action |
|---|---|---|---|---|
| `.devbook/domain/work/scenarios.md#set-up-and-fill-the-backlog` | `9c41e2a0` | `51d0b7e3` | `stale` | `scenario-run`; the spec's header still reads `51d0b7e3`, so `scenario-derive` first |

**Run** is `current` when the two signatures match and `stale` otherwise, and
**Run signature** is `none` when the journey has no `run.json`.
