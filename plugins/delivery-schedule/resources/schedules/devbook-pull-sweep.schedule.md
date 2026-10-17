---
name: devbook-pull-sweep
title: Devbook pull sweep
cadence: weekly
cron: "0 4 * * 1"
target: delivery-schedule:schedule-devbook-sweep
requires: [delivery-schedule, devbook]
tools: [Bash, Read, Write, Edit, Glob, Grep, Skill, Workflow]
result: github
maxResolve: 3
---

Run `schedule-devbook-sweep` with `direction: pull` for the repository `{{repo}}` on `{{base}}`,
with `maxResolve {{maxResolve}}`. It brings chapters level with the code for every sync group at `pull` or
`sync`: up to {{maxResolve}} `code-ahead` groups are carried in one at a time, each on its own branch
under `schedule/{{name}}/<YYYY-MM-DD>/`, each opened as a **draft** pull request whose body
lists under *Status to decide* every chapter it added at `draft`. It writes no code, and
nothing it opens is ready for review.

The brief is the report: the draft pull requests with what to validate, the groups awaiting an
answer, what did not complete, and the `devbook-sync-report` block.
