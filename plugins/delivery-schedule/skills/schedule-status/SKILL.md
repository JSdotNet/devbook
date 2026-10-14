---
name: schedule-status
description: 'Show this repository''s schedules and their recent runs — cadence, enabled state, what each published, and the log of one that failed or parked. Use when: did a scheduled run fire, why did one fail, what did a routine or automation produce, what is scheduled here.'
---

# schedule status

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Read-only. The scheduler, the identity rule, and the stamp are in
`resources/schedule-catalog-contract.md`.

## Steps

1. **Resolve the repository** with `gh repo view --json nameWithOwner` and read
   `components.schedule` from `.devbook/config.json` for the selection.
2. **Resolve the local scheduler** from the live tool list. None: say the host's own page holds the
   answer, list the selection from the stamp, and stop.
3. **List** and keep the entries named `<owner>/<repo> · …`. For each, `list_runs`. For the
   most recent run that failed or parked, and for the run the user asked about, `get_run_log`
   where the scheduler has one; a scheduler with only `list_runs` is reported from that, and
   the report says so.
4. **Cross-check what a run published**: its report, the last message of the run's session,
   and with `gh` an open pull request on `schedule/<name>/`.
5. **Report** one table: schedule, cron, enabled, last run with its outcome, what it published
   as a link, and one line from the log at the point a failed run went wrong. One in the stamp
   the scheduler does not know is `not scheduled — run delivery-schedule:update`; a scheduled one the
   stamp does not list is `unmanaged`; an enabled entry a cloud scheduler still holds for this
   repository is `cloud — run delivery-schedule:update to retire it`.

An empty run list is not proof a schedule never fired: a fire refused before a session existed
leaves no run behind. Report its own `enabled` state and next fire beside the empty list rather
than concluding.
