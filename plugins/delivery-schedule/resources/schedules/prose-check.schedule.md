---
name: prose-check
title: Prose check
cadence: weekly
cron: "0 6 * * 0"
target: delivery-schedule:schedule-prose-check
requires: [delivery-schedule, devbook]
tools: [Bash, Read, Glob, Grep, Skill]
result: session
---

Run `schedule-prose-check` from the repository root over every adopted devbook folder, with
the default limit. Pass mode `bundle` when this run is a job of a bundle, and `report`
otherwise.

The tool list carries no editor, because this routine's own run reads and reports; the daily
`devbook-validate` schedule owns the structural repairs. A bundle is the one place prose check
writes: the bundle's routine carries the editor, and the job lands its edits as a draft pull
request for a person to keep or drop, chapter by chapter.
