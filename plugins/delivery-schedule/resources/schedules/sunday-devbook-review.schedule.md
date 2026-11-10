---
name: sunday-devbook-review
title: Sunday devbook review
cadence: weekly
cron: "0 4 * * 0"
target: delivery-schedule:schedule-bundle
requires: [delivery-schedule]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill, Workflow, Agent]
result: github
jobs: [devbook-validate, tech-update, devbook-verify, prose-check, instruction-review, weekly-update, change-report]
---

Run `schedule-bundle` with bundle `{{name}}`, "{{title}}", across every main checkout this
machine lists. Nobody reads this session while it runs: take the safe answer wherever one is
asked, and end with the bundle report.
