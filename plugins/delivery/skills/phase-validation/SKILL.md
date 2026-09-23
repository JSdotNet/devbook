---
name: phase-validation
description: 'Shared Validation phase for code-modifying flow-* flows. Runs after Build & Test; depth is driven by change kind (new functionality = Playwright QA with capture, bug/existing-flow change = targeted verification, dependency update = startup-only, otherwise skipped). Invoked by the flow-runner agent.'
---

# Phase: Validation

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Reusable **Validation** phase shared by every code-modifying `flow-*` flow. The
`flow-runner` agent invokes this skill after Build & Test. Its depth is decided
automatically from the kind of change so callers do not re-describe QA rules.

## When To Run

- Run for code-modifying flows, after Build & Test passes.
- Documentation/config flows skip this phase.
- Skip when the repository declares it has no runnable application (see **Repo Context**).

## Run This Phase In A Sub-Agent

**Scenario execution is delegated, not run inline.** This is the single most expensive
phase to run in the owner session: browser snapshots, `browser_evaluate` results, page
accessibility trees, and Aspire log pages are large, and every one read inline is re-sent on
every later turn of the run — through Personal Validation, the pull request, and the
summary. Delegated, the owner session pays for the QA *result* instead of the QA *session*.

- **Invoke the `qa.run` provider with a single `Agent` call** in the **same worktree** (never
  `isolation: "worktree"` — an isolated checkout cannot see the change set under test or
  reach the running application), using the model resolved for this phase's category per
  `resources/flow-model-selection.md`.
- **Keep the runtime monitor a separate background agent** — the log-and-trace watcher the
  `qa.run` provider supplies alongside its scenario driver. Its own context window is the
  point:
  log and trace polling is high-volume and low-value to retain, so it belongs anywhere other
  than the session that has to survive to Personal Validation. Merging monitoring into the
  QA agent, or running it inline, puts exactly that volume back into a context that keeps
  paying for it.
- **Ask for the report, never the transcript.** The sub-agent returns the structured
  **Outputs** below — per-scenario pass/fail, evidence paths, monitoring findings. It does
  not return page snapshots, DOM dumps, log pages, or a narration of the steps it drove.
- **The flow-runner reports the stage** from that report, including `scenarios`
  and `monitoring` — the sub-agent never calls surface tools itself.
- **Run inline only when delegation is impossible** (the `Agent` tool is unavailable), or
  for startup-only validation, which is a handful of calls and not worth a sub-agent.

Evidence paths must still resolve under the running worktree root — see **Evidence
Location** below, which is why the QA sub-agent shares the worktree rather than isolating.

## Repo Context

The repository's runtime facts live in its `start` skill — `.agents/skills/start.md`, the
repository's own — and reach this phase two ways: the
`app.start` service returns base URLs and a health verdict, and the flow-runner names the
file when it exists. Use them as follows:

- **How to run** — while the file declares the startup command and AppHost, never discover or
  guess them, and never ask the user for them.
- **Base URLs** — validate against the entry points the `app.start` result returned.
- **Healthy startup** — judge startup against the file's readiness signals, and do not report
  the warnings it names as benign as failures.
- **Test credentials** — follow the file's pointer to obtain credentials; it never contains a
  secret.
- **No runnable application** — when `extensions.app.start` is `null` in
  `.devbook/config.json`, mark this phase `skipped`, record that the repository binds no
  runtime, and attempt no startup, Playwright run, or `qa.run` delegation.

When the file is absent or a section is missing, fall back to the behavior described below,
note the fallback once, and continue.

## Depth Selection (Automatic)

Before running a QA mode that depends on an MCP server, verify that the required MCP tooling
is available: `playwright` for browser automation and any screenshot or video evidence, and
`aspire` for log, trace, resource, or health evidence. The server configuration lives with
the bound `qa.run` provider, never here. This phase only decides what to do when the tooling
is missing.

The Playwright preflight is one live check, not a config inspection: navigate to the target
page and take a screenshot before running scenarios. If that fails, screenshot and video
capture are unavailable for this run — treat it per `resources/capture-contract.md`.

