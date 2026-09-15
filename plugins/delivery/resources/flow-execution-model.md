---
name: flow-execution-model
description: Defines where a flow-* flow runs and how its work is delegated — implementation context and escalation, MCP server strategy, session ownership, delegation order, sub-agent constraints, session handoff, and run state and resume.
---

# Flow Execution Model (Flow-Owned)

Part of the shared `flow-*` contract indexed by `flow-phases.md`.
Read this file once, at the start of a run.

## Code-Modifying Flow Context

- `flow-feature`, `flow-bug`, `flow-structure`, `flow-create-module`, `flow-create-service`,
  `flow-create-mvp`, `flow-update-packages`, `flow-aspire-update`, and
  `flow-project` are **implementation-focused** flows.
- Each of these skills **owns establishing its own implementation context** in its first
  stage — scope, acceptance or verification criteria, impacted code paths, and the
  governing instructions and guidelines for the affected area.
- When a specification, acceptance criteria, architecture decision, or equivalent
  implementation note already exists, that first stage is a short intake: read it, align
  to it, and continue. The documentation flows — `flow-arc42` and `flow-domain` — remain
  the preferred upstream source of that context when they have already run.
- When it does not exist, the first stage **derives it from the request and the codebase**
  and records the derived assumptions before continuing. Missing context is a reason to run
  that stage — never a reason to stop, hand the request back, or skip the flow and
  implement inline.
- Ad-hoc, incremental, and one-line requests are in scope for these skills. They enter
  through the same first stage as fully specified work.

### Escalation (the only stop conditions)

Stop and route the work when the request needs a decision the flow does not own.
Name the successor and invoke it after user approval; do not end the turn by asking the
user to run something themselves.

| Situation | Route to |
|---|---|
| The change requires a new architectural decision | `flow-arc42`, which records it |
| The change requires a new bounded context or service boundary | `flow-create-service`, or `flow-arc42` for the boundary decision |
| The change reshapes the **documented** domain model — a new aggregate root, a changed aggregate invariant, or a renamed concept in the ubiquitous language | `flow-domain`, which owns the domain model; skip this row when the repository keeps no `.domain/` folder |
| The change requires a cross-cutting redesign | `flow-arc42`, as a proposed decision first |
| Accepting known debt instead of fixing it | `flow-arc42`, as a technical debt record |

Everything else — an unwritten specification, absent acceptance criteria, a bug with no
reproduction, a request that arrived as one sentence — is derived in the skill's first
stage, not escalated. Adding a field, an entity, or a method inside an existing aggregate is
ordinary implementation work: only a change to the documented model itself escalates.

That first stage is named **Stage 0: Scope Discovery** in every code-modifying skill, and it
is split between a delegated search half and an inline decision half — see **Splitting Scope
Discovery** below.

## MCP Server Strategy (Shared)

This plugin ships no MCP server and requires none. A repository declares its servers in its
own MCP configuration and binds them per extension point under `bindings["delivery.mcp"]` in
`.devbook/config.json` — see **Bindings** in `surface-contract.md`. A
stage uses the servers bound to the point it serves:

| Stage | Point |
| --- | --- |
| Scope Discovery; every intake, retrieval, drafting, and review stage of a documentation/config flow | `spec` |
| Implementation, refactor, scaffolding, and configuration-writing stages | `implement` |
| Build & Test | `verify` |
| QA Validation | `app.start`, `qa.run` |
| Create Pull Request, Work Item Update | `deliver` |
| Documentation Update | `docs.update` |
| Update Base, Personal Validation, Summary | none |

Defaults, for a point the repository leaves absent:

- `implement` and `verify`: `microsoft-learn`, for targeted official Microsoft/.NET/Azure/Aspire
  lookups tied to the stack being changed — never a broad research pass.
- `app.start` and `qa.run`: `aspire` and `playwright`, under the required-tooling rule in
  `flow-phases.md`; not used when the depth is startup-only or the change has no
  browser surface.
- Every other point: none. The stage grounds itself in the repository's own instruction
  files — the `repo-instructions` slot, matching `**/*.instructions.md`, and the checked-in
  devbook chapters and ADRs.

A default is only a name until the repository declares the server behind it.
`resources/mcp-template.json` declares all three in the `.mcp.json` shape, which Claude Code
and the Copilot CLI both read from the repository root; `resources/mcp-vscode-template.json`
is the same three in the `.vscode/mcp.json` shape VS Code reads. `devbook-config:setup` and
`flow-repo` copy them into a repository that has neither; a repository that already declares
its servers keeps its own files and adds only the ids it is missing.

