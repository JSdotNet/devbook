---
name: scenario-run
description: 'Run one scenario page, or all of them, through the repository''s Playwright suite under the page''s profile, writing run.json and one screenshot per shot into the scenario folder. Use when: proving a scenario page, refreshing a stale run or missing screenshots, or committing runs on the target branch. DO NOT USE FOR: writing the page (scenario-write) or its spec (scenario-derive).'
---

# devbook scenario-run

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs specs and reads what the reporter wrote; never edits a page, a spec, or a run file by hand.
The reporter writes only for a run that covered a whole page. The contract is in
`.devbook/_tools/scenarios/README.md`.

## Steps

1. **Preflight**: `node .devbook/_tools/scenarios/check.mjs`, with `--scenario-folder` and
   `--specs` when the repository moved either folder. A `page-without-spec`,
   `signature-mismatch`, or `label-drift` on a page in this run means its spec no longer proves
   it — leave that page out and name `scenario-derive` — and an `unknown-profile` leaves it out
   too. A run of a stale spec records a signature the page no longer has.
2. **Bring the application up** through the repository's `run` procedure, unless the profile's
   portals point at an environment already running, and set every `env:<NAME>` the profile
   names: an unset one fails setup.
3. **Pick the specs**: for one page, the spec whose `// scenario:` header names it; for all,
   every spec with that header. Confirm `playwright.config.ts` lists
   `.devbook/_tools/scenarios/report.mjs` as a reporter; without it nothing is written, so stop
   and say so.
4. **Run** `npx playwright test <spec files>`, with no `--grep`, `.only`, or line filter: a
   filtered run writes nothing, by design. Each page runs under its own `profile`. Leave
   `SCENARIO_PROFILE` unset unless the person asked for one profile across every page, and say
   so when it was set.
5. **Report** from `<scenario folder>/<stem>/run.json`: per page its signature and profile, per
   part its `outcome` — `passed`, `failed`, or `not-run` — and for a failed part the step and
   message its `failure` holds and the screenshot its `failureShot` names. Name each
   label's PNG. A part a `test.fixme()` holds back reads `not-run`: report it as unfinished, not
   as a defect.
6. **Leave the files in the working tree.** `run.json` and the PNGs are committed with the change
   on the target branch. A label the run did not reach keeps its earlier file, and one the page
   dropped is pruned by the reporter.

## Do not

- Fix a failing part by editing the page or a title in the spec. A failing step is a defect in
  the application or in the step's body; say which.
- Retry until green, or edit, delete, or copy a `run.json` or a PNG by hand. A part that needed a
  retry is recorded as `failed`.
