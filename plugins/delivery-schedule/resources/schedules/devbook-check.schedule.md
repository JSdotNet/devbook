---
name: devbook-check
title: Devbook check
cadence: daily
cron: "0 3 * * *"
target: devbook:devbook-check
requires: [devbook]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill]
---

Run `devbook-check` from the repository root over every adopted devbook folder.

Fix what the check reports in the source Markdown, never under `_meta/`, re-run until it exits
`0`, then refresh the derived indexes. If anything changed, open the pull request titled
`chore(devbook): daily check <YYYY-MM-DD>` with the findings and the fixes in its body.

If the check exits `2`, the repository has not adopted devbook: say so and stop. If the
migration ledger or the stamp reports hard drift, do not repair it — `devbook:install` owns that
and it needs a person. Publish a schedule-report issue naming the outstanding migrations or the
drift, unless one is already open.

One schedule covers every folder. The generator walks them in one pass and a stale reference
crosses folders, so splitting the run per folder would only hide what it is there to find.
