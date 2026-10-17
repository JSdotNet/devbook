---
name: merge-review
title: Merge review
cadence: weekdays
cron: "0 6 * * 1-5"
target: delivery-schedule:schedule-merge-review
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Glob, Grep, Skill]
result: github
---

Run `schedule-merge-review` for `{{repo}}` with the base branch filter `{{base}}`, drafts
excluded, at most 10 pull requests per run, and comments posted.

The comments the skill posts are its findings: open no pull request and no issue. The
report lists every verdict, the pull requests skipped as already reviewed at their current
head, and the conflict hotspots of the last 30 days with the change that would end each.
