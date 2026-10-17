---
name: morning-brief
title: Morning brief
cadence: weekdays
cron: "30 6 * * 1-5"
target: delivery-schedule:schedule-morning-brief
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Glob, Grep, Skill]
result: session
---

Run `schedule-morning-brief` for the repository `{{repo}}` on `{{base}}` with a window of the
last 24 hours — 72 on a Monday, so the weekend is not lost.

The brief is the report.
