---
name: morning-brief
title: Morning brief
cadence: weekdays
cron: "0 5 * * 1-5"
target: delivery-schedule:schedule-morning-brief
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Glob, Grep, Skill]
---

Run `schedule-morning-brief` for the repository `{{repo}}` on `{{base}}` with a window of the
last 24 hours — 72 on a Monday, so the weekend is not lost.

Publish the brief as the schedule-report issue. When the previous brief is still open, nobody
has read it: extend the window back to that brief's date and replace its body, so the one open
issue covers everything unread and nothing between two briefs is lost.
