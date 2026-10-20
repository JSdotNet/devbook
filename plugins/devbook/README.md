# devbook

Encapsulates the `arc42/` / `domain/` / `tech/` / `design/` / `ai/`
devbook convention: durable, cross-linked Markdown chapters with
machine-readable `meta` blocks, a checker that keeps references honest, and a
CI check. The checker writes nothing on its own; a repository
that wants the derived `_meta/` indexes committed enables
[`devbook-derived`](../devbook-derived), which asks the same tool to write them.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `devbook` with `/plugin`. During development, add this working copy by
path instead of by repository.

## What the convention is

Each devbook folder holds Markdown chapters. Every chapter carries a `meta`
block declaring its identity, status, number, date, its relationships to other
chapters, and the test cases that assert what it claims. A generator walks the
corpus and writes derived indexes under `_meta/`, which CI validates on every
pull request and a scheduled job keeps current.

A chapter may also carry `annotation` fences — review notes written in the
chapter, beside the passage they are about. Markdown stays canonical,
annotations included, so a note inherits position as its anchor, git as its
sync and backup, the pull request as its review, and `git blame` as its
authorship record. A note is an open loop, not a record: resolving one means
deleting it, and a reader loading a chapter for context skips every fence.

| Folder | Holds |
|--------|-------|
| `arc42/` | arc42 architecture chapters, ADRs, TDRs |
| `domain/` | Bounded contexts, ubiquitous language, aggregates, domain flows, and the requirements and invariants they guarantee |
| `tech/` | Technology graph: platforms, runtimes, frameworks, versions, maturity |
| `design/` | UX and visual design guidelines, tokens, design rules |
| `ai/` | How the team develops with AI: usage per stage of the DevOps loop, concepts, adoption status |
| `openspec/changes/` | Proposed changes to the folders above, as a proposal and deltas that `delta.mjs` merges; history under `archive/` |

Adoption is partial by design — a repository may take only `domain/` and
`arc42/`, and the tooling emits scopes for the folders that actually exist.

Those five live under one `.devbook/` parent with the leading dot dropped —
`.devbook/arc42`, `.devbook/domain`, and so on — beside the stack config, the
tooling under `.devbook/_tools/`, and the repository rollup under
`.devbook/_meta/`. A root-level `.arc42/` is not a layout: the check reports it
and does not index it. An address is the chapter's real repository path.

The change folder is the one exception to the parent: `openspec/changes/`, because OpenSpec,
whose change lane it is, resolves `changes/` only under a folder named `openspec/`. It is
adopted like the others and stamped as `changes`; its shape is `rules/devbook-changes.md`.

## Features

### Skills: `init` and `update`

Two halves of one reconcile, in six phases: detect, resolve, plan, migrate,
materialize, stamp and verify. `devbook:init` brings devbook into a repository
that has none — it asks which folders to adopt, scaffolds each one, and writes the
stamp at `.devbook/config.json` — and refuses where that stamp already exists.
`devbook:update` moves a stamped repository forward: a plugin upgrade, a change in
which folders are adopted, and an outstanding migration are one idempotent
operation, and it refuses where no stamp exists. Both write devbook's
marker-fenced section of `AGENTS.md`, rendered from the adopted folders, and
reconcile the adopted procedures below. The protocol is in
`assets/reconcile-protocol.md`.

**Trigger keywords:** `devbook init`, `set up devbook`, `adopt the devbook folders`,
`scaffold arc42/`, `scaffold domain/`, `set up tech/` for `init`; `devbook update`,
`devbook sync`, `upgrade devbook`, `run devbook migrations` for `update`

### Procedures: `run`, `capture`, `diagnose`, `estimate`, `prototype`

The five procedures every repository has and no plugin can write. One product runs
`aspire start`, the next `docker compose up`; one has tracing, the next has screenshots. What
never varies is what each procedure is *for*, so devbook fixes the goal and seeds the
procedure:

| Procedure | Goal, fixed by devbook | The repository owns |
|---|---|---|
| `run` | Leave the application running and healthy; report the command, the health verdict, the entry points | the setup, the command, the readiness signals, the entry points, the credential pointer |
| `capture` | Return evidence a reviewer can open: one file per checkpoint and per failure, paths under the worktree root, the form named honestly | the layout, the naming, the tooling |
| `diagnose` | Name the cause of an observed issue and prove it — a log line, a trace span, a breakpoint's state — without handing the person a debugger, and leave nothing behind in the change | where the logs live, which debugger reaches the app, how a reproduction is set up |
| `estimate` | Return story points off 1/2/3/5/8/13/21 per unit of work, sized against the repository's reference examples, naming the reference each was compared with | the reference table of finished work per value, and its calibration |
| `prototype` | Settle a design question stated in one sentence with one throwaway standalone HTML file — a state model to drive, or structurally different variants on the repository's demo template — and answer it in one line kept out of the file; never merged, writing into no `.devbook/` folder and no source file | where the domain model, design system, Storybook, and prototypes live, what a prototype shows |

