# Upgrading devbook

Version-by-version upgrade notes, newest first. From `contractVersion` 6 onward a
breaking change ships as a scripted migration under `migrations/` instead; these notes
cover the releases that predate that ledger, and the behaviour changes it does not
script.

## 3.4.0: the annotation sweep has an entry point

**No migration; nothing you have breaks.** `--check` is unchanged and no schema field
moved. What is new is the step the lifecycle already required and nothing implemented.

- `annotations.mjs` gains `sweep --chapter <path#slug> [--status resolved]`, the bulk half
  of `resolve --delete`. It takes every fence at one status and no other, bottom-up, and is
  chapter-scoped like every other operation there — a resolved note under a subheading is
  the subchapter's to sweep, not its parent's.
- `devbook:annotation-sweep` is the skill that runs it: list what would go, show it, sweep,
  and hand the commit back. Run it before a branch merges. Until now `resolved` notes
  accumulated in chapters and in every diff, because the only deletion was one fence by
  ordinal and nobody reached for it.

## 3.3.0: the validator checks where a field sits, not only what it says

**No migration; `--check` may newly fail.** Four rules the folder rules already stated
now reach `validateDocument`, so a corpus that passed the gate can start reporting.
`contractVersion` is unchanged at **9** — nothing about the schema moved, only what is
enforced.

- A folder-specific field on the **file-level block** is an error. `depends-on`,
  `aliases`, `feature-flag`, `version`, and `alternatives` describe a chapter; a document
  states its own relationships through `related`. Move the field to the chapter it is
  about, or delete it.
- `.domain`'s `depends-on` and `feature-flag` on a chapter that is not a `feature` or
  `sub-feature` is an error. A `domain.md` chapter describes standing structure and
  relates through `model.md`, `dependencies.md`, or `related`. `aliases` is **not**
  restricted this way — a term that is already an aggregate, service, event, or field
  carries its aliases on that chapter, and `devbook-domain.md` now says so outright.
- An `approved` chapter carrying an **open `kind: question` annotation** is an error: an
  open question means the chapter is not agreed, so an approval standing over one is a
  false record. Resolve and sweep the note, or take the approval off. An open question on
  any other rung is still silent — that is the state the fence exists for.
- `.ai` `stage` inside a stage file is a warning. The file already says the stage; delete
  the field. It belongs in `concepts.md` and on anything else that spans the flow.

Separately, heading anchors now keep letters and digits **outside ASCII**. `slugify`
matched `\w`, so `## Café Ordering` yielded `caf-ordering` while GitHub renders
`café-ordering`, and a `related` link written against the rendered anchor resolved to
nothing. A repository with non-ASCII headings gains working anchors and its `_meta/`
indexes change on the next generator run; one with ASCII headings sees no difference.

## 3.2.0: a bounded context says who works with it

**Additive; no migration.** `.domain/<context>/` gains `stakeholders.md`, carrying
`type: actor` for a role that operates the context and `type: party` for someone the
context acts toward without operating it. It reads directly after the context's root
document, and `stakeholders` joins the file-level `type` set.

Nothing is removed, so a corpus written against the current contract stays valid and
`contractVersion` is unchanged at **9**. An existing context gains the file when someone
writes it; its absence is not a missing file, and a context nobody operates directly never
takes one.

Two rules move with it. Another bounded context, module, or technical system is a
dependency and stays in `dependencies.md` — a stakeholder chapter never restates an
integration. And `to-spec-feature` now routes a role check or authorization attribute to
the actor chapter's fourth beat rather than dropping it, while `from-spec-feature` carries
the actor and its right into the change brief.

## 3.1.1: the CI path filter is rendered per layout

**A fix; no migration.** `assets/workflows/devbook-meta.yml` filtered `push` and
`pull_request` on the five root dot-folders alone, so a repository on the nested layout
never triggered the check on a chapter edit and had no gate at all — nothing said so,
because a filter that matches nothing looks exactly like a quiet branch. Both filters now
carry `<prefix>`, and `devbook:install` renders it: `.` in the flat layout, `.devbook/` in
the nested one, per `assets/reconcile-protocol.md`. That keeps a flat repository's filter
as tight as it was.

