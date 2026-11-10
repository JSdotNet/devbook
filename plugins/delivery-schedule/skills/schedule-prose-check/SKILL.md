---
name: schedule-prose-check
description: 'Run devbook:prose-check over every adopted devbook folder and report what it finds. As a job of a bundle, apply the findings instead, as one draft pull request with one commit per chapter, skipping every edit a rejected earlier run proposed. The prose-check schedule''s target.'
---

# Scheduled: Prose Check

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

## Inputs

- Mode: `bundle` when the prompt carries the line `Mode: bundle`, which a bundle adds to each
  job's prompt; `report` otherwise.
- Scope and Limit: passed to `devbook:prose-check` unchanged; its defaults stand.

## Hard Constraints

- `report` writes nothing: no chapter, no branch, no pull request.
- `bundle` applies a finding's suggestion in the sentence it quotes and nothing beside it.
  `structure` is `schedule-devbook-validate`'s. `missing-diagram`, `no-glance`,
  `mermaid-architecture`, and `coinage` ask for content a person writes. All five are reported,
  never edited.
- A finding whose chapter address and quoted sentence match a ledger row of a pull request from
  `schedule/prose-check/` that was closed without merging is skipped and named. A rejection is
  an answer.
- One commit per chapter, so a reviewer drops one chapter without losing the rest. The pull
  request stays a draft: no check proves prose reads better, and the reviewer's re-read is
  the test.

## Workflow

1. **Check.** Invoke `devbook:prose-check` with Scope and Limit. A stop because devbook is not
   adopted: say so and stop. In `report` mode, or while a draft from an earlier run is still
   open on `schedule/prose-check/`, go to step 6: that draft waits on a person, and its
   sentences are still on the base.
2. **Rejections.** `gh pr list --state closed --search "head:schedule/prose-check/" --json number,headRefName,mergedAt,body`;
   each one on `schedule/prose-check/` with `mergedAt` null contributes its ledger rows.
3. **Edit** one chapter at a time, then re-read it whole. A sentence that lost its referent
   reverts the chapter, and its findings are reported instead.
4. **Check the edits** with the devbook check the repository's `AGENTS.md` names. A chapter
   that fails it is reverted and reported, never patched around. Commit each kept chapter as
   `docs(<path>): apply <n> prose findings`.
5. **Land.** Nothing edited: no pull request. Otherwise open a draft titled
   `docs(devbook): prose check <YYYY-MM-DD>` with the ledger `| Chapter | Class | Sentence | After |`:
   the chapter as `<path>#<slug>`, the sentence verbatim as prose-check quoted it, `|` escaped;
   then *Reported, not edited* and *Skipped*, the rejecting pull request beside each row.
6. **Report** in `report.md` beside this file, per `../../resources/report-contract.md`.
