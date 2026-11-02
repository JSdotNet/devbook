# Plugin Boundaries

```meta
date: 2026-10-05
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#plugin-folder", ".devbook/arc42/05-building-block-view.md#config-plugin", ".devbook/arc42/05-building-block-view.md#schedule-plugin", ".devbook/arc42/building-blocks/README.md", ".devbook/arc42/building-blocks/devbook-skills.md", ".devbook/arc42/08-crosscutting-concepts.md#plugin", ".devbook/arc42/08-crosscutting-concepts.md#layer", ".devbook/arc42/08-crosscutting-concepts.md#role", ".devbook/arc42/08-crosscutting-concepts.md#schedule", ".devbook/arc42/tdr/4-delivery-depends-on-devbook.md", ".devbook/arc42/adr/flow-engine.md", ".devbook/arc42/adr/surfaces.md"]
c4: ["marketplace"]
```

Every plugin is self-contained under `plugins/<name>/` and either works alone or declares
what it needs. There are three ways to couple — a declared dependency on a lower layer, a
bridge plugin depending on both sides, a surface capability resolved from the live tool list —
and a lower layer never names a higher one. What the marketplace ships is the convention
(`devbook`), the engine (`delivery`), one extension each for review, the committed index, the
change lane, and unattended work, an L0 plugin of guidance callers name by skill and of planning a person runs, four surfaces,
and a guide that names every plugin and depends on none. The repository's procedures are part of
the convention: a repository adopts them in `devbook`'s stamp the way it adopts a folder. An
extension owns procedure, never schema or state. The specialists are published
from another marketplace and are bound per repository, never depended on.

## Why

```meta
```

**The unattended lane is a separate plugin, and nothing spawns a session.** A flow owns a run,
a gate, and a user turn, none of which survives being split across sessions; shipping a
session-spawning mechanism inside the engine would put it one skill reference away from every
flow that must not use it. Fan-out lived in its own plugin, `fleet`, for that reason — until
the one use anyone had for it, a backlog swept and worked with nobody watching, turned out to
want one session and hours rather than five sessions and minutes. The issue sweep is a schedule
entry point now, sequential in the session the trigger gave it, and no skill in this
marketplace launches, tracks, or waits on another session. Everything that runs with nobody
watching is one folder, one dependency, one enable, and a schedule is a trigger that names an
entry point and never a procedure — a flow ends at a gate no unattended run can pass.

**An unattended run closes an issue on evidence, and only then.** *Never close* was absolute
until the issue sweep became a schedule entry point, and the sweep's first job is to find
issues the code already resolved. Leaving every one of those as a proposal makes the brief a
list the reader closes by hand each morning, which is the work the schedule exists to remove.
So the preamble names one exception: an issue that `already-fixed`, `obsolete-code-gone`, or
`duplicate` evidence — a commit on the base branch, a file that is gone, a sibling issue —
shows resolved at high confidence, closed with that evidence in the comment. `superseded`,
`not-reproducible`, and `wont-fix-by-design` stay proposals, because each is a judgement about
what the repository wants rather than a fact about what it contains. And every pull request the
sweep opens is a draft, proved or not: personal validation moves to the pull request, so
nothing may present itself as ready for review before a person has looked.

**An unattended run moves the stack forward, and never the scheduler.** Detection alone —
`doctor` inside the daily validate, the plugin check inside the package update — left every
upgrade as an issue someone had to turn into a session. A routine runs with the plugins
installed on the machine, so `devbook-config:update` with the safe answer at each question is a draft pull request a
person reviews rather than a session a person drives. Two steps stay a person's: installing or
upgrading a plugin on the machine, and `delivery-schedule:update`, which writes to the
scheduler — a schedule is created or changed only from a person's own turn, so an unattended
run that re-synced the catalog would be a schedule changing itself.

**A schedule is a local routine, never a cloud session.** A routine runs on the maintainer's
machine, in the repository's main checkout, with the plugins installed there, and does its
work in a fresh worktree of the base branch. The catalog was first written for cloud sessions,
on the unverified assumption that one loads this marketplace from the repository's committed
settings. On 2026-09-28 a cloud run of the Backlog issue sweep started with no plugin
installed and stopped without its skill, while the local routines for another repository had
been running their targets since 2026-09-26. So `delivery-schedule` creates through a local
scheduler only, disables any cloud copy carrying the repository's name, and no longer writes
the marketplace keys into a repository's committed settings. The cost is the machine: a
routine fires only while it is on and the host app runs, and one due while it was closed runs
on the next launch.

