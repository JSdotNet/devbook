---
name: saturday-code-health
title: Saturday code health
cadence: weekly
cron: "0 5 * * 6"
target: delivery-schedule:schedule-bundle
requires: [delivery-schedule]
tools: [Bash, Read, Write, Edit, Glob, Grep, WebFetch, Skill, Workflow, Agent]
result: github
jobs: [devbook-update, package-update, security-review]
---

Run `schedule-bundle` with bundle `{{name}}`, "{{title}}", across every main checkout this
machine lists. Nobody reads this session while it runs: take the safe answer wherever one is
asked, and end with the bundle report.
