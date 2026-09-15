---
name: flow-phases
description: The shared phase contract every flow-* flow runs — which phases each tier runs and in what order, which file owns each part, and the full definition of the closing phases (the Personal Validation gate, Create Pull Request, Verification, Work Item Update, Summary).
---

# Flow Phases (Engine-Owned)

Defines the phases every `flow-*` skill shares, **once**, so a maintainer edits them here
instead of in 6 `SKILL.md` files. Each `flow-*/SKILL.md` keeps only its own stages inline
and names the shared phases it runs.

## Where Each Part Lives

This file is both the index and the definition of the closing phases. The rest lives in
companion files so a run reads the part it is actually in.

| File | Holds | Read it |
| --- | --- | --- |
| `flow-execution-model.md` | Context and escalation, MCP server strategy, session ownership, delegation order, sub-agent constraints, run state and resume, **Session Handoff** | Once, at the start of the run |
| `flow-model-selection.md` | Category → model resolution and the personal override | Once, before `start_run` |
| `surface-contract.md` | The extension points, the gates mechanism, the stack config, the surface capability and its reporting contract | Once, before the first `update_stage` |
| **This file, through Update Base** | The phase tiers, and the opening Update Base phase in full | Once, at the start of the run |
| **This file, from Personal Validation onward** | Personal Validation, Create Pull Request, Verification, Work Item Update, Summary | **Only when the run reaches Personal Validation** — not at the start |
| `skills/phase-build-test/SKILL.md` and `skills/phase-validation/SKILL.md` | Build & Test and Validation, in full | When the flow-runner invokes them. It reads them itself, because it owns depth selection and the stage reporting; the sub-agent it delegates to receives the instruction, not the file |
| `skills/phase-personal-validation/SKILL.md` | The Personal Validation **review handoff** — starting the app, the links, the what-to-check list — in full | When the run reaches Personal Validation, and again on every revise round. The flow-runner reads it itself: the phase runs inline and is never delegated |

**This table is a rule, not a reading suggestion.** Everything read stays in the prompt for
the rest of the run, so reading ahead is not preparation — it is a cost paid on every
remaining turn. Re-reading a file the run already loaded is free; reading one it does not
need is not.

## Phase Tiers

**Every tier opens with Update Base**, before the flow's own stages. The flow-runner prepends
it to the stage list; no skill names it. The rest of the tier runs after those stages:

- **Code-modifying flows** — `flow-code`, `flow-update-packages`, `flow-aspire-update`,
  `flow-project` — run, in order: **Build & Test → Validation →
  Personal Validation → Create Pull Request → Verification → Work Item Update →
  Summary**.
- **Documentation/config flows** — `flow-spec`, `flow-repo` — run: **Personal Validation → Create Pull Request → Work Item
  Update → Summary**. They produce no runnable code change, so Build & Test and Validation
  do not apply.
- **`flow-code`** has no fixed tier: it runs the code-modifying tier when Scope Discovery
  determines a code-modifying change kind, and the documentation/config tier otherwise, and
  reports the resolved tier's phase names in `start_run`.
- **A `flow-*` skill shipped by a bridge plugin declares its own tier** in its own body,
  and reads this file and its companions by name. The engine never enumerates a skill in a
  layer above it, so a tier is not something it can assign from here.
- **Session Handoff belongs to no tier.** It is an interrupt, not a step: it fires whenever
  the run-level context gauge reaches the handoff threshold, at whatever stage the run has
  reached, and the run resumes on that same stage in a fresh session. See **Session
  Handoff** in `flow-execution-model.md`.

## How Skills Reference These Phases

- **No skill names Update Base.** The closing tier differs per skill, so a skill names its
  own; the opening phase is identical for every flow, so the flow-runner prepends it and
  there is nothing per-skill to say.
- A skill lists its shared phases under a `## Final Phases (Shared)` heading and links
  here. This file is the source of truth; the skill only names which phases it runs and adds
  skill-specific notes, such as the QA scope.
- No host auto-inlines an instruction file into a running skill, so each skill names its
  phases explicitly and points at the file that defines them.
- The `flow-runner` agent (`agents/flow-runner.agent.md`) runs these phases in order, drives
  the surface, and enforces the Personal Validation gate.
- Model choice for every phase and every skill-specific stage is resolved once, centrally,
  from `flow-model-selection.md` — never described here or in a skill.

## Agent Transition Rule

- Cross-plugin agents are recommended, not required. When a referenced plugin is not
  installed, skip the stage or perform it manually and continue with the remaining stages.
  A role bound in `.devbook/config.json` resolves first; see **Bindings** in
  `surface-contract.md`.
- Internal transitions **do not require separate user approval**. The flow-runner may move
  between its own stages, sub-agents, and phase skills without pausing, so the run can
  build, test, and continue up to Personal Validation.
