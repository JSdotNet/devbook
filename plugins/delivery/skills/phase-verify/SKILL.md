---
name: phase-verify
description: 'Shared Verify phase for flow-code. Runs after Build & Test: starts the application through the repository''s run recipe and drives the scenarios drawn from the scope''s acceptance criteria, taking evidence through its capture procedure, at a depth the kind decides (feature adding behaviour, create, project = Playwright QA with capture; feature changing behaviour, defect, refactor = targeted; config, dependency = startup-only; nothing to run = skipped). Invoked by the flow-runner agent, never directly.'
---

# Phase: Verify

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

**Does**

- Starts the app through the repository's run recipe
- Drives the scenarios at the kind's depth, captures evidence, watches the logs
- Runs exactly the scenario pages Scope listed, through `devbook:scenario-run`

**Doesn't**

- Fix what it finds
- Fall back to a weaker tool when Playwright or Aspire is missing: it blocks
- Call Claude's /verify (user-invoked only)

The `flow-runner` agent invokes this skill after Build & Test. Its depth is decided from the
kind of change, so no flow re-describes QA rules. What it finds is recorded for the ready check
(`skills/phase-ready/SKILL.md`), which decides whether the run goes back to `phase-implement`.
Claude Code's `/verify` does the same job by hand, but it is user-invoked only, so this phase
follows the repository's own `run` and `capture` procedures instead.

## When To Run

- Every `flow-code` run, after Build & Test. `flow-spec` has no Verify.
- Skip when `phase-verify.app` is `null` (see **Repo Context**).

## Run This Phase In A Sub-Agent

**Scenario execution is delegated, not run inline.** This is the single most expensive
phase to run in the owner session: browser snapshots, `browser_evaluate` results, page
accessibility trees, and Aspire log pages are large, and every one read inline is re-sent on
every later turn of the run — through Personal Validation, the pull request, and the
summary. Delegated, the owner session pays for the QA *result* instead of the QA *session*.

- **Invoke the agent the `phase-verify` entry names with a single `Agent` call** in the
  **same worktree** (never `isolation: "worktree"` — an isolated checkout cannot see the
  change set under test or reach the running application), using the model and effort
  resolved for this phase per `resources/phase-resolution.md`.
- **Keep the runtime monitor a separate background agent** — the log-and-trace watcher the
  bound QA agent supplies alongside its scenario driver. Its own context window is the
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
  for startup-only verification, which is a handful of calls and not worth a sub-agent.

Evidence paths must still resolve under the running worktree root — see
`resources/capture-contract.md`, which is why the QA sub-agent shares the worktree rather than isolating.

## Repo Context

The repository's runtime facts live in its `run` recipe — `.claude/skills/run-<name>/SKILL.md`,
the repository's own, which Claude Code's `run` skill follows and Copilot reaches through
`.github/skills/run/` — and evidence is taken through its `capture` procedure, per
`resources/capture-contract.md`. The runtime facts reach this phase two ways: the provider
`phase-verify.app` names — the `run` recipe when unset — returns base URLs and a health
verdict, and the flow-runner names the file when it exists. Start the app by invoking `run`,
never by a command read out of the file. Use them as follows:

- **How to run** — while the recipe declares the setup, the launch command, and AppHost, never
  discover or guess them, and never ask the user for them.
- **What to drive** — derive the scenarios from the scope's acceptance criteria for the
  changed behaviour.
- **Base URLs** — verify against the entry points the start result returned.
- **Healthy startup** — judge startup against the recipe's readiness signals, and do not report
  the warnings it names as benign as failures.
- **Test credentials** — follow the recipe's pointer to obtain credentials; it never contains a
  secret.
- **No runnable application** — when `phase-verify.app` is `null` in the effective
  configuration, mark this phase `skipped`, record that the repository binds no runtime, and
  attempt no startup, Playwright run, or QA delegation.

When a file is absent or a section is missing, fall back to the behavior described below,
note the fallback once, and continue.

## Depth Selection (Automatic)

Before running a QA mode that depends on an MCP server, verify that the required MCP tooling
is available: `playwright` for browser automation and any screenshot or video evidence, and
`aspire` for log, trace, resource, or health evidence. The server configuration lives with
the bound QA agent, never here. This phase only decides what to do when the tooling is
missing.

The Playwright preflight is one live check, not a config inspection: navigate to the target
page and take a screenshot before running scenarios. If that fails, screenshot and video
capture are unavailable for this run — treat it per `resources/capture-contract.md`.

