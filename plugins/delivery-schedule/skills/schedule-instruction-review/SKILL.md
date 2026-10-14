---
name: schedule-instruction-review
description: 'Tighten the instruction assets a repository loads into a model — cut what changes nothing, replace a duplicate with a pointer, turn a prohibition positive, fix dead pointers — as one draft pull request, one commit per file, skipping what a rejected earlier run touched. The instruction-review schedule''s target.'
---

# Scheduled: Instruction Review

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

## Inputs

- Scope: `all` (default) or a path glob.
- Rewrites: `true` (default) or `false` — cuts only.
- Exclude: path globs left alone, on top of what the contract keeps out.

## Hard Constraints

- `../../resources/instruction-tightening.md` decides scope, the standard, and what stays in full.
  Read it before the first edit and again before the pull request; it does not repeat here.
- A file touched by a pull request from `schedule/instruction-review/` that was closed without
  merging is skipped and named in the summary. A rejection is an answer.
- One commit per file, so a reviewer drops one file without losing the rest.
- Add nothing but a pointer that replaces a duplicate. A new rule is a person's.

## Workflow

### Phase 1 — Inventory

1. Collect the files in scope per the contract, drop the exclusions, and drop every file
   named in a rejected earlier run:

   ```bash
   gh pr list --state closed --limit 50 --json number,headRefName,mergedAt,files
   ```

   A pull request whose `headRefName` starts with `schedule/instruction-review/` and whose
   `mergedAt` is null is a rejection; its `files` are skipped.

2. Resolve the standard: the repository's own authoring rule where the contract says one
   counts, the contract's *Standard* section otherwise. Say which in the summary.

### Phase 2 — Read

3. Per file, walk sentence by sentence and record a finding per hit: file, line, class
   (`no-op`, `duplicate`, `prohibition`, `slop`, `dead-pointer`, `over-budget`), the text,
   and the action (`cut`, `rewrite`, `report`).
4. Test every finding against *Stays in Full* before it becomes an edit. A hit inside
   protected text becomes `report`.
5. Count body lines against the budget. Over is `report`, never a cut-to-fit.

### Phase 3 — Edit

6. Apply the cuts, then the rewrites when Rewrites is on, one file at a time. Re-read the
   whole file after; a sentence that lost its referent reverts the file to `report`.
7. Run the repository's checks as `AGENTS.md` names them. A file that fails one is reverted
   and reported, never patched around.
8. Commit per file: `tighten(<path>): <n> cut, <m> rewritten`.

### Phase 4 — Pull Request

9. Nothing edited: no pull request, no issue; the report says so.
10. Otherwise open a draft pull request titled `chore(instructions): tighten <YYYY-MM-DD>`.
    Draft because no check proves a rewritten instruction; the reviewer's re-read is the test.
    The body carries the ledger:

    | File | Lines before → after | Cut | Rewritten | Reported |
    | --- | --- | --- | --- | --- |

    then *Reported, not edited* — over-budget files, pointers that could not be resolved,
    hits in protected text — and *Skipped*, with the rejecting pull request beside each file.

### Phase 5 — Summary

11. Output the report in `report.md` beside this file, per `../../resources/report-contract.md`:
    files read, edited, skipped, lines removed, the standard applied, and the link.