**A run's report stays in the run's own session.** The catalog published every report as a
GitHub issue labelled `schedule-report` because a cloud session leaves nothing its owner can
open later. A local routine does: its session stays on the host's Routines page. So a report
is the run's last message, in a `report.md` template the entry point carries beside its
`SKILL.md` on the frame of `resources/report-contract.md` — a verdict line, *Needs you* first,
one table row per item, *Run* last. An issue is opened only where a skill's procedure files a
finding someone must work — a `devbook-drift` row, a security finding. The first issues read
as a wall of links on 2026-09-30, several pull requests packed into each bullet; that is what
the template's one-row-per-item rule exists to prevent. The cost is reach: the report lives on
one machine's scheduler page, and a morning brief no longer extends its window back to the
last one nobody closed.

**A role plugin holds no flow control.** The ported specialists each arrived with a mandatory
approve-handoff sequence, session-spawning tools, and a plan-and-checkpoint loop of their own.
A gate a plugin owns cannot be governed — configuration may add a gate and never remove one,
and a gate in an instruction file is outside that in both directions; two sequencers disagree
silently; and spawning in a role is fan-out through the back door. A specialist used bare is
less guided, which is the honest trade, and the checker refuses those tools on any non-runner
agent.

**The specialists left, and the by-name references with them.** Deleting seven plugins changed
no mechanism, which is the evidence the boundary was already right. `delivery` carried two
hundred `plugin:asset` references into them, and naming is not depending — but this marketplace
naming a plugin published from another is a coupling nothing here can check. Every stage names
the point it fills, and a repository's config is the only place a specialist's name appears, so
`delivery` alone is visibly capability-free at seven roles and seven services.

**Flows belong to `delivery`.** `devbook` enforces what a folder holds; the engine holds the
flow for each folder. The bridge that once held them was not a bridge: both foundations named
it, and it restated devbook's rules. No bridge is needed because rules reach a session through
the host, not a flow — `init` materializes them and any session reads them by path — so
the engine names folders and never the `devbook` plugin. What remains real and undeclared is
[debt 4](../tdr/4-delivery-depends-on-devbook.md).

**The guide is its own plugin.** A skill that explains the stack must name every part of it,
and a lower layer never names a higher one; both cannot hold in one plugin, so `devbook-config`
declares no `dependencies` and stays reachable with `devbook` absent. Its write skills
stop at the engine keys and invoke `devbook:init` or `devbook:update` for the stamp. It names a host's own
plugin directories on purpose: where a plugin is installed is a fact about a host and nothing
else, and no slot exists for it.

**The committed index is an extension.** A repository that wants `_meta/` committed enables
`devbook-derived` and runs its `init`; one that does not never sees a derived file
([checks and indexes](checks-and-indexes.md)). The review plugin had no rule, no install, and
no stamp, and once contract 38 moved review state to the hosts it had nothing left to write:
it is removed, and `chapter-review` is `devbook`'s ([annotations](annotations.md)).

**The repository's procedures are an extension over the convention, not a payload of the
engine.** `start` and `capture` began as two seeds the engine's install wrote, because the
engine was the first thing that needed them. But the engine never read them as a plugin's
files: it named the skill and the path and expected a running application or evidence
back, which is the one shape that lets a repository hand-write both. Once `show` and `debug`
joined them — one composing the first two into a demo, one finding a cause with a breakpoint
rather than a person — four repository-owned procedures no phase calls two of had no reason to
ride in the engine, and a repository with no engine at all still wants all four. So they are
`devbook-procedures`, an L1 over `devbook` because the reconcile protocol and the stamp are
devbook's; the engine keeps its contract for what Validation expects back and names the skill
alone. The seam the move added is the **goal**: one sentence per procedure the plugin owns and
the wrapper carries, refreshed on every upgrade, while the body under `.agents/skills/` is the
repository's from the first edit. `delivery:init` and `delivery:update` survive as the stamp's holder, and `update`
releases its old claim on the two seeds — the protocol's adoption-changed case, which is why
the handover ships no migration.

