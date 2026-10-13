---
name: schedule-weekly-update
description: 'Report a repository''s week as one update a stakeholder can read: what shipped, what is in flight, the issues opened and closed, releases, failed runs on the base branch, what the schedules landed, and what carries into next week — with the numbers beside the narrative. Picks its own window, so it runs unattended at the end of each week; run it by hand for any date range.'
---

# Scheduled: Weekly Update

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

## Purpose

Keep a record of everything that changed in the repository, one update per week, written so
that someone who was not in the work can read where it stands. The morning brief is triage;
this is the account.

## Inputs

- Repository: `owner/repo` (default: the current repository).
- Base branch (default: the repository's default branch).
- Window: days to look back (default: `7`), or an ISO range `YYYY-MM-DD:YYYY-MM-DD`.
- Sections (optional): named extras — a label, a milestone, a path — each rendered as one
  block before *Carry-over*, in the order given, and dropped without a heading when empty.

## Skill Dependencies

Read the **Change Window Contract** (`resources/change-window-contract.md`): the sources,
what places an item in the window, the attention-first order, and what a run never does.
Nothing here restates it.

## Workflow

### Phase 1 — Gather

1. Resolve `[since, now]` from the window, in UTC.
2. Read every source in the contract for it, and count what each returned.

### Phase 2 — Write the Update

3. Write it in `report.md` beside this file, per `../../resources/report-contract.md`. The
   three sentences come from the items, never from the counts alone; when one thing made
   the week distinct — a release, a week-long stall, a red base branch — say it first.
4. Under *Landed*, the theme is the pull request's label where the repository uses them, and
   the release it landed in when one was published. *Carry-over* makes a stall visible week
   over week.

### Phase 3 — Deliver

5. Render the update in chat, and `render_markdown` it on the bound surface when there is one.

## Related Skills

- `schedule-morning-brief` — the same sources over one day, as triage rather than record.
- `schedule-whats-new` — pull requests across several repositories, with a checkpoint.
