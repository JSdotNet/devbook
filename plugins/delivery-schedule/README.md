# delivery-schedule

The unattended lane, stacked on `delivery`. Everything here runs with nobody watching: eighteen
`schedule-*` entry points that pick their own input and run a flow, a review, a sweep, or a
report, sixteen trigger files that fire one on a cadence, and four skills that put those
triggers in the host's scheduler and read them back.

One capability, two host names. Claude Code calls it **Routines**; the GitHub Copilot app
calls it **Automations**. This plugin says *schedule* and records both as aliases, so one
catalog serves either host — the scheduler is resolved from the live tool list, never named.

Every schedule is a **local routine**: the session runs on your machine, in the repository's
main checkout, with the plugins you have installed there, and works in a fresh worktree of its
own. Never a cloud session — a cloud session starts on a clone without this marketplace's
plugins and cannot reach the skill it was scheduled to run. `delivery-schedule:update` disables
any cloud copy it finds for the repository.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Enable `delivery-schedule` with `/plugin` — the host installs `delivery` with it — then run
`delivery-schedule:init` in the repository.

## The entry points

A `schedule-*` entry point is a procedure that picks its own input, so it needs no person to
hand it one. Every one of them is also runnable by hand.

| Skill | Does | Lands as |
|---|---|---|
| `schedule-devbook-validate` | Runs `devbook:validate` over every adopted folder, fixes what it reports, refreshes the committed indexes where `devbook-derived` keeps them | A pull request, and a report naming what `devbook-config:doctor` finds needs a person |
| `schedule-devbook-update` | Runs `devbook-config:update` with the safe answer at every question, so outstanding migrations run and stale copies are refreshed; never touches the scheduler | A draft pull request, or a report naming the person's step that is left |
| `schedule-devbook-sweep` | Takes `direction: pull` or `push`, lists the sync groups whose chapters go that way, verifies them in parallel, and brings up to N level one at a time — pull carries code into chapters, push builds agreed chapters into code — per `resources/devbook-sweep-contract.md` | Draft pull requests, one `devbook-drift` issue per group a person must answer, and a brief closed by a `devbook-sync-report` block |
| `schedule-devbook-verify` | Runs `devbook:verify-change` over every sync unit at `report`, the default, and opens an issue per unit with a `code-ahead` or `conflict` row nothing already covers; writes no chapter and plans no capture | One `devbook-drift` issue per such unit, and a report with the whole table |
| `schedule-instruction-review` | Cuts what changes nothing in the instruction assets a model loads, per `resources/instruction-tightening.md` | A draft pull request, one commit per file |
| `schedule-issue-sweep` | Classifies the unclassified issues in the repository's own labels, closes what high-confidence evidence shows already resolved, resolves up to N of the rest one at a time | Draft pull requests, closed issues, and a brief of what to validate and decide |
| `schedule-merge-review` | Reviews every pull request waiting on a reviewer, and names the files that keep conflicting with how to split them | One comment per pull request, hotspots in the summary |
| `schedule-morning-brief` | What changed in this repository since yesterday, needs-you first | A one-screen brief |
| `schedule-package-update` | Updates outdated packages and verifies the build | A pull request |
| `schedule-performance-review` | Scores ten findings, implements the best one | A pull request |
| `schedule-review` | TODOs, suggestions, and the code review checklist | A findings report, optionally issues |
| `schedule-security-review` | Dependencies, secrets, CI hardening, code | One issue per new high finding |
| `schedule-tech-update` | Runs `devbook:tech-update` over every `tech/` layer and lands what moved | A draft pull request |
| `schedule-week-starter` | Digests what the tracked topics published this week | A digest |
| `schedule-weekly-cost-analysis` | Reads the surface's token telemetry for the week | A cost report |
| `schedule-weekly-retro` | Reviews the week's sessions for AI usage through the `retro` skill's lenses — bottlenecks, context load, model and effort fit without it — in a fresh context, only while the plan has credit to spare | A draft pull request, one commit per recommendation |
| `schedule-weekly-update` | The repository's week: shipped, in flight, issues, releases, carry-over | A weekly update |
| `schedule-whats-new` | Pull requests across the tracked repositories over a window, each traced to its ticket | A change report |

None of them is a flow, and none may be scheduled as one: a `flow-*` skill ends at Personal
Validation, and no unattended run can pass a gate.