A bound server is matched from the live tool list by pattern at the stage that uses it, since
a host may namespace it (`mcp__<id>__*`, or `mcp__plugin_<plugin>_<id>__*`). A server that
does not answer is a normal outcome: the stage falls back to the repository's own instruction
files, records once that the server was absent, and continues. It never stops the run and
never becomes an MCP setup task. QA's required tooling is the one place absence marks a phase
`blocked` — still never the run. Query the servers the point names and no others.

## Execution Model (Shared)

Defines *where* a flow runs and *how* its progress is tracked. Applies to every
`flow-*` skill.

### Session Ownership

- **One owner session.** The `flow-runner` agent runs the flow in the session it
  was invoked from and stays the sole owner of the run: it alone calls `start_run`,
  `update_stage`, `set_run_context`, and `finish_run`, and it alone holds the Personal
  Validation gate. Never delegate surface writes or the approval decision.
- **Never start a second flow in the same session** while a run is
  `in_progress`; the surface's tool-activity insight is session-wide and would
  mis-attribute the work.

### Delegation Order

1. **Do it inline** for short, decision-heavy steps that need the run's context.
2. **Delegate to a sub-agent (the default for heavy work, not a suggestion).** A sub-agent
   gets its own context but the **same worktree**, so evidence paths, the change set, and the
   running application all stay valid for the owner session. This keeps verbose output out of
   the flow-runner's context without breaking the run record.

   Four kinds of work are delegated by default, and running them inline is a defect in the
   run rather than a shortcut:
   - **Build & Test** — per `skills/phase-build-test/SKILL.md`.
   - **QA Validation** — per `skills/phase-qa-validation/SKILL.md`.
   - **Scope Discovery's search half** — see **Splitting Scope Discovery** below.
   - **Broad exploration and large edits** — reading across many files to find something,
     or a refactor whose diff is larger than the reasoning about it.

   The test is what the step *leaves behind*: a step whose output is large and whose
   conclusion is small belongs in a sub-agent, because the owner session only needs the
   conclusion but pays for the output on every remaining turn of the run.
3. **Run a background sub-agent only for genuinely concurrent long-running work** — in
   practice, the runtime monitor tailing Aspire logs while Playwright drives scenarios. Launch
   it with the `Agent` tool's `run_in_background`, steer it with `SendMessage`, and do not
   background work merely to save context.
4. **Stop every background sub-agent you started, in the same phase that started it.**
   The runtime monitor is built to poll until told otherwise — its own instructions say not to stop
   monitoring — so nothing ends it on its own. Ask it for its final summary with
   `SendMessage`, then end it with `TaskStop`. A monitor left running keeps polling Aspire
   after the run has moved on, and a phase must never complete with a background agent it
   started still alive.

Whichever form is used, pass the model resolved for that stage's category per
`flow-model-selection.md` in the `Agent` call's `model`. That
parameter is the *only* place a category model takes effect — an inline stage runs on the
session's model no matter what the table says, so skipping delegation silently discards the
model choice along with the context saving.

### Splitting Scope Discovery

Every code-modifying skill opens with a **Scope Discovery** stage (`Stage 0`, or the
equivalent intake stage). It does two different jobs, and only one of them belongs inline:

| Half | Work | Where it runs |
|---|---|---|
| **Search** | Identify the impacted or suspected code paths and the integration points they touch; identify the governing instructions — the `repo-instructions` slot, matching `**/*.instructions.md`, guidelines and ADRs | A **read-only search sub-agent** in the same worktree |
| **Decision** | Restate the requested behavior, derive the acceptance or verification criteria, record the derived scope and assumptions, decide whether to escalate | **Inline**, in the owner session |

The split follows the same test as every other delegation: the search half reads widely and
concludes briefly, while the decision half is short, judgement-heavy, and feeds every later
stage. Run whole and inline, Scope Discovery loads the codebase into the context that then
has to survive Implementation, QA, and the approval gate.

- **Ask the search sub-agent for a findings list**, not for file contents: the paths, the
  integration points, and the governing instructions that actually apply, each with one line
  of why. It does not propose scope, derive criteria, or decide escalation.
- **The flow-runner keeps the decision half**, because escalation and acceptance criteria
  are the run's own judgement and cannot be handed to an agent that cannot ask the user.
- **Skip the split when the search is trivially small** — a named file, a one-line change, or
  an already-approved specification that names its own impacted paths. The sub-agent is
  overhead when there is nothing to search.

### Turn Cost

Every tool call is a model turn, and every turn re-reads the entire prompt. Context size and
turn count therefore multiply: at a large context, an extra round-trip is expensive in a way
it never is early in a run. Two habits follow:

- **Batch shell work.** Chained or scripted commands cost one turn; the same commands issued
  one at a time cost one turn each, at full prompt price. Shell calls are the most numerous
  tool calls a flow makes, so this is where batching pays most.
- **Ask for the answer, not the material.** Prefer a search that returns the matching lines
  over reading whole files to find them, and prefer a sub-agent's summary over its
  transcript. Material read into the owner session is re-billed on every later turn; an
  answer is paid for once.