Unlike the instruction globs of 1.3.1, this one does **not** travel with the plugin — the
workflow is materialized and repository-owned, so a reconcile reports it customized and
leaves it alone. A nested repository fixes its own copy: prefix the five folder rows with
`.devbook/` in both filters. The nightly workflow is schedule-driven and unaffected.

## 3.0.0: every install skill is called `install`

**Breaking; scripted migration `009-install-skill-ids`.** `devbook-install` is now
`devbook:install`, and its two siblings elsewhere in the marketplace lost the same
redundant prefix. A repository names these ids under `extensions`, so the rename reaches
committed files.

`contractVersion` moves to **9**. No stamp key changes — `components.devbook` was never
named after the skill that writes it — and no chapter, rule, or materialized asset moves
for the rename.

```bash
node migrate.mjs --check
```

It rewrites the ids under `extensions` in `.devbook/config.json` and in the gitignored
`.devbook/config.local.json` when that exists, touching only `provider` and `run`. A gate
prompt quoting the old name in prose is left alone.

The same release adds the `.gitignore` block devbook now renders beside its `AGENTS.md`
section, covering `AGENTS.local.md` and `.devbook/config.local.json`. Both are
machine-scope and neither is ever created by a reconcile.

## 2.0.0: the stack config leaves `.github/`

**Breaking; scripted migration `008-config-to-devbook`.** The file devbook writes its stamp
into is now `.devbook/config.json`. It was `.github/ai-agent-stack.json`, and `.github/` is one
host's folder for a file both hosts read.

Only the location moved. `components.devbook` keeps its shape — `pluginVersion`,
`contractVersion`, `adopted`, `materialized`, `migrations` — and no chapter, rule, or
materialized asset changes. `contractVersion` moves to **8** because where the stamp is read
from is part of the contract a repository is on.

There is no fallback to the old path, so run the migration before anything else: until it does,
`devbook-check` reports the repository as never reconciled and the delivery engine silently
falls back to every default instead of the wiring the repository declared.

```bash
node migrate.mjs --check
```

It moves the file whole and refuses when both paths exist with different content, which is a
merge only a person can make.

## 1.4.0: the folder rules reach both hosts, and the canvas is `devbook-graph`

### The folder rules

**Renamed assets; no migration.** 1.3.1 fixed the globs and said "nothing to re-sync — the
globs travel with the plugin". They travel, but they arrive nowhere: no plugin manifest
declares an instructions or rules key on either host, and there is no rules component, so a
file sitting in the plugin is auto-applied by neither. Until now these rules reached a session
only when a skill or an agent named one by path.

`instructions/<name>.instructions.md` is therefore now `rules/<name>.md`, named for what it
becomes, and its globs move out of the frontmatter into `rules/rules.json` beside it, keyed by
name and carrying the adopted folder that pulls each rule in. A rule file is body plus `name`
and `description`. **Anything that referenced one by its old path must be updated** — inside
this plugin that is done, but a repository or another plugin that hardcoded
`instructions/devbook-domain.instructions.md` will not resolve it any more.

Reconcile now installs them, in the same shape `ai-agent-stack` uses for its own rules: the
rule verbatim at `.agents/rules/<name>.md`, a `.claude/rules/<name>.md` wrapper carrying its
`paths`, and a `.github/instructions/<name>.instructions.md` wrapper carrying the same list as
`applyTo`. All three are hash-tracked like every other materialized file: customized copies are
reported and left alone, and a folder dropped from `adopted` orphans its trio rather than
deleting it. `assets/rule-wrappers.md` carries the templates.

**`devbook-sync` is now `devbook:install`.** The skill is otherwise unchanged, and `devbook
sync` still works as a trigger phrase; a script or document that invokes the skill by name
needs the new one. `components.devbook` is untouched, so there is nothing to migrate.

Run `devbook:install` once to pick the rules up. Nothing already on disk changes, and a
repository that would rather keep reaching the plugin copies by path can take ownership of any
of the three.

### The canvas extension


**A rename; no migration.** The extension folder, its `copilot-extension.json` name, and one
of the two canvas ids change. `devbook-canvas` named the host mechanism, which put it beside
`delivery-surface-canvas` as if the two were interchangeable implementations of one render
contract — they are not, and devbook's answers no surface contract at all. It is now
`devbook-graph`, after the thing it draws. The chapter viewer, whose id was also
`devbook-canvas`, is now `devbook-chapter`.

