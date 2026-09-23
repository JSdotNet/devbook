---
name: devbook-verify
title: Devbook verify
cadence: weekly
cron: "0 4 * * 1"
target: delivery-schedule:schedule-devbook-verify
requires: [delivery-schedule, devbook]
tools: [Bash, Read, Glob, Grep, Skill]
---

Run `schedule-devbook-verify` from the repository root over every adopted devbook folder. It
runs `devbook:verify-change` once per kind in each folder, opens one issue labelled
`devbook-drift` per `code-ahead` or `conflict` row nothing already covers, and publishes the
merged table as the schedule-report issue. It writes no chapter and plans no capture. Not
adopted: say so and stop.
