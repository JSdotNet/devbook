---
name: schedule-bundle
description: 'Run one bundle — Sunday devbook review — across every repository this machine checks out: one subagent per repository and job, each fed the prompt its own schedule would carry, at most four at once and two writers, every change a draft pull request, ending in one report. A bundle schedule''s target. Use when: a bundle routine fires, or running a bundle by hand. DO NOT USE FOR: one repository''s schedule (schedule-run).'
---

# Scheduled: Bundle

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs under *Running an Entry Point* in `../../resources/report-contract.md`, unattended or by
hand; it asks nothing. A bundle file's shape is *The Schedule File* in
`../../resources/schedule-catalog-contract.md`.

## Inputs

- Bundle: a catalog `name` whose file under `../../resources/schedules/` carries `jobs` (required).

## Phases

1. **Read.** The bundle file; each job's file — `title`, body, `maxResolve` — read verbatim;
   `../../resources/schedule-preamble.md`, and never the pickup gate: a bundle has none. Then the
   checkout list, per *The Machine Record* in `../../resources/machine-sync.md`, the user layer
   alone. Not a bundle, or no checkouts: report so and stop.
2. **Run.** Invoke the `Workflow` tool with `bundle.workflow.js` beside this file, resolved to an
   absolute path, and `args` `{ bundle: { name, title, jobs }, schedules, preamble, checkouts }`.
   The schedule's prompt, or the person's turn, is the opt-in the tool requires. The script plans
   the repository × job matrix — selection, one repository per `origin`, each job's
   precondition — and runs each cell's assembled prompt under the cap. Never rewrite a prompt,
   run a job here, or retry a cell: each job's procedure is its own skill's.
3. **Report** in `report.md` beside this file, from the script's result.

## Do not

- Start a session, or write the checkout list into a repository.
- Mark a pull request ready, or open, comment on, or close an issue: the jobs land drafts only.

## Surface Reporting

`start_run` with `skillId: "schedule-bundle"` and the stages Read, Run, Report; the Run stage's
output is the count of cells per state.