| Was | Is |
| --- | --- |
| extension `devbook-canvas` | extension `devbook-graph` |
| canvas `devbook-graph` | canvas `devbook-graph` — unchanged |
| canvas `devbook-canvas` | canvas `devbook-chapter` |

Ask for the **Reference graph** or **Devbook chapter** canvas by those names on the Copilot
CLI. Nothing materialized into a repository changes, so there is nothing to re-sync, and the
`meta` schema and `contractVersion` are untouched.

## 1.3.2: the plugin names no flow

**Prose only; no migration.** The per-folder flows now live in `delivery`, one per folder —
`flow-arc42`, `flow-domain`, `flow-tech`, `flow-design`, `flow-ai` — and the `devbook-flows`
bridge is no longer published. `devbook`'s README, manifests, session-start hook, routing
snippet, and code-sync protocol stop naming any flow: a change routes through "the engine's
own flow for the folder" when a flow engine is installed, and follows the instruction files
directly when none is. A repository that had `devbook-flows` enabled disables it and enables
`delivery` instead; the materialized files are untouched, so nothing to re-sync. The one
materialized text that changes is the routing snippet, which is repository-owned once copied.

## 1.3.1: instruction globs cover the nested layout

**A fix; no migration.** Schema version 7 taught the generator to resolve `.devbook/arc42`,
`.devbook/domain`, `.devbook/tech`, `.devbook/design`, and `.devbook/ai`, but the instruction
files kept globbing the root dot-folders alone. So a repository on the nested layout indexed
correctly and had every folder rule applied to nothing. Each `applyTo` now carries both
spellings, and the cross-folder ones (`devbook-chapter-metadata`, `devbook-annotations`,
`devbook-naming`) carry `.devbook/**`. `devbook-derived-artifacts` is unchanged: `**/_meta/**`
already matched either layout. Nothing to re-sync — the globs travel with the plugin.

## 1.3.0: a section of `AGENTS.md`

**Additive; no migration.** `devbook:install` now writes one marker-fenced section of the
repository's `AGENTS.md`, rendered from the adopted folders per `assets/agents-section.md`
and keyed `AGENTS.md#devbook` in the stamp. A repository synced before 1.3.0 gains it as a
plain `create` on its next reconcile: an absent `AGENTS.md` is created holding only the
section, a present one gets the section appended. Nothing outside the markers is touched,
and `devbook-check` reports the section stale when adoption moves on. Which host reads
that file, or imports it from a file of its own, is the repository's to arrange.

## 0.15.0: `status` optional at rest

**A behaviour change in three folders, and a sweep worth doing.** `status` is no
longer required everywhere. In `.domain`, `.arc42`, and `.design` it is
**optional**, and an absent field means the resting value `active`:

```markdown
## Order

\`\`\`meta
type: aggregate
\`\`\`
```

`status` is written only while a chapter is in transition (`draft`, `proposed`)
or carries a standing warning (`deprecated`). It stays **required** in `.tech`
and `.ai`, and the asymmetry is the point: the field was doing two unrelated
jobs, and only one of them has a resting value.

| Folder | What `status` is | Resting value |
|---|---|---|
| `.domain`, `.arc42`, `.design` | editorial maturity — how settled the writing is | `active`, omitted |
| `.tech`, `.ai` | a *rating* on an adoption ladder | none; an unrated technology is not a `candidate` one, and a radar built from omissions renders blank |

On top of every one of those ladders sits one shared rung, `approved`, with
`approved-by` and `approved-at` beside it. That is the approval gate's decision,
kept in the chapter so it travels with the content and lands in the git history
rather than in flow configuration. It is always written, never rested at, and
comes off in the same change that alters what was approved.

Two rules make the difference safe:

- **The `meta` fence stays even when the block ends up empty.** `.arc42` and
  `.design` define no `type`, so a settled chapter with no
  relations has nothing left inside its fence. The fence is what marks the
  heading as an addressable chapter — one graph node per heading that carries a
  block — so deleting it as noise drops the chapter out of `graph.json` and out
  of every reference pointing at it.