A repository adopts them in `devbook:init` beside the folders, and `devbook:update` reconciles
them in the same pass; `components.devbook.procedures.adopted` records which. Each lands as
one editable copy under `.agents/skills/<name>.md` with a managed wrapper per host carrying
the goal — except `run`, whose body is Claude Code's project recipe at
`.claude/skills/run-<name>/SKILL.md`, written by `/run-skill-generator`, with a Copilot twin at
`.github/skills/run/SKILL.md`. Edit the copy and it is yours: its hash matches no release, so
every later reconcile reports it and leaves it alone. With `prototype` and `design/` both
adopted, the starting demo template lands at `.devbook/design/demo-template.html`. The shape,
the goal, and what lands where are
[`assets/procedures/skill-wrappers.md`](assets/procedures/skill-wrappers.md).

Nothing depends on a procedure. A flow engine that wants a runtime or evidence names the skill
`run` or `capture` and finds it or does without; a session without one invokes `diagnose` by
name like any other skill.

### Skill: `validate`

Validates the corpus and writes nothing generated: does every chapter's `meta`
block satisfy the schema, does every reference resolve. Then repairs what it
reports in the chapters — broken references, missing or malformed `meta` blocks,
fields the schema no longer defines — and hands anything it cannot fix back to
`devbook:update`, which owns every write to the installation. Whether the
installation itself is current — the stamp, the ledger, the `AGENTS.md` section —
is asked across every component at once, never by this skill.

**Trigger keywords:** `devbook validate`, `devbook check`, `devbook-meta failed`,
`broken reference`, `validate devbook folders`, `build.mjs --check`

### Skill: `tech-update`

Refreshes a repository's `tech/` technology graph from deterministic package
inventories for .NET and frontend dependencies, then analyzes the repository for
non-package technologies such as runtimes, services, platforms, protocols, and
tooling before delegating graph authoring to the `tech/` write path. Runs the
check, never the writer.

**Trigger keywords:** `update technology graph`, `refresh tech/`,
`technology inventory`, `.NET packages`, `frontend packages`, `package graph`

### Skill: `prose-check`

Reads every adopted folder and reports the prose that does not earn its lines
— a name that no longer exists in the tree, a term defined a second time, a
hedge in a statement of fact, a paragraph restating its heading, a synonym
for a defined term, a stack of four nouns, a paragraph past six sentences, a
procedure step that is not one short imperative action — beside what
`devbook:validate` reports about structure. Report only: it writes nothing, and a
finding becomes an edit when a person makes it through the folder's flow. ADRs
and TDRs are records and stay out of the prose classes.

**Trigger keywords:** `prose check`, `check the chapters' prose`,
`what is stale in the devbook`, `tighten the chapters`

### Skill: `annotation-sweep`

Deletes every resolved annotation fence in one chapter and nothing else. It is
the last step of the lifecycle in `rules/devbook-annotations.md`: `open` means
somebody is waiting, `resolved` means answered and lives only the rest of the
branch, and gone is the resting state — the prose change is the record and git
holds the exchange. Chapter-scoped on purpose, so a person sees what is about to
go before it does.

**Trigger keywords:** `sweep the annotations`, `clear resolved notes`,
`delete the answered comments`, `sweep before merging`

### Skills: `scenario-write`, `scenario-derive`, `scenario-run`

Three skills over a journey — one end-to-end walk written as a `##` typed `scenario` in the
`scenarios.md` of the bounded context whose requirements it proves — each one step of the way
from the journey to its proof:

| Skill | Does |
| --- | --- |
| `scenario-write` | Writes or revises the journey in its context's `scenarios.md` — setup fields, English steps, screenshot labels — and the `Proved by:` line in every requirement case it proves |
| `scenario-derive` | Writes or re-derives the spec from the journey: the header and signature, the setup call, one test per part titled as its `###`, one step per step, the `shot` calls. Leaves a step body the journey cannot say to the implementer, never edits the setup hook, and builds on `qa:playwright-e2e-authoring` when it is installed |
| `scenario-run` | Runs one journey or all of them, each under its own profile, so the reporter writes `run.json` and the screenshots beside the scenarios file |

