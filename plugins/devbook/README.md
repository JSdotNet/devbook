# devbook

Encapsulates the `.arc42` / `.domain` / `.tech` / `.design` / `.ai`
devbook convention: durable, cross-linked Markdown chapters with
machine-readable `meta` blocks, derived `_meta/` indexes, a graph canvas, and a
CI check that keeps references honest.

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
| `.arc42/` | arc42 architecture chapters, ADRs, TDRs |
| `.domain/` | Bounded contexts, ubiquitous language, aggregates, domain flows |
| `.tech/` | Technology graph: platforms, runtimes, frameworks, versions, maturity |
| `.design/` | UX and visual design guidelines, tokens, design rules |
| `.ai/` | How the team develops with AI: usage per flow stage, concepts, adoption status |

Adoption is partial by design — a repository may take only `.domain` and
`.arc42`, and the tooling emits scopes for the folders that actually exist.

Those five sit at the repository root, or nested under one `.devbook/` parent
with the leading dot dropped — `.devbook/arc42`, `.devbook/domain`, and so on.
Pick one layout and never mix them; the generator recognizes both, reports which
one it found, and treats a repository containing both as an error. Nothing else
changes: an address is the chapter's real repository path either way, and each
folder's `_meta/` is written beside its own chapters.

## Features

### Skill: `devbook:install`

Reconciles a repository with the installed devbook release, in six phases:
detect, resolve, plan, migrate, materialize, stamp and verify. First install, a
plugin upgrade, a change in which folders are adopted, and an outstanding
migration are one idempotent operation — the stamp at
`.devbook/config.json` says which. Materialize also writes devbook's
marker-fenced section of `AGENTS.md`, rendered from the adopted folders. The
protocol is in `assets/reconcile-protocol.md`.

**Trigger keywords:** `devbook install`, `devbook sync`, `set up devbook`, `adopt the devbook
folders`, `scaffold .arc42`, `scaffold .domain`, `set up .tech`,
`upgrade devbook`, `run devbook migrations`

### Skill: `devbook-check`

The check-only half of the same protocol: writes nothing, and asks the same
three questions. Does the authored Markdown satisfy the schema, is the migration
ledger current, does the stamp still describe what is on disk. Then repairs what
it reports — broken references, missing or malformed `meta` blocks, fields the
schema no longer defines, stale committed indexes — and hands the rest back to
`devbook:install`, which owns every write.

**Trigger keywords:** `devbook check`, `devbook-meta failed`,
`broken reference`, `stale _meta`, `validate devbook folders`,
`build.mjs --check`

### Skill: `devbook-tech-update`

Refreshes a repository's `.tech/` technology graph from deterministic package
inventories for .NET and frontend dependencies, then analyzes the repository for
non-package technologies such as runtimes, services, platforms, protocols, and
tooling before delegating graph authoring to the `.tech` write path.

**Trigger keywords:** `update technology graph`, `refresh .tech`,
`technology inventory`, `.NET packages`, `frontend packages`, `package graph`

### Skill: `prose-check`

Reads every adopted folder and reports the prose that does not earn its lines
— a name that no longer exists in the tree, a term defined a second time, a
hedge in a statement of fact, a paragraph restating its heading — beside what
`devbook-check` reports about structure. Report only: it writes nothing, and a
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

### No flows

This plugin ships the shape of a devbook folder and never the procedure for changing one.
The instruction files below say what a chapter must look like, and the check says whether it
does; how a change is carried — stages, roles, the approval gate, a pull request — is the
delivery engine's, which ships one flow per folder and reads these rules from the repository.
With `devbook` alone, a folder edit follows the folder's instruction file directly.

### Skills: `sync-specs`, `apply-change`, `verify-change`

