---
name: weekly-update
title: Weekly update
cadence: weekly
cron: "0 16 * * 5"
target: delivery-schedule:schedule-weekly-update
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Glob, Grep, Skill]
---

Run `schedule-weekly-update` for the repository `{{repo}}` on `{{base}}` over the last 7 days.

Publish the update as the schedule-report issue. When the previous update is still open,
nobody has read it: extend the window back to that update's date and replace its body, so the
one open issue covers every unread week. Closing the issue is how a week is acknowledged, and
the closed issues are the record.
