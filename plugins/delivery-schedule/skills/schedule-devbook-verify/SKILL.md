---
name: schedule-devbook-verify
description: 'The unattended drift check: run devbook:verify-change over every adopted folder, one run per kind, and open one issue per code-ahead or conflict row nothing already covers. Reports and never writes a chapter, a brief, or a capture plan. The weekly devbook-verify schedule''s target.'
disable-model-invocation: true
---

# Scheduled: Devbook Verify

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Say where the chapters and the code have parted with nobody asking: a `code-ahead` row is a
capture plan waiting to be asked for, a `conflict` row a question only a person can answer,
and a `spec-ahead` row a change nobody proposed. The verdicts are `devbook:verify-change`'s;
this run only collects them and tracks the two that need someone as issues.

## Inputs

- Scope: every adopted folder (default), or one folder name.

## Skill Dependencies

- **`devbook:verify-change`** — the verdicts, one kind per run, per
  `plugins/devbook/assets/code-sync-protocol.md`. Absent: say which plugin is missing and stop.
- `gh` CLI for issue reads and writes.

## Workflow

1. **Collect.** For each adopted folder in scope, invoke `devbook:verify-change` once per kind
   its chapters carry, and merge the tables into one. Not adopted: say so and stop.
2. **Filter.** Keep the `code-ahead` and `conflict` rows. Drop a row marked `unagreed` — a
   verdict against a draft is about a sketch — and a row an open pull request or an approved
   change naming the chapter already covers.
3. **Issues.** List the open issues labelled `devbook-drift`, matched by the title
   `[Devbook drift] <path>#<heading-slug>`. One is open for a row: comment when its verdict
   changed, otherwise leave it. None: open it with labels `devbook-drift` and `automated`, the
   verdict, its evidence, and the action the report named — `devbook:capture-specs` over that
   chapter for `code-ahead`, the question put to a person for `conflict`.
4. **Report.** Publish the merged table as the schedule-report issue, `aligned` rows included,
   with the issues from step 3 linked. Every row `aligned`: say so in the run log and stop.

## Surface Reporting

Follow the **Reporting Contract** in `surface-contract.md` (`delivery` plugin): `start_run`
with `skillId: "schedule-devbook-verify"` and stages Collect, Filter, Issues, Report. No surface
bound: say so once and continue — the issues are the source of truth.

## Do not

- Do not write a chapter, a `status` line, an `annotation` fence, or a change brief, and do not
  plan a capture: the issue names the capture, and a person asks for it.
- Do not open an issue for a `spec-ahead` or `unresolved` row; the report carries them.
- Do not close a `devbook-drift` issue whose row is now `aligned`: say so in the report.
