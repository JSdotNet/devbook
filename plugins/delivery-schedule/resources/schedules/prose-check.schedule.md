---
name: prose-check
title: Prose check
cadence: weekly
cron: "0 6 * * 0"
target: devbook:prose-check
requires: [devbook]
tools: [Bash, Read, Glob, Grep, Skill]
result: session
---

Run `prose-check` from the repository root over every adopted devbook folder, with the
default limit.

The report is the publication, in the frame the preamble's rule 6 gives: *Needs you* holds
nothing, and one section per folder lists its findings — chapter, finding, the sentence at
fault quoted. No findings: `Nothing found.` If the skill stops because the repository has not
adopted devbook, say so and stop.

The tool list carries no editor on purpose. This run reads and reports; the daily
`devbook-validate` schedule owns the structural repairs, and a chapter's prose changes only when
a person changes it through the folder's flow.