- **The generator resolves an absent status rather than passing null through.**
  Both derived artifacts carry the resolved word plus `"statusDeclared": false`
  on the entries where that happened, so a viewer badges them correctly and a
  consumer that cares can still tell "at rest" from "nobody said". See
  `tools/devbook-meta/README.md`.

Stating the resting value explicitly is reported as a warning, so one state does
not end up with two spellings. To adopt: re-sync `.github/tools/devbook-meta/`,
run `build.mjs`, and delete the `status: active` lines it now flags — keeping the
fence behind them.

## 0.12.0: the `.ai` folder

**Additive, and nothing existing changes.** A sixth devbook folder, `.ai`,
records **how the project develops with AI** — which practice, agent, skill,
hook, model, or guardrail is used at which position in the development flow,
the concepts underneath them, and how far adoption has actually got.

```
.ai/
  adoption-map.md       # root: the flow, the stage table, the adoption diagram
  01-<stage>.md         # one file per stage of the development flow
  02-<stage>.md
  concepts.md           # cross-stage concepts and practices
```

It is organized by **flow, not by tool**. A chapter sits in the stage file for
the position where it is used, and answers one question: at this point in how we
work, what do we use AI for, and is that real yet?

```markdown
## Agent-Driven TDD

\`\`\`meta
status: trial
type: practice
depends-on: [".tech/tooling.md#claude-code"]
\`\`\`

The failing test is written with the agent before any implementation.

- **Used for** — every change with a testable outcome.
- **Adopted by** — one developer, on feature branches, since 2026-07.
- **Evidence** — three merged pull requests; no measured cycle-time claim yet.
- **Limits** — not used for spike branches.
```

Three decisions are worth knowing before adopting it:

- **`.tech` stays the registry.** A tool with a vendor and a version is a
  `.tech` chapter, as it always was; `.ai` never re-registers it and points at
  it with `depends-on` instead. The test is *if it has a vendor and a version,
  it is `.tech`* — so "we use Claude Code, version X" is `.tech`, and "at Specify
  we draft chapters with it, `trial`" is `.ai`. The link is one-way: `.tech`
  chapters never point back.
- **Stage files are numbered, and the stage set is the repository's own.**
  `01-discover.md`, `02-specify.md`, `03-build.md` — the number is what makes the
  folder read in the order the work happens. The generator's numbered-set rule
  already handles that, so `.ai` needed no new ordering machinery: root first,
  stages by number, `concepts.md` after them. No flow is prescribed.
- **The status ladder is `.tech`'s**, deliberately: `candidate`, `trial`,
  `adopted`, `hold`, `retired`. One adoption vocabulary, applied to two
  different subjects — `.tech` rates a technology, `.ai` rates a way of working
  with one. A tool that is `adopted` whose use at a stage is still `trial` is
  the normal case, and the reason the folder exists. A `retired` chapter is
  never deleted: what was tried and dropped is the part nobody can reconstruct
  later.

`type` values are `practice`, `agent`, `skill`, `plugin`, `mcp-server`, `hook`,
`workflow`, `model`, `concept`, and `guardrail` at chapter level, and
`adoption-map`, `stage`, or `concepts` at file level. One folder-specific field
is added, `stage` — a list of stage slugs, on `concepts.md` chapters that span
the flow, omitted inside a stage file where it would only restate the filename.
Like `roadmap` it is a plain-slug attribute and produces no graph edges.

`schemaVersion` stays at 4 — `.ai` produces the same node and edge shapes every
other folder does. To adopt: re-sync `.github/tools/devbook-meta/` from this
plugin, run `devbook:install` (or create the folder by hand), add `.ai/**`
to the CI workflow's `paths` filters, and route edits through the `.ai` write path.

## 0.11.0: invariants as a table

**Additive, and no migration.** Aggregate chapters in `.domain/<context>/domain.md`
now carry an `### Invariants` sub-section instead of describing their rules in
prose:

