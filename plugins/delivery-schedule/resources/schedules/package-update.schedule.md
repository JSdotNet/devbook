---
name: package-update
title: Package update
cadence: weekly
cron: "0 4 * * 6"
target: delivery-schedule:schedule-package-update
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Write, Edit, Glob, Grep, WebFetch, Skill]
result: github
---

Run `schedule-package-update` with strategy `minor-and-patch`.
