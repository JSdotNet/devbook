# delivery

The host-neutral delivery engine. It carries a unit of work from a request to a validated,
review-ready change — delivery in the continuous-delivery sense, stopping short of deploy.
A run starts by invoking a `flow-*` skill in a session running as the `flow-runner` agent;
a flow invoked without it runs inline under the same rules and gates.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `delivery` with `/plugin`. During development, add this working copy by path
instead of by repository.

## What is in it

| Kind | Members |
|---|---|
| `flow-*` (2) | A staged procedure named for what changes, run start to finish in **one** session and passing the Personal Validation gate before its pull request: `flow-code` for every change to the code, in seven kinds — `feature`, `create`, `refactor`, `defect`, `config`, `dependency`, `project` — and `flow-spec` for the devbook folders |
| `phase-*` (15) | One phase of a flow, run by the flow-runner and never directly: `phase-update-base`, `phase-scope`, `phase-plan`, `phase-implement`, `phase-review`, `phase-build-test`, `phase-verify`, `phase-spec-check`, `phase-ready`, `phase-personal-validation`, `phase-create-pr`, `phase-report-back`, `phase-summary`, and `flow-spec`'s own `phase-drafting` and `phase-check-review` |
| The pull-request lane (4) | `fix-pr-checks`, `pr-merge-ready`, `push-branch`, `update-pr-branch` — raising a PR is the host's own action or `gh pr create`, not a skill |
| Pickup (2) | `start-session-from-issue`, `sre-alerts-to-work-items` — both read and write through the bound tracker's operations, never one provider's CLI |
| `init`, `update` (2) | The engine's stamp under `components.delivery`, written once and moved forward; hidden from the menu and reached through `devbook-config` |
| Agents | `flow-runner` — the sequencer, tracker, and gatekeeper; `runner-low` through `runner-max` — the effort runners, Claude Code only |

One flow, `flow-spec`, carries a change to any of the five devbook folders — `arc42/`,
`domain/`, `tech/`, `design/`, `ai/` — the same way `flow-code` carries a code change. It owns
the procedure and none of the rules: what a chapter must look like comes from the
instruction files the repository keeps for the folder and the check it ships, which the
`devbook` plugin materializes and this plugin never names. In a repository that has not
adopted the folder it stops and says so. `flow-code`'s phases do name devbook's skills: Spec
Check binds `devbook:verify-change` by default, and the phases carry the scenario pages an item
references through `devbook:scenario-derive` and `devbook:scenario-run`, recording the pages as
not derived or not run where devbook is absent. That coupling is undeclared on purpose, and
this repository's devbook tracks it as a debt.

[FLOW-DIAGRAMS.md](FLOW-DIAGRAMS.md) draws both flows: phase order, the two loops, where the
approval gate sits, and where each one hands off to a pull request. It is the overview the `SKILL.md` files
deliberately leave out, so they can stay execution rules.

A flow never leaves its session, and nothing in this marketplace spawns one. Work that runs
with nobody watching — the `schedule-*` entry points and the triggers that fire them, the
issue sweep among them — is a different subsystem one layer up, in the plugin that owns the
unattended lane.

## How a repository shapes a flow

Four keys, and none of them is a stage definition.

**Phases.** The phase list is closed and declared by the engine. `phases` holds one complete
map per flow, one entry per phase, keyed by the phase's skill name: which `agent` runs it,
which `skill` it follows, on which `model`, at which `effort`, with which `mcp` servers, and
which chores run `before` and `after` it. A qualifier picks a variant — the folder on
`phase-drafting`, an area on `phase-implement`. An absent field inherits the session, so `{}`
is a complete entry. Personal Validation and the ready check take no entry.

**Gates.** A gate presents the output of the phase it attaches to and asks a question, with
three outcomes: `approve` continues, `revise` re-runs that phase with the human's notes, and
`decline` blocks the stage. Configuration may add a gate anywhere; it may never remove one or
hand one to a plugin. Personal Validation is the mandatory instance of that pattern, not a
separate mechanism. A gate after `phase-scope` is the highest-value one to turn on.

