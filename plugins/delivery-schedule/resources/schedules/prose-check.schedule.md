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
the default limit. Mode is `bundle` when this prompt carries the line `Mode: bundle`, and
`report` otherwise.

The tool list carries no editor, because this routine's own run only reports; a bundle is the
one place prose check writes, and the bundle's routine carries the editor.
