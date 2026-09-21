---
name: schedule-whats-new
description: 'Check one or more GitHub repositories for what changed since the last run: open pull requests and pull requests merged since the last checkpoint. Correlates each PR with related Jira tickets or GitHub issues where discoverable, and persists a per-repo checkpoint so the next run only reports genuinely new activity.'
disable-model-invocation: true
---

# Scheduled: What's New

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Give a concise, de-duplicated "what shipped and what's in flight" report across one or more
repositories, without re-reporting items already seen on a previous run. Covers two sources
per repo: currently open pull requests, and pull requests merged since the last run. Each PR
is enriched with any Jira ticket or GitHub issue reference it can be traced back to.

## Inputs

- Repos: comma-separated list of `owner/repo` (required — no default, this skill is
  built to run across multiple repositories in one pass).
- Base branch filter: per-repo `owner/repo=branch` pairs (optional; when set, only PRs whose
  `baseRefName` matches are reported for that repo; default is all base branches).
- Include open PRs: `true` (default) or `false`.
- Include merged PRs: `true` (default) or `false`.
- Jira base URL: e.g. `https://yourteam.atlassian.net` (optional; used to build ticket links
  when a Jira MCP tool is not available to fetch live ticket data).
- First-run look-back window: number of days of merged-PR history to report when a repo has no
  prior checkpoint (default: `7`).
- State file path (optional; default: `.github/delivery/whats-new.json` relative to the
  repository this skill is run from — i.e. the control repo, not the tracked repos).

## Skill Dependencies

This skill has no hard skill dependencies. It uses `gh` CLI (already authenticated in the
session) for all GitHub data, and optionally a Jira MCP tool if one is configured for live
ticket lookups. Falls back to constructing a Jira browse link from the configured base URL
when no Jira tool is available.

## State Model

Maintain one JSON file (path from Inputs, default `.github/delivery/whats-new.json`) with
one entry per repo:

```json
{
  "owner/repo": {
    "last_run_at": "2026-08-04T12:00:00Z",
    "known_open_pr_numbers": [101, 102],
    "reported_merged_pr_numbers": [95, 98]
  }
}
```

- `last_run_at` is the timestamp of the previous run — used as the boundary for "PRs merged
  since last time" (`mergedAt` strictly after this value).
- `known_open_pr_numbers` is the set of open PR numbers already reported; an open PR is only
  re-reported if its `updatedAt` moved past `last_run_at` (i.e. it changed since last seen).
- `reported_merged_pr_numbers` is the set of merged PR numbers already reported; used to guard
  against re-reporting a merge if `mergedAt` sits exactly on the boundary or clocks drift.
- If the state file or a repo entry does not exist yet, treat that repo as a **first run**:
  report all currently open PRs once, and all PRs merged within the look-back window.

## Workflow

### Phase 1 — Load Checkpoint

1. Read the state file at the configured path. If missing, initialize an empty state object
   and note that every configured repo will run in first-run mode.
2. For each repo in the Repos input, look up its entry (if any) and resolve `last_run_at`. For
   a first run, compute the look-back boundary as `now - <look-back window> days`.

### Phase 2 — Gather Open Pull Requests

3. If "Include open PRs" is enabled, fetch open PRs:
   ```bash
   gh pr list --repo <owner>/<repo> --state open \
     --json number,title,author,url,createdAt,updatedAt,labels,headRefName,baseRefName,body
   ```
4. Apply the base branch filter for the repo if one is configured.
5. Classify each open PR:
   - **New** — number not in `known_open_pr_numbers`.
   - **Updated** — number known, but `updatedAt` is after `last_run_at`.
   - **Unchanged** — skip from the report entirely (already seen, nothing changed).

### Phase 3 — Gather Merged Pull Requests

6. If "Include merged PRs" is enabled, fetch PRs merged since the boundary:
   ```bash
   gh pr list --repo <owner>/<repo> --state merged \
     --search "merged:>=<boundary-date>" \
     --json number,title,author,url,mergedAt,createdAt,labels,headRefName,baseRefName,body
   ```
   The `<boundary-date>` is `last_run_at` for a repeat run, or the look-back boundary for a
   first run (date form `YYYY-MM-DD` is sufficient for the `--search` filter).
7. Apply the base branch filter for the repo if one is configured.
8. Drop any PR whose number is already in `reported_merged_pr_numbers`, and any whose
   `mergedAt` is not strictly after the boundary. Report the rest as **Merged**.

### Phase 4 — Correlate Tickets

