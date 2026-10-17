---
name: issue-sweep
title: Issue sweep
cadence: weekdays
cron: "30 4 * * 1-5"
target: delivery-schedule:schedule-issue-sweep
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill, Workflow, Agent]
result: github
maxResolve: 10
---

Run `schedule-issue-sweep` for the repository `{{repo}}` on `{{base}}` over every open issue,
with `maxResolve {{maxResolve}}` and `labelConfidence high`. Every issue nobody has classified yet gets
its labels from the repository's own set; an issue high-confidence evidence shows already
fixed, obsolete, or a duplicate is closed with that evidence in the comment — the one closure
the preamble allows; up to {{maxResolve}} of the rest are resolved one at a time, each on its own
branch under `schedule/{{name}}/<YYYY-MM-DD>/`, each opened as a **draft** pull request whose
body says what could not be proved. Nothing else is closed, nothing is ready for review.

The brief is the report: the draft pull requests with what to validate, the proposals
awaiting an answer, the flagged issues, what did not complete, what was closed.
