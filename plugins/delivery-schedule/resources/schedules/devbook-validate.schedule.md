---
name: devbook-validate
title: Devbook validate
cadence: daily
cron: "0 3 * * *"
target: delivery-schedule:schedule-devbook-validate
requires: [delivery-schedule, devbook]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill]
---

Run `schedule-devbook-validate` from the repository root over every adopted devbook folder. It
runs `devbook:validate`, fixes what it reports in the source Markdown, refreshes the committed
indexes where `devbook-derived` keeps them, and lands the result as the pull request titled
`chore(devbook): daily validate <YYYY-MM-DD>` — or a schedule-report issue when
`devbook-config:doctor`, where installed, finds the installation needs a person. Not adopted:
say so and stop.