The two change reports read the same sources over different windows, stated once in
`resources/change-window-contract.md`: the morning brief is triage for one day, the weekly
update is the record for one week. `schedule-whats-new` reads the pull request rows alone,
across several repositories, and traces each to its ticket.

## The catalog

| Schedule | Cadence (UTC) | Runs | Needs | Lands as |
|---|---|---|---|---|
| `package-update` | Saturday 04:00 | `schedule-package-update`, minor and patch only | `delivery-schedule`, `delivery` | A pull request |
| `merge-review` | Weekdays 06:00 | `schedule-merge-review`, up to 10 pull requests | `delivery-schedule`, `delivery` | One comment per pull request |
| `issue-sweep` | Weekdays 04:30 | `schedule-issue-sweep`, every open issue, `maxResolve 10`, high confidence only | `delivery-schedule`, `delivery` | Draft pull requests, closed issues, and a brief |
| `morning-brief` | Weekdays 06:30 | `schedule-morning-brief`, 24-hour window, 72 on a Monday | `delivery-schedule`, `delivery` | A report |
| `change-report` | Sunday 16:00 | `schedule-whats-new`, 7-day window | `delivery-schedule`, `delivery` | A report |
| `devbook-validate` | Daily 03:00 | `schedule-devbook-validate`, every adopted folder | `delivery-schedule`, `devbook` | A pull request when something was fixed |
| `devbook-verify` | Sunday 05:00 | `schedule-devbook-verify`, every unit at `sync: report` | `delivery-schedule`, `devbook` | One `devbook-drift` issue per new `code-ahead` or `conflict` row, and a report |
| `devbook-pull-sweep` | Monday 04:00 | `schedule-devbook-sweep`, `direction: pull`, `maxResolve 3` | `delivery-schedule`, `devbook` | Draft pull requests carrying chapters, `devbook-drift` issues, and a brief |
| `devbook-push-sweep` | Wednesday 04:00 | `schedule-devbook-sweep`, `direction: push`, `maxResolve 1` | `delivery-schedule`, `devbook`, `delivery` | A draft pull request building agreed chapters, `devbook-drift` issues, and a brief |
| `devbook-update` | Saturday 06:00 | `schedule-devbook-update`, every adopted component bar the scheduler | `delivery-schedule`, `devbook-config`, `devbook` | A draft pull request when something moved |
| `security-review` | Saturday 08:00 | `schedule-security-review`, all four layers | `delivery-schedule`, `delivery` | One issue per new high finding |
| `instruction-review` | Sunday 07:00 | `schedule-instruction-review`, all assets, rewrites on | `delivery-schedule`, `delivery` | A draft pull request when something was cut |
| `tech-update` | Sunday 04:00 | `schedule-tech-update`, every `tech/` layer | `delivery-schedule`, `devbook` | A draft pull request |
| `weekly-update` | Sunday 17:00 | `schedule-weekly-update`, 7-day window | `delivery-schedule`, `delivery` | A report |
| `weekly-retro` | Saturday and Sunday 09:00 | `schedule-weekly-retro`, at most once a week, only below 75% of every plan window | `delivery-schedule`, `delivery` | A draft pull request when something was recommended, and a report |
| `prose-check` | Sunday 06:00 | `prose-check`, every adopted folder, report only | `devbook` | A report |

Each is one file under `resources/schedules/`, and every prompt starts with
`resources/schedule-preamble.md`: the unattended rules, stated once. A repository changes a
cadence under `components.schedule.overrides` rather than in the catalog.

A chapter says which way it syncs in its own `sync` field — `pull`, `push`, `sync`, `report`, or
`off`, set on a folder, a context, a page, or a unit and inherited nearest-wins. `devbook-verify`
reports on the `report` units; `schedule-devbook-sweep` writes to the rest, one group per draft
pull request. `devbook-pull-sweep` lands the pull direction through `capture-unit.workflow.js`;
`devbook-push-sweep` lands the push direction through `apply-unit.workflow.js`, which runs the
issue sweep's resolver with the change brief as its specification.

`devbook-validate` is one schedule, not one per folder. The generator walks every adopted folder
in a single pass, and the failures worth catching — a reference into a chapter another folder
renamed — are exactly the ones a per-folder split would not see.

`devbook` is named, not depended on: a schedule whose target plugin the repository has not
enabled is reported and skipped, never scheduled.

