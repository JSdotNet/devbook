---
name: schedule-whats-new
description: 'Report the pull requests opened, merged, and still open across one or more repositories over a window, each traced to its Jira ticket or GitHub issue, and flag the ones whose ticket and state disagree. Stateless: every run reads its window fresh. The change-report schedule''s target.'
---

# Scheduled: What's New

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`. What places a
pull request in the window, and what a run never does with what it reads, is
`../../resources/change-window-contract.md`; this skill reads its pull request rows only.

## Inputs

- Repositories: `owner/repo, …` (default: the current one).
- Base branch filter: `owner/repo=branch` pairs (default: every base branch).
- Window: days to look back (default `7`), or an ISO range `YYYY-MM-DD:YYYY-MM-DD`.
- Jira base URL, for ticket links where no Jira tool is reachable (optional).

## Workflow

### Phase 1 — Gather

1. Per repository, the contract's three pull request sources over `[since, now]`, adding
   `body` and `headRefName` to each `--json` list, and the base branch filter applied. Open
   pull requests that did not change in the window are left out.

### Phase 2 — Correlate

2. In each title, body, and head branch name, find the ticket references: a Jira key
   (`PROJ-123`), a closing keyword before `#<n>`, and a bare `#<n>`. A Jira key reads its
   summary and status through a Jira tool when one is reachable, else links
   `<base URL>/browse/<KEY>`, else stands as the raw key. An issue reads its title and state
   with `gh issue view <n> --repo <owner/repo> --json title,state,url`.
3. *Needs you* rows: a merged pull request whose closing issue is still open, an open pull
   request whose ticket is already done, and a pull request with no ticket at all.

### Phase 3 — Report

4. One report over every repository, in `report.md` beside this file.
