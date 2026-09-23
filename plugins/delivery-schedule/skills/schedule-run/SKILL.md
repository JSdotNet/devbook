---
name: schedule-run
description: 'Fire one of this repository''s schedules now, outside its cadence, and report the run. Use when: running a routine or automation now, testing one right after delivery-schedule:install, or re-running one that failed.'
---

# schedule run

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

The scheduler and the identity rule are in `resources/schedule-catalog-contract.md`.

## Steps

1. **Take the schedule name.** Without one, list the selection from `components.schedule` and
   ask.
2. **Resolve the scheduler** from the live tool list. None: say it is fired from the host's
   own page, and stop.
3. **Find it**: `list`, matched on `<owner>/<repo> · <title>`. Not found: say so and point at
   `delivery-schedule:init`, or `delivery-schedule:update` where `components.schedule` exists.
4. **Confirm before firing.** Show the name, the target skill, and what the run may open — a
   pull request on `schedule/<name>/`, an issue labelled `schedule-report` — and wait for a yes.
   Then `run`.
5. **Report.** Wait for the run to appear in `list_runs`, `get_run_log` it, and report as
   `schedule-status` does in its step 5.

A run fired this way is the same unattended session a schedule starts. It cannot ask this
session anything, and it parks where a gate would be.
