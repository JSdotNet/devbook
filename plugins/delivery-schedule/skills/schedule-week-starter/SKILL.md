---
name: schedule-week-starter
description: 'Digest what a set of topics published over the last week — Aspire, the Claude Code changelog, Anthropic news and engineering by default — with any breaking change that touches this repository first. Use when: what is new this week, a weekly tech digest.'
---

# Scheduled: Week Starter

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`.

## Inputs

- Topics: keys of the **Source Map** (default: every key).
- Window: days to look back (default `7`).
- Format: `digest` (default, one section per topic) or `timeline` (one table, newest first).

## Source Map

| Topic key | Sources |
| --- | --- |
| `aspire` | `https://github.com/microsoft/aspire/releases.atom` · `https://aspire.dev/whats-new/` |
| `claude-code` | `https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md` · docs: `https://code.claude.com/docs/en/overview` |
| `anthropic-news` | `https://www.anthropic.com/news` · `https://www.anthropic.com/engineering` |

## Workflow

### Phase 1 — Fetch

1. Per topic, fetch every source and keep what was published inside the window:
   - **A releases feed** — an entry whose `<published>` falls in the window: the tag, the date,
     and the release body's new features, breaking changes, deprecations, and fixes.
   - **The Claude Code changelog** — version sections from the top, down to the first one
     older than the window; it carries no dates, so a version's date is its GitHub release's.
   - **`aspire.dev/whats-new/`** — redirects to the latest post. Use it only when its version
     matches a release already in the window, and only to enrich that release's rows, never
     as a row of its own.
   - **The Claude Code docs** — context for a terse changelog line, never a row.
   - **Anthropic news and engineering** — dated index pages; keep model releases, agent
     tooling, and engineering practice, not every announcement.
2. A topic with nothing in the window is a `skipped` row under *Run*; an unreachable source
   is an `unread` row naming its URL.

### Phase 2 — Digest

3. The report in `report.md` beside this file, in the chosen format: up to five rows per
   release, one per change, and one row per post. A breaking change in a dependency this
   repository uses is a *Needs you* row.