**Bindings and policy.** Which tracker the repository uses, which surfaces it reports to, and
a closed set of switches — QA depth and its ceiling, the review and ready retry budgets, the
gate revise budget, whether the flow commits its change set at each handback, whether a pull
request is required.

All of them live in `.devbook/config.json`:

```json
{
  "phases": {
    "flow-code": {
      "phase-implement": { "agent": "your-coding-plugin:coding", "model": "opus" },
      "phase-verify": { "before": [{ "run": "repo:seed-test-data", "on-failure": "required" }] }
    }
  },
  "gates": [{ "at": "scope", "when": "after", "purpose": "approval", "show": "artifact" }],
  "policy": { "qa.depth": "targeted", "review.retryBudget": 1 },
  "bindings": { "delivery.tracker": { "provider": "github" } }
}
```

A committed map lists every phase of its flow; the snippet shows two. Copy `resources/config-template.json` and validate with
`node tools/stack-config/check.mjs <path>` — the default target is `.devbook/config.json`
under the working directory, so name the file when running from the plugin's folder. An
unknown key is rejected, not ignored: a typo must
never become a silently absent setting. The checker also merges the overlays a machine keeps
over the committed file — the user's own under `$XDG_CONFIG_HOME/devbook`
(`%APPDATA%\devbook`, `~/.config/devbook`) for every repository and for this one's `id`,
never a file inside the clone — and `--print` emits the merged result as JSON, which is how a
flow reads its effective configuration on either host, per *The overlays* in
`resources/engine-contract.md`. An overlay may also carry `ext.<plugin>.<key>`, a plugin's
own machine-scope state, which the engine merges and never reads. A phase whose `mcp` is absent takes the engine
default — `microsoft-learn`, `aspire`, `playwright` — and `resources/mcp-template.json` and
`resources/mcp-vscode-template.json` declare those three in the shape each host reads, so
`devbook-config:init` can copy them into a repository that declares no server yet.

**Configuration chooses among behaviour the engine already implements; it never introduces
new behaviour.** A stage is a prompt, not a program — "apply TDD", "escalate instead of
continuing when the request needs a new architectural decision" — and encoding that as JSON
either drops the prose or buries paragraphs in strings. A repository that genuinely needs a
different flow shape writes a repo-native `flow-*` skill, which takes precedence for the
categories it covers.

## The two procedures the engine names and cannot write

Configuration picks *which* provider runs. It cannot say how one product's application comes
up, or where that product wants its screenshots — and those are prose, not switches. So the
engine names two skills by name and reads them by path, and writes neither:

| Skill | Fills | Where it comes from |
|---|---|---|
| `run` | the facts `phase-verify` and Personal Validation read to start the application — the setup, the command, the entry points, the readiness signals, the credential pointer | `.claude/skills/run-<name>/SKILL.md`, the repository's own recipe, which Claude Code's `run` follows; Copilot's twin at `.github/skills/run/` points at it |
| `capture` | evidence capture inside Verify — the layout, the naming, the tooling | `.agents/skills/capture.md`, the same shape |

Whoever seeds them is the repository's business; the engine only expects a skill by that name
to exist and to leave behind what its goal says — a running application, evidence paths.
`delivery:init` and `delivery:update` materialize nothing and record the engine's version alone.
`delivery:update` also runs `migrations/` oldest first: `001-phase-maps` rewrites a 1.13.0
config's `extensions`, `delivery.roles`, and `delivery.mcp` into the phase maps, in the
committed file and both overlay layers.

Neither is a dependency, and this is the part worth being precise about: **the guardrail is
the contract, not the skill.** `resources/capture-contract.md` says what is captured, when it
is required, and that an unavailable capture blocks the stage rather than degrading it — and
that holds with no capture skill, no agent bound to `phase-verify`, and no QA plugin installed. A missing
skill changes who runs capture, never whether it runs.

