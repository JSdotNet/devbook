---
name: schedule-weekly-update
description: 'Report a repository''s week as one update a stakeholder can read — what shipped, what is in flight, issues, releases, failed runs, what the schedules landed, and what carries over — with the numbers beside the narrative. The weekly-update schedule''s target; by hand, any date range.'
---

# Scheduled: Weekly Update

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`. The sources, what
places an item in the window, the order, and what a run never does are
`../../resources/change-window-contract.md`'s. Written for someone who was not in the work; the
morning brief is the triage.

## Inputs

- Repository: `owner/repo` (default: the current one); base branch (default: its default).
- Window: days to look back (default `7`), or an ISO range `YYYY-MM-DD:YYYY-MM-DD`.
- Sections (optional): named extras — a label, a milestone, a path — each one block before
  *Carry-over*, in the order given, dropped when empty.

## Workflow

### Phase 1 — Gather

1. Every source in the contract over `[since, now]`, in UTC, counting what each returned.

### Phase 2 — Write the Update

2. The report in `report.md` beside this file. The three sentences come from the items, never
   from the counts alone; what made the week distinct — a release, a stall, a red base branch
   — comes first. *Landed* themes by the pull request's label where the repository uses them,
   and names the release it shipped in.

### Phase 3 — Deliver

3. In chat, and through `render_markdown` on a bound surface.
