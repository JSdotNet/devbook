---
name: schedule-bug-fix
description: 'Pick the single highest-priority open GitHub issue labelled ''bug'', claim it, and resolve it in this session by running flow-code, defect kind, through to Personal Validation. One issue per run, no extra sessions.'
disable-model-invocation: true
---

# Scheduled: Bug Fix

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Take the bug backlog down by exactly one. Fetch the open GitHub issues labelled `bug`, skip
everything already in flight, select the single highest-priority remaining issue, claim it,
and run `flow-code` on it **in this session**, as a defect, — through reproduction, root cause, TDD fix, and
verification, stopping at Personal Validation.

## One Issue Per Run

This skill handles **one issue, in one session, per run.** It never prepares work for a
second session and never spawns an agent to run the flow.

That is a hard constraint, not a preference. `flow-code` runs through the `flow-runner`
agent, which must own its session to hold the Personal Validation gate, write surface
state, and ask the user a question — and this run cannot open a second session to give it
one. See **Session Ownership** and **Sub-Agent Constraints** in
`resources/flow-execution-model.md`. Because the scope is a single issue,
this session *is* the owner session and `flow-code` behaves exactly as designed.

To work more than one bug, run this skill again. Each run picks the next issue, because the
previous one is now claimed and filtered out as in flight.

## Inputs

- GitHub repository in `owner/repo` format (required).
- Additional label filters to narrow the candidate set — e.g. `critical`, `sprint-42`
  (optional; default: `bug` only).
- Severity hint for `flow-code`: `critical`, `high`, `medium`, or `low`
  (optional; default: derived from issue labels when present, otherwise `medium`).
- Base branch to branch from (default: repository default branch).
- Selection override: an explicit issue number to work instead of the ranked pick (optional).

> Candidates are fetched regardless of current assignee. The selected issue is assigned to
> `@me` and labelled `in-progress` **before** work starts, so a later run — or a run on
> another machine — filters it out instead of picking it up twice.

## Skill Dependencies

This skill invokes the following installed skill:

- **`flow-code`** — drives the full bug-resolution workflow, defect kind: scope
  discovery, reproduction, root-cause analysis, TDD fix, verification, and local-run
  monitoring, up to Personal Validation. This skill selects and claims the issue, then hands
  the session to it.

If `flow-code` is not installed, work the stages listed in Phase 4 manually and say in the
summary that the run went without the flow wrapper.

## Workflow

### Phase 1 — Fetch Candidate Bug Issues

1. List all open issues labelled `bug` (plus any additional label filters):

   ```bash
   gh issue list --repo <owner/repo> --state open --label "bug" \
     --json number,title,body,labels,assignees,milestone,url,createdAt
   ```

2. If no issues come back, report "no open bug issues" and stop.

### Phase 2 — Filter Out Work Already In Flight

3. Drop every candidate that is already being worked:

   - Labelled `in-progress` — a previous run of this skill claimed it.
   - A branch or worktree already carries its issue number. Check with
     `git --no-pager worktree list` and `git branch --all`.
   - An open pull request references it: `gh pr list --repo <owner/repo> --state open
     --search "<number>"`.
   - Assigned to somebody other than the current user.

4. If every candidate is filtered out, report that the backlog is fully in flight and stop
   without claiming anything.

### Phase 3 — Select One Issue

5. Rank the remaining candidates and take the **top one only**:

   a. Severity from labels, highest first: `critical` > `high` > `medium` > `low`. An issue
      with no severity label sorts at the configured severity hint, defaulting to `medium`.
   b. Break ties by age — oldest `createdAt` first, so nothing starves at the bottom.

   When the selection override names an issue number, take that issue instead, and still
   apply the Phase 2 in-flight check to it — report and stop if it is already being worked.

6. Report the selection: the chosen issue, its derived severity, and the count of candidates
   filtered out and left for later runs. Name the runner-up, so the next run's pick is
   predictable.

7. Ask the user to confirm the selected issue, or name a different one. Do not proceed until
   they answer.

