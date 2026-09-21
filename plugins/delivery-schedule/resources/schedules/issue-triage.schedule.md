---
name: issue-triage
title: Issue triage
cadence: weekdays
cron: "30 4 * * 1-5"
target: delivery-schedule:schedule-issue-triage
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Glob, Grep, Skill]
---

Run `schedule-issue-triage` for the repository `{{repo}}` over every open item that does not
carry the `triaged` label. It runs `issue-triage` at confidence `high`: the labels and comments
it writes are the publication, and an item it is not sure about stays a proposal. No tracker
bound: say so and stop.

Publish what a person still has to decide as the schedule-report issue — the proposals, the
labels the repository lacks, the flagged items, the duplicates awaiting a close. When the
previous report is still open, fold its unresolved rows into this one and replace its body.
Nothing to decide: say so in the run log and open no issue.