Neither is a reason to guess. Read what the decision actually needs — the waste being named
here is re-reading and drip-feeding, not thoroughness.

**Escalate to sub-agent delegation when the run-level context gauge approaches its limit.**
The gauge described in **Context and Token Insight** (`surface-contract.md`)
is the signal: when the owner session's context is filling up, move the next heavy step —
broad exploration, large refactors, verbose build/test output — to a sub-agent so its cost
lands in a separate context window, instead of continuing inline until compaction interrupts
the run mid-flow. The gauge ignores sub-agent samples, so this genuinely relieves the owner
session's context. This is the existing delegation order applied earlier, not a new
mechanism; background sub-agents remain reserved for concurrent monitoring.

### Sub-Agent Constraints

- **Keep sub-agents in the owner's worktree.** A plain `Agent` call shares the worktree, so
  the change set, the running application, and evidence paths all stay valid. Only pass
  `isolation: "worktree"` when parallel agents would otherwise write the same files — an
  isolated agent cannot see the owner's uncommitted change set and must not be asked to
  build, test, or validate it.
- **Evidence must land in the owner's worktree.** Instruct any isolated or background agent
  to write evidence under the owner worktree root, or copy it back before the owner reports
  it. The surface serves evidence only from that root and rejects paths outside it.
- The owner session reports a sub-agent's findings; a sub-agent never calls surface tools.
- **A sub-agent never prompts the user.** `AskUserQuestion` is foreground-only — the harness
  strips it from sub-agents, so a sub-agent that reaches for it errors out mid-stage, and
  "wait for the user to approve" has no user turn to wait for. When a sub-agent hits a
  decision it does not own, it **stops and returns the decision to its caller** as
  structured findings: the question, the options it sees, its recommendation, and the
  default it would take if told to proceed. The owner session is the only one that asks the
  user and the only one that records the answer. Never invent an answer and continue, and
  never end a sub-agent's turn waiting for input that cannot arrive.
- **The Personal Validation gate belongs to the owner session, always.** A sub-agent —
  including a backgrounded or worktree-isolated one — cannot hold it: it cannot hand control
  back to the user and cannot persist `approval`. A sub-agent runs up to the gate, returns
  its change set, evidence, and code review, and stops. The session that launched it takes
  the gate.
- **Never run a flow as a sub-agent.** A `flow-*` run needs all three of the
  capabilities a sub-agent lacks: the user turn behind Personal Validation, `AskUserQuestion`
  for a decision it does not own, and ownership of the run (which the two rules
  above reserve for the owner session, and whose telemetry is session-wide). So the
  `flow-runner` agent is always a session's main loop, never something another agent spawns.
  Delegation *within* a run — build, test, QA, large edits — stays sub-agent work as
  described under **Delegation Order**.
- **One item per run, and never a fan-out.** A skill that works from a queue of issues or
  pull requests selects **one** item, claims it, and runs the flow for it in its own
  session, as `start-session-from-issue`, `pr-merge-ready`, and the `schedule-*` entry points
  of `delivery-schedule` do. An
  `flow-*` run does not prepare work for other sessions and does not spawn them: it owns a
  run, a Personal Validation gate, and a user turn, none of which survives being
  split across sessions mid-flow. Parallelism across items comes from the **user**
  starting another session and running the skill again — each run claims a different item, so
  concurrent runs do not collide.

  This is a rule about **flows**, not a statement that sessions cannot be created.
  They can: a one-time scheduled task becomes a fresh session, and the `fleet` plugin's
  sweep skills use exactly that to spawn a worker per item. That mechanism belongs to
  `fleet-*` skills, which own no run and hold no gate. It stays unavailable to `flow-*`
  skills, because a spawned session starts with no memory of the run that spawned it — so a
  flow handed across one would lose the context its later stages depend on.

### Session Handoff

Delegation relieves a *step*; it does not relieve a *run*. Every turn re-reads the whole
context, so a long-lived owner session pays more for the same work at its last stage than it
did at its first, and a run that outgrows the window loses to compaction exactly the detail
it was carrying that context for. Handoff caps the **session**, not the run: the run
continues in a fresh session, from the state already on disk.

The steps below are the whole procedure: capture the state, write the brief the next session
reads, mark the run, and hand back the message to paste. Two cases hand off the same way with
the run-marking steps skipped — a session carrying no run at all, and work whose next step
belongs to a different repository, where the run cannot follow because run state is stored per
project.

The plugin's telemetry hook announces the gauge crossings that drive this — once per
crossing, on the tool call that crosses it, latched so it does not repeat:

