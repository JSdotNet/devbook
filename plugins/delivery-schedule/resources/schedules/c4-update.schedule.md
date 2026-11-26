---
name: c4-update
title: C4 model refresh
cadence: weekly
cron: "0 8 * * 0"
target: delivery-schedule:schedule-c4-update
requires: [delivery-schedule, devbook]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill]
result: github
---

Run `schedule-c4-update`: it runs `devbook:c4-update` over every C4 level the repository has a
source for and lands what moved as one draft pull request, titled as the skill says. If there
is no `arc42/` folder, say so and stop.