When QA is delegated to the bound QA agent or the runtime monitor, verify availability in
the target agent/session tool surface, not only in the parent flow session. An agent is
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
  plugin, and only a server registered directly in a repository's MCP configuration surfaces
  under its bare id — the two shapes `flow-execution-model.md` gives for a bound server. An
  allowlist naming the wrong form
  matches nothing, and the child agent loses every tool of that server while the parent
  session still has them.

If the tools are present in normal sessions but absent only in the delegated child agent,
report it as a child-agent MCP/tool allowlist exposure failure, name the missing server, and
say which of the two forms the agent's allowlist used.

If required MCP tooling is unavailable:

- Mark **Verify** `blocked`, not `done` or `skipped`, and record it for the ready check.
- Prompt the user with the missing MCP server or tool name, why it is required, and the
  setup or enablement action needed before QA can continue.
- Do not complete the phase through a degraded/manual fallback that omits required
  browser automation, evidence capture, or monitoring.
- Do not describe browser snapshots or smoke output as Playwright MCP screenshots,
  videos, or traces, and never record them as evidence in their place.

The kind `phase-scope` persisted as `changeKind` selects the depth. Applies when
`policy.qa.depth` is absent from the stack config; `policy.qa.ceiling` caps whatever is
selected, per **QA depth** in `resources/engine-contract.md`.

- **`feature` adding behaviour, `create`, `project` → QA verification with capture.** For
  `project`, the scenarios are the app host, the health endpoints, and the smoke checks:
  1. **Run the application locally** via the `phase-verify.app` provider.
  2. **Execute the changed/affected scenarios with Playwright** — via the `playwright` MCP
     server, the bound QA agent drives each scenario, capturing evidence per checkpoint
     and failure per `resources/capture-contract.md`. Capture resolves to the repository's
     `capture` skill first, then the agent's own, then this phase driving it directly;
     name which answered. Capture is **required** here.
  3. **Monitor runtime behavior continuously** — the runtime monitor watches Aspire logs,
     traces, and metrics. Run it as a background sub-agent (the `Agent` tool with
     `run_in_background`) so monitoring runs concurrently with Playwright verification;
     otherwise hand off in the same session, where the agent offers that.
  4. **Stop the monitor when the scenarios are done** — request its summary, then end the
     background agent. The monitor polls until told otherwise, so this phase must not be
     marked `done` while one is still running. **Delegation Order** in
     `resources/flow-execution-model.md` names the calls per host.
  5. **Record the QA result** with pass/fail per scenario and the captured evidence.

  Playwright execution stays in the running **worktree** — delegated to a sub-agent
  that shares it, per **Run This Phase In A Sub-Agent** — so it exercises the actual change
  set while its output stays out of the owner session's context.
- **`feature` changing existing behaviour, `defect`, `refactor` → targeted QA without
  required capture:**
  1. **Run the application locally** via the `phase-verify.app` provider and verify the
     affected scenarios — for a defect, the reproduction and the regression scenario.
  2. **Use Playwright when it helps verify the flow**, capturing on failure or on request
     per `resources/capture-contract.md`. Where that contract makes capture required,
     missing MCP availability blocks QA instead of falling back to an incomplete manual
     check.
  3. **Record pass/fail and monitoring findings** for the affected scenarios.
- **`config`, `dependency` → startup-only:** start the
  application, confirm the Aspire dashboard and health endpoints report healthy, and confirm
  the logs show no new errors. Full functional Playwright scenarios and capture are not
  required unless the change introduces new user-facing behavior; a framework upgrade adds
  smoke checks.
- **Nothing to run** — `phase-verify.app` is `null`, or a `config` change touches nothing
  that runs → skip: mark this phase `skipped` and record why.

## Scenario Pages

When `scope.md` lists scenario pages, they are this run's proof of the requirements that point
at them, and they run at the full and the targeted depth alike, beside the scenarios drawn from
the acceptance criteria:

1. **Exactly those pages.** Hand the QA sub-agent the listed pages and have it invoke
   `devbook:scenario-run` once with all of them, against the instance this phase started. Never
   every page in the repository, and never a part on its own: a filtered run writes no
   `run.json`, so the run is always whole pages.
2. **Preflight is the skill's.** A page its coverage check leaves out — the spec no longer
   matches the page, or the profile is unknown — is reported as not run with the finding and
   `scenario-derive` named, and records an open item for the ready check; never run it anyway.
3. **Report what the reporter wrote.** From each page's `run.json`: per part its `outcome`, and
   for a failed part the step, the message, and the `failureShot`. A failed part is a failed
   scenario; a `not-run` part is unfinished, not a defect, and is reported as such.
