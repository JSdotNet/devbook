---
name: phase-spec-check
description: "Spec Check phase of flow-code: one drift verdict per item against the spec and the chapters in scope; an updating skill brings code-ahead chapters level. flow-runner only."
---

# Phase: Spec Check

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

**Does**

- Gives one verdict per item against the spec and the chapters
- With an updating skill, brings code-ahead chapters level, in the change set

**Doesn't**

- Edit spec-ahead, conflict or unresolved rows
- Set the approved status
- Edit code

Build & Test and Verify say whether the change **runs**; this phase says whether it is **what
was agreed**, and whether what the repository has written down is still true. It runs after
Verify and before the ready check, so the approval sees the drift. Its place in the order is in
`resources/flow-phases.md`; who runs it, per `resources/phase-resolution.md`.

## Inputs

- **The specification** Scope recorded — the approved version when a gate sat after
  `phase-scope` — and its acceptance criteria.
- **The chapter list** Scope recorded, plus every governed chapter the change set touches, in
  the adopted devbook folders. That union is **in scope**; nothing else is.
- **The journeys** Scope listed, with the parts the item references, and what Verify
  recorded for each.
- **The change set**: the diff against the merge base, untracked files included.
- **The bound skill**: `phases.<flow>.phase-spec-check.skill` in the effective configuration.

## Step 1 — Check-Only or Check-and-Update

The bound skill's contract decides, never a flag in this phase or in the configuration.

- **A skill whose `SKILL.md` frontmatter declares `updates: true`** checks and updates.
- **Any other bound skill** — `devbook:verify-change` is the usual one — only reports, and
  this phase changes nothing in the change set.
- **Unbound,** reach the same verdicts through a read-only sub-agent in the same worktree.
  Only code that executes and tests that pass count as evidence. Unbound never updates.
- **A bound id that does not resolve** runs as unbound, named once in the run summary.

Record the mode in the stage output.

## Step 2 — One Verdict Per Item

Every item in scope gets exactly one row with the evidence that settles it:

| Verdict | Means |
| --- | --- |
| `aligned` | The code and the chapter or criterion say the same thing |
| `spec-ahead` | Agreed and not built |
| `code-ahead` | Built and not written down |
| `conflict` | The two disagree |
| `unresolved` | The evidence does not settle it |

**List the unverified scenarios.** Every scenario in the specification whose chapter names no
test for it is a row of its own, whatever `policy["openspec.scenarios"]` says: `advisory`
reports it, `linked` reports it as what will refuse acceptance.

**Check every journey Scope listed** yourself, whatever skill is bound, per
`resources/scenario-page-check.md`: a part with no proof is `spec-ahead`, and a journey whose
signature no longer matches its run is `stale`, listed in its own table after the verdicts.

## Step 3 — Update, Only When the Skill Does

Only in check-and-update mode, and only within these limits. Repeat them to the bound skill in
its brief; it is the one that edits.

- **Only `code-ahead` rows, and only chapters in scope.** The code is the truth there. A
  drifted chapter outside scope is reported, not fixed in this run.
- **`spec-ahead`, `conflict`, `unresolved`, and `stale` rows are always reported, never
  edited.** A journey, its spec, and its run are never this phase's to write. Each
  needs a decision or more code, not a chapter rewrite.
- **Follow the folder's own rules** — its instruction files and the chapter's `meta` block,
  written in the same edit — then run the repository's devbook check. A failing check marks the
  phase `blocked` with its output; never hand a failing chapter to the gate.
- **Never set the `approved` status.** It stays a person's decision. An edit that would move
  a chapter to `approved` is reverted and reported.
- **Never edit code**, and never write a review note into a chapter.

## Step 4 — List Every Edit for Personal Validation

- **Every chapter edit is a row in the stage output**: the file, the verdict row it answers,
  and a one-line account of what changed. Personal Validation presents it beside the code.
- **A rejected chapter edit reopens this phase**, the same way a code rejection reopens
  `phase-implement`. Revert the rejected edit, take the person's wording as the brief, and
  run again.

## Outputs

- The verdict table, with the mode and the bound skill named, and the journey table after
  it. Personal Validation presents
  it, Create Pull Request puts it in the description, and Report Back carries it to every
  target.
- The edit list, empty in check-only mode.

What the ready check makes of each row is its own table, in `skills/phase-ready/SKILL.md`.

## Skip

`skipped`, with the reason, when the run recorded no specification and no acceptance criteria
and the change set touches no governed chapter — a dependency update with no functional change
is the usual case. **`policy.phases.specCheck: false`** turns it off.

## Dashboard Reporting

The flow-runner reports the `Spec Check` stage from what you return, per the **Reporting
Contract** in `resources/surface-contract.md`; a delegated runner makes no surface calls.
