---
name: schedule-status
description: 'Show this repository''s schedules and how their recent runs went — cadence, enabled state, the last runs, what each published, and the log of a run that failed or parked. Use when: checking whether a scheduled run fired, why one failed, what a routine or automation produced last night, or listing what is scheduled for this repository.'
---

# schedule status

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Read-only. The scheduler, the identity rule, and the stamp are in
`resources/schedule-catalog-contract.md`.

## Steps

1. **Resolve the repository** with `gh repo view --json nameWithOwner` and read
   `components.schedule` from `.devbook/config.json` for the selection.
2. **Resolve the scheduler** from the live tool list. None: say the host's own page holds the
   answer, list the selection from the stamp, and stop.
3. **List** and keep the entries named `<owner>/<repo> · …`. For each, `list_runs`. For the
   most recent run that failed or parked, and for the run the user asked about, `get_run_log`.
4. **Cross-check what a run published** with `gh`: an open pull request on `schedule/<name>/`,
   an open issue labelled `schedule-report`.
5. **Report** one table: schedule, cron, enabled, last run with its outcome, what it published
   as a link, and one line from the log at the point a failed run went wrong. One in the stamp
   the scheduler does not know is `not scheduled — run delivery-schedule:update`; a scheduled one the
   stamp does not list is `unmanaged`.

An empty run list is not proof a schedule never fired: a fire refused before a session existed
leaves no run behind. Report its own `enabled` state and next fire beside the empty list rather
than concluding.
