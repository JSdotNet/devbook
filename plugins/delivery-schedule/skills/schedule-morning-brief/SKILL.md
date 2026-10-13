---
name: schedule-morning-brief
description: 'Report what changed in this repository since yesterday and what needs a person today, in one screen: failed runs on the base branch, pull requests waiting on someone, what merged, what opened, and what the schedules landed overnight. Picks its own window, so it runs unattended each weekday morning; run it by hand to catch up after time away.'
---

# Scheduled: Morning Brief

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

## Purpose

Answer one question before the day starts: **what changed since yesterday, and what needs me?**
The brief is read once and acted on; the weekly update is the record.

## Inputs

- Repository: `owner/repo` (default: the current repository).
- Base branch (default: the repository's default branch).
- Window: hours to look back (default: `24`). Use `72` on a Monday, or since the last brief
  that was read, after time away.
- Sections (optional): named extras — a label, a milestone, a path — each rendered as one
  block after the four sections, in the order given, and dropped without a heading when empty.

## Skill Dependencies

Read the **Change Window Contract** (`resources/change-window-contract.md`): the sources,
what places an item in the window, the attention-first order, and what a run never does.
Nothing here restates it.

## Workflow

### Phase 1 — Gather

1. Resolve `since` as now minus the window, in UTC.
2. Read every source in the contract for `[since, now]`.

### Phase 2 — Write the Brief

3. Write it in `report.md` beside this file, per `../../resources/report-contract.md`. The
   verdict is spoken like a colleague handing over the day: when one thing makes today
   distinct — `main` is red, a release went out, a pull request has waited a week — name
   that and nothing else; otherwise name the shape.
4. The contract's four sections in its order, one row per item. When *Needs you* alone is
   empty the verdict says `Nothing needs you this morning.`; when all four are,
   `Nothing changed since <since>.`

### Phase 3 — Deliver

5. Render the brief in chat, and `render_markdown` it on the bound surface when there is one.
   Keep it to one screen: detail belongs behind the links, and the brief's job is triage.

## Related Skills

- `schedule-weekly-update` — the same sources over a week, with the numbers and the narrative
  a stakeholder reads.
- `schedule-whats-new` — pull requests across several repositories, with a checkpoint.
