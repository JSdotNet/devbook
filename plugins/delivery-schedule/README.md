# delivery-schedule

The unattended lane, stacked on `delivery`. Everything here runs with nobody watching: twelve
`schedule-*` entry points that pick their own input and run a flow, a review, or a report,
ten trigger files that fire one on a cadence, and three skills that put those triggers in
the host's scheduler and read them back.

One capability, two host names. Claude Code calls it **Routines**; the GitHub Copilot app
calls it **Automations**. This plugin says *schedule* and records both as aliases, so one
catalog serves either host — the scheduler is resolved from the live tool list, never named.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Enable `delivery-schedule` with `/plugin` — the host installs `delivery` with it — then run
`delivery-schedule:install` in the repository.

## The entry points

A `schedule-*` entry point is a procedure that picks its own input, so it needs no person to
hand it one. Every one of them is also runnable by hand.

| Skill | Does | Lands as |
|---|---|---|
| `schedule-bug-fix` | Picks the top open `bug` issue and runs `flow-code` on it as a defect | A branch at Personal Validation |
| `schedule-instruction-review` | Cuts what changes nothing in the instruction assets a model loads, per `resources/instruction-tightening.md` | A draft pull request, one commit per file |
| `schedule-merge-review` | Reviews every pull request waiting on a reviewer | One comment per pull request |
| `schedule-morning-brief` | What changed in this repository since yesterday, needs-you first | A one-screen brief |
| `schedule-package-update` | Updates outdated packages and verifies the build | A pull request |
| `schedule-performance-review` | Scores ten findings, implements the best one | A pull request |
| `schedule-review` | TODOs, suggestions, and the code review checklist | A findings report, optionally issues |
| `schedule-security-review` | Dependencies, secrets, CI hardening, code | One issue per new high finding |
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
| `package-update` | Monday 04:00 | `schedule-package-update`, minor and patch only | `delivery-schedule`, `delivery` | A pull request |
| `merge-review` | Weekdays 06:00 | `schedule-merge-review`, up to 10 pull requests | `delivery-schedule`, `delivery` | One comment per pull request |
| `morning-brief` | Weekdays 05:00 | `schedule-morning-brief`, 24-hour window, 72 on a Monday | `delivery-schedule`, `delivery` | A `schedule-report` issue, replaced while unread |
| `change-report` | Friday 15:00 | `schedule-whats-new`, 7-day window | `delivery-schedule`, `delivery` | A `schedule-report` issue |
| `devbook-check` | Daily 03:00 | `devbook-derived:check`, every adopted folder | `devbook`, `devbook-derived` | A pull request when something was fixed |
| `security-review` | Tuesday 04:00 | `schedule-security-review`, all four layers | `delivery-schedule`, `delivery` | One issue per new high finding |
| `instruction-review` | Thursday 04:00 | `schedule-instruction-review`, all assets, rewrites on | `delivery-schedule`, `delivery` | A draft pull request when something was cut |
| `tech-update` | Wednesday 04:00 | `devbook-derived:tech-update`, every `.tech` layer | `devbook`, `devbook-derived` | A draft pull request |
| `weekly-update` | Friday 16:00 | `schedule-weekly-update`, 7-day window | `delivery-schedule`, `delivery` | A `schedule-report` issue, replaced while unread |
| `prose-check` | Saturday 04:00 | `prose-check`, every adopted folder, report only | `devbook` | A `schedule-report` issue when something was found |

Each is one file under `resources/schedules/`, and every prompt starts with
`resources/schedule-preamble.md`: the unattended rules, stated once. A repository changes a
cadence under `components.schedule.overrides` rather than in the catalog.

`devbook-check` is one schedule, not one per folder. The generator walks every adopted folder
in a single pass, and the failures worth catching — a reference into a chapter another folder
renamed — are exactly the ones a per-folder split would not see.

`devbook` is named, not depended on: a schedule whose target plugin the repository has not
enabled is reported and skipped, never scheduled.

The two report schedules keep one open issue each. While the previous brief or update is
still open nobody has read it, so the next run extends its window back to that issue's date
and replaces the body: nothing between two runs is lost, and closing the issue is how it is
acknowledged. The closed issues are the record.

## The three catalog skills

| Skill | Does |
|---|---|
| `delivery-schedule:install` | Creates or updates the selected schedules, disables the deselected, writes `components.schedule` |
| `schedule-status` | Lists them with their last runs, what each published, and the log where one failed |
| `schedule-run` | Fires one now and reports the run |

All three resolve the scheduler from the live tool list, match by the name
`<owner>/<repo> · <title>`, and treat no scheduler as a normal outcome. The file, the prompt,
the stamp, and the operations are in `resources/schedule-catalog-contract.md`.

## What a scheduled run never does

- **Pass a gate.** It parks with a handoff brief where Personal Validation would be.
- **Merge, approve, close, or delete.** Every change lands as a pull request from
  `schedule/<name>/<date>`, every report as an issue labelled `schedule-report`, and a run
  updates what its previous run left open rather than opening a second.
- **Carry anything personal into the repository.** The environment, the model, and the
  scheduler ids live in the scheduler. The stamp records the selection and the cadence
  overrides, and nothing that would be wrong for the next person who opens the file.

## Why it is its own plugin

The entry points sat in `delivery` and the triggers in a plugin beside it, which split one
subject across two folders and made the engine carry procedures no attended flow ever reaches.
Together they are one thing — work that runs with nobody watching — so they are one plugin,
stacked on the engine they call into. It is an L1 extension: it owns no flow, holds no gate,
and adds no extension point.

It is the one plugin here whose subject is a host capability — scheduled cloud sessions — and
that is a divergence from the rule that nothing in this marketplace names one, taken on purpose
and recorded in `.devbook/arc42/09-architecture-decisions.md`. The catalog is host-neutral
data; only the scheduler resolution knows which tool answers.

## Before the first schedule

A cloud session loads this marketplace only if the repository's committed host settings enable
it and the plugins a schedule requires. `delivery-schedule:install` checks that and refuses to schedule
what would start without its skill. The first run is still the proof: fire one with
`schedule-run` and read it with `schedule-status` before trusting the cadence.

## Checking the catalog

```bash
node plugins/delivery-schedule/tools/schedule-catalog/check.mjs
```

Fails on a malformed entry, a cron that could fire more than hourly, a target that is a flow
or does not exist, a `requires` list that omits the target's plugin, or a placeholder the
contract does not name.
