---
name: phase-create-pr
description: 'Shared Create Pull Request phase for every flow-* flow, after an approved Personal Validation gate. Stops the validation runtime, pushes, and opens the pull request with a description built from the review, the evidence, and the spec-check table. Invoked inline by the flow-runner agent, never directly.'
---

# Phase: Create Pull Request

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

**Does**
- Stops the runtime, pushes, opens the PR with a description from the review and evidence

**Doesn't**
- Run before an approved gate
- Re-run tests or QA

Both flows, inline, after Personal Validation. Open the change under whatever the `pr-lane`
slot resolves to; with none, write the change set and the description as file artifacts, say
so once, and continue. Nothing to submit is `skipped`.

1. **Check the gate.** Run only when the persisted `approval` is `approved`. `policy.pr.required`
   says whether the flow must end in a pull request; `policy.pr.base` names its base.
2. **Shut down what the run started**, before the run leaves your hands by any exit — this
   phase, a `blocked` or `cancelled` finish, or a gate the person stepped away from. Stop any
   runtime Verify or Personal Validation started, with the repository's proven shutdown command,
   and confirm it is down. A runtime that cannot be stopped safely blocks the phase with the
   actual error. Close only the browser windows the run opened for QA, evidence, or review —
   never the surface's tabs or the person's own.
3. **Write the description** from the change set, the review outcome, the verify evidence, and
   the spec-check table, in the repository's PR template when it has one. Link every origin:
   `Closes` when merging resolves it, `Refs` when not. With the `pr-body` skill available, write
   the description per it — Summary, Evidence at the depth Verify reached, Merge Danger;
   else, with the `show-me` skill available, write each section per it.
4. **Push, then open** with the host's own pull-request action when the session offers one,
   else `gh pr create` or the bound GitHub tooling. Build & Test, Verify, Spec Check, and the
   recorded approval **are** the validation: never rebuild, re-run tests or QA, or ask again.
5. **Apply PR-time polish** — labels, changelog — as part of this phase.

Pass the pull request URL in `links` on this stage, per **Reporting Contract** in
`resources/surface-contract.md`. A host's own Create PR button is the gate's approval:
`resources/flow-phases.md`, **Host create-PR instruction**.