The two report schedules keep one open issue each. While the previous brief or update is
still open nobody has read it, so the next run extends its window back to that issue's date
and replaces the body: nothing between two runs is lost, and closing the issue is how it is
acknowledged. The closed issues are the record. `issue-sweep`'s brief keeps the same one
open issue without a window: the rows a person has not decided fold into the next run's.

A run waits for you. Archiving a run's session in the host is how you say you have handled
it; while an earlier run of the same schedule is still unarchived — a merge review whose
comments you are still working through, a pull request you have not looked at — the next run
does no work, replies `Skipped: …`, and archives itself. Where the host keeps no archived state,
every run proceeds. The rule is in `resources/schedule-catalog-contract.md` under
*The Pickup Gate*.

## The four catalog skills

| Skill | Does |
|---|---|
| `delivery-schedule:init` | Asks which schedules to enable, creates them, and stamps `components.schedule`; refused where that stamp exists |
| `delivery-schedule:update` | Creates or updates the selected schedules, disables the deselected, rewrites `components.schedule`; refused where no stamp exists |
| `schedule-status` | Lists them with their last runs, what each published, and the log where one failed |
| `schedule-run` | Fires one now and reports the run |

All four resolve the scheduler from the live tool list, match by the name
`<owner>/<repo> · <title>`, and treat no scheduler as a normal outcome. The file, the prompt,
the stamp, and the operations are in `resources/schedule-catalog-contract.md`.

## Migrations

A routine keeps the cron it was created with, so a moved catalog default reaches a repository
only through `delivery-schedule:update`. A migration under `migrations/<nnn>-<slug>/` names
the routines that still carry an old default: `migrate.mjs --check` exits `1` while the stamp
predates the move, and `update` runs every one in step 1 and re-times what it names in step 6.

| Migration | Does |
|---|---|
| `migrations/001-weekend-cadence/` | Names the routines the weekend cadence moves, for a stamp below `1.15.0`; an override is kept |

## What a scheduled run never does

- **Pass a gate.** It parks with a handoff brief where Personal Validation would be.
- **Merge, approve, or delete.** Every change lands as a pull request from a branch under
  `schedule/<name>/<date>`, and a run updates the pull request its previous run left open
  rather than opening a second.
- **Close, with one exception.** An issue that high-confidence evidence — a commit, a file, a
  pull request, a sibling issue — shows already resolved, closed by the issue sweep with that
  evidence in the comment. Every other closure is a proposal in a brief, with the command.
- **Carry anything personal into the repository.** The scheduler ids, the checkout's path,
  and the tools you approved live in the scheduler. The stamp records
  the selection and the cadence overrides, and nothing that would be wrong for the next
  person who opens the file.

## Why it is its own plugin

The entry points sat in `delivery` and the triggers in a plugin beside it, which split one
subject across two folders and made the engine carry procedures no attended flow ever reaches.
Together they are one thing — work that runs with nobody watching — so they are one plugin,
stacked on the engine they call into. It is an L1 extension: it owns no flow, holds no gate,
and adds no phase.

It is the one plugin here whose subject is a host capability — scheduled local routines — and
that is a divergence from the rule that nothing in this marketplace names one, taken on purpose
and recorded in `.devbook/arc42/adr/plugin-boundaries.md`. The catalog is host-neutral
data; only the scheduler resolution knows which tool answers.

## Before the first schedule

A routine loads the plugins installed on this machine for the checkout, so install every
plugin a schedule `requires` first: `delivery-schedule:update` skips a schedule whose plugin
this session has not loaded, and names it. Run it from the repository's main checkout, never a
worktree — the routine keeps the folder it was created from. Keep each routine's worktree
option on, its default here: `delivery-schedule:update` sets it where the scheduler lets it,
and names every routine you still have to switch on in the host's own page. The first run is the proof, and
it is where the routine's tools are approved: fire one with `schedule-run` and read it with
`schedule-status` before trusting the cadence. A local scheduler runs only while its host
is running; a routine due while it was closed runs on the next launch.

## Checking the catalog

```bash
node plugins/delivery-schedule/tools/schedule-catalog/check.mjs
```

Fails on a malformed entry, a cron that could fire more than hourly, a target that is a flow
or does not exist, a `requires` list that omits the target's plugin, or a placeholder the
contract does not name.