```markdown
## Order

\`\`\`meta
type: aggregate
tests: [unit:dotnet:Ordering.Domain.Tests.OrderTests]
\`\`\`

An order a customer is assembling, and the consistency boundary for its lines.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| An order has at least one line before it can be confirmed | `Confirm()` | `Ordering.Domain.Tests.OrderTests.CannotConfirmAnEmptyOrder` |
| A confirmed order cannot be cancelled | `Cancel()` | `untested` |
| Line quantities are positive | `AddLine()` | `Ordering.Domain.Tests.OrderTests.RejectsZeroQuantity` |
| Whether a partially refunded order may be re-confirmed | `open` | Nobody owns this yet — asked in the 2026-08 session |
```

The rules were always the most valuable content in `.domain`, and the only
content with no shape. `from-spec-aggregate` already required each invariant written
out in full with one acceptance check per rule, and `to-spec-aggregate` already
mined unit tests for them — both against a paragraph, which is not quotable,
countable, or linkable. Three columns fix that:

- **`Rule`**, one per row, because a row is the unit a brief quotes and a check
  is derived from. Merged rows silently merge acceptance checks.
- **`Enforced at`** is the column prose loses: the constructor, or the named
  transition. It is what tells a build pass where the guard clause belongs, and
  a rule whose enforcement point cannot be named is usually a caller's rule
  rather than an invariant.
- **`Evidence`** is a `tests` selector or the literal `untested`. Coverage
  becomes visible per rule instead of per chapter.

An **`open`** row is the Event Storming hot spot, kept in place. The sync
protocol already said an unsettled rule is recorded as an open question rather
than captured as fact, but never said where it lived; now it does. An `open` row
does not block a chapter reaching `active` — a model can be current and still carry an
unanswered question — but `from-spec-*` reports it as a decision needed rather than
briefing a rule nobody agreed.

Nothing to re-sync: the generator needs no change, no `type` value is added, and
`schemaVersion` stays at 4. `### Invariants` is a structural sub-section like
`### Payload`, so `build.mjs --check` reports the same expected "heading with no
`meta` block" warning for it. To adopt, move an aggregate's rules out of its
prose as you next touch it — or run `to-spec-aggregate`, which now writes the
table directly from the guard clauses and tests it reads.

## 0.10.0: linking test cases

**Additive.** A new optional `tests` field, on chapter and file blocks in every
folder, records the test cases that assert what a chapter claims:

```markdown
## Order

\`\`\`meta
type: aggregate
tests: [unit:dotnet:Ordering.Domain.Tests.OrderTests, e2e:playwright:tests/e2e/checkout.spec.ts#Guest checkout completes]
\`\`\`
```

Each entry is `<level>:<runner>:<selector>`, coarse to fine: a level (`unit`,
`integration`, `e2e`) so a reader can see whether a capability is covered end to
end, a runner so a command can be derived, and that runner's own selector so it
can be handed over verbatim.

This is the one link from a chapter into a code tree that this convention allows,
and the reason is that it is **executable**. A source path in a metadata block
rots on the first refactor and gives no signal when it does — which is why
`code-sync-protocol.md` pairs chapters to code through naming instead. A test
identifier that stops resolving fails a run, out loud, in the same CI that runs
the suite.

`testCommand()` in `tools/devbook-meta/metadata.mjs` turns one entry into an
argv and executes nothing, so a "run this test" affordance in a viewer and the
command this convention documents are the same one:

```js
testCommand("unit:dotnet:Ordering.Domain.Tests.OrderTests");
// → { level, runner, selector,
//     command: ["dotnet", "test", "--filter", "FullyQualifiedName~Ordering.Domain.Tests.OrderTests"] }
```

`dotnet`, `playwright`, `vitest`, `jest`, and `pytest` have command mappings; a
runner outside that set still records what covers the chapter and is reported as
a warning, because nothing can offer to run it. Add one by extending
`TEST_RUNNERS` in `metadata.mjs`.

Nothing existing breaks if you adopt none of it. To adopt: re-sync
`.github/tools/devbook-meta/` from this plugin, add `tests` where a chapter has
tests worth naming, and regenerate — `graph.json` nodes and `index.json` file
entries carry the field, and `schemaVersion` goes to 4. A `to-spec-*` pass now
records the tests it read as `tests` entries, so the fastest way to populate an
adopted repository is to capture the chapters that already have suites.

## Migrating to 0.9.0: the `order` field is removed

**Breaking for every repository that adopted the convention before 0.9.0.** The
file-level `order` field is gone from the metadata schema, and `build.mjs
--check` reports an **error** on every block that still carries one.

