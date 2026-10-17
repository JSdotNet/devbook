---
name: change-report
title: Change report
cadence: weekly
cron: "0 16 * * 0"
target: delivery-schedule:schedule-whats-new
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Glob, Grep, Skill]
result: session
---

Run `schedule-whats-new` for the repository `{{repo}}` with the base branch filter
`{{repo}}={{base}}` over the last 7 days.