**The procedures fold into `devbook`.** `devbook` is the plugin's only dependency, and what the
plugin takes from it is the machinery to write copies into a repository: the reconcile
protocol, the stamp with its per-file hashes, and migrations. `devbook:init` and
`devbook:update` already reconcile, stamp, and migrate, so the procedures become one more
part a repository adopts in `devbook`'s stamp, with their own `adopted` list kept. Demos
already live in `devbook` — `demo.mjs` and the demo address contract — so `prototype` and its
template sit beside their checker, and the reconcile protocol is read inside the plugin that
owns it instead of across a boundary. `run`, `capture`, `diagnose`, and `estimate` depend on
nothing, and the repository-owned copies keep their names, so `delivery` and every other
caller that names a procedure by skill changes nothing. The marketplace loses a plugin. The
cost is one stamp migration, which [install](install.md) records; a repository that wants
`run` and `capture` without a devbook folder already installs `devbook` as the dependency.

**The change lane is an extension over the convention, and OpenSpec is installed, never
copied.** A change is a set of deltas against devbook chapters, merged by devbook's own
`delta.mjs` and decided in the host that keeps the proposal's state, through
`devbook.decision@1`, so everything the lane adds is
procedure around a shape devbook owns: `devbook-openspec`, an L1 over `devbook`. It configures
OpenSpec through its documented surfaces — a project schema and `config.yaml` — rather than
forking a dozen skills against a project that releases every few weeks, and it names the engine
only as the `spec` and `tracker` providers a repository binds, so a repository without an engine
builds each step through OpenSpec's own `/opsx:apply`.

**Showing before telling is a plugin of its own, named by skill and never by plugin.** A
person takes in a diagram, a file tree, or a type signature faster than the paragraph that
describes it. Three places want that: a devbook chapter, a pull request description, and the
report a flow gives the person at each stage and gate. The guidance is one skill, `show-me`, in
`devbook-skills`, an L0 plugin that depends on nothing. `devbook` and `delivery` name the skill
alone, the way `delivery` names `run` and `capture`, and declare no dependency on it. Where the
skill is absent, each caller keeps its own short rule: `devbook-writing.md` keeps its table of
diagram kinds, and the engine reports in prose as before. A declared dependency would install a
second plugin with each foundation for guidance that only improves how output reads, and a
missing skill must cost readability, never a load. `domain.md` and its splits are the exception
in the devbook: they keep the diagrams `devbook-domain.md` prescribes, because that rule already
fixes the model chapter's shape.

The same plugin holds `research-brief`, on the same terms: a cited answer from primary sources
to a question the repository cannot answer. `delivery`'s Scope phase names it when an external
fact decides scope, and its Drafting phase names it for `arc42/` and `tech/`. It returns the
brief and writes nothing, so one skill serves every place a brief lands — a decision record's
options, an OpenSpec change's `research.md`, a ticket — without knowing any of them. Without
it, each caller cites the primary source itself or leaves the fact open.

`pr-body` joins them: a pull request description as Summary, Evidence, and Merge Danger, the
last declaring a one-way or two-way door and its blast radius. `delivery`'s Create Pull Request
phase and `delivery-schedule`'s draft pull request contract name it, and `schedule-merge-review`
weighs its verdict by the declared door. The door is the reviewer's question, so it is
written where the reviewer reads: a one-way door — a migration, a renamed config key or stamp
field, deleted data, an edited `accepted` chapter — links the decision record it rests on. A
repository's own pull request template still wins; the skill fills the sections that match.

`retro` joins them too: one session or one delivery run read back with the person present,
through one set of lenses, ranked by what the next run would save. The weekly retro schedule
read the same evidence through three lenses of its own, so the set now lives in `retro` alone
and `schedule-weekly-retro` names the skill for it, keeping its three as the rule for when the
skill is absent. `delivery`'s Summary offers a retro once a run took two or more revise rounds
at Personal Validation, because repeated rounds are the clearest sign the environment cost the
run something. Its one rule carried from upstream decides where a finding lands: a mechanical
violation gets a check, because a check fires every time and a written rule costs context on
every load and still fails.

