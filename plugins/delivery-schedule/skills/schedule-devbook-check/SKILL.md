---
name: schedule-devbook-check
description: 'The unattended devbook check: run devbook:check over every adopted folder, fix what it reports in the source Markdown, refresh the committed _meta/ indexes where devbook-derived keeps them, and land the result as one pull request — or a schedule-report issue when the ledger or the stamp needs a person. The daily devbook-check schedule''s target.'
disable-model-invocation: true
---

# Scheduled: Devbook Check

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Keep a repository's devbook honest with nobody watching: broken references and schema
violations are fixed in the chapters, and the committed indexes are the one refresh
[the checks and indexes record](../../../../.devbook/arc42/adr/checks-and-indexes.md) allows —
a scheduled run, never a session beside a chapter edit.

## Inputs

- Scope: every adopted folder (default), or one folder name.

## Skill Dependencies

- **`devbook:check`** — the check and the repairs it can prove. Stops at exit `2` when the
  repository has not adopted devbook.
- **`devbook-derived`'s refresh**, where that plugin is installed: `./build/Update-DevbookIndex.ps1`,
  or `node .devbook/_tools/devbook-meta/build.mjs --write`. Absent, there is no index to
  refresh and this run fixes Markdown only.

## Workflow

1. **Check.** Invoke `devbook:check`. Exit `2` means not adopted: say so and stop.
2. **Repair.** Fix what it reports in the source Markdown, never under `_meta/`, and re-run
   until it exits `0`. Ledger or stamp drift is not repaired here — `devbook:install` owns it
   and needs a person: publish a schedule-report issue naming it, unless one is open.
3. **Refresh** the committed indexes where `devbook-derived` materialized the refresh path.
4. **Land.** If anything changed, open the pull request titled
   `chore(devbook): daily check <YYYY-MM-DD>` with the findings, the fixes, and the moved
   index files in its body. Nothing changed: say so in the run log and stop.

## Do not

- Do not split the run per folder: a stale reference crosses folders, and the check walks
  them in one pass.
- Do not regenerate an index the repository does not commit, and do not commit one beside a
  chapter fix in any other run than this one.