The journey is the source throughout: a finding is fixed by bringing the spec to the journey.
All three work on the [scenario tools](#tooling-scenarios), so they need `domain/` adopted.

**Trigger keywords:** `write a journey`, `add a scenario` for `scenario-write`;
`derive the spec`, `signature mismatch`, `journey without spec` for `scenario-derive`;
`run the journeys`, `refresh the scenario screenshots` for `scenario-run`

### No flows

This plugin ships the shape of a devbook folder and never the procedure for changing one.
The instruction files below say what a chapter must look like, and the check says whether it
does; how a change is carried — stages, roles, the approval gate, a pull request — is the
delivery engine's, which ships one flow per folder and reads these rules from the repository.
With `devbook` alone, a folder edit follows the folder's instruction file directly.

### Skills: `capture-specs`, `apply-change`, `verify-change`

Three skills between a devbook chapter and the code that implements it. Two are
named after the verbs [OpenSpec](https://openspec.dev/docs/skills) uses for the
same moves — `apply-change` and `verify-change` mean there what they mean here.
The third is not: OpenSpec's `sync-specs` merges the spec deltas a proposal
already wrote, and this direction — reading source to write the chapter — is one
OpenSpec has no skill for, so it carries the protocol's own word instead. The
chapter is the **spec**.

- **`capture-specs`** — something exists in the application and the chapter is
  missing, thin, or stale, so read the implementation and plan the chapter.
  Source and tests are the only evidence; comments, TODOs, and disabled tests
  are not. It writes nothing: the result is a **capture plan**, delivered to the
  person as a Markdown artifact — the drafts, as a delta against the target file
  marked `ADDED` / `MODIFIED` / `REMOVED` by heading, and the report table. What
  happens to it is theirs, per **The capture plan** in
  `assets/code-sync-protocol.md`. Its frontmatter declares `updates: true`, so a
  `phase-spec-check` binding runs it in write mode: it carries the plan's
  `code-ahead` entries into the chapters in scope, each with its `meta` block,
  runs the devbook check, never sets a decision rung, and lists every edit for
  Personal Validation, per **Carrying a plan in** in the protocol.
- **`apply-change`** — a chapter is agreed but unbuilt, so turn it into a
  change brief (outcomes, invariants, ubiquitous language, out of scope,
  acceptance checks) plus a change category, and hand the brief to the flow that
  implements a change of that category, per **Where the code-side write goes**
  in the protocol: a repo-native `flow-*` skill first, then the engine's
  `flow-code`, and nowhere when no engine is installed — then
  it stops with the brief, and which flow picks it up is the user's decision.
  It never edits a source or test tree itself.
- **`verify-change`** — report which side moved, per chapter, and write
  nothing: the drift verdict is the whole result, and its `Action` column names
  which of the other two the verdict calls for. Its scope is the wide one —
  a chapter, a file, a bounded context, or a whole devbook folder, one kind per
  run and one table for all of it.

**`apply-change` covers both from scratch and update.** The change category
is that axis, and counterpart resolution picks between them before the brief is
written: `new functionality` when no counterpart exists at all, `change to
existing behaviour` when one exists and the chapter asks for more, and `defect`
when one was believed to already satisfy an agreed chapter and does not. That
is why it reads code — not to change it, but to establish what is already there
so the brief asks only for the delta, and an update brief lists where the
current behaviour lives.

Each skill covers seven kinds, decided by the chapter's `type` — or by the file,
where the folder defines no `type` — and an eighth, `demo`, that rides with the page
it belongs to and roots no unit:

| Kind | Target | `type` value(s) | Kind file |
|------|--------|-----------------|-----------|
| `aggregate` | `.devbook/domain/<context>/domain.md` and `domain.invariants.md`, or the split `domain.<name>.md` and its `domain.<name>.invariants.md` | `aggregate`, `entity`, `value-object`, `enum`, `shared-value-objects`, `shared-enums`, `domain-event`, plus `invariants` and `invariant` for the rules it enforces | `assets/spec-kinds/aggregate.md` |
| `domain-service` | `.devbook/domain/<context>/domain.md` and `domain.invariants.md`, or the split `domain.<name>.md` and its `domain.<name>.invariants.md` | `domain-service`, plus `domain-event` for events the service itself raises and `invariants`/`invariant` for the rules it enforces | `assets/spec-kinds/domain-service.md` |
| `feature` | `.devbook/domain/<context>/features.md`, or `skills.md` where the context describes skills, and `requirements.md`, or the files split from them | `feature`, `sub-feature`, plus `requirements` and `requirement` for what it promises | `assets/spec-kinds/feature.md` |
| `setting` | `.devbook/domain/<context>/context.md` | `feature-flag`, `setting` | `assets/spec-kinds/setting.md` |
| `actor` | `.devbook/domain/<context>/actors.md`, or `context.md` while the actors live there | `user`, `technical` — an `organisation` is no unit | `assets/spec-kinds/actor.md` |
| `building-block` | `.devbook/arc42/05-building-block-view.md`, or `.devbook/arc42/building-blocks/<slug>.md` | none — `arc42/` defines no value set | `assets/spec-kinds/building-block.md` |
| `design-component` | `.devbook/design/component-libraries.md` | `requirement` for each rule a component keeps or breaks; the component chapter itself is untyped | `assets/spec-kinds/design-component.md` |
| `demo` | `.devbook/domain/<context>/demo.html`, `<page>.demo.html`, or a `*.demo.html` a `demo` field names | none — a demo has no `meta` block; it takes its page's status and `sync`, and capture never writes one | `assets/spec-kinds/demo.md` |

A kind file is what a kind needs that the protocol does not say: the chapters
and file it covers, the folder rule, the spec-to-code mapping with an evidence
column for capturing and a requirements column for proposing, and what each
direction does differently there. The three skills are short because the kind
files and the protocol are not.

**The aggregate is the unit, not its parts.** One pass covers the root, every
entity, value object, and enum it owns, the shared value-object and enum
groupings, and the domain events it raises. An aggregate is a consistency
boundary and its parts are only meaningful in terms of that boundary, so
capturing them separately would mean reading the same root several times and
deciding the boundary several times, with several chances to decide it
differently — and building them separately would produce work items that cannot
land independently.

A **domain service** is the deliberate exception: it is defined by coordinating
across boundaries rather than living in one, so folding it into a boundary's pass
would be backwards. It is its own kind, and owns the events it raises itself.

**Behaviour lives in `requirements.md` and the invariants subpages, one rule
per chapter.** A `### Requirement:` is one SHALL sentence about what the product
promises; an `### Invariant:` is one claim a type guarantees, with the
`Enforced at:` line that says where. A requirement carries `#### Scenario:`
cases; an invariant is proved by its `unit` test instead. Both are captured and briefed with the prose chapter they belong to rather than as a
kind of their own — the rules of an aggregate are that aggregate's pass. The
heading shape is OpenSpec's, kept so a tool that reads OpenSpec reads these
files; the two words are not, because a promise made outside the model and a
guarantee made by a type are different claims held by different people. That
also fixes the level of proof: a requirement is `e2e`, an invariant `unit`.

**`capture-specs` runs the application for a feature.** `features.md` is the one
chapter file written from the user's point of view, so that pass starts the app,
walks the feature, and captures a screenshot per step — reading a controller
tells you a route exists, while using the feature tells you what the product
lets someone do, in what order, with what wording. It prefers the repository's
own runtime and QA workflow skills where the repository has any installed, runs
only against a local or disposable environment, never exercises a destructive
step to document it, and keeps the screenshots as report evidence rather than
committing them to a devbook folder. `verify-change` runs nothing: a feature is
verified from code and tests.

**Term chapters have no kind of their own.** They are written through the
`domain/` write path, and populated incrementally by capture passes: whenever
one resolves a counterpart by inference rather than by an existing alias, it
proposes a term with the discovered code name as an `alias`, which turns a
one-off inference into a durable pairing for the next pass. The context folder
itself, including its term chapters, is created by the same path.

`tech/` has no kind here — `tech-update` already covers that direction.

The shared rules live once in `assets/code-sync-protocol.md`, which all three
skills reference and none repeats: counterpart resolution, the evidence rules
(including why unit tests are first-class evidence for capture rather than a
cross-check), a five-way drift verdict (`aligned`, `code-ahead`, `spec-ahead`,
`conflict`, `unresolved`, where `conflict` always stops and asks), the status
rules, the shape of the capture plan, and a shared report table.

Counterpart resolution deliberately uses **no metadata field** linking a chapter
to a code path — a path in a `meta` block rots on the first refactor and gives no
signal when it does. It goes through the chapter's `aliases`, then the `arc42/`
building-block view, then the observed naming convention, and reports
`unresolved` rather than guessing.

The dependency on the flows is one-way, and `capture-specs` has none at all: it
hands its plan to a person, and a person opens the folder's flow, or a flow binds it
for Spec Check and the person approves its edits at Personal Validation. `apply-change`
names its category's flow and hands over grounded input. No flow knows these
skills exist.

**Trigger keywords:** `document what we built`, `capture from code`,
`domain/ is stale`, `build the aggregate we agreed`, `build this chapter`,
`change brief`, `spec code drift`, `is the chapter still true`,
`the code has an invariant the chapter omits`

### Instructions

| File | Pattern | Purpose |
|------|---------|---------|
| `devbook-chapter-metadata.md` | all five folders | Required `meta` block fields, `status` ladders, `type` value sets, the approval and acceptance records, and the `tests` test-case link format |
| `devbook-domain.md` | `.devbook/domain/**` | Bounded-context structure and ubiquitous language |
| `devbook-arc42.md` | `.devbook/arc42/**` | arc42 chapter, ADR, and TDR structure |
| `devbook-tech.md` | `.devbook/tech/**` | Technology graph, versions, maturity ladder |
| `devbook-design.md` | `.devbook/design/**` | Design guideline scope and token rules |
| `devbook-ai.md` | `.devbook/ai/**` | AI usage per stage of the DevOps loop, the adoption ladder, and the `tech/` boundary |
| `devbook-annotations.md` | all five folders | The `annotation` fence: core field set, position anchoring, the resolve-means-delete lifecycle, and the rule that keeps an open note out of task context |
| `devbook-changes.md` | `openspec/changes/**` | The change folder: `proposal.md`, the delta shape `delta.mjs` merges, `solution.md`, and `tasks.md` |
| `devbook-writing.md` | all five folders | How a chapter reads: full sentences, short paragraphs and imperative steps, one meaning per term, no dash chains, noun stacks, or coined names, and a Mermaid diagram wherever a sequence, state, or structure is described |
| `devbook-naming.md` | devbook folders and `_meta` | Underscore and dot prefixes, kebab-case, no redundant suffixes |

Every glob is scoped to the `.devbook/` folders and the change folder, so the plugin stays silent in
repositories and files that have not adopted the convention.

#### How they reach a session

Not on their own. Neither Claude Code nor GitHub Copilot auto-applies a rule that sits
inside a plugin: there is no rules key in either manifest and no rules component, and a
plugin-root `CLAUDE.md` is not loaded either. A rule in the table above governs paths in
*your* repository, and its globs can only resolve there.

So `devbook:init` installs them, and `devbook:update` keeps them current — one copy of the rule, and a wrapper per host beside it,
each in the folder that host already reads:

```
plugins/devbook/rules/devbook-arc42.md                  what devbook ships
  └── .agents/rules/devbook-arc42.md                    the rule, verbatim
        ├── .claude/rules/devbook-arc42.md              paths:   → points at it
        └── .github/instructions/devbook-arc42.instructions.md
                                                        applyTo: → points at it
```

From then on the rule fires when either host opens a matching chapter — no skill, flow,
or hook has to name it first. All three are hash-tracked in the stamp like every other
materialized file, so an upgrade refreshes them, a copy you have edited is reported and
left alone, and dropping a folder from `adopted` orphans its trio rather than deleting
it. The templates and the reasons are in
[`assets/rule-wrappers.md`](assets/rule-wrappers.md).

Until you run `devbook:init`, the rules still reach a session the way they always have:
the session-start hook, and the skills that name one by path.

### Review state

A review in progress is never a field of its own. The chapter stays on its
transitional rung, its open `annotation` fences say what is still asked, and who
owes the next move lives in the pull request or the tracker. Only the decisions
are recorded in the chapter: `approved-*` and `accepted-*`, because they have to
travel with the content and lapse with it. [`devbook-collaboration`](../devbook-collaboration)'s skills run
the pass; a repository without that plugin reviews the same way by hand.

### Demo addresses

A chapter's `demo` field, a review note, and a frame hosting a click demo all point into a
demo the same way. The address and the four `postMessage` messages are
[`resources/demo-address.md`](resources/demo-address.md), versioned, owned here, and followed
by the demo template, spec-manager, and Backlog.

### The `ext` namespace

A plugin layered on top of devbook may keep its own per-chapter state under
`ext.<plugin>.<key>`. The generator carries those keys through untouched and
unvalidated, and emits them as one `ext` object per node — so an extension can
remember something about a chapter without a devbook schema change, a contract
bump, and a migration in every consuming repository. Reserved and currently
unused. See `devbook-chapter-metadata.md`.

### Tooling: `devbook-meta`

```bash
node .devbook/_tools/devbook-meta/build.mjs --check          # every adopted scope; CI runs this
node .devbook/_tools/devbook-meta/build.mjs --scope tech --check
node .devbook/_tools/devbook-meta/build.mjs --print          # the documents as JSON on stdout
node .devbook/_tools/devbook-meta/build.mjs --root ../other-repo --check
```

The checker builds the reference graph, the reading outline, the open-note
index, the term register, and the scenario register in memory and reports what
does not resolve. It writes nothing unless
asked with `--write`, and nothing in this plugin asks: the committed `_meta/`
indexes are [`devbook-derived`](../devbook-derived)'s, and its refresh paths are
what pass the flag. `--print` emits the same five documents per scope for a
viewer that cannot import `graph.mjs`, `outline.mjs`, and `annotations-index.mjs`
in-process.

```bash
node .devbook/_tools/devbook-meta/annotations.mjs list --chapter .devbook/arc42/05-building-block-view.md#devbook-meta
node .devbook/_tools/devbook-meta/annotations.mjs add  --chapter <path#slug> --after "<quote>" --author <who> --body <text>
node .devbook/_tools/devbook-meta/annotations.mjs reply   --chapter <path#slug> --index <n> --author <who> --body <text>
node .devbook/_tools/devbook-meta/annotations.mjs resolve --chapter <path#slug> --index <n> [--delete]
node .devbook/_tools/devbook-meta/annotations.mjs sweep   --chapter <path#slug>
```

`annotations.mjs` is the only writer of an annotation fence — the CLI above and
any in-process caller import the same functions, so nothing else edits a note
with a regular expression of its own. Its edits are surgical, and it never
commits. See `tools/devbook-meta/README.md` for the document shapes.

```bash
node .devbook/_tools/devbook-meta/delta.mjs --check <change>   # resolve every delta, write nothing
node .devbook/_tools/devbook-meta/delta.mjs --apply <change>   # merge, stamp `change`, move to archive/
node .devbook/_tools/devbook-meta/delta.mjs --apply <change> --no-move   # merge; the caller moves the folder
```

`delta.mjs` is the only merge of a change's deltas into the chapters they target. Its
`gateCheck`, before anything is written, refuses a change whose proposal is not `accepted`
over its current hash. `chapter-hash.mjs openspec/changes/<name>` prints that hash.

### Tooling: `devbook-tech`

```bash
node .devbook/_tools/devbook-tech/dotnet-packages.mjs --root .
node .devbook/_tools/devbook-tech/frontend-packages.mjs --root .
```

The inventory scripts emit deterministic JSON from repository manifests. Use them
as the source of truth for package-derived `tech/` facts; use repository analysis
for technologies that do not appear in package manifests.

### Tooling: `scenarios`

```bash
node .devbook/_tools/scenarios/check.mjs          # coverage: every journey against its spec
node .devbook/_tools/scenarios/signature.mjs <scenarios.md>#<journey>   # the signature a spec's header takes
```

The scenario tools connect a repository's e2e suite to its journeys: the parser, the
signature and its shared vector, the setup runner and `shot` helper a derived spec imports,
the reporter that writes `run.json` and the screenshots, and the coverage check. Materialized
only where `domain/` is adopted. The contract and the wiring are
[tools/scenarios/README.md](tools/scenarios/README.md).

### Assets

| File | Purpose |
|------|---------|
| `assets/reconcile-protocol.md` | Shared rules for `devbook:init` and `devbook:update`: the stamp devbook writes into `.devbook/config.json`, which files it materializes where, the four situations one reconcile covers, and what each of the six phases does |
| `assets/workflows/devbook-meta.yml` | CI workflow template materialized by `devbook:init`, its path filters trimmed to the adopted folders: fails on broken references and schema violations |
| `assets/agents-section.md` | Template for devbook's marker-fenced section of `AGENTS.md`: rendered from the adopted folders on every reconcile, rewritten only while it still matches the stamped hash |
| `assets/rule-wrappers.md` | How the rules land in an adopting repository: the verbatim copy under `.agents/rules/`, the `paths` wrapper Claude reads, the `applyTo` wrapper Copilot reads, and what `rules/rules.json` decides |
| `assets/routing-snippet.md` | Optional repository-local context-loading and routing policy |
| `assets/code-sync-protocol.md` | Shared rules for `capture-specs`, `apply-change`, and `verify-change`: counterpart resolution, evidence rules including why unit tests are first-class evidence for capture, the five-way drift verdict, status rules, the capture plan, the check, and the report table. An asset rather than an instruction, because an honest `paths` list for these rules would have to cover source trees and would break the plugin's silence in non-adopting repositories |
| `assets/procedures/skills/<name>.md` | The five procedure seeds: `name`, `description`, and `goal` in the frontmatter, an example-filled procedure below. `run.md` lands only where `/run-skill-generator` cannot run |
| `assets/procedures/skill-wrappers.md` | How a procedure lands: one editable copy, a managed wrapper per host, where the goal sits, and `run`'s exception |
| `assets/procedures/demo-template.html` | The starting demo template, seeded at `.devbook/design/demo-template.html` when `prototype` and `design/` are adopted: the managed region between `template:begin hash=…` and `template:end`, and a placeholder `main[data-demo-app]`. The comment opening the region is the authoring reference |
| `assets/procedures/demo-sample/features.demo.html` | A demo built on the template, with realistic data and one walkthrough: the fixture spec-manager and Backlog test against, its region kept equal to the template's by `tools/devbook-meta/demo-template.test.mjs` |
| `assets/spec-kinds/<kind>.md` | One file per chapter kind the three converters cover — `aggregate`, `domain-service`, `feature`, `setting`, `actor`, `building-block`, `design-component`, `demo`: the chapters and file it covers, the folder rule, the spec-to-code mapping with an evidence column and a requirements column, and what each direction does differently there. Long by kind: a mapping stated by half is wrong |

### Hook configuration

- `hooks.json` adds a session-start guardrail: devbook folders are task-scoped
  context rather than baseline context, `meta` blocks are mandatory on every
  chapter, and `_meta/` is never hand-edited. It also points a session at the
  repository's procedure skills rather than a guessed command, URL, or layout.

### Migrations

`migrations/` holds one folder per breaking change, `<contractVersion>-<slug>/`:

```text
migrations/
└── <contractVersion>-<slug>/
    ├── MIGRATION.md   what, why, what breaks, appliesTo
    └── migrate.mjs    idempotent; --check exits 1 while work remains
```

1.0.0 shipped none. The first after it is `010-terms-live-in-domain-md`, which moves a
context's `term` chapters into `domain.md` now that the glossary file kind is gone; the second
is `011-context-md`, which gives every context its `context.md` and moves each feature's
bare flag key onto a `feature-flag` chapter there; the third is `012-no-checkout-overlay`,
which removes the `.gitignore` block and moves a checkout-layer personal file out of the
clone now that nothing personal lives in one; the fourth is
`013-decision-rungs-are-domains`, which takes the `approved` and `accepted` rungs and
their six record fields off every folder but `domain/`, and names the `tech/` and `ai/`
chapters whose original rating no script can restore; the fifth is `015-openspec-verbs`,
which rewrites the skill ids a stack config binds — in the committed config and in both
overlay layers — now that every `install` is `init` and `update` and `check` is `validate`;
the sixth is `017-invariants-under-domain`, which moves `invariants.md` and
`invariants.<name>.md` into the invariants subpage of their domain page and rewrites every
reference to them; the seventh is `018-behaviour-titles`, which titles the two behaviour
files by kind, a `requirements.<name>.md` by its feature, and takes the `#### Scenario:` cases
off an `### Invariant:`; the eighth is `021-no-review-triad`, which deletes `review`,
`reviewer`, and `review-at` from every `meta` block and reports the review state it took off;
the ninth is `027-procedures-in-devbook`, which moves `components.devbook-procedures` under
`components.devbook`, keeping `adopted` and every hash, now that the procedures are devbook's;
the tenth is `030-scenario-tools`, which materializes `.devbook/_tools/scenarios/` where
`domain/` is adopted and the folder is missing or still an older release's copy, since 1.21.0
added the path without one; the eleventh is `030-linked-walkthroughs`, which rewrites a demo's
free walkthrough under a `Proved by:` case's slug to a linked one, `step` by position and text
copied by `demo-sync.mjs`, and lists one whose step count differs from its part's
`not-applicable`.
`001-start-is-run`, `002-debug-is-diagnose`, `003-show-removed`, and
`004-start-binding-is-run` shipped in `devbook-procedures` and moved here with it under their
shipped ids, because a ledger id is never renamed: they rewrite the old entry, so ledger order
runs them before `027`, and their `appliesTo` is `procedures`.
Contract 14 owed none. The
migrations written before 1.0.0 moved repositories between states no repository is in any
more and were dropped at the reset, per
`.devbook/arc42/adr/releases.md`.
Whether a change owes one — and the three cases that are easy to get wrong — is decided once,
in `AGENTS.md` under *When a change ships a migration*.

Rules that keep a ledger trustworthy:

- The id is immutable once released. Never rewrite a shipped migration — add a
  new one.
- A migration lives for the major version it ships in. A major release raises
  `MINIMUM_CONTRACT_VERSION` in `tools/devbook-meta/graph.mjs` to the contract
  the previous major last reached and deletes every folder at or below it; a
  reconcile refuses a stamp below the floor and says to upgrade through the
  previous major's last release first. The folder is bounded by one major's
  worth of breaking changes, and a dropped folder is never a hole, because the
  floor sits above it. The decision is
  `.devbook/arc42/adr/releases.md`.
- A migration is idempotent by rule: the second run changes nothing.
- `--check` is mandatory. CI calls it, and so does the plan phase of `devbook:update`; it is what
  makes a plan worth reading before anything is written.
- `appliesTo` names adopted folders. A repository that never adopted one records
  *not-applicable*, and adopting it later re-evaluates the migration rather than
  silently skipping it.
- A content change is scripted, never written up as a note. "Delete every
  `order:` line" is a five-line script or an unbounded manual chore in every
  consuming repository.

Presence in the ledger decides whether a migration runs — never a comparison of
version numbers. That is what makes re-running safe, and why a contract bump
that ships no migration is normal.

### `contractVersion`

One number, currently **30**, covering the metadata schema a repository authors
and the derived artifacts a consumer reads — `schemaVersion` in `graph.json` and
`index.json` is the same number under the name those files stamp themselves
with. It moves only when something repo-visible changes shape, so most plugin
releases leave it alone: plugin semver moves for prose and new skills,
`contractVersion` moves for the contract. It lives in `CONTRACT_VERSION` in
`tools/devbook-meta/graph.mjs`, beside `MINIMUM_CONTRACT_VERSION`, the oldest
contract a reconcile still carries forward. A contract bump is a minor release, with its
migration when one is owed — the upgrade is then automatic — and the major is
reserved for the release that raises the floor. A bump whose every part is an
added field or value with a safe default owes none: nothing written under the
previous contract stops validating, so there is no state for a script to move.

1.0.0 shipped at 9. The number counts schema shapes rather than releases and was not
restarted with the version: a derived artifact stamped 9 before the reset still follows
the contract a 1.0.0 generator writes. 10 removed the glossary file type from `domain/`,
and ships as `010-terms-live-in-domain-md`. 11 adds `context.md` as a bounded context's
root — the boundary, its feature flags and settings, and its actors and dependencies until
they outgrow it — and turns a feature's `feature-flag` from a bare key into a reference to
the switch's chapter, beside the new `setting` field; it ships as `011-context-md`. 12
retires the checkout layer of the stack-config overlay and the `.gitignore` block that
existed for it — the stamp's `materialized` no longer carries `.gitignore#devbook` — and
ships as `012-no-checkout-overlay`. 13 adds the optional `approved-hash`
fingerprint over a chapter's content, the `accepted` rung above `approved` with
`accepted-by`, `accepted-at`, and `accepted-hash`, and a `domain/` bounded
context's freedom to carry a page the convention does not name, whose
file-level `type` is its own filename. It also confines both rungs and their
six fields to `domain/`, which is breaking, so it ships as
`013-decision-rungs-are-domains`. 14 gives a bounded context
`requirements.md` and `invariants.md`, with the chapter types `requirements`,
`requirement`, `invariants`, and `invariant` and the two matching file types;
a `requirements`/`invariants` chapter's `related` is held to the
`feature`/`sub-feature` or `aggregate`/`domain-service` chapter it belongs to.
Every part of it is an added value with a safe default — the aggregate's
`### Invariants` table is still a legal structural heading, and nothing written
under 13 stops validating — so it ships no migration folder. Converting a table
into chapters is editorial work a repository does when it chooses to, and no
script can write the scenarios that make the move worth anything. 15 changes no
chapter shape: it renames the skill ids a stack config binds — `devbook:install`
to `devbook:update`, `devbook:check` to `devbook:validate`, and every other
renamed provider — and the `devbook-check` schedule to `devbook-validate`. A
config still naming an old id binds a skill that no longer exists, so it ships as
`015-openspec-verbs`. 16 gives the `bounded-context` chapter in `context-map.md` and
the context's own `context.md` an optional `deployment` — `service`, or `module` in
a modular monolith — which the two must state alike, and ships no migration: the
field is added, and a context without it reads as undecided. 17 moves a context's
invariants into a subpage of the domain page whose aggregates enforce them —
`domain.invariants.md`, and `domain.<name>.invariants.md` beside a split
`domain.<name>.md` — and ships as `017-invariants-under-domain`, which moves the files and
rewrites every reference into them. The old names validate with a warning for one release.
18 takes the `#### Scenario:` cases off an `### Invariant:` — it is a claim, its rejection
code, and `Enforced at:`, proved by its `unit` test — so only a requirement is warned for
having none, and a scenario an older invariant carries is tolerated. It titles the behaviour
files by kind, `# Requirements` and `# Invariants`, a `requirements.<name>.md` split by its
feature, and ships as `018-behaviour-titles`,
which retitles them; an old title still validates. 19 lets an `invariants` chapter pair with the
`shared-value-objects` or `shared-enums` grouping as well, so a shared type's own rules sit in
`domain.invariants.md` beside it; it only widens what `related` may name, and ships no
migration. 20 lets a repository declare its own `status` ladder per folder, file glob, and
block level in `.devbook/statuses.json`; a folder or block the file does not name takes the
built-in ladder, so a repository without the file validates as before and no migration is
owed. 21 removes the review triad — `review`, `reviewer`, `review-at` — from every folder: a
review in progress is the chapter's rung plus its open annotation fences, and who owes the
next move is the pull request's or the tracker's. A leftover field is an error naming the
migration, and `021-no-review-triad` deletes it.
22 gives `design/` its one `type`, `requirement`: a rule a component keeps or
breaks is a `### Requirement:` with `#### Scenario:` cases under the component's chapter,
warned when its `tests` reach no `e2e`. Every other `design/` chapter stays untyped, so it
ships no migration. 23 adopts the change folder, `openspec/changes/`: a change's `proposal.md`
is `type: change` at `status: proposed` with a `category`, each file under its `devbook-delta/`
is a delta the checker resolves through `delta.mjs`, `archive/` is never indexed, and `change`
is legal on any chapter as the merge's provenance. A repository without the folder validates
as before, so it ships no migration. 24 gives a change's `proposal.md` the `approved` and
`accepted` rungs for the whole change, fingerprinted over the proposal and every delta. 25 adds
the optional `sync` direction. 26 learns the click demos: the `demo` field, every address in it
resolved against the demo's `demo-model`, the HTML contract each `*.demo.html` keeps, and a
demo folded into the fingerprint of the page it belongs to. Each is an added field or rule a
corpus without it never meets, so none ships a migration. 27 changes no chapter: the
procedures' stamp entry moves under `components.devbook`, and it ships as
`027-procedures-in-devbook`. 28 makes a `user` and a `technical` actor chapter a sync unit, and 29 leaves a
demo's managed region out of every fingerprint. 30 adds the `scenario` type, its setup fields,
and the `Proved by:` line a requirement's scenario may carry instead of its own steps. Each is
added with a safe default, so none of the three owes a migration. `030-scenario-tools` and
`030-linked-walkthroughs` ship later under 30 without moving it: one materializes a path 1.21.0
added, the other rewrites free walkthroughs to the linked form a free one still validates
beside, and the ledger, not the number, decides that a repository on 30 runs both. 31 takes the
change folder out of the graph and moves no chapter shape. 32 moves the journey into a file of
its context: a `##` typed `scenario` in `scenarios.md` or `scenarios.<name>.md`, its `###`
headings the parts, addressed as `<scenarios file>#<journey>`, its runs beside the file. A
whole file typed `scenario` is an error from then on, so it ships `032-scenarios-md`, which
folds each page into `scenarios.md` and moves every reference, run folder, and spec header
with it.

## Folder structure

After running `devbook:init`, a repository that adopted everything has:

```
.devbook/
├── config.json                      # the stack config, with devbook's stamp
├── arc42/
│   ├── _meta/{graph,index,annotations,naming,scenarios}.json   # devbook-derived's, where enabled
│   └── <chapter>.md
├── domain/
│   ├── _meta/…
│   └── <bounded-context>/<chapter>.md
├── tech/
│   ├── _meta/…
│   ├── technology-graph.md
│   └── <layer>.md
├── design/
│   ├── _meta/…
│   └── <guideline>.md
├── ai/
│   ├── _meta/…
│   ├── adoption-map.md
│   ├── <nn>-<part>.md
│   └── concepts.md
├── _meta/{graph,index,annotations,naming,scenarios}.json   # the rollup, devbook-derived's
└── _tools/
    ├── devbook-meta/                # the checker, the fence writer, the graph modules
    ├── devbook-tech/                # deterministic package inventory scripts
    └── scenarios/                   # journey parser, signature, runner, reporter, coverage check
AGENTS.md                            # devbook's section between markers; the rest is the repository's
.github/
└── workflows/devbook-meta.yml       # the CI check
```

`devbook-derived` adds `.devbook/_meta/` and one `_meta/` per folder, `build/`, the
nightly and drift workflows, and its own `AGENTS.md` section beside these.

## Enforcement

Five layers, weakest to strongest:

1. **Instructions** govern the paths above in every repository that has run
   `devbook:init`, which installs each one where both hosts already look. Before that,
   they are reached by path only.
2. **The session-start hook** stops agents treating devbook folders as baseline
   context, and is what carries the folder rules in a repository that has not
   installed them.
3. **`meta` block rules** make every chapter's relationships explicit and
   checkable.
4. **`build.mjs --check`** fails on unresolved references and schema violations.
5. **The CI workflow** fails the pull request on broken references or a `meta`
   block that violates the schema. Whether a committed index has drifted is
   `devbook-derived`'s question, asked by its own workflow and never a failure.

## License

MIT
