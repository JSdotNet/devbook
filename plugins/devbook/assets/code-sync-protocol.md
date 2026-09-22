# Code sync protocol

Shared rules for the three skills that connect a repository's devbook folders
to its running code:

- **`sync-specs`** — something already exists in the application, the matching
  chapter is missing, thin, or stale, so read the implementation and write the
  chapter.
- **`apply-change`** — a chapter is agreed but not built, so turn it into a
  change brief and hand it to the flow that implements it.
- **`verify-change`** — report where the two stand, and write nothing.

Throughout this file and the files that load it, **capture** is what `sync-specs`
does and **apply** is what `apply-change` does. The names carry the endpoints;
these two words carry the action, and both spellings mean the same pass.

Each skill covers six kinds — `aggregate`, `domain-service`, `feature`,
`setting`, `building-block`, `design-component` — and none of them restates
this file. What
is specific to a kind lives once in `assets/spec-kinds/<kind>.md`: the chapters
and the file it covers, the `type` values, the folder rule, the spec-to-code
mapping, and what each direction does differently there.

## Why this is an asset and not an instruction

A rule declares the paths it governs, and `devbook:install` puts it in the
repository so both hosts apply it there. An honest `paths` list for these rules
would have to cover source and test trees — which would make the plugin speak in
every repository that has not adopted the devbook convention. This file is
therefore loaded on demand by the skills that need it, and the plugin stays
silent everywhere else.

## The two directions

| | `sync-specs` | `apply-change` | `verify-change` |
|---|---|---|---|
| Starting point | Implementation exists | Chapter exists and is agreed | Both exist |
| Missing thing | The chapter | The implementation | The knowledge of which side moved |
| Reads | Source, tests, and the chapter as it stands | The chapter, plus code only to establish what is already there | Source, tests, and the chapter |
| Writes | The chapter, through the folder's flow | A change brief, handed to the code-side flow | The report table, and nothing else |
| Never | Changes source or test code | Edits a source tree, a test tree, or the chapter's substance itself | Writes a chapter or a brief |

A single request often needs both directions, in sequence: `sync-specs` what is
built, then `apply-change` what the corrected chapter now says is missing. Run
them as two passes with the chapter settled in between — never interleave them,
or the chapter becomes both the question and the answer. `verify-change` is the
pass that says which one a chapter needs, and it is what both of the others do
before they write.

## Counterpart resolution

Neither direction can start until the chapter and its code counterpart are
paired. There is deliberately **no metadata field linking a chapter to a code
path** — a path in a `meta` block rots on the first refactor and gives no signal
when it does. Resolution goes through naming instead, in this order. Stop at the
first rung that produces a single unambiguous match.

The one link this schema does carry is `tests`, and the difference is the whole
reason it is allowed: a test identifier is *executable*, so an entry that stops
resolving fails a run instead of quietly pointing at nothing. It is a record of
what asserts a chapter, not a shortcut through the ladder below — a `tests`
entry names a test, and the counterpart still has to be resolved by naming. See
"Linking test cases" in `devbook-chapter-metadata.md`.

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
   deployable units the code is organized into, which narrows the search to one
   project or folder even when the type name itself differs.
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
turns a one-off inference into a durable pairing for the next pass. Propose it —
the write itself still routes through the folder's flow.

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

### Unit tests are first-class evidence, not a cross-check

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
land on the `### Invariant:` chapters in `invariants.md`, the `e2e` ones — or
`integration`, for a policy no user triggers — on the `### Requirement:`
chapters in `requirements.md`. A pass that puts them on the wrong half is
reported as a coverage warning, which usually means the rule itself is filed on
the wrong side.

Entries go in with the drafted content, so they route through the folder's
flow along with everything else — a capture pass does not edit a
chapter file directly, and that includes this field.

An apply pass writes no `tests` entries: the tests in its brief do not exist yet.
Its acceptance checks are what those entries will name once someone has written
them, which is a reason to phrase each check as something a single test can
assert.

## Drift verdict

Every run of any of the three skills ends in exactly one of five verdicts per
chapter in scope. For `verify-change` the verdict is the whole result, and the
"what to do" column below is what its report names rather than what it does.

| Verdict | Meaning | What to do |
|---|---|---|
| `aligned` | The chapter and the code say the same thing. | Report it and stop. No write in either direction. Say what was compared, so the pass is not repeated. |
| `code-ahead` | The code carries behaviour, structure, or language the chapter does not. | Capture: write the chapter from the code. Apply: stop — there is nothing to build; hand the scope to `sync-specs`. |
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

## Status rules

`status` records how settled the written chapter is. It is not a report on the
code, and the two directions each have a way of getting this wrong.

**Capture must not promote status on the strength of code alone.** Finding an
implementation is not agreement that the implementation is the intended model.
So:

- A new chapter written from code starts at `draft`. It is a description of what
  was found, not a ratified model.
- An existing chapter's `status` is left exactly as it is. Capture changes the
  chapter's *content*; a status change is a separate, deliberate decision that
  belongs to the folder's flow and the person running it.
- Never move a chapter to `active` because the code exists. `active` means "this
  is the current agreed model", and only a person agrees. In `domain/`,
  `arc42/`, and `design/` that move is spelled by *deleting* the `status` line,
  since `active` is those folders' resting value — so a capture pass must leave
  a `draft` or `proposed` line in place rather than tidying it away.
- Never move a chapter to `deprecated` because the code was deleted. Code being
  gone may mean the model was abandoned, or may mean it regressed. Report it as
  `code-ahead` with the removal as the finding, and let the flow
  and the user decide.

