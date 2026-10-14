---
name: phase-update-base
description: "Update Base phase, first in every flow-*: fetches the base and fast-forwards, or rebases the branch's unpushed commits onto it. flow-runner only."
---

# Phase: Update Base

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

**Does**
- Fetches the base and fast-forwards, or rebases the branch's own unpushed commits

**Doesn't**
- Switch branches: the run stays on the branch it was started on
- Stash, or touch a dirty tree
- Rebase a branch that already has an open PR (that's update-pr-branch)
- Resolve a conflict: it blocks instead

Both flows, first, inline. A worktree is cut from the local checkout, never from the remote, so
a branch is stale whenever the local default branch is behind, and nothing later notices.

1. **Resolve the base** from `policy.pr.base`, else the repository's default branch, and fetch
   it. No remote, or a failed fetch, is `skipped` with the reason, never `blocked`: offline is
   not an error, and a `project` run with no remote yet is the usual case.
2. **Refuse a dirty tree.** Uncommitted changes make the phase `skipped`, naming the files.
   **Never stash**: the stash stack is shared by every worktree, so an entry left here can be
   popped by another session.
3. **Never rebase a branch with an open pull request.** Mark it `skipped` and name
   `update-pr-branch`: a rewrite detaches review comments and moves code under a reviewer.
4. **Fast-forward** when the branch carries no commits of its own; otherwise **rebase** its
   own commits onto the fetched tip. That history is still private, so rewriting it is safe.
5. **Block on conflict.** Abort the rebase so the tree is exactly as it was, mark the phase
   `blocked` with the conflicting paths, and stop before the flow's next phase. A base
   conflict is work with its own scope; never fold it into this run.

Already current is `done`, saying so. Create no commit and never push.
`policy.phases.updateBase: false` makes the phase `skipped` with that reason.

Report it as the first stage passed to `start_run`, per **Reporting Contract** in
`resources/surface-contract.md`. Its place in the order: `resources/flow-phases.md`.
