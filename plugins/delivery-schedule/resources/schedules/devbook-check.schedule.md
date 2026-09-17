---
name: devbook-check
title: Devbook check
cadence: daily
cron: "0 3 * * *"
target: delivery-schedule:schedule-devbook-check
requires: [delivery-schedule, devbook]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill]
---

Run `schedule-devbook-check` from the repository root over every adopted devbook folder. It
runs `devbook:check`, fixes what it reports in the source Markdown, refreshes the committed
indexes where `devbook-derived` keeps them, and lands the result as the pull request titled
`chore(devbook): daily check <YYYY-MM-DD>` — or a schedule-report issue when the ledger or
the stamp needs a person. Not adopted: say so and stop.
