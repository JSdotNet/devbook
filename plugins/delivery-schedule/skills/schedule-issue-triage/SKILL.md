---
name: schedule-issue-triage
description: 'The unattended inbox triage: run fleet-issue-sweep at maxParallel 0 — classify every open issue nobody has classified yet in the repository''s own labels, judge relevance and collision, propose closures — writing only the high-confidence classifications back, and publish what a person still has to decide as one schedule-report issue. The weekday issue-triage schedule''s target.'
disable-model-invocation: true
---

# Scheduled: Issue Triage

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Keep the inbox classified before anyone reads it: the morning brief and the bug-fix schedule
rank by labels, and a label written at 04:30 is what lets a 05:00 brief say what matters.
Unattended, the run writes only what it is sure of and leaves the rest as questions.

## Inputs

- Scope: every open issue (default), or an issue filter the sweep accepts.

## Skill Dependencies

- **`fleet-issue-sweep`** (`fleet` plugin) — the classification, the relevance and collision
  verdicts, the closure proposals, and every tracker write. Not installed: say so and stop.

## Workflow

1. **Triage.** Invoke `fleet-issue-sweep` with `maxParallel: 0` and `labelConfidence: high`.
   Zero workers means no marking, no dispatch, and no wait: the labels and comments it writes
   are the publication, and its brief is the run log.
2. **Report** what needs a person, as the schedule-report issue: the classifications below
   the threshold, each label the repository lacks, every flagged issue with its quoted text,
   the duplicates awaiting a close, and the closure proposals nobody could answer — with the
   brief's ready-to-run close commands. Nothing needs a person: say so in the run log and stop.
3. **Replace, do not stack.** When the previous run's report is still open, nobody has read
   it: fold its unresolved rows into this one and replace its body, so one issue carries
   everything undecided.

## Do not

- Do not raise `maxParallel`: a scheduled sweep that dispatches workers is a different
  decision, taken by scheduling `fleet-issue-sweep` itself.
- Do not lower the threshold to clear the queue: a `medium` verdict is a person's call and
  stays a proposal.
- Do not close a proposed issue, remove a flag, or create a label the repository lacks — each
  is a decision the report hands over.
