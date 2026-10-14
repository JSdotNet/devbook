---
name: chapter-review-queue
description: 'Sweep a repository''s devbook folders and open changes for everything a review pass has left open — chapters and changes carrying unresolved notes, approved work awaiting acceptance, notes answered but not yet swept, and approvals that have gone stale because the content changed after they were signed. Reports one queue grouped by who owes the next move. Use when: asking what is waiting on review, what needs approval, whose turn it is, or whether any approval has lapsed. Triggers on: "what is awaiting review", "review queue", "what needs approval", "stale approvals", "whose turn is it", "open findings across the devbook folders".'
---

# chapter review queue

Open the reply with `devbook-collaboration@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Answer one question across every adopted devbook folder and open change: what is a person
still owed. A review requested but not yet started lives in the pull request or the tracker,
and this queue does not see it.

## Steps

1. **Run the queue.** From this plugin's root:
   `node scripts/review-queue.mjs --root <repository> --json`. It reads the adopted folders
   and every open change, sorts each into the first matching row, and decides each lapse —
   the table and the fingerprint rules are in the script's header and `ROWS`. Exit `1` with
   no devbook-meta tools means the repository needs `devbook:update`; say so and stop.

2. **Report** the rows grouped by `owedBy` — `who` where it is set, else the role — in the
   order the script returns them: an approval over an open question, a lapsed one, and one
   objected to since it was signed are claims the repository is getting wrong, and lead.
   Give each row its address, `waitingDays` since `since`, and its notes verbatim. Name the
   lapse `method` of every lapse row as `methods` words it: only `hash` is exact, and
   `git-file` over-reports a chapter in a busy file.

3. **Stop and offer the next move** — `chapter-review` for open notes, `chapter-approve` for
   a stale, objected-to, or unsigned approval or a change awaiting approval,
   `chapter-accept` for work awaiting acceptance, `devbook:annotation-sweep` for notes to
   sweep — and let the user pick one.

## Never

- Change a chapter from here, lift a stale rung, or sweep a note: the queue is a report, and
  each of those is a decision about one chapter in the skill that owns it.
- Read chapter prose or `_meta/` to build or explain the queue. The script reads the fences
  alone, which is the whole question.
