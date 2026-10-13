# devbook-openspec

```meta
related: [".devbook/arc42/building-blocks/README.md", ".devbook/arc42/building-blocks/devbook.md#change", ".devbook/arc42/building-blocks/devbook.md#dependencies", ".devbook/arc42/tdr/9-openspecs-model-does-not-cover-a-devbook-change.md", ".devbook/arc42/adr/plugin-boundaries.md", ".devbook/arc42/08-crosscutting-concepts.md#layer"]
```

The change lane: the plugin that installs and configures the OpenSpec CLI so a change to a
repository is proposed, agreed, built step by step, and archived as a set of deltas against its
devbook chapters.

Inside the block: the `devbook` schema and its templates, the seeded `config.yaml`, the rule
for what an OpenSpec skill does inside a change, the providers an engine binds (`spec`,
`tracker`), the report that joins steps, verdicts, and gates (`status`), and the sequence that
lands a change (`archive`).

Outside it: the shape of a change and its delta, the merge, and both gate records, which are
[devbook](devbook.md#change)'s — `devbook-changes.md` and `delta.mjs`; the approve and accept
decisions, which are [devbook-collaboration](devbook-collaboration.md)'s; the flows that carry
each step, which are the engine's; and OpenSpec's own skills and CLI, which are installed and
configured here, never copied.

## Interfaces

```meta
```

| Interface | Kind | Reached by |
| --- | --- | --- |
| `init` | skill | A person, or `devbook-config:init` during a fan-out |
| `update` | skill | A person, or `devbook-config:update` during a fan-out |
| `onboard` | skill | A person making a first change |
| `spec` | skill, provider | The engine's Scope phase, as the `skill` of `phases.flow-code.phase-scope` |
| `tracker` | skill, provider | `bindings["delivery.tracker"]`, as `{ "provider": "devbook-openspec:tracker" }` |
| `status` | skill | A person, `archive` as its gate check, and a chore after the engine's `phase-scope` as `devbook-openspec:status --replan` |
| `archive` | skill | A person, once the change is accepted |
| `devbook-openspec-change` | rule | Both hosts, when a file under `openspec/changes/` is opened |

## Structure

```meta
```

### Schema

```meta
```

A project schema named `devbook` at `openspec/schemas/devbook/`, whose artifacts run
`proposal` → `devbook-delta` → `solution` → `tasks`, with `apply` tracking `tasks.md`.
`solution` is OpenSpec's `design` renamed, because `design` is a devbook folder here. Managed:
`init` writes it and `update` replaces it while it still hashes to what landed. Every artifact
carries a `description`, and every `instruction` is a block scalar, because a plain YAML scalar
cannot hold the `: ` in `` `owner: me` ``; `openspec schema validate devbook` passes on 1.13.2.
The `devbook-delta` instruction also covers a demo: the standalone prototype copied whole to
the path where it lands, one variant, never edited in the change. The proposal lists the demo
under *Chapters touched* and records its verdict under *Why*, `solution.md` names its screens
in a file-level `demo` block, and a step names it on `delivers:`, per
[the demos decision](../adr/demos.md). `spec` hands a run a demo delta by path, never inlined.

The instruction covers a scenario page too: a delta under `devbook-delta/domain/<context>/`,
a new page `delta: added` with its parts as `ADDED` entries, a part replaced whole and never
step by step, and a requirement it proves holding only `Proved by: <page>.md#<part>` in its
`#### Scenario:`, so behaviour is written once, in the page. `delta.mjs --check` resolves those
pointers with every delta of the change merged, per [devbook](devbook.md#change), so one may
name a page the same change adds. A step's `delivers:` may name the page, or one part as
`<path>#<part>`.

A demo does not match the `devbook-delta/**/*.md` glob, so a change whose only delta is a demo
still writes the placeholder, and `archive` reports a demo as replaced rather than merged.

### Config

```meta
```

`openspec/config.yaml` with `schema: devbook`, the context every OpenSpec skill is handed, the
per-artifact rules, and `operations.apply` and `operations.archive` guidance that routes a step
through a flow and a change through `archive`. Seeded once by `init` and the repository's after that —
OpenSpec reads only one such file. A step is never a prototype: a prototype is a standalone
file, per [the demos decision](../adr/demos.md), and migration `001-no-step-0-prototype` takes
the Step 0 rule line an earlier `init` seeded out of an installed config.

### The change rule

```meta
```

`devbook-openspec-change.md`, installed as a trio on `openspec/changes/**`: four artifacts and
no `specs/` or `design`, no gate field written by an OpenSpec skill, `delta.mjs --check` after
every delta edit, and the lines a step records itself with — `delivers:` and `owner: me`,
never a branch or a pull request. It is what OpenSpec's defaults would otherwise get wrong; the shape itself
stays `devbook-changes.md`.

### Step state

```meta
```

Nothing in a change or the stamp says which branch or pull request carries it: that is
decided per case by whoever starts the run, and a run ends in its own pull request — the
proposal alone, the whole change, or one step of a plan. So `tracker` reads state off the
files and never off a branch or a pull request: a step is `done` once every task is ticked in
`tasks.md` as the current branch holds it, `in progress` when some are, `open` when none are;
the close is `done` once the change is archived. Nothing is ever `in review`, which is what
lets a run accept and archive before its pull request opens. `update_item` only ticks. Its
items are the proposal, each step, and the close, and `read_item` reports each one's `change`
and `part`. For a step it
also lists the scenario pages `delivers:` names, each with its run as `verify-change` reports
it — `current`, `stale`, or `missing` — and `status` gives each a row with `scenario-run` as
the action when the run is not current, which stands before acceptance.

### Landing a change

```meta
```

`archive` runs `status` as the gate check, then `delta.mjs --apply <name> --no-move`, then
`openspec archive <name> --yes --skip-specs`. devbook's merge refuses on the same gates again;
`--no-move` leaves the folder where OpenSpec's archive expects it, and OpenSpec's move lands it
at the same `archive/<date>-<name>/` devbook's own move would have. Run end to end on a trial
change against 1.13.2: the gate refused `proposed`, the merge stamped `change`, and the archive
exited 0 with only its `## What Changes` warning.

### The stamp

```meta
```

`components.openspec`: `pluginVersion`, `cli` (the range `init` checked, `>=1.13.2 <2.0.0` by
default), `tools` (the hosts `openspec init` set up), and `materialized`. It records no git
workflow: migration `002-no-git-workflow` removed the `workflow` field. Whether
OpenSpec may send usage statistics is one machine's answer and lives in the stack-config
overlay as `ext["devbook-openspec"].telemetry`.

## Constraints

```meta
related: [".devbook/arc42/tdr/9-openspecs-model-does-not-cover-a-devbook-change.md"]
```

Established against OpenSpec CLI **1.13.2** (`npm install -g @fission-ai/openspec@latest`) on
a throwaway branch since deleted, with the schema and config above and one change run through
`new change`, `status`, `validate`, and `archive`. The CLI's own source agrees with every
answer: `core/root-selection.js` builds each root as `<root>/openspec/changes`,
`<root>/openspec/specs`, and `<root>/openspec/changes/archive`, and the schema resolver as
`<root>/openspec/schemas`.

### The root is a folder named openspec

```meta
```

**Question:** can the root be `.devbook/`, with `openspec init` run there? **No.** A root is
a directory that *contains* a folder literally named `openspec/`; it cannot be `.devbook/`
itself, and a dotted `.openspec/` is not recognised.

- `openspec init .devbook --tools none` wrote `.devbook/openspec/` with `changes/archive/`,
  `specs/`, and `config.yaml`.
- With that folder renamed to `.devbook/.openspec/`, `openspec list` answered
  `Error: No OpenSpec root found from the current directory.`, and `openspec new change
  probe` silently created a fresh `openspec/` beside it: `Note: no OpenSpec root was found
  here, so one was created at openspec/.`
- The root is found by walking up from the working directory. From anywhere under `.devbook/`
  it resolved; from the repository root the same `openspec list` found nothing.
- With the root at `.devbook/`, `openspec status --json` reports `allowedEditRoots` as
  `.devbook/` alone — the action context OpenSpec hands an apply agent scopes implementation
  edits to the devbook folder, not to the code.

**Taken:** `openspec/` at the repository root, where `init` runs `openspec init .`: the one
placement every command resolves from anywhere in the tree and whose edit root is the
repository.

### Folder names are fixed

```meta
```

**Question:** can the change and schema folders be `.changes/` and `.schemas/`, and can
`specs/` be absent? **No, no, and only on disk.** `changes/`, `schemas/`, and `specs/` are
fixed names under `openspec/`.

- With `openspec/changes/` renamed to `.changes/`, `openspec list` said `No active changes
  found.`, and `openspec new change probe` created `openspec/changes/probe/` beside the
  dotted folder.
- With the schema under `openspec/.schemas/devbook/`, `openspec schema which devbook` said
  `Error: Schema 'devbook' not found`; under `openspec/schemas/devbook/` it said `Source:
  project`.
- With `specs/` deleted, `openspec list --specs` said `No specs found.`, `openspec validate
  --all` said `No items found to validate.`, and `openspec doctor` said `OpenSpec root: ok` —
  but `init` scaffolds `specs/` with a `.gitkeep` in it, which git does track, and the next
  `openspec archive` recreated the folder, empty.

**Taken:** OpenSpec's plain names inside its own folder. `init` deletes the scaffolded
`specs/` and its `.gitkeep`, and `update` and `archive` delete it again when it comes back
empty.

### An empty glob artifact is incomplete

```meta
```

**Question:** is `devbook-delta/**/*.md`, matching no file, complete in `openspec status`?
**No.** With `proposal.md`, `solution.md`, and `tasks.md` written and no delta,
`openspec status --change spike-probe` showed `Progress: 3/4 artifacts complete` and
`[ ] devbook-delta`; the JSON gave the artifact `"status": "ready"`, `"existingOutputPaths":
[]`, and the change `"isComplete": false`. One delta file made it `4/4`.

`openspec new change` wrote `skip_specs: true` into the change's `.openspec.yaml` on its own,
because the schema has no `specs` artifact; that is what lets `openspec validate` pass a
devbook change at all (`skip_specs is set in .openspec.yaml ... zero deltas accepted`).

**Taken:** a placeholder delta for a change with no prose delta — the opening block alone, per
`devbook-changes.md` — and the schema's `devbook-delta` instruction says so.

### Archive moves, and merges nothing

```meta
```

**Question:** does `openspec archive` move a change whose deltas it does not recognise, or
refuse? **It moves it.** `openspec archive spike-probe --yes` answered `Change 'spike-probe'
archived as '2026-09-27-spike-probe'.` and exited 0. `devbook-delta/` was carried along
untouched and no chapter changed. Two warnings, neither blocking: the proposal lacks
`## What Changes` — a check written for the `spec-driven` proposal, applied whatever the
schema — and one task was open, `Continuing due to --yes flag.`

With `skip_specs: false` on a second change, `openspec validate` refused (`Change must have at
least one delta. No deltas found.`, exit 1), and `openspec archive --yes` moved it anyway.

**Taken:** the CLI does the move and the bridge does the merge first — *Landing a change*
above.

## Dependencies

```meta
related: [".devbook/arc42/building-blocks/devbook.md#dependencies", ".devbook/arc42/08-crosscutting-concepts.md#layer"]
```

An L1 extension over devbook, declaring that one dependency and naming the engine only as the
provider strings a repository binds.

### Outbound

```meta
```

| Depends on | Pattern | Mechanism | Contract | Why |
| --- | --- | --- | --- | --- |
| [devbook](devbook.md#dependencies) | Customer-Supplier, declared `devbook >=1.13.0 <2.0.0` | The change folder and its rule, `delta.mjs --check` and `--apply --no-move`, `chapter-hash.mjs`, `verify-change`, and the reconcile protocol's stamp | devbook's chapter schema at contract 24 and its reconcile protocol | A delta is a devbook chapter by another path, and only devbook merges one. `init` refuses below contract 24. |
| [devbook-collaboration](devbook-collaboration.md) | Separate Ways | `chapter-approve` and `chapter-accept` named as the next move | The skill names alone | The two gates are decisions, and deciding is that plugin's; `status` names them and never writes a rung. |
| OpenSpec CLI | Conformist | `openspec init`, `update`, `new change`, `status`, `validate`, `schema validate`, `archive` | The CLI, its `schema.yaml` and `config.yaml` formats, and its fixed `openspec/` layout | The workflow is OpenSpec's; the bridge only configures it. |
| delivery | Separate Ways | Provider strings in `.devbook/config.json`, skipped when absent | The engine's `spec` point and its `plugin:skill` tracker contract | A step runs through a flow when an engine is installed and through `/opsx:apply` when not. |
