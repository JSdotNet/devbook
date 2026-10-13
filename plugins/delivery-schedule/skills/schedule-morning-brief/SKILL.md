---
name: schedule-morning-brief
description: 'Report what changed in this repository since yesterday and what needs a person today, in one screen: failed runs on the base branch, pull requests waiting on someone, what merged and opened, and what the schedules landed overnight. The morning-brief schedule''s target; by hand, a catch-up after time away.'
---

# Scheduled: Morning Brief

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`. The sources, what
places an item in the window, the order, and what a run never does are
`../../resources/change-window-contract.md`'s. The brief is triage, read once; the weekly
update is the record.

## Inputs

- Repository: `owner/repo` (default: the current one); base branch (default: its default).
- Window: hours to look back (default `24`; `72` on a Monday, or since the last brief read).
- Sections (optional): named extras — a label, a milestone, a path — each one block after the
  contract's four, in the order given, dropped when empty.

## Workflow

### Phase 1 — Gather

1. Every source in the contract over `[now − window, now]`, in UTC.

### Phase 2 — Write the Brief

2. The report in `report.md` beside this file, one screen, detail behind the links. The
   verdict hands over the day like a colleague: the one thing that makes today distinct — the
   base branch is red, a release went out, a pull request has waited a week — or else the
   shape. Nothing under *Needs you*: `Nothing needs you this morning.`

### Phase 3 — Deliver

3. In chat, and through `render_markdown` on a bound surface.
