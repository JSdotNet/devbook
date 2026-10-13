---
name: chapter-review-queue
description: 'List everything a review pass left open across the devbook folders and open changes — unresolved notes, approved work awaiting acceptance, answered notes not yet swept, approvals stale since the content changed — grouped by who owes the next move. Use when: what is awaiting review or approval, whose turn it is, has an approval lapsed ("review queue").'
---

# chapter review queue

Open the reply with `devbook-collaboration@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Answer one question across every adopted devbook folder: what is a person
still owed. This is the only skill in this plugin that reads the folder rather
than one chapter, because a queue is the one thing an address cannot give you.

A chapter carries no review state — `devbook-chapter-metadata.md` says why —
so the queue is built from its decision rungs and its annotation fences, per
`devbook-annotations.md`. A review requested but not yet started is not in the
chapter; it is in the pull request or the tracker, and this queue does not see
it.

This file exceeds the 40-line body budget on purpose: the routing table in step
3 is one row per state a chapter can be waiting in, and a row left out is a
chapter that never appears in the queue.

## Steps

1. **Find the adopted folders.** Read `adopted` from devbook's entry in
   `.devbook/config.json` — the stamp, per `devbook`'s reconcile
   protocol. Fall back to the devbook folders present on disk when the
   repository has no stamp; do not ask.

2. **Collect the `meta` blocks and the notes** in those folders: scan every
   Markdown file for its `meta` fences and its `annotation` fences and read
   those fences only. `status` and the approval and acceptance records live in
   the `meta` fence; a note's address, status, and kind
   live in the `annotation` fence, and `node .devbook/_tools/devbook-meta/annotations.mjs list --chapter <address>`
   reads them for one chapter. Read each open change beside them — every
   `openspec/changes/<name>/`, never `archive/` — its `proposal.md` block, and
   the notes of the proposal and every delta counted as the change's own.
   Never build the queue from `_meta/`: it is
   generated tool input, carries no review or approval field, and a session is
   denied reading it.

3. **Sort every chapter into one row**, first match wins:

   | Row | Condition | Owed by |
   |---|---|---|
   | Approved over a question | `status: approved` or `accepted` with an open `kind: question` note | Whoever approved it |
   | Acceptance lapsed | `status: accepted` and the chapter's content changed after `accepted-at` | Whoever accepted it |
   | Stale approval | `status: approved` and the chapter's content changed after `approved-at` | Whoever approved it |
   | Objected to since approval | `status: approved` with an open note dated after `approved-at` | Whoever approved it |
   | Open notes | Any other chapter with an open note | The chapter's author, answering them — `git log` names who last wrote it |
   | Awaiting acceptance | `status: approved`, signed and unchanged | Whoever accepts the built work |
   | Rung outside `domain/` | Either decision rung, or any of its six fields, on a chapter in another folder | Whoever wrote it — devbook's check reports it |
   | Unsigned approval | `status: approved` with no `approved-by` or `approved-at` | Whoever approved it |
   | Notes to sweep | Resolved notes still in the chapter | Whoever is about to merge the branch |

   An open change is one row, addressed `openspec/changes/<name>`, sorted by
   the same table from its proposal's rung and the notes of the whole change,
   plus one row after *Awaiting acceptance*: **Awaiting approval** — a change
   at `proposed` with no open note, owed by whoever approves. *Rung outside
   `domain/`* never matches a proposal. Its fingerprint is
   `chapter-hash.mjs openspec/changes/<name>`.

   For the two lapse rows, prefer the chapter's own fingerprint: where it
   carries `approved-hash` or `accepted-hash`, compare it with
   `node .devbook/_tools/devbook-meta/chapter-hash.mjs <path#slug>` — different
   is stale, exactly, with no git and no caveat. Only where it carries none,
   fall back to comparing `approved-at` with the last commit that touched the
   chapter's own lines — `git log -1 --format=%ad --date=short -L <start>,<end>:<file>` over its
   heading range, or the file's last commit when the range is unclear. Say
   which of the three you used; a file-level answer over-reports a chapter in a
   busy file, and reporting it as exact would be wrong.

4. **Report the queue** grouped by who owes the next move, each row carrying the
   chapter address, how long it has been waiting, and its open notes verbatim
   when it has any, flags first. Order the groups by the table above — an
   approval standing over an open question, a stale one, and one objected to
   since it was signed are claims the repository is currently making and
   getting wrong, which outrank work that is merely waiting.

5. **Stop.** Offer the next move — `chapter-review` for an open-notes row,
   `chapter-approve` for a stale or objected-to row,
   `devbook:annotation-sweep` for a chapter with notes to sweep — and let the
   user pick one.

## Do not

- Do not change a chapter from here. This skill reads; the queue is a report.
- Do not fix a stale approval as part of the sweep. Lifting a rung is a decision
  about one chapter and belongs in `chapter-approve`, with the change that
  caused it in front of the person.
- Do not read chapter prose into context while sweeping. The two fence kinds
  answer the whole question, and loading the corpus is exactly what devbook's
  task-scoped loading rule forbids.
- Do not report a chapter with no decision rung and no notes. Silence is the
  normal case, not a queue entry.
- Do not sweep from here. The queue reports resolved notes; deleting them is
  `devbook:annotation-sweep`, on the branch that answered them.
