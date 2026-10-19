# Configuration

```meta
date: 2026-10-06
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#stack-config", ".devbook/arc42/08-crosscutting-concepts.md#stamp", ".devbook/arc42/08-crosscutting-concepts.md#phase", ".devbook/arc42/building-blocks/devbook-config.md#engine-configuration", ".devbook/arc42/adr/flow-engine.md", ".devbook/arc42/adr/install.md", ".devbook/arc42/adr/releases.md"]
c4: ["marketplace.delivery.stack-config", "marketplace.devbook-config.engine-configuration"]
c4-touches: ["repository"]
```

A repository's wiring is one committed file, `.devbook/config.json`: the engine's four keys —
`bindings`, `phases`, `policy`, `gates` — and the optional `areas`, beside every component's
`components.<name>` entry and a committed `id`. Unknown keys are rejected by name. `phases`
holds one complete map per flow, and model and effort are legal in it as team defaults. A
`config.local.json` outside every clone overlays the engine keys at two layers — the user's
devbook config directory, and `repos/<id>/` under it — wins field by field, and may add a gate
but never remove one. How the application starts is not configuration: it is the repository's
own `run` recipe.

## Why

```meta
```

**One file.** The two halves are read by the same people at the same moment: whoever decides
which folders devbook adopts is deciding, in the same sitting, which tracker the flows post to.
Two files would give the repository two places to disagree with itself. Each component writes
only its own entry, and `policy` keys are closed enums with documented defaults, so an absent
key means the engine's choice and a hand edit is safe.

**One complete map per flow.** `phases.<flow>.<phase>[:<qualifier>]` holds `agent`, `skill`,
`model`, `effort`, `mcp`, `before`, `after`, and a few options a phase takes for itself —
`phase-verify.app`, the provider that starts the application, and `phase-report-back.targets`.
The first level is the flow's skill name, the second the phase's (`phase-implement`), and the
qualifier is the folder in `flow-spec` or an area on `phase-implement`; there is no kind
qualifier, because what a kind needs is `phase-implement`'s call. Each field resolves on its
own, most specific key first, then the session, so an absent field inherits the session's
model and effort, the phase runs as the engine contract's *Runs by default* column says —
inline, fork, or delegated — and `{}` is a complete entry. The committed file lists
exactly the phases its flow has: a missing phase, a phase the flow lacks, or a map under an
unknown flow is rejected by name. Nothing crosses flows, so each map reads as that flow's whole
wiring with no second place to look. The ready check and Personal Validation take no entry, and
a `phase-personal-validation` key is refused in any map, as `policy.gate.personalValidation`
is. The config templates ship both maps filled in, carrying the cost profile the old model
categories gave.

**A model on a fork phase delegates it, and the templates leave the fork phases empty.** Any of
`agent`, `model`, or `effort` makes a phase delegated, because a resolved model takes effect
only as the `model` of an `Agent` call and a fork has no such call: it runs on its skill's own
frontmatter. `phase-scope`, `phase-implement`, and `phase-review` fork by default, and their
skills carry the model and effort the cost profile wants, so both templates ship them as `{}`
and a test keeps them so. Copying a template as shipped then keeps every phase where the engine
contract puts it, and a model written on a fork phase by hand is a deliberate choice to delegate.

**Three mechanisms fold into it.** `extensions` became each phase's `skill`, `agent`, and
`before` and `after` chores; `bindings["delivery.roles"]` became the `agent` of the phases a
role ran; `bindings["delivery.mcp"]` became each phase's `mcp`; the categories in the personal
`model-selection.md` became `model` entries in the user overlay. One question — who runs this
phase, how — had three answers in three places. The migration does the rewrite, and resolves a
role bound to a bare plugin name to that plugin's single agent, reporting one with more than
one agent rather than guessing.

**Model and effort are team defaults.** A model was personal only, so a committed value could
not change every collaborator's cost. A committed value now sets the team's default and the
overlay always wins, so nobody's own choice is taken away, and a repository can record that its
review runs on a stronger model than its Build & Test without every contributor writing it down.

**No aliases for the old keys.** `extensions`, `bindings["delivery.roles"]`, and
`bindings["delivery.mcp"]` are rejected by name, with a message naming `delivery:update`.
[Releases](releases.md) ships one migration per contract change, and an alias would leave two
ways to say the same thing for a whole major.

