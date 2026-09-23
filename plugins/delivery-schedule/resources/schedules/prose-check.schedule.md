---
name: prose-check
title: Prose check
cadence: weekly
cron: "0 4 * * 3"
target: devbook:prose-check
requires: [devbook]
tools: [Bash, Read, Glob, Grep, Skill]
---

Run `prose-check` from the repository root over every adopted devbook folder, with the
default limit.

The report is the publication: publish it as the schedule-report issue. No findings means the
summary in this log is enough — no issue. If the skill stops because the repository has not
adopted devbook, say so and stop.

The tool list carries no editor on purpose. This run reads and reports; the daily
`devbook-validate` schedule owns the structural repairs, and a chapter's prose changes only when
a person changes it through the folder's flow.