4. **Pass it as `evidence`.** The flow-runner reports one `{ stem, part, outcome, runAt }` per
   part on the stage, per `resources/surface-contract.md` — `part` is the part's `anchor`, and
   `runAt` is the file's `ranAt`. A `passed` or `failed` part also appears in `scenarios` as
   `pass` or `fail`, with its labels' PNGs as its evidence paths; a `not-run` part has no
   `scenarios` status, so it appears in `evidence` and the stage output alone, named unfinished.
5. **Leave the files.** `run.json` and the PNGs stay in the working tree as part of the change
   set; nothing here edits, deletes, or copies one.

At the startup-only depth, or when the phase is `skipped`, run none: record each listed page as
not run with the depth that ruled it out; Spec Check judges it on the run already committed,
`stale` when there is none or its signature is not the page's. Without the skill,
or without `.devbook/_tools/scenarios/report.mjs` among the Playwright reporters, record the
pages as not run and name what is missing — never run the specs some other way and present the
result as a page's run.

## Reverifying After Requested Changes

When the ready check sends the run back, or the user requests changes during Personal
Validation, refresh the running app before repeating QA or handing back to the user. Prefer
updating the same running instance when the repo's startup mode supports hot reload/watch and
Aspire reports the affected resources remain healthy. Otherwise stop and restart the
application automatically, wait for healthy/running state again, and refresh endpoint URLs
when they change. Record whether reverification used the same updated instance or a restart,
and do not ask the user to restart the app manually as the normal path.

## Inputs

- The change kind the flow-runner persisted with `set_run_context`.
- The affected scenarios or critical paths, and the scope's acceptance criteria.
- The scenario pages `scope.md` lists, each with its stem, path, and profile.
- The start result — base URLs, health verdict — and the path of the repository's `run`
  recipe when the flow-runner found it.

## Outputs

- QA result: per-scenario pass/fail with optional Playwright evidence paths; a `blocked`
  result naming missing required MCP tooling and the user action needed to continue; or the
  startup/health outcome (startup-only mode), or a skip reason.
- The depth that actually ran, recorded honestly: a shallower depth is reported as the depth
  it was, never as verification that did not happen.
- Monitoring findings (Aspire log/trace/metric anomalies) when monitoring ran.
- Per scenario page Scope listed, each part's outcome from the `run.json` `devbook:scenario-run`
  wrote, which the flow-runner reports as `evidence` (`resources/surface-contract.md`), and each
  label's PNG; or the page recorded as not run, with the reason.
- These outputs feed the ready check and then Personal Validation, which presents the
  recorded QA review. The flow-runner reports its failures as escaped defects, per **Quality
  Facts** in `resources/surface-contract.md`.

These are what the QA sub-agent returns, and all of it. A failure is reported with the
evidence path and the specific error, not with the page snapshot or log page it came from —
the evidence file is the record. Personal Validation shows it to the person, per **Step 4**
of `skills/phase-personal-validation/SKILL.md`.

## Dashboard Reporting

- Report as the `Verify` stage via the shared **Reporting Contract** in
  `resources/surface-contract.md`. Also pass `scenarios` (per-scenario
  `status`, `notes`, `evidence`) and `monitoring` (log/trace summary) so the surface
  renders QA results with evidence inline.
- When required MCP tooling is unavailable, report the stage as `blocked` with the missing
  tooling and user-actionable setup guidance in `output`. Do not report pass scenarios or
  success wording for checks that could not be completed correctly.

## Agents

- The agent the `phase-verify` entry names, and its runtime monitor (recommended). With
  none, the flow-runner runs this procedure itself, but only when that can complete the
  selected depth correctly. Running it unaided is not a substitute for required MCP-backed
  browser automation, evidence capture, or monitoring. Continue without a separate approval
  prompt before this phase unless required tooling is missing or a gate sits before it.

## MCP Servers

- `playwright` is required for browser automation, smoke/E2E execution of browser-facing
  scenarios, and evidence capture.
- Aspire MCP is required when verification depends on Aspire resource state, logs, traces,
  metrics, or health evidence. Initialize/start it with `aspire mcp init` and
  `aspire mcp start` before verification, or block with a clear missing-monitoring report.
- Missing required MCP tooling is a blocking prerequisite failure; stop and prompt the user
  for setup instead of completing QA through degraded fallback.

## Reference

Capture contract: `resources/capture-contract.md` — who captures, when it is required, what
comes back, and what an unavailable capture does to this stage. It holds whether or not a
QA agent or a repository `capture` skill exists, so read it before reporting any scenario
that had visual evidence to give.

Phase definition: `resources/flow-phases.md`.
Runtime facts: the repository's `run` recipe at `.claude/skills/run-<name>/SKILL.md`.
