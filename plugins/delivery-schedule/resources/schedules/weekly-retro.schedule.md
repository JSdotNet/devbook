---
name: weekly-retro
title: Weekly retro
cadence: weekly
cron: "0 9 * * 0,6"
target: delivery-schedule:schedule-weekly-retro
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill, Agent]
result: github
---

Run `schedule-weekly-retro` for `{{repo}}` on `{{base}}` with threshold `75`.

It fires on Saturday and again on Sunday, and runs at most once a week: a run the credit gate
or an earlier retro stops is a normal outcome, and its report says which window stopped it.
The draft pull request it opens carries the recommendations; the report links it.