- The required approval gate is **Personal Validation**. Stop there before creating a pull
  request, updating a work item, or marking the flow complete. A repository may add further
  gates; it may never remove this one.

## Phase: Update Base

Every tier. Runs **first**, before the flow's own stages, so the work starts from the current
base instead of from whatever commit the branch was cut at. A worktree is created from the
local checkout and never from the remote, so a branch is already stale when the local default
branch is behind — and nothing later in the run notices.

- **Prepended by the engine.** The flow-runner puts this phase at the head of the stage list
  it passes to `start_run`, and reports it like any other stage.
- **Resolve the base** from `policy.pr.base`, falling back to the repository's default
  branch, and fetch it. No remote, or a fetch that fails, marks the phase `skipped` with the
  reason — never `blocked`. Working offline is not an error.
- **Refuse to touch a dirty tree.** With uncommitted changes present, mark the phase
  `skipped` and name the files. **Never stash.** The stash stack is shared by every worktree
  of the repository, so an entry left here can be popped by another session.
- **Fast-forward when the branch carries no commits of its own** — the common case for a
  freshly cut worktree.
- **Otherwise rebase the branch's own commits onto the fetched base tip.** That history is
  still private, so rewriting it is safe here and keeps the branch linear.
- **Never rebase a branch that already has an open pull request.** Mark the phase `skipped`
  and name `update-pr-branch`, which does that job under review-safe rules: a reviewer may
  already be reading the branch, and a rewrite silently detaches review comments and changes
  code under someone mid-review.
- **Block on conflict.** Abort the rebase so the tree is exactly as it was, mark the phase
  `blocked` with the conflicting paths, and stop before the flow's first stage. Resolving a
  base conflict is work with its own scope; never fold it silently into a run the user started
  for something else.
- **Already current is `done`**, with an output saying so. Create no commit, and never push.
- **`policy.phases.updateBase: false`** turns the phase off. It is then `skipped` with that
  reason, for a repository that tracks a long-lived branch or has no remote to sync with.

**Agents:** *(default)* — no dedicated agent runs this phase, so the flow-runner performs it
directly.

**Model Category:** Documentation & Low-Complexity.

## Phase: Build & Test

Code-modifying tier. Runs after the flow's own stages, before Validation and Personal
Validation.

**Defined in `skills/phase-build-test/SKILL.md`** — steps, agents, MCP servers, and stage
reporting all live there. What stays here is its place in the tier: build every project, run
the unit suite, run the automated end-to-end suite, and never continue to Validation or
Personal Validation on a red build or a failing test. When all three are green, continue to
Validation without a confirmation prompt.

This phase is the `validate` service point. When a repository binds `validate`, that provider
supplies the build and suite run and returns the failing targets; the phase skill is the
default provider when nothing is bound.

**Model Category:** Implementation & Coding.

## Phase: Validation

Code-modifying tier. Runs after Build & Test.

**Defined in `skills/phase-validation/SKILL.md`** — depth selection per change kind, the
required-tooling policy, Playwright and Aspire preflight, evidence rules, repo context, and
revalidation after requested changes all live there. What stays here is the contract around
the phase:

- **Depth follows the change kind** the flow-runner persisted with `set_run_context`: new
  functionality gets Playwright QA with capture, a bug fix or a change to existing behavior
  gets targeted verification, a dependency update gets startup-only validation, and a change
  with nothing to run is `skipped` with the reason recorded. This selection is the last resort:
  `policy.qa.depth` outranks it, and `policy.qa.ceiling` caps the result — the full order is
  in `surface-contract.md`.
- **Required tooling is required.** When the selected depth needs the Playwright or Aspire
  MCP server and it is unavailable, mark the phase `blocked`, name the missing server and
  the setup action, and stop before Personal Validation. Never complete this phase through a
  degraded fallback, and never present browser-snapshot output as Playwright evidence.
- **A background monitor you started, you stop.** Collect the monitor's summary with
  `SendMessage` and end it with `TaskStop` before marking the phase done — see **Delegation
  Order** in `flow-execution-model.md`.

This phase covers two service points: `app.start` starts the runtime and returns base URLs
and a health verdict, and `qa.run` turns scenarios into evidence. The `data.prepare` chores
run before both.

**Model Category:** Testing, QA & Monitoring.

## Phase: Personal Validation

Every tier. Two things happen here, and keeping them apart is the point: a **review handoff**
that shows the person what to look at, and the **gate** that waits for their answer. The
handoff is a procedure and repeats freely; the gate is mandatory and decides once per pass.

### The review handoff

**Defined in `skills/phase-personal-validation/SKILL.md`** — bringing the application up and
confirming its health, publishing the review links as clickable URLs, writing the what-to-check
list, and presenting the code review and the recorded QA review all live there. It is invoked
on the first handback and again on every revise round, because a revised change set is a new
thing to look at.

