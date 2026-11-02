---
name: draft-pr-contract
description: How an unattended sweep resolves one item on its own branch and lands it — claim, worktree, the work script, the empty-diff check, the commit, the draft pull request and its ordered body, the failure marker, the worktree removal. The caller names the schedule, the item, the work script, and the failure marker. Read by schedule-issue-sweep, and by a sweep another plugin ships that lands through it.
---

# Draft Pull Request Contract

One item at a time, never two at once, in the session the sweep runs in. The caller supplies
the five parameters below; a sweep in another plugin states its own values in its own contract.

| Parameter | Issue sweep |
| --- | --- |
| `<schedule>` — the branch and worktree segment | `issue-sweep` |
| `<item>` — the item's slug | `<number>-<slug>`, issue number first |
| `<issue>` — the issue the item answers and claims | the issue itself |
| work script — a `Workflow` script and its `args` | `../scripts/resolve-issue.workflow.js` |
| `<failure marker>` — the label that keeps a failed item out of later runs | `sweep-failed` |

1. **Claim.** Add `in-progress` to `<issue>` and assign `@me`; create the label if absent. A
   claim that fails skips the item with a line in the brief.
2. **Branch.** `schedule/<schedule>/<YYYY-MM-DD>/<item>` from an up-to-date base, in a worktree
   of its own under a temporary root, so the checkout the session runs from stays clean:

   ```bash
   git fetch origin <base branch>
   git worktree add "${TMPDIR:-/tmp}/<schedule>/<item>" \
     -b schedule/<schedule>/<YYYY-MM-DD>/<item> origin/<base branch>
   ```

   Resolve the path to an absolute one — the work script anchors every agent to it.
3. **Work.** Invoke the `Workflow` tool with the work script, passing `worktree`, `branch`, and
   `baseBranch` beside the caller's own `args`. It returns `outcome`, `route`, `parkReasons`,
   and the summaries the body needs; its agents never commit, push, or call `gh`.
4. **`outcome: "ready"` → draft pull request.** Verify the diff is non-empty and confined to the
   worktree; an empty diff is a failed run, not an empty pull request. Commit with
   `<type>(<scope>): <what changed>` under 72 characters, a body stating what changed and why
   and the criteria met, `Refs #<issue>`, and the co-author line. Push and open:

   ```bash
   git -C "<worktree>" push -u origin <branch>
   gh pr create --repo <owner/repo> --base <base branch> --head <branch> --draft \
     --title "<subject line>" --body-file -
   ```

   The body carries, in this order: `Closes #<issue>`; **What changed**; **Acceptance
   criteria**, each with how it is verified; **Verification** — the command, pass and fail
   counts, repair attempts; **Review** — findings fixed and findings left open; **What could not
   be proved** — the `parkReasons` verbatim when `route` is `needs-validation`, or *everything
   was proved by a test* when it is `small-fix`; this is the section to read first, because it
   is what personal validation has to cover; **Assumptions** taken instead of asking; and a
   line saying the pull request was opened as a draft by an unattended run of the calling
   skill. A caller that adds a section names it and its place. With the `pr-body` skill
   available, write **What changed** as its Summary, **Verification** as its Evidence, and add
   its **Merge Danger** after **What could not be proved**; without it, still state the door
   there — one-way or two-way, with the decision record a one-way door rests on. Follow the
   repository's pull request template, labels, and reviewer conventions where it has them.

   Comment the pull request URL on `<issue>` and remove `in-progress`.
5. **Any other outcome** — `escalated`, `blocked`, `red`, `failed` — opens nothing. Comment on
   `<issue>` with the outcome, the stage it stopped at, and the reason; remove `in-progress`;
   add `<failure marker>` (create it if absent) so later runs skip the item until a person
   clears it — except on `escalated`, where the label names the successor instead
   (`needs-adr`, `needs-architecture`).
6. **Remove the worktree** either way — `git worktree remove --force <path>` — and continue
   with the next item. A pushed branch is the record; a session with nobody watching has
   nothing else to keep.
