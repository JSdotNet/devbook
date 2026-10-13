---
name: schedule-devbook-validate
description: 'Run devbook:validate over every adopted folder, fix what it reports in the source Markdown, refresh the committed _meta/ indexes where devbook-derived keeps them, land one pull request, and report what devbook-config:doctor finds for a person. The devbook-validate schedule''s target.'
---

# Scheduled: Devbook Validate

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

## Purpose

Keep a repository's devbook honest with nobody watching: broken references and schema
violations are fixed in the chapters, and the committed indexes are the one refresh
the checks-and-indexes decision in the repository's devbook allows —
a scheduled run, never a session beside a chapter edit.

## Inputs

- Scope: every adopted folder (default), or one folder name.

## Skill Dependencies

- **`devbook:validate`** — the check and the repairs it can prove. Stops at exit `2` when the
  repository has not adopted devbook.
- **`devbook-derived`'s refresh**, where that plugin is installed: `node <generator> --write`,
  `<generator>` being the checker path the repository's `AGENTS.md` devbook section names,
  or `./build/Update-DevbookIndex.ps1` where that wrapper is materialized. Absent, there is
  no index to refresh and this run fixes Markdown only.
- **`devbook-config:doctor`**, where that plugin is installed: whether the installation —
  the stamps, the migration ledger, the `AGENTS.md` sections — is current. Absent, this run
  asks only about the chapters.

## Workflow

1. **Validate.** Invoke `devbook:validate`. Exit `2` means not adopted: say so and stop.
2. **Repair.** Fix what it reports in the source Markdown, never under `_meta/`, and re-run
   until it exits `0`.
3. **Diagnose** with `devbook-config:doctor` where it is installed. Hard drift is not
   repaired here — each component's `update` owns it and needs a person: a *Needs you* row
   in the report.
4. **Refresh** the committed indexes where `devbook-derived` materialized the refresh path.
5. **Land.** If anything changed, open the pull request titled
   `chore(devbook): daily validate <YYYY-MM-DD>` with the findings, the fixes, and the moved
   index files in its body.
6. **Report** in `report.md` beside this file, per `../../resources/report-contract.md`.

## Do not

- Do not split the run per folder: a stale reference crosses folders, and the check walks
  them in one pass.
- Do not regenerate an index the repository does not commit, and do not commit one beside a
  chapter fix in any other run than this one.
