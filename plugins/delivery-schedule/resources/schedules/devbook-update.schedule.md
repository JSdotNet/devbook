---
name: devbook-update
title: Devbook stack update
cadence: weekly
cron: "0 5 * * 6"
target: delivery-schedule:schedule-devbook-update
requires: [delivery-schedule, devbook-config, devbook]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill]
---

Run `schedule-devbook-update` from the repository root: it runs `devbook-config:update` with
the safe answer at every question and lands what moved as one draft pull request, titled as
the skill says. If `.devbook/config.json` does not exist, say so and stop.