**Apply must not brief an unsettled chapter without confirmation.** A
chapter at `draft` or `proposed` has not been agreed:

- `approved` — proceed. The approval gate's rung: a person read this chapter and
  approved it, with `approved-by` and `approved-at` recording who and when.
- `active` — proceed. This is the agreed model, and building it is the point.
- `draft` or `proposed` — stop and confirm before emitting a brief. Say what the
  chapter currently claims, that it is not yet agreed, and ask whether to build
  it as written or settle the chapter first. Building from a draft silently
  turns an unreviewed sketch into shipped behaviour.
- `deprecated` — do not build. Report it and stop.

In `design/`, the ladder is only `draft`, `active`, `deprecated`; the `draft`
rule above applies unchanged and there is no `proposed`. The two decision rungs,
`approved` and `accepted` above it, sit on `domain/`'s ladder and on no other.

**No skill here writes either decision rung.** Capture never sets it: finding
code is not a person approving a chapter, and the same rule that forbids
promoting to `active` forbids this more strongly. Apply never sets it either —
it reads the rung and stops or proceeds. Only the approval gate, and the person
answering it, writes `approved`, `approved-by`, and `approved-at`.

## Where the spec-side write goes

A capture skill never writes a chapter file directly. It prepares the content and hands
the write to whatever flow covers the folder, resolved in this order:

1. **A repo-native `flow-*` skill** for that folder — it takes precedence over anything a
   plugin provides.
2. **The flow engine's own flow for the devbook folders** — `flow-spec`, which derives the
   folder and drafts through the role it maps to — when an engine is installed.
3. **Directly**, following that folder's `devbook-*.md` rule and
   `devbook-chapter-metadata.md`, when no flow engine is installed at all.

Name the rung that answered, once, in the report. Whichever rung it is owns template
conformance, metadata blocks, and the consistency review; this skill owns the evidence.
The dependency is one-way — no flow knows these skills exist, and none of them changes to
accommodate this. `tech-update` has the same relationship with the `tech/` write.

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
| `defect` | The counterpart exists and is supposed to already satisfy the chapter, but does not. Reach this only from a `spec-ahead` verdict on content whose `status` says it was agreed and believed delivered — never from a `conflict`, which stops instead. |

**The five parts:**

1. **Outcomes** — what is true for the user or the system once this is built, in
   the domain's own language. Observable statements, not implementation steps.
   Where the chapter has a `requirements.md` half, they are its
   `### Requirement:` chapters, quoted as they stand: each is already one SHALL
   sentence about what the product promises, which is what an outcome is.
2. **Invariants** — the rules that must hold at all times afterwards, stated as
   the chapter states them. They come from the `### Invariant:` chapters in
   `invariants.md`, each with its `Enforced at:` line, reached from the
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
   can assert it. Where a rule carries `#### Scenario:` cases, those *are* the
   acceptance checks — Given/When/Then is already one test's worth — so carry
   them rather than paraphrasing them into something weaker. Do not write the
   tests; state what they must establish.

A brief that cannot state its invariants or its acceptance checks is not ready.
That is an `unresolved` verdict on the chapter's own completeness — report the
gap rather than emitting a vague brief.

### Where the code-side write goes

The mirror of the spec-side ladder. An apply pass never edits a source or test
tree itself; it hands the brief to whatever flow implements a change of its
category, resolved in this order:

1. **A repo-native `flow-*` skill** that covers the change category — it takes
   precedence over anything a plugin provides.
2. **The flow engine's own flow for the code**, when an engine is installed: `flow-code`,
   which derives its kind from the category — `defect` is its defect kind, the other two its
   feature kind. The brief is the flow's approved specification —
   its outcomes are the requested behaviour, its acceptance checks the
   acceptance criteria, its invariants the constraints Stage 0 would otherwise
   derive.
3. **Nowhere**, when no flow engine is installed: stop with the brief, which is
   then the whole result, and say so. Which flow picks it up is the user's
   decision, made after reading it.

Name the rung that answered, once, in the report. The dependency stays one-way:
no flow knows these skills exist, and a brief reaches a flow as ordinary input.

## The check

Whenever a capture pass results in a chapter being added, renamed, or re-linked,
close the pass with the check, at the scope of the folder that changed:

```bash
node .devbook/_tools/devbook-meta/build.mjs --scope <folder> --check
```

Run it with no `--scope` when the pass touched more than one folder. If it
reports unresolved references or a schema violation, fix the source Markdown;
run `devbook:check` for anything that does not resolve from the message alone.
Never regenerate a committed `_meta/` index in the pass, and never hand-edit
one: where a repository keeps them, their refresh is the layered plugin's own
path, named in the repository's `AGENTS.md`.

An apply pass changes no chapter file and therefore checks nothing, and neither
does a verify pass.

## Report table

All three skills close with the same table, one row per chapter or counterpart in
scope, so a run's outcome is legible without reading the prose.

| Chapter | Counterpart | Resolved via | Verdict | Evidence | Action |
|---|---|---|---|---|---|
| `.devbook/domain/order-management/domain.md#order` | `Order` in `src/Ordering.Domain/Order.cs` | term alias | `code-ahead` | Two guard clauses and 4 passing tests assert an invariant the chapter omits | Chapter updated via `flow-spec` |
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

Report every chapter in scope, including the `aligned` ones. A pass that lists
only its findings does not tell the reader what was checked and found fine, so
the same ground gets re-covered next time.
