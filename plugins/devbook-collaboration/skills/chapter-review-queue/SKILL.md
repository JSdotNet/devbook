---
name: chapter-review-queue
description: 'List everything a review pass left open across the devbook folders and open changes — unresolved notes, approved work awaiting acceptance, answered notes not yet swept, approvals stale since the content changed — grouped by who owes the next move. Use when: what is awaiting review or approval, whose turn it is, has an approval lapsed ("review queue").'
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

This skill writes nothing. Lifting a stale rung is a decision about one chapter, made in
`chapter-approve` with the change that caused it in front of the person, and deleting resolved
notes is `devbook:annotation-sweep`, on the branch that answered them. Build and explain the
queue from the script's output alone: it reads the fences, never chapter prose or `_meta/`.
