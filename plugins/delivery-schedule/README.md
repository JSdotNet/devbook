# delivery-schedule

The unattended lane, stacked on `delivery`. Everything here runs with nobody watching: fifteen
`schedule-*` entry points that pick their own input and run a flow, a review, a sweep, or a
report, twelve trigger files that fire one on a cadence, and three skills that put those
triggers in the host's scheduler and read them back.

One capability, two host names. Claude Code calls it **Routines**; the GitHub Copilot app
calls it **Automations**. This plugin says *schedule* and records both as aliases, so one
catalog serves either host — the scheduler is resolved from the live tool list, never named.

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
| `schedule-devbook-validate` | Runs `devbook:validate` over every adopted folder, fixes what it reports, refreshes the committed indexes where `devbook-derived` keeps them | A pull request, or a schedule-report issue when `devbook-config:doctor` finds the installation needs a person |
| `schedule-devbook-verify` | Runs `devbook:verify-change` over every adopted folder, one run per kind, and opens an issue per `code-ahead` or `conflict` row nothing already covers; writes no chapter and plans no capture | One `devbook-drift` issue per such row, and a `schedule-report` issue with the whole table |
| `schedule-instruction-review` | Cuts what changes nothing in the instruction assets a model loads, per `resources/instruction-tightening.md` | A draft pull request, one commit per file |
| `schedule-issue-sweep` | Classifies the unclassified issues in the repository's own labels, closes what high-confidence evidence shows already resolved, resolves up to N of the rest one at a time | Draft pull requests, closed issues, and a `schedule-report` brief of what to validate and decide |
| `schedule-merge-review` | Reviews every pull request waiting on a reviewer | One comment per pull request |
| `schedule-morning-brief` | What changed in this repository since yesterday, needs-you first | A one-screen brief |
| `schedule-package-update` | Updates outdated packages and verifies the build | A pull request |
| `schedule-performance-review` | Scores ten findings, implements the best one | A pull request |
| `schedule-review` | TODOs, suggestions, and the code review checklist | A findings report, optionally issues |
| `schedule-security-review` | Dependencies, secrets, CI hardening, code | One issue per new high finding |
| `schedule-tech-update` | Runs `devbook:tech-update` over every `tech/` layer and lands what moved | A draft pull request |
| `schedule-week-starter` | Digests what the tracked topics published this week | A digest |
| `schedule-weekly-cost-analysis` | Reads the surface's token telemetry for the week | A cost report |
| `schedule-weekly-update` | The repository's week: shipped, in flight, issues, releases, carry-over | A weekly update |
| `schedule-whats-new` | What changed in the tracked repositories since last run | A change report |

None of them is a flow, and none may be scheduled as one: a `flow-*` skill ends at Personal
Validation, and no unattended run can pass a gate.

The two change reports read the same sources over different windows, stated once in
`resources/change-window-contract.md`: the morning brief is triage for one day, the weekly
update is the record for one week. `schedule-whats-new` is the third and older one: pull
requests across several repositories, with a checkpoint and ticket correlation.

## The catalog

| Schedule | Cadence (UTC) | Runs | Needs | Lands as |
|---|---|---|---|---|
| `package-update` | Saturday 04:00 | `schedule-package-update`, minor and patch only | `delivery-schedule`, `delivery` | A pull request |
| `merge-review` | Weekdays 06:00 | `schedule-merge-review`, up to 10 pull requests | `delivery-schedule`, `delivery` | One comment per pull request |
| `issue-sweep` | Weekdays 04:30 | `schedule-issue-sweep`, every open issue, `maxResolve 3`, high confidence only | `delivery-schedule`, `delivery` | Draft pull requests, closed issues, and a `schedule-report` brief, replaced while unread |
| `morning-brief` | Weekdays 05:00 | `schedule-morning-brief`, 24-hour window, 72 on a Monday | `delivery-schedule`, `delivery` | A `schedule-report` issue, replaced while unread |
| `change-report` | Friday 15:00 | `schedule-whats-new`, 7-day window | `delivery-schedule`, `delivery` | A `schedule-report` issue |
| `devbook-validate` | Daily 03:00 | `schedule-devbook-validate`, every adopted folder | `delivery-schedule`, `devbook` | A pull request when something was fixed |
| `devbook-verify` | Monday 04:00 | `schedule-devbook-verify`, every adopted folder, report only | `delivery-schedule`, `devbook` | One `devbook-drift` issue per new `code-ahead` or `conflict` row, and a `schedule-report` issue |
| `security-review` | Tuesday 04:00 | `schedule-security-review`, all four layers | `delivery-schedule`, `delivery` | One issue per new high finding |
| `instruction-review` | Thursday 04:00 | `schedule-instruction-review`, all assets, rewrites on | `delivery-schedule`, `delivery` | A draft pull request when something was cut |
| `tech-update` | Sunday 04:00 | `schedule-tech-update`, every `tech/` layer | `delivery-schedule`, `devbook` | A draft pull request |
| `weekly-update` | Friday 16:00 | `schedule-weekly-update`, 7-day window | `delivery-schedule`, `delivery` | A `schedule-report` issue, replaced while unread |
| `prose-check` | Wednesday 04:00 | `prose-check`, every adopted folder, report only | `devbook` | A `schedule-report` issue when something was found |

