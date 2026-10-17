---
name: weekly-update
title: Weekly update
cadence: weekly
cron: "0 17 * * 0"
target: delivery-schedule:schedule-weekly-update
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Glob, Grep, Skill]
result: session
---

Run `schedule-weekly-update` for the repository `{{repo}}` on `{{base}}` over the last 7 days.

The update is the report. The routine's run history is the record, one run per week.
