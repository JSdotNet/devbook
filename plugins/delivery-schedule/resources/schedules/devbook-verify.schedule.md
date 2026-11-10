---
name: devbook-verify
title: Devbook verify
cadence: weekly
cron: "0 5 * * 0"
target: delivery-schedule:schedule-devbook-verify
requires: [delivery-schedule, devbook]
tools: [Bash, Read, Glob, Grep, Skill]
result: github
---

Run `schedule-devbook-verify` from the repository root over every sync unit, with no direction.
It runs `devbook:verify-change` once per unit, opens one issue labelled `devbook-drift` per unit
with a `code-ahead` or `conflict` row nothing already covers, and reports the merged table. It
writes no chapter and plans no capture. Not adopted: say so and stop.
Set `bundle` when this prompt carries the line `Mode: bundle`.
