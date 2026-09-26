---
name: schedule-devbook-update
description: 'The unattended stack update: run devbook-config:update with the safe answer at every question it would ask a person, so outstanding migrations run and stale copies are re-materialized from the plugins the session loaded, and land the result as one draft pull request — or a schedule-report issue when only a person''s step is left. The weekly devbook-update schedule''s target.'
disable-model-invocation: true
---

# Scheduled: Devbook Update

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

`schedule-devbook-validate` finds a repository behind the marketplace and says so; this run
moves it forward. A cloud session loads the marketplace the repository's committed settings
name, so its plugins are the published ones, and what `devbook-config:update` would do by hand
is a pull request a person reviews instead.

## Skill Dependencies

- **`devbook-config:update`** — the report, the fan-out to each adopted component's own
  `update`, and the re-validation. Stops when `.devbook/config.json` does not exist.

## Workflow

1. **Update.** Invoke `devbook-config:update`. Not initialized: say so and stop. Where it
   would ask a person, answer:
   - which plugins to update, and the host command that installs them: skip — the session
     already runs what the marketplace published; a plugin still behind is a finding;
   - which `reconcile` rows to run: all of them, **except `delivery-schedule:update`** — it
     writes to the scheduler and the host settings, and only a person's own turn changes a
     schedule; list it as a person's step when its stamp is behind;
   - `frozen` or `adoptable`: skip; a seeded file or a customized copy: keep the repository's;
     `devbook-config:local`: never offered.
2. **Land.** If the tree changed, open a **draft** pull request titled
   `chore(devbook): stack update <YYYY-MM-DD>`: the stamps before and after, each migration
   run, each copy left customized, each row skipped and why, and the person's steps. Only a
   person's step is left: a schedule-report issue naming it. Neither: say so and stop.

## Do not

- Do not regenerate a committed `_meta/` index here; the daily `devbook-validate` owns that.
- Do not hand-edit a stamp, a migration's output, or a delivered copy to make a check pass;
  a failing check is reported in the pull request, which stays draft.