9. For every open and merged PR title, body, and `headRefName` gathered above, extract ticket
   references using these patterns (a single PR may match more than one):
   - **Jira key:** `[A-Z][A-Z0-9]{1,9}-\d+` (e.g. `PROJ-123`).
   - **GitHub issue, closing keyword:** `(close[sd]?|fix(es|ed)?|resolve[sd]?)\s+#(\d+)`
     (case-insensitive).
   - **GitHub issue, bare reference:** `#(\d+)` when not already matched above.
10. For each Jira key found:
    - If a Jira MCP tool is configured, fetch the ticket's summary and status.
    - Otherwise, if a Jira base URL is configured, build a link: `<base-url>/browse/<KEY>`
      without fetching live data.
    - If neither is available, report the raw key only.
11. For each GitHub issue reference found, fetch the issue's title and state:
    ```bash
    gh issue view <number> --repo <owner>/<repo> --json title,state,url
    ```
12. Attach resolved ticket/issue context to the originating PR.

### Phase 5 — Report

13. Produce one report covering all configured repos:

    ```
    ## What's New — <ISO date>
    Repos: <owner/repo, ...> | Since: <last run timestamp, or "first run (last <n> days)">

    ### <owner/repo>

    #### Merged pull requests (<count>)

    | PR | Title | Author | Base | Merged | Ticket |
    |----|-------|--------|------|--------|--------|
    | #98 | <title> | <author> | `<base>` | <date> | [PROJ-123](<link>) — <summary/status> |

    #### Open pull requests (<new-count> new, <updated-count> updated)

    | PR | Title | Author | Base ← Head | Status | Ticket |
    |----|-------|--------|-------------|--------|--------|
    | #101 | <title> | <author> | `<base>` ← `<head>` | 🆕 New | #45 <issue title> (open) |
    | #99 | <title> | <author> | `<base>` ← `<head>` | 🔄 Updated | — |

    ---
    ```

14. If a repo has no new activity in any category, record a single line:
    `No merged PRs or open-PR changes since <last run timestamp>.`
15. Append a footer:
    ```
    ---
    *Generated by `schedule-whats-new` on <ISO datetime UTC>.*
    *Checkpoint saved to `<state file path>`.*
    ```

### Phase 6 — Persist Checkpoint

16. For each repo processed, update its state entry:
    - `last_run_at` → current UTC timestamp.
    - `known_open_pr_numbers` → all currently open PR numbers (drop merged/closed ones).
    - `reported_merged_pr_numbers` → the prior set plus every merged PR number reported this
      run; prune numbers older than a reasonable retention window (e.g. drop entries merged
      more than 30 days ago) to keep the file bounded.
17. Write the updated state object back to the state file, creating parent directories if
    needed. Do not overwrite entries for repos that were not part of this run's Repos input.

### Phase 7 — Follow-Up (Optional)

18. After presenting the report, ask whether to act on any notable item:
    - If an open PR references a Jira ticket that is already **Done**/closed: flag as a
      candidate for merge or closure.
    - If a merged PR closed a GitHub issue that is still **open**: flag for manual issue
      closure follow-up.
    - If an open or merged PR has no discoverable ticket reference at all: note it for manual
      traceability follow-up if the team requires ticket linkage.

## Surface Reporting

Follow the **Reporting Contract** in `surface-contract.md` (`delivery` plugin).
With no surface bound, skip the calls, say so once, and continue — file artifacts remain
the source of truth.

- `start_run` with `skillId: "schedule-whats-new"` and these stages: Load Checkpoint, Gather
  Open Pull Requests, Gather Merged Pull Requests, Correlate Tickets, Report,
  Persist Checkpoint, Follow-Up.

## Output

- Consolidated "what's new" report across all configured repos, grouped by repo and split
  into merged pull requests and open-PR changes.
- Ticket/issue context attached to each PR where discoverable.
- Updated checkpoint file so the next run reports only genuinely new activity.
- Optional follow-up suggestions for closeable open PRs and unclosed linked issues.

## Notes

- Run this skill at whatever cadence suits the repos you track, from a session in the
  control repo that holds the state file. The checkpoint makes each run additive, so a run
  after a long gap reports everything since the last one rather than only the last week.
- The state file is local to whichever repo/session runs this skill; it does not need to
  live in any of the tracked repos and should not be committed to them.
- "Merged since last run" is driven by the `last_run_at` timestamp and the PR `mergedAt`
  field, so it is resilient to force-pushes and history rewrites on the base branch.
- Ticket correlation is best-effort text matching against PR title, body, and head branch
  name; it will miss tickets referenced only in linked external tools with no ID pattern.
- For very active repos, narrow the merged-PR query with a tighter `merged:>=<date>` bound
  aligned to `last_run_at` to keep `gh pr list` responses small on repeat runs.
