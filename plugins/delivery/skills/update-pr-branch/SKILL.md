---
name: update-pr-branch
description: "Bring a pull request branch up to date with its base branch and resolve merge conflicts, then re-validate and push. Use when: a PR is behind or out of date, GitHub reports conflicts, 'this branch has conflicts that must be resolved', or a required 'branch up to date' status is blocking merge."
---

# Update Pull Request Branch

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Integrate the latest base branch into a pull request branch, resolve every conflict with a
decision that preserves both sides' intent, re-run the project's validation, and push the
result so the PR becomes mergeable again.

## Pull Request Lane

Every `gh pr` command below is one spelling of the `pr-lane` slot. Resolve the slot first and
use whatever pull-request CLI or API the session offers for the same operation. Unbound, there
is no pull request: take the base from the input or the repository default, integrate and push
from git alone, and report the branch rather than a mergeable state. Never fail on a missing
binary. The slot and its unbound default are in `resources/engine-contract.md`.

## Inputs

- Pull request number or branch name (default: the PR for the current branch).
- Base branch (default: the PR's own `baseRefName` through the lane; with no lane, the
  repository default branch).
- Integration strategy: `merge` (default) or `rebase`.

## Strategy Selection

| Situation | Strategy |
| --- | --- |
| PR is open and others may have pulled the branch | `merge` |
| PR is under review with existing review comments | `merge` — rebasing orphans inline comments |
| Repository requires a linear history / rebase-merge only | `rebase` |
| Branch is private, unreviewed, and history is messy | `rebase` |

`rebase` rewrites published history. Only use it after telling the user it will rewrite the
branch, and never on a branch someone else is working on.

## Hard Constraints

- Read both sides of every conflict before resolving it; never resolve by taking one side
  wholesale, and never with a blanket `git checkout --ours` / `--theirs`.
- Push a branch only after it builds and validates following conflict resolution.
- Stop and report rather than guessing when a conflict encodes a genuine design decision.

## Workflow

### Phase 1 — Establish State

1. Read the PR's `number`, `headRefName`, `baseRefName`, `mergeable`, `mergeStateStatus`, and
   `url`. `mergeable: CONFLICTING` or `mergeStateStatus: DIRTY` means real conflicts;
   `mergeStateStatus: BEHIND` means the branch only needs the base merged in. GitHub's own
   "Update branch" button helps only with `BEHIND`.
2. Confirm the local checkout is the PR head and clean. With uncommitted changes, stop and ask
   the user to commit them, or to set them aside as a temporary commit — never a stash, whose
   stack is shared across worktrees.
3. Fetch the base. With no incoming commits, report that the branch is already up to date and
   stop.

### Phase 2 — Integrate

4. Merge or rebase onto `origin/<base>` per the strategy. A clean result skips to Phase 4.

### Phase 3 — Resolve Conflicts

5. For each conflicted file, read the whole file, not just the hunk, and each side's recent
   commits to the file to learn what it intended. Then resolve by type:

   | Conflict type | Resolution |
   | --- | --- |
   | Both sides edited unrelated lines in the same hunk | Keep both edits |
   | Base refactored an API the PR calls | Adapt the PR's calls to the new API |
   | Both sides changed the same logic differently | Combine the intents; ask the user if they are mutually exclusive |
   | Lock or generated source file (`package-lock.json`, `*.g.cs`) | Take the base version, then regenerate |
   | Generated `_meta/` index | Take the base version and leave the refresh to the scheduled job, per `devbook-derived-artifacts.md` |
   | Version or changelog line | Take the base value and re-apply the PR's entry on top |
   | File deleted on one side, edited on the other | Ask the user — never decide silently |

6. Stage each resolved file, then grep the tree for `^(<<<<<<<|=======|>>>>>>>)`; continue
   only when no marker remains. Continue the merge or rebase, repeating this phase for each
   rebase step that conflicts.
7. If resolution is not possible, abort the merge or rebase and report which files blocked it.

### Phase 4 — Re-validate

8. Regenerate the lock and generated source files taken from the base; never a `_meta/` index.
9. Run the repository's own validation — the commands its instruction files or CI workflow
   name. Fix fallout from the integration before pushing; failures that predate the
   integration belong to `fix-pr-checks`.

### Phase 5 — Push

10. Confirm with the user before pushing, stating the strategy used and the conflicts resolved.
11. Push — after a rebase with `--force-with-lease`, never plain `--force`. A lease that fails
    because the branch moved elsewhere is the guard working; report it.
12. Re-read the PR's mergeability and checks. After a rebase, inline review comments on
    rewritten commits become outdated; say so in the PR when it matters to reviewers.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`.

- `start_run` with `skillId: "update-pr-branch"` and these stages: Establish State, Integrate,
  Resolve Conflicts, Re-validate, Push.
  Pass `sessionId: "${CLAUDE_SESSION_ID}"` — the host's session id, per the `session-id` slot.

## Output

- Branch integrated with its base, or an explicit report of why it could not be.
- Per-file conflict resolution summary with the decision taken for each.
- Post-integration validation result, and the PR's mergeability and check status.

## Related Skills

- `fix-pr-checks` — for check failures that are not caused by the integration.
- `pr-merge-ready` — picks the pull request that needs this integration, one PR per pass.
