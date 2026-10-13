---
name: schedule-devbook-verify
description: 'The unattended drift check for the sync units no sweep writes to: run devbook:verify-change over every unit whose chapters resolve to sync: report — the default when no sync is set — and open one issue per unit with a code-ahead or conflict chapter nothing already covers. Units at off are left out; pull, push, and sync units are schedule-devbook-sweep''s. Reports and never writes a chapter, a brief, or a capture plan. The weekly devbook-verify schedule''s target.'
---

# Scheduled: Devbook Verify

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

## Purpose

Say where the chapters and the code have parted with nobody asking: a `code-ahead` row is a
capture plan waiting to be asked for, a `conflict` row a question only a person can answer,
and a `spec-ahead` row a change nobody proposed. The verdicts are `devbook:verify-change`'s;
this run only collects them and tracks the two that need someone as issues.

It covers the sync units at `report` and nothing else: a unit at `pull`, `push`, or `sync` is
`schedule-devbook-sweep`'s, and one at `off` is nobody's.

## Inputs

- Scope: every `report` unit (default), or the ones in one folder.

## Skill Dependencies

- **`devbook`** — `.devbook/_tools/devbook-meta/units.mjs` for the units, and
  `devbook:verify-change` for the verdicts, one unit per run, per "The sync unit" in
  `plugins/devbook/assets/code-sync-protocol.md`. Either absent: say which and stop.
- `gh` CLI for issue reads and writes.

## Workflow

1. **Collect.** List the units with `node .devbook/_tools/devbook-meta/units.mjs --direction report --json`;
   an `off` unit is never in it. For each unit in scope, invoke `devbook:verify-change` with the
   unit as its scope, and merge the tables into one, each row keeping its unit. The `orphans` go
   to the report as they stand. No devbook folder adopted: say so and stop.
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
4. **Report** in `report.md` beside this file, per `../../resources/report-contract.md`,
   with the issues from step 3 linked. Every row `aligned`: the counts and nothing else.

## Do not

- Do not write a chapter, a `status` line, a `sync` value, an `annotation` fence, or a change
  brief, and do not plan a capture: the issue names the capture, and a person asks for it.
- Do not open an issue for a `spec-ahead` or `unresolved` row; the report carries them.
- Do not close a `devbook-drift` issue whose row is now `aligned`: say so in the report.
- Do not verify a unit at `pull`, `push`, `sync`, or `off`.
