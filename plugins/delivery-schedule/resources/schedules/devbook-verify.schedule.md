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

Run `schedule-devbook-verify` from the repository root over every sync unit at `report` — the
default when a chapter sets no `sync`. It runs `devbook:verify-change` once per unit, opens one
issue labelled `devbook-drift` per unit with a `code-ahead` or `conflict` row nothing already
covers, and reports the merged table. Units at `pull`, `push`, or `sync` are the sweeps', and
units at `off` nobody's. It writes no chapter and plans no capture. Not adopted: say so and stop.