| Gauge | Signal | What the run does |
| --- | --- | --- |
| **60%** | `delegate` | Push the next heavy step to a sub-agent in the same worktree, per **Delegation Order** above. |
| **75%** | `prepare-handoff` | Persist the decisions that gate later phases, finish the stage in flight, and start no further heavy stage inline. |
| **85%** | `hand-off` | Hand off now. |

The warnings are a backstop, not a schedule. A stage already known to be expensive — a broad
refactor, a full QA pass — is worth handing off *before* starting it rather than partway
through.

**Handing off**, in the session that is ending:

1. **Persist what gates a later phase** with `set_run_context`: `changeKind`, and
   `approval` plus the user's wording when Personal Validation has already decided.
   Conversation memory does not survive the handoff; the run JSON does.
2. **Leave the stage in flight `in_progress`.** Do not mark it `done` to leave things
   tidy — a resumed run continues from the first stage that is not `done`, so a stage
   rounded up to `done` is a stage the next session skips.
3. **Mark the handoff** with `set_run_context` (`handoff: true`), passing `handoffNote`:
   what is finished, what is not, the files and evidence paths the next session needs, and
   the exact invocation to resume with. This is what separates a handoff from an abandoned
   run — without it the run is merely idle, `start_run` refuses to reattach, and the next
   session opens a duplicate. The note lands on the run, where `get_run` and `list_runs`
   surface it, rather than in a conversation the next session cannot read.
4. **Commit the work in progress, or describe it in the note.** The next session inherits the
   worktree but none of the reasoning behind an uncommitted diff.
5. **Hand the user the resume invocation and stop.** Do not start the next session yourself:
   a run's owner session is a foreground session with a user turn behind it — see **Never run
   a flow as a sub-agent** above.

**Resuming** is the ordinary resume path, not a special mode. `start_run` with the same
`skillId` reattaches and returns `resumed: true` — it accepts a handed-off run even though
that run is idle by every other signal — and clears the marker so telemetry attributes the
new session's work to the run again. The run continues from the first stage that is not
`done`. Read `handoff.note` from `get_run` **before** re-deriving anything: it exists so
the fresh session does not pay a second time to rediscover what the previous one knew.

**When not to hand off.** Two cases, both where the handoff costs more than it saves: the run
is one short stage from `finish_run`, or the user is at the Personal Validation gate right
now. Finish instead, and note the pressure in the Summary. Everywhere else a handoff mid-stage
plus a re-read of the change set costs less than one compaction — and far less than the stages
that would otherwise follow it in a session already this full.

### Run State and Resume

- **The run JSON is the source of truth**, not the conversation. It lives at
  `<state dir>/runs/<runId>.json` (the `stateDir` returned by `open_dashboard`) and survives
  compaction, restart, and session resume.
- **On start, reattach before creating.** `start_run` resumes an existing `in_progress`
  run for the same `skillId` by default and returns `resumed: true` with the stored run.
  Continue from the first stage that is not `done`; pass `resume: false` only to
  deliberately start a second run of the same skill.
- **An idle run is abandoned work, not resumable work.** A run only leaves `in_progress`
  through `finish_run`, so one left waiting at an unanswered Personal Validation gate stays
  `in_progress` indefinitely. The surface derives an `idle` flag for those (session ended,
  or nothing advanced the run for hours) and `start_run` will not reattach to one. When
  `list_runs` shows an idle run, do not silently continue it: either close it with
  `finish_run` (`cancelled`, with a summary saying where it stopped) or confirm with the
  user that it should be picked up, then advance a stage so it counts as live again.
- **A handed-off run is the exception, and it says so.** `handoffPending: true` on a run that
  is also `idle` means the previous session ended deliberately at a context threshold for
  another session to continue — not that the work was dropped. Continue it: `start_run` for
  the same `skillId` reattaches, and `handoff.note` says where it stopped. Do not close it
  with `finish_run` as abandoned work, and do not treat a missing marker as one: an idle run
  with no marker is abandoned, whatever the conversation claims. See **Session Handoff**
  above.
- **Persist the decisions that gate later phases** with `set_run_context`:
  - `changeKind` (`new-functionality` / `bug-fix` / `dependency-update` / `none`) as soon
    as it is known, so a resumed run selects the same QA depth.
  - `approval` (`pending` / `approved` / `rejected`) at every Personal Validation decision.
- **Never create a pull request unless the persisted `approval` is `approved`.** If the
  run state says `pending` after a resume, re-run Personal Validation — do not rely on
  conversation memory of an approval.
- **When Personal Validation rejects or requests changes**, set `approval: "rejected"` with
  the user's wording, return to the appropriate implementation/specification stage, mark that
  stage `in_progress`, apply the requested changes, and then repeat Build & Test, QA
  Validation, and Personal Validation. Before the repeated Personal Validation handoff, reset
  `approval: "pending"` so Create Pull Request remains locked until the user approves the
  revised change set.
