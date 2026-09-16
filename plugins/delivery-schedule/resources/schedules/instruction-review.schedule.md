---
name: instruction-review
title: Instruction review
cadence: weekly
cron: "0 4 * * 4"
target: delivery-schedule:schedule-instruction-review
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill]
---

Run `schedule-instruction-review` in the repository `{{repo}}` with scope `all` and rewrites
on.

The draft pull request it opens is the publication, and its ledger is the report. When
nothing was cut, the summary in this log is enough — no issue. A file skipped because an
earlier pull request was closed unmerged stays skipped; do not reopen the question.