**Gates attach to phase ids.** `{ "at": "scope", "when": "after" }` names the phase whose
output the gate presents. An overlay still only adds a gate.

**`areas` is a hint.** Path globs per area, first match wins, for a repository whose paths do
not tell `phase-implement` which code is frontend. Without it the skill decides from the seams
and the paths, and a `phase-implement:<area>` entry overrides the bare one field by field.

**Doctor resolves what the checker cannot.** The checker validates shape. `devbook-config:doctor`
resolves a phase's `agent` against the installed agents and the repository's own agent folder,
and its `skill` against the installed skills. An agent id in a `skill` field, and an `agent`
field naming a plugin with more than one agent or none, are warnings that name the fix: an agent
id in a provider slot is what left `extensions.implement: csharp-coding:coding` resolving to
nothing. It also flags a map left under a retired flow and a leftover `model-selection.md`.

**Under `.devbook/`.** It was `.github/ai-agent-stack.json`, and `.github/` is one host's
folder — a file both hosts read belongs in neither's. `.devbook/` already holds the
repository's own account of how it works, of which the config is the machine-readable half.
Reading the path is not a dependency on the `devbook` plugin: `delivery` reads it whether or
not a single folder was adopted. There is no fallback path, deliberately; the guide's report
names the old file while it exists.

**The overlay may only tighten.** A file no reviewer sees may not weaken what a reviewer sees:
`gates` append, `policy.pr.required`, `policy.qa.ceiling`, `policy.gate.personalValidation`,
`policy.openspec.scenarios` and `components` are refused, and the check validates the overlay
alone and the merged result. A model or an effort is a cost choice, not a guard, so the overlay
overrides it. Trusting the overlay because its author could edit the committed file fails on
visibility, not capability — the committed edit shows in review and the overlay never does.

**`ext` is the overlay's `components`.** A plugin that must remember something about one
machine — the environment and model a routine runs with — had no legal key: the engine
rejects every top-level name it does not own, and an overlay may not carry a stamp. `ext.<plugin>.<key>`
is the extension namespace the chapter `meta` block already reserves, applied to the config:
accepted in an overlay only, refused in the committed file, shape-checked as far as being an
object of objects and otherwise opaque to the engine. The owning plugin reads it and asks only
for what is absent, and may write its own namespace there and nothing else. `devbook-config:local`
writes an overlay whole; `devbook-config:init` never does, because an overlay is true of the person running
it and of nobody they set a repository up for.

**Two layers, keyed by a committed id, and none in the clone.** A gitignored file is in no
commit, so a fresh worktree ran at the team's defaults without saying so. A file outside the
clone keyed on the checkout path splits worktrees exactly as the gitignored one does; a
committed `id` survives a move, a re-clone, and a worktree alike, which is how OpenSpec's stores
key a machine to a repository. The location is `$XDG_CONFIG_HOME/devbook` rather than
`~/.claude/`, because the reader is `check.mjs` and Copilot runs it as readily as Claude. `id`
configures nothing and is never renamed — a renamed id orphans every machine's `repos/<old>/`.
The gitignored checkout layer that started the overlay was retired once both user layers
existed: everything personal has a home outside the repository, so the repository has nothing
to ignore, and devbook's `.gitignore` block went with it.

**Runtime facts live in the `run` recipe, not a `runtime` key.** The flow context file had
eight sections; three were answered by config and `.mcp.json`, one spelled `null` in Markdown,
and the rest were facts the start procedure — `run` since 1.12.0 — consumed in its next line.
Configuration chooses among behaviour the engine implements, and how one product's application
comes up is prose the repository owns. Nothing to start is `phase-verify.app: null`.

**A component entry may be hand-written.** The dashboard computes a session title from
`components.delivery-surface-dashboard.sessionNaming.labels`; it materializes nothing and ships
no install skill, so an install skill whose only job is to copy one object would be ceremony.
The owner and the boundary are the same — nobody writes another component's entry. An overlay
cannot change the words, because a stamp is repo-scope and one committed vocabulary is what
makes two developers' session lists readable to each other.

## Rejected

```meta
```

- A second file for the engine keys, and a second supported path for the config.
- Shared phase entries inherited across flows, and a partial committed map: either puts a
  flow's wiring in two places.
