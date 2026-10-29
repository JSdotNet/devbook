---
name: schedule-devbook-verify
description: 'Run devbook:verify-change over every sync unit at report — the default when no sync is set — and open one devbook-drift issue per unit with a code-ahead or conflict chapter nothing already covers. Writes no chapter. The devbook-verify schedule''s target.'
---

# Scheduled: Devbook Verify

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

## Inputs

- Scope: every `report` unit (default), or the ones in one folder.

## Workflow

1. **Collect.** List the units with `node .devbook/_tools/devbook-meta/units.mjs --direction report --json`;
   an `off` unit is never in it. For each unit in scope, invoke `devbook:verify-change` with the
   unit as its scope, and merge the tables into one, each row keeping its unit. The `orphans` go
   to the report as they stand. No devbook folder adopted, or `units.mjs` or `devbook:verify-change`
   absent: say which and stop. The sync unit is "The sync unit" in
   `plugins/devbook/assets/code-sync-protocol.md`.
2. **Filter.** Keep the units with a `code-ahead` or `conflict` row. Drop a row marked
   `unagreed` — a verdict against a draft is about a sketch — and a row an open pull request or
   an approved change naming the chapter already covers.
3. **Issues.** One per unit. List the open issues labelled `devbook-drift`, matched by the title
   `[Devbook drift] <unit id>`; an earlier run's `[Devbook drift] <path>#<heading-slug>` for one
   of its chapters covers that row. One is open: comment when a verdict changed, otherwise leave
   it. None: open it with labels `devbook-drift` and `automated`, the unit's rows, their
   evidence, and the action the report named — `devbook:capture-specs` over the unit for
   `code-ahead`, the question put to a person for `conflict` — and that a `sync` direction on the
   unit would hand it to a sweep.
4. **Report** in `report.md` beside this file, with the issues from step 3 linked. Every row `aligned`: the counts and nothing else.

## Do not

- Do not write a chapter, a `status` line, a `sync` value, a review note, or a change
  brief, and do not plan a capture: the issue names the capture, and a person asks for it.
- Do not open an issue for a `spec-ahead` or `unresolved` row; the report carries them.
- Do not close a `devbook-drift` issue whose row is now `aligned`: say so in the report.
- Do not verify a unit at `pull`, `push`, `sync`, or `off`.
