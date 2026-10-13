---
name: phase-verify
description: "Verify phase of flow-code: starts the app through the run recipe and drives the acceptance scenarios at the kind's depth, with evidence. flow-runner only."
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

Its place in the order and what the ready check does with its result: `resources/flow-phases.md`.

## You Run Delegated

You run delegated, in the run's worktree, per `resources/phase-resolution.md`.

- **Keep the runtime monitor a separate background agent** — the log-and-trace watcher the
  bound QA agent supplies. Log and trace polling is high-volume and worthless to retain, so it
  stays out of the context that drives the scenarios.
- **Stop the monitor before you return** — request its summary, then end it. It polls until
  told otherwise; **Delegation Order** in `resources/flow-execution-model.md` names the calls
  per host.
- **Return the report, never the transcript.** Return only the **Outputs** below — no page
  snapshots, DOM dumps, log pages, or narration — and make no surface calls: the flow-runner
  reports the stage, `scenarios` and `monitoring` included.

## Repo Context

The runtime facts are the repository's `run` recipe at `.claude/skills/run-<name>/SKILL.md`,
which the flow-runner names when it exists. The provider `phase-verify.app` names — the `run`
recipe when unset — returns base URLs and a health verdict. Start the app by invoking `run`,
never by a command read out of the file.

- **How to run** — while the recipe declares the setup, the launch command, and AppHost, never
  discover or guess them, and never ask the user for them.
- **What to drive** — the scenarios drawn from the scope's acceptance criteria for the changed
  behaviour, against the entry points the start result returned.
- **Healthy startup** — judge it against the recipe's readiness signals; the warnings it names
  as benign are not failures.
- **Test credentials** — follow the recipe's pointer; it never contains a secret.
- **No runnable application** — `phase-verify.app` is `null`: mark this phase `skipped`,
  record that the repository binds no runtime, and attempt no startup or QA.

When the recipe is absent or a section is missing, fall back to the behaviour below, note the
fallback once, and continue.

## Required Tooling

Browser automation and evidence need the `playwright` MCP server; log, trace, resource, and
health evidence need `aspire`. Their configuration belongs to the bound QA agent, never to
this phase. Check that both are in your own tool list and in the runtime monitor's, and call
each tool by the name that list gives now, never a remembered one. The Playwright preflight is
the one live check `resources/capture-contract.md` defines, which also settles who captures,
what form is reported, and what an unavailable capture does to this stage.

When a required server is missing, mark Verify `blocked` — never `done` or `skipped` — and
record it for the ready check. Tell the user which server or tool is missing, why this depth
needs it, and what setup would enable it. Never complete the phase through a manual or
degraded substitute, and never report a browser snapshot or smoke output as a Playwright
screenshot, video, or trace. When the tools reach the parent session but not you or the
monitor, report a child-agent allowlist exposure failure: name the server, and say whether the
allowlist used the plugin-namespaced or the bare form `resources/flow-execution-model.md` gives.

## Depth

The `changeKind` Scope persisted selects the depth, unless `policy.qa.depth` sets one;
`policy.qa.ceiling` caps either, per **QA depth** in `resources/engine-contract.md`.

| Kind | Depth |
| --- | --- |
| `feature` adding behaviour, `create`, `project` | **Full QA with capture** |
| `feature` changing behaviour, `defect`, `refactor` | **Targeted** |
| `config`, `dependency` | **Startup-only** |
| `phase-verify.app` is `null`, or a `config` change touches nothing that runs | **Skipped**, with the reason |

- **Full QA with capture.** Start the app, then have the bound QA agent drive each changed or
  affected scenario through Playwright, capturing per checkpoint and per failure — capture is
  required. For `project`, the scenarios are the app host, the health endpoints, and the smoke
  checks. Run the runtime monitor alongside for the whole session, then stop it.
- **Targeted.** Start the app and verify the affected scenarios — for a defect, the
  reproduction and the regression scenario. Use Playwright where it helps, capturing on failure
  or on request.
- **Startup-only.** Start the app, confirm the Aspire dashboard and health endpoints report
  healthy, and confirm the logs show no new errors. A framework upgrade adds smoke checks; new
  user-facing behaviour raises the depth to targeted.

Record the depth that actually ran. A shallower depth is reported as the depth it was, never
as verification that did not happen.

## Scenario Pages

When `scope.md` lists scenario pages, they run at the full and the targeted depth alike,
beside the scenarios drawn from the acceptance criteria:

1. **Exactly those pages.** Invoke `devbook:scenario-run` once with all of them, against the
   instance this phase started. Never every page in the repository, and never a part on its
   own: a filtered run writes no `run.json`.
2. **Preflight is the skill's.** A page its coverage check leaves out is reported as not run
   with the finding and `scenario-derive` named, as an open item for the ready check; never
   run it anyway.
3. **Report what the reporter wrote.** From each page's `run.json`: per part its `outcome`,
   and for a failed part the step, the message, and the `failureShot`. A failed part is a
   failed scenario; a `not-run` part is unfinished, not a defect.
4. **Return it as `evidence`**: one `{ stem, part, outcome, runAt }` per part — `part` is the
   part's `anchor`, `runAt` the file's `ranAt`. A `passed` or `failed` part also appears in
   `scenarios` as `pass` or `fail` with its labels' PNGs as evidence; a `not-run` part appears
   in `evidence` and the output alone, named unfinished.
5. **Leave the files.** `run.json` and the PNGs stay in the working tree as part of the change
   set.

At the startup-only depth, or when skipped, run none: record each listed page as not run with
the depth that ruled it out. Without the skill, or without `.devbook/_tools/scenarios/report.mjs`
among the Playwright reporters, record the pages as not run and name what is missing — never
run the specs some other way and present the result as a page's run.

## Reverifying After Requested Changes

When the ready check or Personal Validation sends the run back, refresh the running app before
repeating QA: update the same instance when the startup mode supports hot reload and Aspire
reports the affected resources healthy, otherwise restart it, wait for healthy, and refresh the
endpoint URLs. Record which happened. Never ask the user to restart the app as the normal path.

## Outputs

- Per-scenario pass/fail with evidence paths; or the startup and health outcome; or a skip
  reason; or `blocked`, naming the missing tooling and the user action needed.
- The depth that actually ran.
- Monitoring findings — Aspire log and trace anomalies — when monitoring ran.
- Per listed scenario page, each part's outcome as `evidence` per
  `resources/surface-contract.md`, or the page recorded as not run with the reason.
- `execution.defectsFound`: distinct failed scenarios and failed scenario-page parts, each
  once, `0` when all passed — omitted at startup-only, `skipped`, or `blocked`, per **Stage
  Counts** in `resources/surface-contract.md`.

Report a failure with its evidence path and the specific error, never the page snapshot or log
page it came from: the evidence file is the record.