When QA is delegated to the `qa.run` provider or the runtime monitor, verify availability in
the target agent/session tool surface, not only in the parent flow session. A provider is
expected to declare the required `aspire` and `playwright` MCP servers and to allowlist them
at server granularity, so the child agent gets every tool of each server (Aspire's `list_resources`,
`list_structured_logs`, `list_console_logs`, `list_traces`, `list_trace_structured_logs`, and
Playwright's `browser_*`).

Two failure modes are worth naming separately, because they look identical from the outside
and only one is a real outage:

- **Stale tool name.** A tool called by a remembered name the server no longer exposes fails
  per call — Aspire renamed its query tools from `get_*` to `list_*` and dropped metrics
  entirely. Resolve the current name from the tool list; this is not a missing server.
- **Wrong prefix in an allowlist.** A plugin-provided MCP server is namespaced with its
  plugin, so the QA servers surface as `mcp__plugin_qa_aspire__*` and
  `mcp__plugin_qa_playwright__*`, and only as `mcp__aspire__*` / `mcp__playwright__*` when
  registered directly in a repository's MCP configuration. An allowlist naming the wrong form
  matches nothing, and the child agent loses every tool of that server while the parent
  session still has them.

If the tools are present in normal sessions but absent only in the delegated child agent,
report it as a child-agent MCP/tool allowlist exposure failure, name the missing server, and
say which of the two forms the agent's allowlist used.

If required MCP tooling is unavailable:

- Mark **Validation** `blocked`, not `done` or `skipped`.
- Prompt the user with the missing MCP server or tool name, why it is required, and the
  setup or enablement action needed before QA can continue.
- Stop before Personal Validation, pull request creation, issue updates, or Summary.
- Do not complete the phase through a degraded/manual fallback that omits required
  browser automation, evidence capture, or monitoring.
- Do not describe browser snapshots or smoke output as Playwright MCP screenshots,
  videos, or traces. They can be noted as fallback render evidence only when the selected
  validation policy allows a degraded result; they do not satisfy required Playwright
  evidence capture.

Applies when `policy.qa.depth` is absent from the stack config.

- **New functionality → QA validation with capture:**
  1. **Run the application locally** via the `app.start` service.
  2. **Execute the changed/affected scenarios with Playwright** — via the `playwright` MCP
     server, the `qa.run` provider drives each scenario, capturing evidence per checkpoint
     and failure per `resources/capture-contract.md`. Capture resolves to the repository's
     `capture` skill first, then the provider's own, then this phase driving it directly;
     name which answered. Capture is **required** here.
  3. **Monitor runtime behavior continuously** — the runtime monitor watches Aspire logs,
     traces, and metrics. Run it as a background sub-agent (the `Agent` tool with
     `run_in_background`) so monitoring runs concurrently with Playwright validation;
     otherwise hand off in the same session, where the provider offers that.
  4. **Stop the monitor when the scenarios are done** — request its summary, then end the
     background agent. The monitor polls until told otherwise, so this phase must not be
     marked `done` while one is still running. **Delegation Order** in
     `resources/flow-execution-model.md` names the calls per host.
  5. **Record the QA result** with pass/fail per scenario and the captured evidence.

  Playwright execution stays in the running **worktree** — delegated to a sub-agent
  that shares it, per **Run This Phase In A Sub-Agent** — so it exercises the actual change
  set while its output stays out of the owner session's context.
- **Bug fix or change to existing functionality → targeted QA validation without required capture:**
  1. **Run the application locally** via the `app.start` service and verify the
     affected scenarios.
  2. **Use Playwright when it helps validate the flow**, capturing on failure or on request
     per `resources/capture-contract.md`. Where that contract makes capture required,
     missing MCP availability blocks QA instead of falling back to an incomplete manual
     check.
  3. **Record pass/fail and monitoring findings** for the affected scenarios.
- **Dependency, package, framework, or SDK update with no functional change → startup-only
  validation:** start the application, confirm the Aspire dashboard and health endpoints report
  healthy, and confirm the logs show no new errors. Full functional Playwright scenarios and
  capture are not required unless the update introduces new user-facing behavior.
- **No functional change and nothing to run → skip:** mark this phase `skipped` and record
  why.

## Revalidation After Requested Changes

When the user requests changes during Personal Validation, or QA finds issues that lead to
implementation changes, refresh the running app before repeating QA or handing back to the
user. Prefer updating the same running instance when the repo's startup mode supports hot
reload/watch and Aspire reports the affected resources remain healthy. Otherwise stop and
restart the application automatically, wait for healthy/running state again, and refresh
endpoint URLs when they change. Record whether revalidation used the same updated instance
or a restart, and do not ask the user to restart the app manually as the normal path.

## Inputs

- The change kind (functional / bug fix / dependency update / none) from the calling
  flow.
- The affected scenarios or critical paths to exercise.
- The `app.start` result — base URLs, health verdict — and the path of the repository's
  `start` skill when the flow-runner found one.

## Outputs

- QA result: per-scenario pass/fail with optional Playwright evidence paths; a `blocked`
  result naming missing required MCP tooling and the user action needed to continue; or the
  startup/health outcome (startup-only mode), or a skip reason.
- Monitoring findings (Aspire log/trace/metric anomalies) when monitoring ran.
- These outputs feed the shared Personal Validation phase (the recorded QA review the user
  reviews).

These are what the QA sub-agent returns, and all of it. A failure is reported with the
evidence path and the specific error, not with the page snapshot or log page it came from —
the evidence file is the record. Personal Validation shows it to the person, per **Step 4**
of `skills/phase-personal-validation/SKILL.md`.

## Dashboard Reporting

- Report as the `Validation` stage via the shared **Reporting Contract** in
  `resources/surface-contract.md`. Also pass `scenarios` (per-scenario
  `status`, `notes`, `evidence`) and `monitoring` (log/trace summary) so the surface
  renders QA results with evidence inline.
- When required MCP tooling is unavailable, report the stage as `blocked` with the missing
  tooling and user-actionable setup guidance in `output`. Do not report pass scenarios or
  success wording for checks that could not be completed correctly.

## Agents

- The `qa.run` provider and its runtime monitor (recommended); falls back to the `implement`
  service running validation manually when `qa.run` is unbound, but only when manual
  validation can complete the selected QA depth correctly. Manual validation is not a
  substitute for required MCP-backed browser automation, evidence capture, or monitoring.
  Continue without a separate approval prompt before this phase unless required tooling is
  missing; missing required tooling blocks the phase and prompts the user.

## MCP Servers

- `playwright` is required for browser automation, smoke/E2E execution of browser-facing
  scenarios, and evidence capture.
- Aspire MCP is required when validation depends on Aspire resource state, logs, traces,
  metrics, or health evidence. Initialize/start it with `aspire mcp init` and
  `aspire mcp start` before validation, or block with a clear missing-monitoring report.
- Missing required MCP tooling is a blocking prerequisite failure; stop and prompt the user
  for setup instead of completing QA through degraded fallback.

## Reference

Capture contract: `resources/capture-contract.md` — who captures, when it is required, what
comes back, and what an unavailable capture does to this stage. It holds whether or not a
`qa.run` provider or a repository `capture` skill exists, so read it before reporting any
scenario that had visual evidence to give.

Phase definition: `resources/flow-phases.md`.
Runtime facts: the repository's `start` skill at `.agents/skills/start.md`.
