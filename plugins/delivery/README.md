# delivery

The host-neutral delivery engine. It carries a unit of work from a request to a validated,
review-ready change — delivery in the continuous-delivery sense, stopping short of deploy.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `delivery` with `/plugin`. During development, add this working copy by path
instead of by repository.

## What is in it

| Kind | Members |
|---|---|
| `flow-*` (4) | A staged procedure for one category of work, run start to finish in **one** session, ending at the Personal Validation gate: `flow-code`, `flow-spec`, `flow-update-packages`, `flow-project` |
| `phase-*` (3) | A shared step inside a flow, invoked by a flow and never directly: `phase-build-test`, `phase-validation`, `phase-personal-validation` |
| The pull-request lane (4) | `fix-pr-checks`, `pr-merge-ready`, `push-branch`, `update-pr-branch` — raising a PR is the host's own action or `gh pr create`, not a skill |
| Pickup (2) | `start-session-from-issue`, `sre-alerts-to-work-items` — both read and write through the bound tracker's operations, never one provider's CLI |
| Agent | `flow-runner` — the sequencer, tracker, and gatekeeper |

Five of the flows are named after a devbook folder — `arc42/`, `domain/`, `tech/`,
`design/`, `ai/` — and carry a chapter change the same way the others carry a code change.
They own the procedure and none of the rules: what a chapter must look like comes from the
instruction files the repository keeps for the folder and the check it ships, which the
`devbook` plugin materializes and this plugin never names. A folder flow in a repository that
has not adopted the folder stops and says so.

[FLOW-DIAGRAMS.md](FLOW-DIAGRAMS.md) draws every flow: stage order, where the approval gate
sits, and where each one hands off to a pull request. It is the overview the `SKILL.md` files
deliberately leave out, so they can stay execution rules.

A flow never leaves its session. Fan-out across sessions and worktrees — triage a backlog,
spawn workers, aggregate results — is a different subsystem and lives in the `fleet` plugin.
Work that runs with nobody watching — the `schedule-*` entry points and the triggers that fire
them — is another, and lives in `delivery-schedule`.

## How a repository shapes a flow

Three things, and only three, and none of them is a stage definition.

**Extension points.** The point set is closed and declared by the engine. Seven are
**services** — exactly one provider, returning a result the flow acts on: `spec`,
`implement`, `validate`, `app.start`, `qa.run`, `verify`, `deliver`. Four are **chores** — zero or more,
in declared order, contributing side effects and a report and never changing a decision:
`session.start`, `flow.start`, `data.prepare`, `flow.end`.

**Gates.** A gate presents the output of the point it attaches to and asks a question, with
three outcomes: `approve` continues, `revise` re-runs that point with the human's notes, and
`decline` blocks the stage. Configuration may add a gate anywhere; it may never remove one or
hand one to a plugin. Personal Validation is the mandatory instance of that pattern, not a
separate mechanism. `spec → gate → implement` is the highest-value one to turn on.

**Bindings and policy.** Which plugin fills each role, which tracker the repository uses,
which MCP servers each extension point uses, and a closed set of switches — QA depth and its ceiling, the validate retry budget, the gate revise
budget, whether the flow commits its change set at each handback, whether a pull request is
required.

All four live in `.devbook/config.json`:

```json
{
  "extensions": {
    "implement": "your-coding-plugin:coding",
    "data.prepare": [{ "run": "repo:seed-test-data", "on-failure": "required" }]
  },
  "gates": [{ "at": "spec", "when": "after", "purpose": "approval", "show": "artifact" }],
  "policy": { "qa.depth": "targeted", "validate.retryBudget": 2 },
  "bindings": {
    "delivery.tracker": { "provider": "github" },
    "delivery.mcp": { "spec": ["your-guidelines-server"] }
  }
}
```

Copy `resources/config-template.json` and validate with
`node tools/stack-config/check.mjs`. An unknown key is rejected, not ignored: a typo must
never become a silently absent setting. The checker also merges the overlays a machine keeps
over the committed file — this checkout's gitignored `.devbook/config.local.json`, and the
user's own under `$XDG_CONFIG_HOME/devbook` (`%APPDATA%\devbook`, `~/.config/devbook`) for
every repository and for this one's `id` — per *The overlays* in
`resources/surface-contract.md`. A point left out of `delivery.mcp` takes the engine
default — `microsoft-learn`, `aspire`, `playwright` — and `resources/mcp-template.json` and
`resources/mcp-vscode-template.json` declare those three in the shape each host reads, so
`devbook-config:setup` can copy them into a repository that declares no server yet.

