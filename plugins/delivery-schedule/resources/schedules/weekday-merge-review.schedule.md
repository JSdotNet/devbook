---
name: weekday-merge-review
title: Merge review
cadence: weekdays
cron: "0 8 * * 1-5"
target: delivery-schedule:schedule-bundle
requires: [delivery-schedule]
tools: [Bash, Read, Glob, Grep, Skill, Workflow, Agent]
result: github
jobs: [merge-review]
---

Run `schedule-bundle` with bundle `{{name}}`, "{{title}}", across every main checkout this
machine lists. Nobody reads this session while it runs: take the safe answer wherever one is
asked, and end with the bundle report.