Each is one file under `resources/schedules/`, and every prompt starts with
`resources/schedule-preamble.md`: the unattended rules, stated once. A repository changes a
cadence under `components.schedule.overrides` rather than in the catalog.

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

## The four catalog skills

| Skill | Does |
|---|---|
| `delivery-schedule:init` | Asks which schedules to enable, creates them, and stamps `components.schedule`; refused where that stamp exists |
| `delivery-schedule:update` | Creates or updates the selected schedules, disables the deselected, rewrites `components.schedule`; refused where no stamp exists |
| `schedule-status` | Lists them with their last runs, what each published, and the log where one failed |
| `schedule-run` | Fires one now and reports the run |

All three resolve the scheduler from the live tool list, match by the name
`<owner>/<repo> · <title>`, and treat no scheduler as a normal outcome. The file, the prompt,
the stamp, and the operations are in `resources/schedule-catalog-contract.md`.

## What a scheduled run never does

- **Pass a gate.** It parks with a handoff brief where Personal Validation would be.
- **Merge, approve, or delete.** Every change lands as a pull request from a branch under
  `schedule/<name>/<date>`, every report as an issue labelled `schedule-report`, and a run
  updates what its previous run left open rather than opening a second.
- **Close, with one exception.** An issue that high-confidence evidence — a commit, a file, a
  pull request, a sibling issue — shows already resolved, closed by the issue sweep with that
  evidence in the comment. Every other closure is a proposal in a brief, with the command.
- **Carry anything personal into the repository.** The scheduler ids live in the scheduler;
  the environment and the model are asked once and, if you say so, remembered under
  `ext.schedule` in your own stack-config overlay, outside every clone. The stamp records
  the selection and the cadence overrides, and nothing that would be wrong for the next
  person who opens the file.

## Why it is its own plugin

The entry points sat in `delivery` and the triggers in a plugin beside it, which split one
subject across two folders and made the engine carry procedures no attended flow ever reaches.
Together they are one thing — work that runs with nobody watching — so they are one plugin,
stacked on the engine they call into. It is an L1 extension: it owns no flow, holds no gate,
and adds no extension point.

It is the one plugin here whose subject is a host capability — scheduled cloud sessions — and
that is a divergence from the rule that nothing in this marketplace names one, taken on purpose
and recorded in `.devbook/arc42/adr/plugin-boundaries.md`. The catalog is host-neutral
data; only the scheduler resolution knows which tool answers.

## Before the first schedule

A cloud session loads this marketplace only if the repository's committed host settings enable
it and the plugins a schedule requires. `delivery-schedule:init` and `delivery-schedule:update` own those two keys: it offers
to write what is missing, and refuses to schedule what would start without its skill when
you decline. The first run is still the proof: fire one with
`schedule-run` and read it with `schedule-status` before trusting the cadence.

## Checking the catalog

```bash
node plugins/delivery-schedule/tools/schedule-catalog/check.mjs
```

Fails on a malformed entry, a cron that could fire more than hourly, a target that is a flow
or does not exist, a `requires` list that omits the target's plugin, or a placeholder the
contract does not name.
