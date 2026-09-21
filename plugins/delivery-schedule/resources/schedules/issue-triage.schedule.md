---
name: issue-triage
title: Issue triage
cadence: weekdays
cron: "30 4 * * 1-5"
target: delivery-schedule:schedule-issue-triage
requires: [delivery-schedule, fleet]
tools: [Bash, Read, Glob, Grep, Skill, Workflow, Agent]
---

Run `schedule-issue-triage` for the repository `{{repo}}` on `{{base}}` over every open issue.
It runs `fleet-issue-sweep` at `maxParallel 0` and `labelConfidence high`: every issue nobody
has classified yet gets its labels from the repository's own set, a duplicate is named, a thin
report gets its questions, and an issue the sweep is not sure about stays a proposal. Nothing
is dispatched and nothing is closed — a closure proposal waits for a person.

Publish what a person still has to decide as the schedule-report issue — the proposals, the
labels the repository lacks, the flagged issues, the duplicates and closure proposals awaiting
an answer. When the previous report is still open, fold its unresolved rows into this one and
replace its body. Nothing to decide: say so in the run log and open no issue.