`wayfinder` widens what the plugin is. The other four are guidance a caller names; `wayfinder`
is a procedure a person invokes, no plugin names it, and it writes — a `wayfinder:map` issue and
its decision tickets on the repository's tracker. It belongs here anyway, because what it
needs is what L0 allows: the host's issue CLI, `research-brief` beside it, and a `grilling` or
`prototype` skill named alone, with an inline fallback for grilling. It writes nothing in the
repository and stamps nothing, so the plugin still installs nothing and declares nothing. A map
spans many sessions and resolves one decision per session, which a flow cannot be: a flow is one
session ending at a gate. Nor does it name the engine or the change lane — the destination a
map reaches, a spec or a decision, is handed to whichever lane the person picks. The issue sweep
leaves its issues alone by label, so an unattended run never claims or closes a ticket that
belongs to a person's map.

## Rejected

```meta
```

- Fan-out or scheduling as skills inside the engine; the triggers outside and the procedures in.
- The unattended stack update running `delivery-schedule:update` with the rest: a schedule
  would re-sync the scheduler that fires it, from no person's turn.
- Cloud sessions as the schedule's runtime, beside or instead of local routines. A cloud clone
  installs none of the marketplace's plugins, so the run cannot reach its skill; keeping both
  would fire every schedule twice. A setup script that installs the plugins in the cloud
  environment would make the environment, not the repository, the thing a schedule depends on,
  and it is personal.
- Reports as `schedule-report` issues once schedules ran locally: a report is read once, and
  as an issue it needs closing, sits in the backlog the issue sweep triages, and is written
  for GitHub's renderer rather than the session it came from.
- Keeping the specialists with their references, on the argument that an unresolvable reference
  degrades one stage.
- The guide as a skill inside `devbook`, or as an L1 extension over it.
- A `devbook-flows` bridge holding the folder flows.
- Keeping the seeds in `delivery` and adding `show` and `debug` there: two skills no phase
  calls, in a plugin a repository without an engine never enables.
- `show-me` inside `devbook`: a pull request and a flow's report are not devbook's concerns,
  and a repository running the engine without devbook would lose it.
- `devbook` and `delivery` declaring `devbook-skills` in `dependencies`: guidance that only
  improves readability would decide whether a foundation loads.
- A migration for the seed handover: `delivery` is payload-only and the protocol gives such a
  component hash-matching and orphaning as its whole mechanism.
- Folding `devbook-procedures` into `devbook-skills`: the procedures need the reconcile
  protocol, so `devbook-skills` would depend on `devbook` and become L1, while
  `devbook-writing.md` in `devbook` names `show-me` from it — a lower layer naming a higher
  one. It would also change what `devbook-skills` is, from skills only to a plugin with an
  install, a hook, a stamp, and migrations.
- Splitting the procedures, `prototype` into `devbook` and the other four into
  `devbook-skills`: the four still need the install machinery, which needs either a
  dependency on `devbook`, the layering problem again, or a copy of the reconcile protocol,
  which breaks one rule, one file.
- `wayfinder` as a flow in `delivery`, or inside `devbook-openspec`: a flow is one session
  ending at a gate and a map spans many, and the change lane starts from a proposal, which is
  what a map finds its way to. Naming either would make an L0 plugin name a higher layer.
- Keeping `devbook-procedures` as an L1 plugin of its own: it duplicates the adoption, stamp,
  and migration surface `devbook` already has, for a plugin no repository can install without
  `devbook`.

## History

```meta
```