A metadata block describes the thing it sits under, and a directory's reading
order is not a property of one document inside it. So reading order moved out of
metadata and into the folder convention: each directory's root document is read
first — `.domain/context-map.md`, a bounded context's `domain.md`,
`.tech/technology-graph.md`, `.design/README.md` — then that folder's prescribed
files in the sequence its instructions file documents, then anything else
filename-sorted. `.arc42` sorts by filename outright, as it always did. Nothing is authored per repository any more, so adding a file needs
no declaration and the whole class of drift between a list and its directory is
gone. The convention is encoded once, in `DIRECTORY_CONVENTION` in
`.github/tools/devbook-meta/outline.mjs`.

To migrate, re-sync `.github/tools/devbook-meta/` from this plugin, then:

1. **Delete every `order` field.** They are all on file-level blocks:
   `.domain/context-map.md`, each `.domain/<context>/domain.md`,
   `.tech/technology-graph.md`, `.design/README.md`. Remove the line; change
   nothing else in the block.
2. **Check the order you get is the order you want.** Run
   `node .github/tools/devbook-meta/build.mjs` and read the resulting
   `index.json`. Where a hand-declared order disagrees with the convention, the
   convention wins — a repository-specific sequence is no longer expressible, by
   design.
3. **Give each directory the root document its folder names.** A directory
   without one is reported as a warning and simply sorts by filename.
4. **Commit the regenerated `_meta/` indexes.** Entry order may move; the
   `schemaVersion` does not change, because the derived shape is identical.

`.arc42` repositories are unaffected: they never declared `order`.

### New in the same release: `number`, `date`, `index`

Three **additive** fields give the generator what it needs to build a good
outline without any document listing its siblings. Nothing existing breaks if you
adopt none of them.

| Field | Level | What it does |
|---|---|---|
| `number` | file | This document's number in its directory — arc42 chapter 9, ADR 7, TDR 2. A numbered filename (`09-…`, `7-…`, `ADR-0007-…`) supplies it on its own, so the field is for when the filename cannot. A numbered directory sorts by number, so 10 follows 7 instead of following 1. |
| `date` | file or chapter | The calendar day the document records — a decision taken, debt logged — as `YYYY-MM-DD`. Not a modification timestamp. |
| `index` | file | `index: root` makes this document its directory's entry point, overriding the convention; `index: exclude` keeps it out of `index.json` while leaving it in `graph.json`. |

Worth doing on adoption: mark `.arc42/adr/README.md` and `.arc42/tdr/README.md`
with `index: root` — neither folder has a convention root, so without it each is
a bare numbered list — and give existing ADRs and TDRs their `date`. Both show up
in `index.json` and on `graph.json` file nodes immediately after a regenerate.

## Migrating to schema version 7

Additive over 6 in both halves, so there is no migration script and nothing that
validated under 6 stops validating.

**The nested layout is recognized.** `.devbook/arc42`, `.devbook/domain`,
`.devbook/tech`, `.devbook/design`, and `.devbook/ai` now resolve exactly as the
root-level dot-folders do — same graph, same edges, same lint, `_meta/` written
beside the chapters as always. Until now the generator recognized the flat
spelling alone, so a nested repository resolved to no folder at all and silently
indexed nothing rather than failing. A repository holding both layouts is
reported as an error and both are still indexed, so nothing becomes invisible
while it is straightened out.

**`bounded-context` joins the `.domain` chapter types.** A `##` section of
`context-map.md` naming one bounded context may now carry
`type: bounded-context`, which makes it addressable as
`.domain/context-map.md#order-management` — the form a building block, a
technology, or an arc42 chapter uses to point at the context it belongs to.
Context maps whose sections carry no blocks are unaffected.

## Migrating to schema version 5

Schema version 5 is **additive** over 4 in shape, with one semantic change worth
knowing about. `status` on a `graph.json` node and on an `index.json` file entry
is now the block's **effective** status: where `.domain`, `.arc42`, or `.design`
omits the field, the artifacts carry the resolved resting value `active` rather
than `null`, plus a new optional `"statusDeclared": false` marking that the file
did not state it. Declared statuses are emitted exactly as before, so the only
diff on an unswept corpus is the bumped `schemaVersion`.

