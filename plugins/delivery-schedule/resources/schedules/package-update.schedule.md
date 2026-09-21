---
name: package-update
title: Package update
cadence: weekly
cron: "0 4 * * 6"
target: delivery-schedule:schedule-package-update
requires: [delivery-schedule, delivery]
tools: [Bash, Read, Write, Edit, Glob, Grep, WebFetch, Skill]
---

Run `schedule-package-update` with update strategy `minor-and-patch`, target branch
`{{base}}`, and dry-run `false`.

If the repository has no .NET solution, say so in the summary and stop; nothing is opened.

This schedule requires only the two delivery plugins. Repairing or verifying a bump is the `implement` and
`verify` services' work, and a repository binds those itself — unbound, the run reports what
it could not verify rather than opening a pull request nothing checked.

Title the pull request `chore(deps): weekly package update <YYYY-MM-DD>`. List every package
the skill skipped because its bump broke the build or the tests in the pull request body, with
the version it would have moved to, so the person merging sees what was left behind.