**Configuration chooses among behaviour the engine already implements; it never introduces
new behaviour.** A stage is a prompt, not a program — "apply TDD", "escalate instead of
continuing when the request needs a new architectural decision" — and encoding that as JSON
either drops the prose or buries paragraphs in strings. A repository that genuinely needs a
different flow shape writes a repo-native `flow-*` skill, which takes precedence for the
categories it covers.

## The two procedures the engine cannot write

Configuration picks *which* provider runs. It cannot say how one product's application comes
up, or where that product wants its screenshots — and those are prose, not switches.

So `delivery:install` seeds two skills into the repository and hands them over:

| Seed | Fills | The repository owns |
|---|---|---|
| `start` | the `app.start` point, as `repo:start` | the facts — command, entry points, readiness signals, credential pointer — and the procedure: startup, sign-in, the branch-to-area map |
| `capture` | evidence capture inside Validation | the layout, the naming, the tooling |

Each lands as one editable copy under `.agents/skills/` with a pointer wrapper per host. Edit
the copy and it is yours: its hash matches no release, so every later reconcile reports it and
leaves it alone. `assets/skill-wrappers.md` has the shape.

Neither is a dependency, and this is the part worth being precise about: **the guardrail is
the contract, not the skill.** `resources/capture-contract.md` says what is captured, when it
is required, and that an unavailable capture blocks the stage rather than degrading it — and
that holds with no capture skill, no `qa.run` provider, and no QA plugin installed. A missing
seed changes who runs capture, never whether it runs.

## What it never depends on

- **Specialist plugins.** An architecture, QA, domain, UX, product, security, or docs
  specialist is bound as a role per repository, and a coding one as a service. Neither is
  ever declared as a dependency — one missing specialist must not demote all 26 skills. The
  engine names no specialist and none of them is published from this marketplace. The
  reverse holds too: no specialist ever learns about `delivery`.
- **A tracker.** GitHub, Jira, or Markdown chapters, whichever `delivery.tracker` names.
  Unbound, a flow runs to its file artifacts and opens nothing.
- **A surface.** A dashboard, a canvas, and a headless collector are three implementations of
  one capability, resolved by pattern from the live tool list. **No surface bound is a normal
  outcome:** produce the file artifacts, say so once, never block a stage.
- **A host.** A shared skill names a *slot* — `repo-instructions`, `model-override`,
  `stage-delegation`, `surface`, `pr-lane` — which a repository may bind,
  or which takes its documented unbound default. A slot is bound, never branched.

## Files

| Path | Holds |
|---|---|
| `FLOW-DIAGRAMS.md` | Stage order, gates, and handoff points for every flow — read by people, loaded by no host |
| `agents/flow-runner.agent.md` | The one agent: sequences the phases, resolves the config, enforces the gate |
| `resources/flow-phases.md` | Which phases each tier runs, and the opening and closing phases in full |
| `resources/surface-contract.md` | Extension points, gates, the stack config, host slots, and the surface capability |
| `resources/flow-execution-model.md` | Session ownership, delegation order, sub-agent constraints, session handoff |
| `resources/flow-model-selection.md` | Category → model resolution and the personal override |
| `resources/capture-contract.md` | What evidence is captured, when it is required, and what an unavailable capture blocks |
| `resources/config.schema.json` | The four engine-owned keys and the repository `id`, as a schema |
| `resources/config-template.json` | A filled-in starting point to copy |
| `resources/mcp-template.json` | The three default MCP servers as a `.mcp.json`, read by Claude Code and the Copilot CLI |
| `resources/mcp-vscode-template.json` | The same three as a `.vscode/mcp.json`, read by VS Code |
| `assets/skills/` | The `start` and `capture` seeds `delivery:install` writes into a repository |
| `assets/skill-wrappers.md` | How a seed lands: one editable copy, a pointer wrapper per host |
| `tools/stack-config/check.mjs` | Validates a repository's stack config; `node --test` covers it |