Three skills between a devbook chapter and the code that implements it, named
after the verbs [OpenSpec](https://openspec.dev/docs/skills) uses for the same
moves — `apply-change` and `verify-change` exactly, `sync-specs` approximately,
since OpenSpec has no skill that reads code to update a spec (debt record 6 in
this repository's `.devbook/arc42/tdr/`). The chapter is the **spec**.

- **`sync-specs`** — something exists in the application and the chapter is
  missing, thin, or stale, so read the implementation and write the chapter.
  Source and tests are the only evidence; comments, TODOs, and disabled tests
  are not. The write routes per **Where the spec-side write goes** in
  `assets/code-sync-protocol.md`.
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
  which of the other two the verdict calls for.

**`apply-change` covers both from scratch and update.** The change category
is that axis, and counterpart resolution picks between them before the brief is
written: `new functionality` when no counterpart exists at all, `change to
existing behaviour` when one exists and the chapter asks for more, and `defect`
when one was believed to already satisfy an agreed chapter and does not. That
is why it reads code — not to change it, but to establish what is already there
so the brief asks only for the delta, and an update brief lists where the
current behaviour lives.

Each skill covers five kinds, decided by the chapter's `type` — or by the file,
where the folder defines no `type`:

| Kind | Target | `type` value(s) | Kind file |
|------|--------|-----------------|-----------|
| `aggregate` | `.domain/<context>/domain.md` | `aggregate`, `entity`, `value-object`, `enum`, `shared-value-objects`, `shared-enums`, `domain-event` | `assets/spec-kinds/aggregate.md` |
| `domain-service` | `.domain/<context>/domain.md` | `domain-service`, plus `domain-event` for events the service itself raises | `assets/spec-kinds/domain-service.md` |
| `feature` | `.domain/<context>/features.md`, or `skills.md` where the context describes skills | `feature`, `sub-feature` | `assets/spec-kinds/feature.md` |
| `building-block` | `.arc42/05-building-block-view.md` | none — `.arc42` defines no value set | `assets/spec-kinds/building-block.md` |
| `design-component` | `.design/component-libraries.md` | none — `.design` defines no value set | `assets/spec-kinds/design-component.md` |

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

**`sync-specs` runs the application for a feature.** `features.md` is the one
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
`.domain` write path, and populated incrementally by capture passes: whenever
one resolves a counterpart by inference rather than by an existing alias, it
proposes a term with the discovered code name as an `alias`, which turns a
one-off inference into a durable pairing for the next pass. The context folder
itself, including its term chapters, is created by the same path.

`.tech` has no kind here — `devbook-tech-update` already covers that direction.

The shared rules live once in `assets/code-sync-protocol.md`, which all three
skills reference and none repeats: counterpart resolution, the evidence rules
(including why unit tests are first-class evidence for capture rather than a
cross-check), a five-way drift verdict (`aligned`, `code-ahead`, `spec-ahead`,
`conflict`, `unresolved`, where `conflict` always stops and asks), the status
rules, index regeneration, and a shared report table.

Counterpart resolution deliberately uses **no metadata field** linking a chapter
to a code path — a path in a `meta` block rots on the first refactor and gives no
signal when it does. It goes through a `term` chapter's `aliases`, then the `.arc42`
building-block view, then the observed naming convention, and reports
`unresolved` rather than guessing.

The dependency on the flows is one-way. `sync-specs` names its folder's write
path and `apply-change` its category's, and both hand over grounded input; no
flow knows these skills exist.

**Trigger keywords:** `document what we built`, `capture from code`,
`.domain is stale`, `build the aggregate we agreed`, `build this chapter`,
`change brief`, `spec code drift`, `is the chapter still true`,
`the code has an invariant the chapter omits`

### Instructions

| File | Pattern | Purpose |
|------|---------|---------|
| `devbook-chapter-metadata.md` | all five folders | Required `meta` block fields, `status` ladders, `type` value sets, and the `tests` test-case link format |
| `devbook-domain.md` | `.domain/**`, `.devbook/domain/**` | Bounded-context structure and ubiquitous language |
| `devbook-arc42.md` | `.arc42/**`, `.devbook/arc42/**` | arc42 chapter, ADR, and TDR structure |
| `devbook-tech.md` | `.tech/**`, `.devbook/tech/**` | Technology graph, versions, maturity ladder |
| `devbook-design.md` | `.design/**`, `.devbook/design/**` | Design guideline scope and token rules |
| `devbook-ai.md` | `.ai/**`, `.devbook/ai/**` | AI usage per flow stage, the adoption ladder, and the `.tech` boundary |
| `devbook-annotations.md` | all five folders | The `annotation` fence: core field set, position anchoring, the resolve-means-delete lifecycle, and the rule that keeps an open note out of task context |
| `devbook-derived-artifacts.md` | `**/_meta/**` | Placement, naming, and envelope rules for generated files |
| `devbook-naming.md` | devbook folders and `_meta` | Underscore and dot prefixes, kebab-case, no redundant suffixes |

Every glob carries both layouts — the five root dot-folders and their `.devbook/`
nesting — and is scoped to the devbook folders, so the plugin stays silent in
repositories and files that have not adopted the convention.

#### How they reach a session

Not on their own. Neither Claude Code nor GitHub Copilot auto-applies a rule that sits
inside a plugin: there is no rules key in either manifest and no rules component, and a
plugin-root `CLAUDE.md` is not loaded either. A rule in the table above governs paths in
*your* repository, and its globs can only resolve there.

So `devbook:install` installs them — one copy of the rule, and a wrapper per host beside it,
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

Until you run `devbook:install`, the rules still reach a session the way they always have:
the session-start hook, and the skills that name one by path.

### The `ext` namespace

A plugin layered on top of devbook keeps its own per-chapter state under
`ext.<plugin>.<key>`. The generator carries those keys through untouched and
unvalidated, and emits them as one `ext` object per node — so an extension can
remember something about a chapter without a devbook schema change, a contract
bump, and a migration in every consuming repository. See
`devbook-chapter-metadata.md`.

### Extension: `devbook-graph`

Two canvases. `devbook-graph` renders the reference graph — chapters as nodes,
`related` / `depends-on` as edges — using the same graph code the
generator writes, so the live view and the committed indexes never disagree. The
node inspector lists a chapter's test links with the command that runs each one,
which is where a "run this test" button goes. `devbook-chapter` opens one
chapter's Markdown beside its parsed `meta` block and a metadata lint.

### Tooling: `devbook-meta`

```powershell
./build/Update-DevbookIndex.ps1                      # refresh, and say what moved
./build/Update-DevbookIndex.ps1 -Scope .tech
./build/Update-DevbookIndex.ps1 -Check               # validate, write nothing
```

```bash
node .devbook/_tools/devbook-meta/build.mjs            # write every adopted scope
node .devbook/_tools/devbook-meta/build.mjs --check    # CI: verify only
node .devbook/_tools/devbook-meta/build.mjs --scope .tech
node .devbook/_tools/devbook-meta/build.mjs --root ../other-repo
```

```bash
node .devbook/_tools/devbook-meta/annotations.mjs list --chapter .arc42/05-building-block-view.md#devbook-meta
node .devbook/_tools/devbook-meta/annotations.mjs add  --chapter <path#slug> --after "<quote>" --author <who> --body <text>
node .devbook/_tools/devbook-meta/annotations.mjs reply   --chapter <path#slug> --index <n> --author <who> --body <text>
node .devbook/_tools/devbook-meta/annotations.mjs resolve --chapter <path#slug> --index <n> [--delete]
```

`annotations.mjs` is the only writer of an annotation fence — the CLI above and
any in-process caller import the same four functions, so nothing else edits a
note with a regular expression of its own. Its edits are surgical, and it never
commits: adding a note dirties a tracked file, and that is the caller's to
review.

Output is deterministic — no timestamps — so a clean `git diff` proves the
committed indexes are current. See `tools/devbook-meta/README.md` for the
output shape and for when to refresh.

### Tooling: `devbook-tech`

```bash
node .devbook/_tools/devbook-tech/dotnet-packages.mjs --root .
node .devbook/_tools/devbook-tech/frontend-packages.mjs --root .
```

The inventory scripts emit deterministic JSON from repository manifests. Use them
as the source of truth for package-derived `.tech` facts; use repository analysis
for technologies that do not appear in package manifests.

### Assets

| File | Purpose |
|------|---------|
| `assets/reconcile-protocol.md` | Shared rules for `devbook:install` and `devbook-check`: the stamp devbook writes into `.devbook/config.json`, which files it materializes where, the four situations one reconcile covers, and what each of the six phases does |
| `assets/workflows/devbook-meta.yml` | CI workflow template materialized by `devbook:install`, its path filters rendered to the layout and the adopted folders: fails on broken references, warns on drifted indexes |
| `assets/workflows/devbook-meta-nightly.yml` | Scheduled index refresh; opens one pull request when the output drifted, nothing when it did not |
| `assets/build/Update-DevbookIndex.ps1` | On-demand index refresh, with `-Scope` and `-Check`; reports which index files moved |
| `assets/agents-section.md` | Template for devbook's marker-fenced section of `AGENTS.md`: rendered from the adopted folders on every reconcile, rewritten only while it still matches the stamped hash |
| `assets/rule-wrappers.md` | How the rules land in an adopting repository: the verbatim copy under `.agents/rules/`, the `paths` wrapper Claude reads, the `applyTo` wrapper Copilot reads, and what `rules/rules.json` decides |
| `assets/routing-snippet.md` | Optional repository-local context-loading and routing policy, plus the `Read(_meta/**)` deny rule that keeps generated indexes out of agent context |
| `assets/code-sync-protocol.md` | Shared rules for `sync-specs`, `apply-change`, and `verify-change`: counterpart resolution, evidence rules including why unit tests are first-class evidence for capture, the five-way drift verdict, status rules, index regeneration, and the report table. An asset rather than an instruction, because an honest `paths` list for these rules would have to cover source trees and would break the plugin's silence in non-adopting repositories |
| `assets/spec-kinds/<kind>.md` | One file per chapter kind the three converters cover — `aggregate`, `domain-service`, `feature`, `building-block`, `design-component`: the chapters and file it covers, the folder rule, the spec-to-code mapping with an evidence column and a requirements column, and what each direction does differently there. Long by kind: a mapping stated by half is wrong |

### Hook configuration

- `hooks.json` adds a session-start guardrail: devbook folders are task-scoped
  context rather than baseline context, `meta` blocks are mandatory on every
  chapter, and `_meta/` is never hand-edited.

### Migrations

`migrations/` holds one folder per breaking change, `<contractVersion>-<slug>/`:

```text
migrations/
└── <contractVersion>-<slug>/
    ├── MIGRATION.md   what, why, what breaks, appliesTo
    └── migrate.mjs    idempotent; --check exits 1 while work remains
```

1.0.0 ships none, so the folder is absent until the first breaking change after it. The
migrations written before 1.0.0 moved repositories between states no repository is in any
more and were dropped at the reset, per
`.devbook/arc42/adr/64-1-0-0-is-the-first-release.md`.
Whether a change owes one — and the three cases that are easy to get wrong — is decided once,
in `AGENTS.md` under *When a change ships a migration*.

Rules that keep a ledger trustworthy:

- The id is immutable once released. Never rewrite a shipped migration — add a
  new one.
- A migration is idempotent by rule: the second run changes nothing.
- `--check` is mandatory. CI calls it, and so does `devbook-check`; it is what
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

One number, currently **9**, covering the metadata schema a repository authors
and the derived artifacts a consumer reads — `schemaVersion` in `graph.json` and
`index.json` is the same number under the name those files stamp themselves
with. It moves only when something repo-visible changes shape, so most plugin
releases leave it alone: plugin semver moves for prose and new skills,
`contractVersion` moves for the contract. It lives in `CONTRACT_VERSION` in
`tools/devbook-meta/graph.mjs`.

1.0.0 ships at 9. The number counts schema shapes rather than releases and was not
restarted with the version: a derived artifact stamped 9 before the reset still follows
the contract a 1.0.0 generator writes, and the first breaking change after 1.0.0 ships as
`010-<slug>`.

## Upgrade notes

Behaviour changes a consumer would notice, release by release, are in
[UPGRADING.md](UPGRADING.md); 1.0.0 is its first entry.

## Folder structure

After running `devbook:install`, a repository that adopted everything has:

```
.arc42/
├── _meta/{graph.json,index.json,annotations.json}
└── <chapter>.md
.domain/
├── _meta/{graph.json,index.json,annotations.json}
└── <bounded-context>/<chapter>.md
.tech/
├── _meta/{graph.json,index.json,annotations.json}
├── technology-graph.md
└── <layer>.md
.design/
├── _meta/{graph.json,index.json,annotations.json}
└── <guideline>.md
.ai/
├── _meta/{graph.json,index.json,annotations.json}
├── adoption-map.md
├── <nn>-<stage>.md
└── concepts.md
_meta/{graph.json,index.json,annotations.json}          # repository-wide rollup
AGENTS.md                            # devbook's section between markers; the rest is the repository's
build/
└── Update-DevbookIndex.ps1          # on-demand index refresh
.github/
├── tools/devbook-meta/              # the generator
├── tools/devbook-tech/              # deterministic package inventory scripts
├── workflows/devbook-meta.yml       # the CI check
└── workflows/devbook-meta-nightly.yml   # the scheduled index refresh
```

## Enforcement

Five layers, weakest to strongest:

1. **Instructions** govern the paths above in every repository that has run
   `devbook:install`, which installs each one where both hosts already look. Before that,
   they are reached by path only.
2. **The session-start hook** stops agents treating devbook folders as baseline
   context or hand-editing derived files, and is what carries the folder rules in a
   repository that has not installed them.
3. **`meta` block rules** make every chapter's relationships explicit and
   checkable.
4. **`build.mjs --check`** fails on unresolved references and schema violations.
5. **The CI workflow** fails the pull request on broken references or a `meta`
   block that violates the schema. Drifted `_meta/` indexes are reported as a
   warning, not a failure — making every devbook pull request carry a
   regenerated index is what turns those files into merge conflicts. Refresh is
   deliberate instead: `build/Update-DevbookIndex.ps1` on demand, the nightly
   workflow on a schedule. A consumer that reads an index at runtime owes the
   other half of that contract — re-read any source newer than the index.

## License

MIT