## What it never depends on

- **Specialist plugins.** An architecture, QA, domain, UX, coding, or docs
  specialist is bound per repository as the `agent` of the phase it runs. None is
  ever declared as a dependency — one missing specialist must not demote every skill. The
  engine names no specialist and none of them is published from this marketplace. The
  reverse holds too: no specialist ever learns about `delivery`.
- **A tracker.** GitHub, Jira, Markdown chapters, Backlog entries, or a `plugin:skill`
  provider, whichever `delivery.tracker` names. Unbound, a flow runs to its file artifacts and opens nothing.
- **A surface.** Any installed `delivery-surface-*` plugin: its server name is what makes it
  one, resolved from the live tool list, and `delivery.surface` orders them when more than one
  is installed. **No surface bound is a normal outcome:** produce the file artifacts, say so
  once, never block a stage. Four ship from this marketplace; which groups each answers is
  information, not contract:

  | Plugin | lifecycle | render | export |
  |---|---|---|---|
  | `delivery-surface-dashboard` | yes | yes | yes |
  | `delivery-surface-collector` | yes | no | yes |
  | `delivery-surface-backlog` — the Backlog desktop app, while it is open | yes | no | when Backlog lists it |
  | `delivery-surface-canvas` — Copilot canvas actions | no | yes | no |
- **A host.** A shared skill names a *slot* — `repo-instructions`, `model-override`,
  `stage-delegation`, `surface`, `pr-lane`, `session-id` — which a repository may bind,
  or which takes its documented unbound default. A slot is bound, never branched.

## Files

| Path | Holds |
|---|---|
| `FLOW-DIAGRAMS.md` | Stage order, gates, and handoff points for every flow — read by people, loaded by no host |
| `agents/flow-runner.agent.md` | The agent that runs a flow: sequences the phases, resolves the config, enforces the gate |
| `runners/runner-<effort>.agent.md` | The five effort runners, `low` through `max`, that carry a delegated phase's effort — Claude Code only |
| `resources/flow-phases.md` | The phase order of both flows, the Personal Validation gate in full, and a pointer to each phase skill |
| `resources/engine-contract.md` | The phase list and the `phases` map, gates, policy, the stack config and its overlays, bindings, and host slots |
| `resources/surface-contract.md` | The surface capability, how a surface is bound, and the reporting contract every flow follows |
| `resources/flow-execution-model.md` | Session ownership, delegation order, sub-agent constraints, session handoff |
| `resources/phase-resolution.md` | How a phase entry resolves into inline, delegated, or forked, and the effort runners |
| `resources/implement-kinds.md` | What `phase-implement` does for each kind |
| `resources/tdd-rules.md` | How `phase-implement` names seams and drives red-green at each |
| `resources/smell-baseline.md` | The twelve code smells `phase-review` checks where the repository's rules say nothing |
| `resources/capture-contract.md` | What evidence is captured, when it is required, and what an unavailable capture blocks |
| `resources/config.schema.json` | The engine-owned keys — `bindings`, `phases`, `areas`, `policy`, `gates` — and the repository `id`, as a schema |
| `resources/config-template.json` | A filled-in starting point to copy |
| `resources/config.local-template.json` | A starting point for the personal overlay, copied outside the repository |
| `resources/mcp-template.json` | The three default MCP servers as a `.mcp.json`, read by Claude Code and the Copilot CLI |
| `resources/mcp-vscode-template.json` | The same three as a `.vscode/mcp.json`, read by VS Code |
| `hooks/hooks.json`, `hooks.json`, `hooks/session-start-context.md` | The session-start routing guidance: a guarded command hook for Claude Code, a prompt hook for Copilot, one text |
| `tools/stack-config/check.mjs` | Validates a repository's stack config; `node --test` covers it |
| `migrations/<nnn>-<slug>/` | A `MIGRATION.md` beside an idempotent `migrate.mjs`, one per config contract change |
