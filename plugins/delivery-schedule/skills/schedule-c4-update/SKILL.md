---
name: schedule-c4-update
description: 'Run devbook:c4-update over the repository''s arc42 workspace — containers from the Aspire AppHost, components from the project graph, the code level from the marked types — and land what moved as one draft pull request, never a merge. The c4-update schedule''s target, and the only run that refreshes and compares level 2.'
---

# Scheduled: C4 Update

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

## Purpose

Keep the generated part of the C4 model level with the code on a cadence. Levels 3 and 4 are
also compared in CI, by `devbook-derived`'s drift workflow; level 2 is refreshed and compared
only here, because only a local routine can start the AppHost.

## Inputs

- Scope: every level `devbook:c4-update` finds a source for (default).

## Skill Dependencies

- **`devbook:c4-update`** — the AppHost start and stop, the three generators, and the reports
  a person decides on. Stops when the repository has no `arc42/` folder.

## Workflow

1. **Refresh.** Invoke `devbook:c4-update`. No `arc42/` folder: say so and stop. A level it
   skipped — no AppHost, no `aspire-map.json`, no `.csproj`, no solution — is a *Run* row.
2. **Land.** If any file under `.devbook/arc42/c4/generated/` moved, open a **draft** pull
   request titled `chore(c4): C4 model refresh <YYYY-MM-DD>` with each file's change and every
   report `c4-update` returned in its body.
3. **Report** in `report.md` beside this file, per `../../resources/report-contract.md`.

## Do not

- Do not edit `aspire-map.json`, a `<Description>`, or a `domain/` alias to silence a report:
  each is a person's call, and the run lists it under *Needs you*.
- Do not commit the `aspire describe` output or leave the AppHost instance running.
- Do not refresh `_meta/` or the rendered views here; their scheduled job owns that refresh.
