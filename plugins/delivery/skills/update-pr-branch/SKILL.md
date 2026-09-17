---
name: update-pr-branch
description: "Bring a pull request branch up to date with its base branch and resolve merge conflicts, then re-validate and push. Use when: a PR is behind or out of date, GitHub reports conflicts, 'this branch has conflicts that must be resolved', or a required 'branch up to date' status is blocking merge."
---

# Update Pull Request Branch

## Purpose

Integrate the latest base branch into a pull request branch, resolve every conflict with a
decision that preserves both sides' intent, re-run the project's validation, and push the
result so the PR becomes mergeable again.

## Pull Request Lane

Every `gh pr` command below is one spelling of the `pr-lane` slot. Resolve the slot first and
use whatever pull-request CLI or API the session offers for the same operation. Unbound, there
is no pull request: take the base from the input or the repository default, integrate and push
from git alone, and report the branch rather than a mergeable state. Never fail on a missing
binary. The slot and its unbound default are in `resources/surface-contract.md`.

## Inputs

- Pull request number or branch name (default: the PR for the current branch).
- Base branch (default: the PR's own base through the lane, `gh pr view --json baseRefName`;
  with no lane, the repository default branch).
- Integration strategy: `merge` (default) or `rebase`.

## Strategy Selection

| Situation | Strategy |
| --- | --- |
| PR is open and others may have pulled the branch | `merge` |
| PR is under review with existing review comments | `merge` — rebasing orphans inline comments |
| Repository requires a linear history / rebase-merge only | `rebase` |
| Branch is private, unreviewed, and history is messy | `rebase` |

`rebase` rewrites published history and needs `--force-with-lease`. Only use it after telling
the user it will rewrite the branch, and never on a branch someone else is working on.

## Hard Constraints

- Never resolve a conflict by discarding one side wholesale without reading both sides.
- Never use `git checkout --ours` / `--theirs` as a blanket resolution.
- Never force-push with plain `--force`; always `--force-with-lease`.
- Never push a branch that fails to build after conflict resolution.
- Stop and report rather than guessing when a conflict encodes a genuine design decision.

## Workflow

### Phase 1 — Establish State

1. Identify the PR and its base:

   ```bash
   gh pr view <number> --json number,headRefName,baseRefName,mergeable,mergeStateStatus,url
   ```

   `mergeable: CONFLICTING` or `mergeStateStatus: DIRTY` means real conflicts;
   `mergeStateStatus: BEHIND` means the branch only needs the base merged in.

2. Confirm the local checkout matches the PR head and is clean:

   ```bash
   git --no-pager branch --show-current
   git --no-pager status --short
   ```

   If there are uncommitted changes, stop and ask the user to commit or stash first.

3. Fetch the base:

   ```bash
   git --no-pager fetch origin <base>
   git --no-pager log HEAD..origin/<base> --oneline
   ```

4. If there are no incoming commits, report that the branch is already up to date and stop.

### Phase 2 — Integrate

5. Merge strategy:

   ```bash
   git merge origin/<base>
   ```

   Rebase strategy:

   ```bash
   git rebase origin/<base>
   ```

6. If the command completes cleanly, skip to Phase 4.

### Phase 3 — Resolve Conflicts

7. List the conflicted files:

   ```bash
   git --no-pager diff --name-only --diff-filter=U
   ```

8. For each conflicted file, resolve deliberately:

   a. Read the full file, not just the conflict hunk.

   b. Understand what each side intended:

      ```bash
      git --no-pager log --oneline -3 origin/<base> -- <file>
      git --no-pager log --oneline -3 HEAD -- <file>
      ```

   c. Classify the conflict and resolve accordingly:

      | Conflict type | Resolution |
      | --- | --- |
      | Both sides edited unrelated lines in the same hunk | Keep both edits |
      | Base refactored an API the PR calls | Adapt the PR's calls to the new API |
      | Both sides changed the same logic differently | Combine the intents; ask the user if they are mutually exclusive |
      | Generated or lock file (`package-lock.json`, `*.g.cs`, `_meta` indexes) | Take the base version, then regenerate |
      | Version or changelog line | Take the base value and re-apply the PR's entry on top |
      | File deleted on one side, edited on the other | Ask the user — never decide silently |

   d. Remove every conflict marker (`<<<<<<<`, `=======`, `>>>>>>>`) and stage the file:

      ```bash
      git add <file>
      ```

9. Verify no markers remain anywhere:

   ```bash
   git --no-pager grep -n -E "^(<<<<<<<|=======|>>>>>>>)" || echo "clean"
   ```

10. Complete the integration:

    ```bash
    git merge --continue
    ```

    or, for rebase:

    ```bash
    git rebase --continue
    ```

    Repeat Phase 3 for each subsequent rebase step that conflicts.

11. If resolution is not possible, abort cleanly and report which files blocked it:

    ```bash
    git merge --abort
    ```

    ```bash
    git rebase --abort
    ```

### Phase 4 — Re-validate

12. Regenerate anything derived from conflicted generated files before validating.
13. Run the repository's own validation. Detect the toolchain from the repository rather than
    assuming one:

    | Repository marker | Validation |
    | --- | --- |
    | `*.sln`, `*.csproj` | `dotnet restore` then `dotnet build` then `dotnet test` |
    | `package.json` | the `build`, `lint`, and `test` scripts that exist |
    | `scripts/*.ps1` check modes | run each `-Check` script the repository defines |
    | none of the above | the commands named in the `repo-instructions` file, `AGENTS.md`, or the CI workflow |

14. If validation fails, fix the fallout from the integration before pushing. Failures that
    predate the integration belong to `fix-pr-checks`.

### Phase 5 — Push

15. Confirm with the user before pushing, stating the strategy used and the conflicts resolved.
16. Push:

    ```bash
    git push
    ```

    After a rebase:

    ```bash
    git push --force-with-lease
    ```

17. Re-check the PR state:

    ```bash
    gh pr view <number> --json mergeable,mergeStateStatus
    gh pr checks <number>
    ```

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`.
With no surface bound, skip the calls, say so once, and continue — file artifacts remain
the source of truth.

- `start_run` with `skillId: "update-pr-branch"` and these stages: Establish State, Integrate,
  Resolve Conflicts, Re-validate, Push.

## Output

- Branch integrated with its base, or an explicit report of why it could not be.
- Per-file conflict resolution summary with the decision taken for each.
- Post-integration validation result.
- Updated PR mergeability and check status.

## Related Skills

- `fix-pr-checks` — for check failures that are not caused by the integration.
- `pr-merge-ready` — pick the pull request that needs this integration and run it, one PR per pass, on a timer.

## Notes

- GitHub's own "Update branch" button performs the merge strategy without conflict resolution;
  it only helps when `mergeStateStatus` is `BEHIND`, not `DIRTY`.
- Re-running this skill is safe: an already-integrated branch reports "up to date" and stops.
- After a rebase, existing inline review comments on rewritten commits become outdated. Say so
  in the PR when it matters to reviewers.