- A kind qualifier on a phase (`phase-implement:defect`): what a kind needs is the skill's call.
- The old keys kept as deprecated aliases.
- Model choice kept personal only: the team had no way to record the cost profile it agreed.
- Keeping the fork when only `model` is set on a fork phase: a fork cannot take a model, so the
  setting would be silently ignored, which is worse than the delegation it asks for.
- Resolving the overlay from the main worktree via `git rev-parse --git-common-dir`: still
  inside a clone, so `git clean -x` and a re-clone take it.
- A `runtime` key for the application's facts, and a per-user file for session-naming words.
- `.agents/` as the config's folder: it holds authored rules that get wrapped, and a file nothing
  wraps would be the odd one in it.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-10-06 | The config templates leave `phase-scope`, `phase-implement`, and `phase-review` empty: a model set there delegated the three fork phases, so copying a template as shipped changed how they ran. A model on a fork phase still delegates it. An unconfigured phase runs as the engine contract's *Runs by default* says, not inline. |
| 2026-10-06 | `policy.validate.retryBudget` retired: nothing read it once the review and ready budgets bounded the only loops. `policy.phases.verification` and `phases.workItemUpdate` become `phases.specCheck` and `phases.reportBack`, after the phase each switches, and a gate's `unattended: skip-point` becomes `skip-phase`. Each old spelling is refused by name and rewritten by delivery's `001-phase-maps`. A `phases` map under a flow the engine does not declare is accepted only when the repository ships that `flow-*` skill, so a misspelt flow is refused rather than read as one nobody runs; `check.mjs` looks in `.claude/skills/`, `.agents/skills/`, and `.github/skills/` beside `.devbook/`. |
| 2026-10-05 | The engine keys become `bindings`, `phases`, `policy`, `gates`, and the optional `areas`. `phases` holds one complete map per flow, keyed by skill name; `extensions`, `bindings["delivery.roles"]`, `bindings["delivery.mcp"]`, and the personal `model-selection.md` fold into it, with no aliases. Model and effort are legal in the committed file as team defaults the overlay overrides, replacing the rule that a model is personal only. Gates attach to phase ids. `policy.review.retryBudget`, `policy.ready.retryBudget`, and `policy.phases.review` join the policy enums. Per [Flow Engine](flow-engine.md). |
| 2026-09-29 | `bindings["openspec.grill"]` names the change lane's grill skill, or `null`. The engine carries it and never reads it; `devbook-config:init` writes it with the lane's `spec` and tracker bindings, and `devbook-config:local` may bind one per machine in an overlay. |
| 2026-09-29 | `policy["openspec.scenarios"]`: `advisory` by default, `linked` refusing a change's acceptance while a scenario names no test. Locked against overlays, beside `pr.required` and `qa.ceiling`: what acceptance requires is the repository's. A chore's `run` may carry `--flag` arguments; a service's provider may not. |
| 2026-09-27 | `devbook-config:doctor` resolves every provider id in the effective configuration against the installed skills and the repository's own skill folder: an id migration 015 retired is hard drift naming its successor, any other unresolved id a warning, and an unbound point nothing. The checker still validates shape only. |
| 2026-09-21 | `check.mjs --print` emits the merged configuration; a flow reads that document and never a layer by hand. A session learns of the overlays from delivery's session-start hook on both hosts; the rendered `AGENTS.md` section keeps the contributor rule and the directory, and names no plugin's file. |
| 2026-09-21 | The checkout layer retired: an overlay lives in the user's devbook config directory and never in a clone. `ext.<plugin>.<key>` accepted in an overlay and refused in the committed file; `devbook-config:local` owns writing the overlays. |
| 2026-09-17 | Session-naming labels configured in the dashboard's hand-edited component entry; `null` means no prefix. |
| 2026-09-15 | Overlay gains two layers under the devbook config directory, keyed by a committed `id`. |
| 2026-09-15 | The flow context file and the `repo-flow-context` slot retired; the `start` skill holds the runtime facts, and nothing to start is `app.start: null`. |
| 2026-09-15 | The flow context file moved from `.claude/` to `.devbook/` — superseded the same day by its retirement. |
| 2026-09-07 | `config.local.json` overlay: gates append, three policy keys and `components` refused. |
| 2026-09-07 | The file moves from `.github/ai-agent-stack.json` to `.devbook/config.json`, no fallback. |
| 2026-09-03 | One committed file holds the engine's four keys and every component's stamp. |
