---
name: schedule-issue-triage
description: 'The unattended inbox triage: run delivery''s issue-triage over every open item nobody has classified yet, write only the high-confidence verdicts back as labels and comments, and publish what a person still has to decide as one schedule-report issue. The weekday issue-triage schedule''s target.'
disable-model-invocation: true
---

# Scheduled: Issue Triage

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Keep the inbox classified before anyone reads it: the morning brief and the bug-fix schedule
rank by labels, and a label written at 04:30 is what lets a 05:00 brief say what matters.
Unattended, the run writes only what it is sure of and leaves the rest as questions.

## Inputs

- Scope: every open item without the `triaged` marker (default), or a maximum count.

## Skill Dependencies

- **`issue-triage`** (`delivery` plugin) — the classification and every tracker write. Stops
  when no tracker is bound.

## Workflow

1. **Triage.** Invoke `issue-triage` with confidence threshold `high`, dry-run off. No tracker
   bound: say so and stop. The labels and comments it writes are the publication.
2. **Report** what needs a person, as the schedule-report issue: the verdicts below the
   threshold, each label the target lacks, every flagged item with its quoted text, and the
   duplicates awaiting a close. Nothing needs a person: say so in the run log and stop.
3. **Replace, do not stack.** When the previous run's report is still open, nobody has read
   it: fold its unresolved rows into this one and replace its body, so one issue carries
   everything undecided.

## Do not

- Do not lower the threshold to clear the queue: a `medium` verdict is a person's call and
  stays a proposal.
- Do not close a duplicate, remove a flag, or create a label the target lacks — each is a
  decision the report hands over.