It uses **no agent and no model** and runs inline in the owner session: the links have to be
clickable in the conversation the person is reading. It presents and never decides — nothing in
it can approve, skip, or soften the gate below.

### The gate

The mandatory instance of the gate pattern in **Gates** (`surface-contract.md`), placed after
`validate` with purpose `handoff`. A repository may declare further gates **in front of** this
one — `{ "at": "validate", "when": "after", "purpose": "risk" }` is the usual shape — and that
is the whole of what configuration may change here.

- **Do not delegate to an agent and do not auto-approve.** Wait for the user's explicit
  decision.
- **Commit the change set before handing back, when `policy.commit.at` is `gate`.** One commit
  per handback, on the run's working branch, with a message derived from the run's scope
  record. This is then the flow's only commit point — no earlier stage commits. Stage what the
  run changed; name anything else in the working tree in the stage output and leave it
  uncommitted. Never amend, squash, or push here — a revise round produces a **new** commit at
  the next handback, and pushing belongs to Create Pull Request. With nothing to commit, say so
  and create no empty commit. If the commit fails — a rejecting hook, a signing error — name
  the actual error in the stage output and hand back anyway: the user is present, and the
  failure is theirs to decide on. Under the default `manual` this phase commits nothing.
- **Wait for explicit user approval** before any pull request is created.
- **When the user requests changes**, record `approval: "rejected"` with the user's wording,
  reopen the appropriate implementation or specification stage in the same run, apply the
  requested changes, then repeat Build & Test, Validation, and the review handoff above.
  The run must not advance to Create Pull Request while a rejected decision is persisted.
- **When returning to Personal Validation after requested changes**, record
  `approval: "pending"` before the handoff, so the revised change set still requires
  explicit approval.