### Phase 4 — Claim and Resolve

8. Claim the issue before touching any code:

   ```bash
   gh issue edit <number> --repo <owner/repo> --add-assignee "@me"
   gh issue edit <number> --repo <owner/repo> --add-label "in-progress"
   ```

   If the `in-progress` label does not exist in the repository yet, create it first:

   ```bash
   gh label create "in-progress" --repo <owner/repo> --color "0075ca" \
     --description "Issue is actively being worked on"
   ```

   If the claim fails (no write access, label creation rejected), stop here and report it.
   Never start work on an issue that could not be claimed.

9. Run `flow-code` in **this session**, defect kind, with the issue context below. Pass the GitHub origin as
   `githubIssue` to `start_run`, so the run reports its captured result and QA report back to
   the issue.

   ```text
   Bug: "<issue title>"
   GitHub issue: #<number> in <owner/repo>
   URL: <issue url>

   Issue description:
   <issue body>

   Labels: <labels>
   Milestone: <milestone or "none">
   Severity: <derived severity>
   Fix type: <"hotfix" if labelled hotfix or critical, otherwise "standard">
   Runtime validation target: local run + monitoring
   Branch: fix/<number>-<slug> from <base branch>
   ```

   `flow-code` owns the workflow from here: scope discovery, reproduction, root cause, a
   failing-test-first fix, verification, and local runtime validation. It stops at Personal
   Validation, and the pull request stays a separate, explicitly approved step.

10. **Never spawn an agent to run the flow**, and never start a second issue in this
    run — not even when the fix turns out to be trivial and the context still has room. The
    next issue is the next run's job.

### Phase 5 — Summary

11. Output a summary:

    | Field | Value |
    |-------|-------|
    | Issue worked | #42 — `Login fails with special chars` |
    | Severity | High |
    | Claimed | `@me`, `in-progress` |
    | Outcome | Fix implemented, awaiting Personal Validation |
    | Candidates deferred | 4 (next up: #37 — `NPE on empty cart`) |
    | In flight, skipped | 2 |

12. State what the next run will pick up, and what still needs the user — Personal Validation
    on this fix, and the pull request behind it.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`.
With no surface bound, skip the calls, say so once, and continue — file artifacts remain
the source of truth.

- `start_run` with `skillId: "schedule-bug-fix"` and these stages: Fetch Candidate Bug Issues, Filter Out
  Work Already In Flight, Select One Issue, Claim and Resolve, Summary.
- The `flow-code` flow in Phase 4 opens its own run, with the selection run's
  `githubIssue` metadata carried into its `start_run`. Reference that run id in this run's
  Claim and Resolve stage output rather than duplicating its stages here.

## Output

- Exactly one bug issue selected, claimed, and resolved up to Personal Validation.
- The remaining candidates ranked and deferred, with the next run's pick named.
- No extra sessions requested, no agents spawned, and no issue claimed twice.

## Notes

- A run either resolves one bug or is a clean no-op; it never claims more than it works, so
  an interrupted run leaves at most one issue labelled `in-progress` with a branch to pick
  back up.
- The `in-progress` label is created automatically if it does not exist. Remove it when an
  issue is abandoned, or later runs will keep skipping it.
- Severity is inferred from issue labels in this priority order:
  `critical` > `high` > `medium` > `low`. When no matching label is found the configured
  severity hint is used, defaulting to `medium`.
- To work several bugs in parallel, launch several sessions yourself and run this skill once
  in each — every run claims a different issue, so they do not collide. Do not try to make
  one run cover several issues.
- For Jira bug tickets, replace Phase 1 with a Jira skill query using the same field mapping
  (key, summary, description, priority, fix-version).

## Related Skills

- `start-session-from-issue` — the same single-issue pickup for any issue filter, routing to
  whichever `flow-*` skill matches the issue type rather than always `flow-code`'s defect kind.
- `pr-merge-ready` — takes the pull request behind this fix to merge-ready, one PR per pass.