| Date | Change | Why |
| --- | --- | --- |
| 2026-10-12 | A routine's worktree option is on by default: `delivery-schedule:update` sets it where the scheduler takes it and reports each routine a person must switch on by hand, and the preamble's rule 1 works in the host's worktree when there is one and adds its own only when there is not. | — |
| 2026-10-06 | `devbook-skills` ships `wayfinder`, adapted from `mattpocock/skills`, and widens from guidance callers name to planning a person runs: a `wayfinder:map` issue with decision tickets as child issues linked by native blocking, one ticket per session, on the repository's tracker through the host's issue CLI. It stays L0, names `research-brief` and a `grilling` skill alone, and never names the engine or the change lane. | — |
| 2026-10-06 | `devbook-skills` ships `retro`, adapted from `mattpocock/skills` and merged with `schedule-weekly-retro`'s lenses, which now names it for them; the engine's Summary offers it after two or more revise rounds. A mechanical violation gets a check, never a written rule. | — |
| 2026-10-05 | The fold lands: the seeds, the wrapper shape, and the demo template and sample move under `devbook`'s `assets/procedures/`, `devbook:init` and `devbook:update` adopt and reconcile the procedures, the session-start paragraph joins devbook's hook, and `devbook-procedures` leaves the marketplace. | — |
| 2026-10-05 | `devbook-skills` ships `pr-body`, adapted from `mattpocock/skills`; the engine's Create Pull Request phase and the schedule sweeps' draft pull requests name it alone, and `schedule-merge-review` weighs its verdict by the declared door, a one-way door with no decision record linked being Blocking. | — |
| 2026-10-05 | `devbook-procedures` folds into `devbook`: the procedures become a part a repository adopts in `devbook`'s stamp. Decided here; the fold lands as its own change. | `devbook` is the plugin's only dependency and already reconciles, stamps, and migrates, and demos already live there. |
| 2026-10-05 | `devbook-skills` ships `research-brief`, adapted from `mattpocock/skills`; the engine's Scope phase and its `arc42/` and `tech/` Drafting name it alone and cite external facts themselves when it is absent. It writes nothing. | — |
| 2026-10-01 | `devbook-skills` is an L0 plugin shipping `show-me`; `devbook-writing.md` and the engine's pull request and report-back name the skill alone and keep their own rule when it is absent. `domain.md` keeps `devbook-domain.md`'s diagrams. | — |
| 2026-09-30 | A scheduled run's report is its session's last message, never a `schedule-report` issue; every reporting entry point carries a `report.md` template on the frame of `delivery-schedule`'s `resources/report-contract.md`. | — |
| 2026-09-28 | `devbook-openspec` is the change lane's plugin, an L1 over `devbook`: it installs and configures the OpenSpec CLI at `openspec/` in the repository root, provides `spec` and `tracker` to an engine by name, and lands a change by merging through devbook's `delta.mjs` before `openspec archive` moves the folder. | — |
| 2026-09-28 | Every schedule is a local routine: `delivery-schedule` creates through a local scheduler only, disables cloud copies, and stops writing the marketplace keys into committed settings; the `{{checkout}}` placeholder and a worktree rule enter the preamble, and `ext.schedule` is no longer read. | — |
| 2026-09-26 | The weekly `devbook-update` schedule runs `devbook-config:update` unattended and lands a draft pull request; it installs no plugin and never runs `delivery-schedule:update`. | — |
| 2026-09-26 | `devbook-procedures` seeds a fifth procedure, `estimate`: story points sized against the repository's own finished work. Nothing depends on it; a caller that finds it absent sizes by its own rule and says so. | A pace measured in points means the same across plans. |
| 2026-09-21 | `fleet` is deleted: the issue sweep is a `delivery-schedule` entry point, sequential in one session, and nothing in the marketplace spawns a session. An unattended run closes an issue on high-confidence evidence of it being resolved, the one exception to *never close*; every pull request the sweep opens is a draft. | — |
| 2026-09-21 | `devbook-procedures` seeds `start`, `show`, `capture`, and `debug` with a fixed goal per wrapper; `delivery` seeds nothing and names the skills alone. | — |
| 2026-09-17 | `devbook-derived` is the committed index's plugin; the review plugin ships skills only. | — |
| 2026-09-07 | The five folder flows move into `delivery`; the `devbook-flows` bridge is removed. | — |
| 2026-09-07 | `delivery-schedule` holds every unattended entry point and its triggers; a schedule is never a procedure. | — |
| 2026-09-07 | Seven specialist plugins leave; every stage names a point, and no plugin names one published elsewhere. | — |
| 2026-09-07 | `devbook-config` is a plugin of its own with no dependencies. | — |
| 2026-09-04 | A role plugin holds no gate, no sequencing, no spawning, no delegation. | — |
| 2026-09-03 | The sweep skills land in `fleet`, an L1 extension over `delivery`. | — |
| 2026-09-02 | One folder per plugin; dependency, bridge, and surface are the three ways to couple. | — |
