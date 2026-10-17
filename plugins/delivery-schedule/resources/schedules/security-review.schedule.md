---
name: security-review
title: Security review
cadence: weekly
cron: "0 8 * * 6"
target: delivery-schedule:schedule-security-review
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Glob, Grep, Skill]
result: github
---

Run `schedule-security-review` in the repository `{{repo}}` with scope `all`, every layer,
and issues created for findings at severity `high` and above.

The issues the skill opens are its findings. A layer that could not run — a package manager
missing, an audit command failing — is a *Needs you* row in the report, so a silent gap stays
visible.