A consumer that read `status` to badge or group needs no change — it gets a real
value where it previously would have got `null`. A consumer that needs to know
whether a person actually chose the value reads `statusDeclared`.

## Migrating to schema version 4

Schema version 4 is **additive** over 3: both derived artifacts gained the
optional `tests` field described under "0.10.0: linking test cases" above, and
nothing else about their shape changed. Re-sync
`.github/tools/devbook-meta/` and regenerate; the diff is the new field where
a document declares one, and the bumped `schemaVersion`.

## Migrating to schema version 3

Schema version 3 is **additive** over 2 and needs no authoring changes. A `file`
entry in `index.json` may now carry two optional fields — `summary`, the
document's lede, and `diagrams`, how many mermaid blocks and images it embeds —
so a viewer can render a devbook folder's list view without opening any
Markdown. `graph.json` is unchanged apart from the version number.

Re-sync `.github/tools/devbook-meta/` from this plugin and regenerate; the
diff is the new fields and the bumped `schemaVersion`. Also install the two
refresh assets that ship with this version — `assets/build/Update-DevbookIndex.ps1`
and `assets/workflows/devbook-meta-nightly.yml` — and re-copy
`assets/workflows/devbook-meta.yml`, whose staleness step now warns instead of
failing. See `devbook-derived-artifacts.md` for the policy and
for the freshness contract a runtime consumer of these indexes has to honour.

## Migrating to schema version 2

Schema version 2 moves the *kind* of a chapter out of its heading and into a
`type` metadata field. A repository written against version 1 keeps parsing,
but `build.mjs --check` reports errors until it is migrated. Re-sync
`.github/tools/devbook-meta/` from this plugin first, then:

1. **Strip kind prefixes from `.domain` headings.** `## Aggregate: Order`
   becomes `## Order`; the same for `Domain Service:`, `Domain Event:`,
   `Feature:`, `Sub-feature:`, and `Term:`. File titles lose theirs too —
   `# Domain: Order Management`, `# Features: Order Management`, and
   `# Naming: Order Management` all become `# Order Management`.
   `## Shared Value Objects` and `## Shared Enums` keep their headings: those
   name a grouping, not a single thing. `.domain/context-map.md` has no context
   name to fall back to, so prefer titling it after the system the map covers
   (`# Order Platform`), with `type: context-map` carrying the kind; a plain
   `# Context Map` is also accepted. If it already has a sensible title, leave
   it — this step is about stripping *kind prefixes*, and that file never had
   one.
2. **Add `type` to every `meta` block.** Values come from the folder's own
   instructions file — `devbook-domain.md` for `.domain`,
   `devbook-tech.md` for `.tech`. File-level blocks take a
   file-level value (`domain`, `features`, `model`, …) matching the filename.
   `.arc42` and `.design` define no value set and take no `type`.
3. **Promote Entity, Value Object, and Enum sub-chapters one level.** Delete
   the `### Entities`, `### Value Objects`, and `### Enums` grouping headings
   and lift their `#### <Name>` children to `### <Name>` directly under the
   aggregate. Each now carries its own `meta` block with `type: entity`,
   `type: value-object`, or `type: enum` — they are no longer covered by the
   parent aggregate's block.
4. **Rewrite every anchor.** Any `related` / `depends-on` entry pointing at a
   prefixed heading now points at the bare name:
   `#aggregate-order` → `#order`, `#feature-checkout` → `#checkout`,
   `#term-basket` → `#basket`. Anchors in prose links need the same treatment.
5. **Rename `.tech`'s `kind` field to `type`.** Easy to miss, because it is a
   separate mechanical edit in a different folder from all the work above, and
   nothing fails if you skip it. Values are unchanged — only the field name
   moves, so this is a find-and-replace of `kind:` to `type:` across
   `.tech/*.md`. `kind` remains supported as a deprecated alias that reports a
   **warning, never an error**, so `.domain` can be migrated and landed on its
   own and `.tech` can follow in a later commit.
6. **Regenerate and check.**

   ```bash
   node .github/tools/devbook-meta/build.mjs
   node .github/tools/devbook-meta/build.mjs --check
   ```

   Run `devbook-check` for anything still reported.