- **Record every decision durably** with `set_run_context` (`approval` of `"pending"`,
  `"approved"`, or `"rejected"`, plus the user's wording as `approvalNote`) so the gate
  survives a session resume.
- **Never let this gate be delegated to a plugin, or removed by configuration.** A gate a
  plugin can supply is not a gate. `policy.gate.personalValidation` may only be `required`;
  the key exists so the stack config can state the fact, not soften it. Splitting the handoff
  into its own skill does not weaken this: the skill is what the person is shown, never what
  decides.
- **In an unattended run** — a scheduled `schedule-*` entry point, or a spawned worker session —
  this gate blocks: park the work with a handoff brief naming what is done and what is not,
  leave `approval` as `pending`, and stop. Never self-approve because no one answered.
- **Do not leave a runtime running behind an unanswered gate.** The app must stay up while
  the user reviews, but the flow still owns it. If the user defers, ends the session, or
  steps away without deciding, shut down the runtime and any flow-owned browser windows
  under the same rules as **Create Pull Request**, leave `approval: "pending"`, and record
  in the stage output that the gate is still open and the app was stopped. A resumed run
  re-runs the review handoff before asking again.

## Phase: Create Pull Request

Every tier. This is the `deliver` service point: open the change for review under whatever
the `pr-lane` slot resolves to. With no PR lane available, produce the change set and the
description as file artifacts, say so once, and continue.

- **Create the pull request only after explicit user approval** in Personal Validation —
  never before, and only when the persisted `approval` is `approved`. `policy.pr.required`
  states whether a flow must end in one; `policy.pr.base` names the base branch.
- **Shut down validation runtime first** — and, more generally, before the run leaves your
  hands by any exit: a pull request, a `blocked` or `cancelled` finish, or a gate the user
  has stepped away from. If Validation or Personal Validation started a local application
  runtime, stop it and confirm it is no longer running before invoking any PR creation
  command. Prefer the repository's proven shutdown command. Block this phase with the actual
  shutdown error if the runtime cannot be stopped safely.
- **Close flow-owned browser windows first.** Close only windows or tabs opened for QA,
  evidence capture, or Personal Validation review. Never close the surface's own tabs or
  unrelated user browser sessions.
- **Write the PR description** from the change set, the code review outcome, and the
  validation evidence. Follow the repository's own PR template when it has one, and link the
  originating work item — `Closes` when merging resolves it, `Refs` when it does not.
- **Open it through the lane, and validate nothing twice.** Push the branch, then raise the PR
  with the host's own pull-request action when the session offers one, otherwise `gh pr create`
  or the bound GitHub tooling. Build & Test, Validation, and the recorded approval **are**
  the validation: never rebuild, re-run tests or QA, or ask for a second confirmation here.
- **Apply PR-time improvements** — final polish, labels, changelog — as part of this phase.
- **Skip this phase** (`skipped`) when the run produces no change set to submit.

**Agents:** *(default)* — no dedicated agent runs this phase, so the flow-runner performs it
directly under the category's resolved model.

**Model Category:** none. The flow-runner performs this phase inline, so it runs on the
session's own model — see `flow-model-selection.md`.

## Phase: Verification

Code-modifying tier. Runs **after** Create Pull Request and before Work Item Update. This is
the `verify` service point, and the word is OpenSpec's: Build & Test and Validation say
whether the change **runs**; this phase says whether it is **what was agreed**, and whether
what the repository has written down is still true — one verdict per item, reported where the
reviewer reads. It replaces a documentation refresh that guessed at staleness with a check
that names it. The phase is named for the question, not for the one check it runs today: a
further verification joins this phase rather than becoming a phase of its own.

- **What it checks against.** The specification the run built on — the `spec` stage's output,
  the approved version when a gate sat after `spec`, and the acceptance criteria Scope
  Discovery recorded — and the governed chapters the change set touches: the checked-in
  devbook folders (`.arc42/`, `.domain/`, `.tech/`, `.design/`, `.ai/`, at the root or under
  `.devbook/`), resolved from the scope and the changed paths.
- **Bound**, the provider takes the specification, the chapters, and the change set and
  returns one verdict per item with the evidence that settles it: `aligned`; `spec-ahead`,
  agreed and not built; `code-ahead`, built and not written down; `conflict`; or
  `unresolved`. Each row names what the verdict calls for — the chapter to bring level, the
  item still to build, the question for the user — and does none of it.
- **Unbound**, the flow-runner reaches the same verdicts itself, with only code that executes
  and tests that pass counting as evidence. The reading goes to a read-only sub-agent in the
  same worktree; the verdict table is what comes back.
- **Report; never repair.** The phase edits no source, test, or chapter and creates no commit,
  so the pull-request branch is exactly as the reviewer found it. It is `done` whatever the
  verdicts say: a `spec-ahead` or `code-ahead` row is not a failed stage, it is the finding.
  Record the table in the stage output, reflect it in the pull request body when one was
  opened — the reviewer decides with it — and Work Item Update carries it into the item's
  comment. Never route a row back into this run: the run is past its gate, so a `spec-ahead`
  row is new work with its own scope, and a `code-ahead` row is a chapter change for the flow
  that owns the folder.
- **Skip this phase** (`skipped`) with the reason when the run recorded no specification and
  no acceptance criteria and the change set touches no governed chapter — a dependency update
  with no functional change is the usual case.
- **`policy.phases.verification: false`** turns the phase off. It is then `skipped` with
  that reason.

**Agents:** the provider bound to `verify`; unbound, the flow-runner, with the reading
delegated per **Delegation Order** in `flow-execution-model.md`.

**Model Category:** Verification.

## Phase: Work Item Update

Every tier. Runs after the pull request and Verification, before Summary. It
speaks to whatever `bindings["delivery.tracker"]` names — GitHub issues, Jira tickets, or
Markdown chapters in the folder a repository that plans work as Markdown names.

- **Detect the originating work item** from the run's tracker metadata when available, then
  from the origin block a pickup skill recorded when it claimed the item and routed this
  flow (the tracker, the repository or project, the item id, and its URL).
- **Skip this phase** (`skipped`) when no work-item origin is present, when the item cannot
  be determined, or when no tracker is bound and no tracker tooling is available. Include
  the reason in the stage output.
- **Add a new comment; never rewrite the item body.** The comment carries the captured
  result, the pull request link when one exists, the Personal Validation decision, the
  recorded QA report, and the spec verdict table.
- **Include the QA report** for code-modifying flows: scenario pass/fail/flaky status,
  monitoring findings, and captured evidence or report links when available. If QA
  Validation was skipped or does not apply, state that explicitly rather than inventing a
  result. The same for the spec verdict: the table when Verification ran, the recorded
  reason when it was skipped.
- **Use the bound tracker's own tooling first** — an installed tracker plugin skill or MCP
  integration — falling back to the host's CLI for that tracker. Never create a new item.
- **Fail loudly on update errors.** If posting the comment fails, mark the stage `blocked`
  with the actual error in the output; never `done`, and never silently continue.

**Agents:** *(default)*

**Model Category:** Documentation & Low-Complexity.

## Phase: Summary

Every tier. This is where the `flow.end` chores run: each contributes to the run summary and
captures what this run learned. A chore may fail without failing the run unless it declared
itself required.

- **Summarize the delivered outcome**, the created pull request if any, and the work item
  update outcome when applicable.
- **Emit the run summary** once the pull request and any applicable work item update are
  complete, or the run concludes without one.
- **Never author measured numbers.** Token, context, and timing figures come from the
  surface's own telemetry; the summary describes what the run did, not what it cost.

**Agents:** the `flow-runner` agent.

**Model Category:** none. The flow-runner performs this phase inline, so it runs on the
session's own model — see `flow-model-selection.md`.
