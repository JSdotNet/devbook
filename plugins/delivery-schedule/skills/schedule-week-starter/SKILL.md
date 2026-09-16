---
name: schedule-week-starter
description: 'Scan configured topics for updates published in the last 7 days and produce a concise "What''s new this week" digest. Default topics: .NET Aspire, Claude Code, and the Anthropic engineering blog.'
disable-model-invocation: true
---

# Scheduled: Week Starter

## Purpose

Fetch recent release notes, changelogs, and announcements for each configured topic,
then produce a structured weekly digest so you can stay current without manually checking
multiple sources.

## Inputs

- Topics: comma-separated list (default: `aspire, claude-code, anthropic-news`). Each
  topic maps to a known source in the **Source Map** below.
- Look-back window: number of days to search (default: `7`).
- Output format: `digest` (default — grouped by topic) or `timeline` (all items ordered by date).

## Source Map

| Topic key | Source(s) |
|-----------|--------|
| `aspire` | GitHub releases: `https://github.com/microsoft/aspire/releases` · Announcement posts: `https://aspire.dev/whats-new/` (e.g. `https://aspire.dev/whats-new/aspire-13-4/`) |
| `claude-code` | Release notes: `https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md` · Repo activity: `https://github.com/anthropics/claude-code` · Docs: `https://docs.claude.com/en/docs/claude-code` |
| `anthropic-news` | Announcements: `https://www.anthropic.com/news` · Engineering blog: `https://www.anthropic.com/engineering` |

> **Note:** The Aspire repository moved from `dotnet/aspire` to `microsoft/aspire`; use the
> `microsoft/aspire` URLs going forward. Old `dotnet/aspire` links may redirect but should not
> be used as the canonical source.

> **Extending:** To add a new topic, append a row to the Source Map and reference the key in
> the Topics input. No code changes are required — just add a row and invoke the skill with
> the new key.

## Skill Dependencies

This skill has no hard skill dependencies. It uses the built-in web-fetch capability to
retrieve changelog and release data from public URLs.

## Workflow

### Phase 1 — Fetch Updates per Topic

For each topic in the configured Topics list:

1. Resolve the topic key to its Source Map URL(s). A topic may have more than one source;
   fetch each and merge results before applying the look-back filter.

2. Fetch each source and extract items published within the look-back window.
   Use the following extraction rules per source type:

   **GitHub Releases** (`github.com/<org>/<repo>/releases`):
   - Fetch `https://github.com/<org>/<repo>/releases.atom` for structured data.
   - Filter entries whose `<updated>`/`<published>` date falls within the look-back window.
   - Extract per entry: version tag, title, published date, and body (trimmed to key bullet points).
   - Applies to `https://github.com/microsoft/aspire/releases`.

   **Claude Code Changelog** (`github.com/anthropics/claude-code/blob/main/CHANGELOG.md`):
   - Fetch the raw file and parse the version sections from the top down.
   - Stop at the first version already reported in an earlier run, or once the entries fall
     outside the look-back window.
   - Extract per entry: version, the bulleted changes, and the release URL.

   **Aspire Announcement Posts** (`aspire.dev/whats-new/<slug>/`):
   - `https://aspire.dev/whats-new/` redirects to the latest post (e.g. `aspire-13-4`); fetch
     the redirect target to identify the current post slug.
   - Fetch the resolved post and extract: version/title (from slug or heading), the summary
     paragraph, and the bulleted list of highlights.
   - Treat the post as in-window if its referenced version matches a release entry from the
     `microsoft/aspire` releases feed that falls within the look-back window; otherwise skip it
     to avoid re-reporting a stale announcement.
   - Use this source to enrich the corresponding release entry with narrative context (e.g.
     "TypeScript AppHost reaches GA") rather than as a separate digest item.

   **Claude Code Docs** (`docs.claude.com/en/docs/claude-code`):
   - Fetch for descriptive context only — what a newly announced capability actually does.
   - Use it to enrich changelog entries when a line is terse, not as a standalone item.

   **Anthropic Announcements** (`anthropic.com/news`, `anthropic.com/engineering`):
   - Fetch both index pages and parse the dated post list.
   - Filter entries whose publication date falls within the look-back window.
   - Extract per entry: date, title, one-line summary, and URL.
   - Keep only posts relevant to the configured topics — model releases, agent tooling, and
     engineering practice — rather than every corporate announcement.

3. If no updates are found for a topic within the look-back window, record:
   `No updates published in the last <n> days.`

4. If a source URL is unreachable, record:
   `⚠️ Could not reach <url> — check connectivity or verify the URL in the Source Map.`

### Phase 2 — Produce Digest

5. Format the digest using the configured output format.

   **`digest` format (default):**

   ```
   ## Week Starter — <ISO date of today>
   Look-back: last <n> days

   ### .NET Aspire

   #### <version> — <date>

   <2-5 bullet summary of highlights: new features, breaking changes, deprecations>

   - **New:** <feature>
   - **Breaking:** <change> *(if any)*
   - **Fixed:** <fix>

   Full release notes: <url>

   ---

   ### Claude Code

   #### <title> — <date>

   <2-3 sentence summary>

   Source: <url>

   ---

   ### Anthropic Announcements

   #### <commit title / contributed asset> — <date> (<author>)

   <1-2 sentence summary of what was added, updated, or fixed>

   Commit: <url>

   ---
   ```

   **`timeline` format:**

   ```
   ## Week Starter — <ISO date of today> (Timeline)

   | Date | Topic | Title | Link |
   |------|-------|-------|------|
   | <date> | .NET Aspire | <version> | <url> |
   | <date> | Claude Code | <title> | <url> |
   | <date> | Anthropic | <post title> | <url> |
   ```

6. Append a footer:

   ```
   ---
   *Generated by `schedule-week-starter` on <ISO datetime UTC>.*
   *Topics: <topic-key-list> | Look-back: <n> days*
   ```

### Phase 3 — Follow-Up (Optional)

7. After presenting the digest, ask whether to act on any notable item:
   - If an Aspire release contains breaking changes: offer to invoke `flow-update-packages`
     as a framework upgrade to assess impact on the current solution.
   - If a Claude Code release introduces a new capability relevant to the configured
     plugins: note it as a potential enhancement opportunity.
   - If an Anthropic post describes an agent, skill, or workflow practice that overlaps with
     this repository's own customizations: note it as a candidate for review or reuse (do not
     copy content automatically).
   - Otherwise, confirm the digest is complete and the week can start.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`.
With no surface bound, skip the calls, say so once, and continue — file artifacts remain
the source of truth.

- `start_run` with `skillId: "schedule-week-starter"` and these stages: Fetch Updates per
  Topic, Produce Digest, Follow-Up.

## Output

- Structured weekly digest grouped by topic (or in timeline order).
- Per-item summaries with links to full release notes or changelog entries.
- Optional follow-up action suggestions for actionable updates.

## Notes

- Run this skill every Monday morning to start the week informed.
- The Source Map is intentionally flat and additive: new topics require only a new row —
  no workflow phases need to change.
- Summaries are generated from public sources only; no credentials or tokens are required.
- When a source returns a large release body, limit the extracted summary to the first
  10 bullet points or 300 words, whichever is shorter.
