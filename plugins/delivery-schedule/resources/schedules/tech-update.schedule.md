---
name: tech-update
title: Technology graph refresh
cadence: weekly
cron: "0 4 * * 3"
target: delivery-schedule:schedule-tech-update
requires: [delivery-schedule, devbook]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill]
---

Run `schedule-tech-update` over every `tech/` layer the repository has: it runs
`devbook:tech-update` and lands what moved as one draft pull request, titled as the skill
says. If there is no `tech/` folder, say so and stop.
