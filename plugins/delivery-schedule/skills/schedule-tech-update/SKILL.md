---
name: schedule-tech-update
description: 'The unattended technology-graph refresh: run devbook:tech-update over every tech/ layer the repository has and land what moved as one draft pull request, never a merge. The weekly tech-update schedule''s target.'
disable-model-invocation: true
---

# Scheduled: Tech Update

## Purpose

Keep `tech/` level with what the repository actually depends on, on a cadence rather than
when someone remembers: the package inventories are deterministic, so a drift between a
manifest and a chapter is a fact the run can state and a person can accept.

## Inputs

- Scope: every `tech/` layer (default), or one layer file.

## Skill Dependencies

- **`devbook:tech-update`** — the inventories, the repository analysis, and the hand-off to
  the `tech/` write path. Stops when the repository has no `tech/` folder.

## Workflow

1. **Refresh.** Invoke `devbook:tech-update` over the scope. No `tech/` folder: say so and
   stop.
2. **Land.** If any chapter moved, open a **draft** pull request titled
   `chore(tech): technology graph refresh <YYYY-MM-DD>` with the inventory deltas and every
   chapter change in its body. Nothing moved: say so in the run log and stop.

## Do not

- Do not mark a technology `adopted`, `hold`, or `retired` from here: a rating is a person's
  decision, and this run proposes it in the pull request at most.
- Do not commit the temporary inventory JSON the scripts emit.
- Do not regenerate a committed `_meta/` index here; the daily `devbook-check` schedule owns
  that refresh.
