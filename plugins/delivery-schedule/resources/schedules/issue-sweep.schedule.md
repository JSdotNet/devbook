---
name: issue-sweep
title: Issue sweep
cadence: weekdays
cron: "30 4 * * 1-5"
target: delivery-schedule:schedule-issue-sweep
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill, Workflow, Agent]
---

Run `schedule-issue-sweep` for the repository `{{repo}}` on `{{base}}` over every open issue,
with `maxResolve 3` and `labelConfidence high`. Every issue nobody has classified yet gets
its labels from the repository's own set; an issue high-confidence evidence shows already
fixed, obsolete, or a duplicate is closed with that evidence in the comment — the one closure
the preamble allows; up to three of the rest are resolved one at a time, each on its own
branch under `schedule/{{name}}/<YYYY-MM-DD>/`, each opened as a **draft** pull request whose
body says what could not be proved. Nothing else is closed, nothing is ready for review.

Publish the brief as the schedule-report issue `{{title}} — <YYYY-MM-DD>`: the draft pull
requests with what to validate, the proposals awaiting an answer, the flagged issues, what did
not complete, what was closed. When the previous brief is still open, fold its unresolved rows
into this one and replace its body. Nothing to report: say so in the run log and open no
issue.
