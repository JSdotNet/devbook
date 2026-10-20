---
name: scenario-run
description: 'Run one journey, or all of them, through the repository''s Playwright suite under the journey''s profile, writing run.json and one screenshot per shot into the journey''s run folder beside its scenarios file. Use when: proving a journey, refreshing a stale run or missing screenshots, or committing runs on the target branch. DO NOT USE FOR: writing the journey (scenario-write) or its spec (scenario-derive).'
---

# devbook scenario-run

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Runs specs and reads what the reporter wrote; never edits a journey, a spec, or a run file by
hand. The reporter writes only for a run that covered a whole journey. The contract is in
`.devbook/_tools/scenarios/README.md`.

## Steps

1. **Preflight**: `node .devbook/_tools/scenarios/check.mjs`, with `--scenario-folder` and
   `--specs` when the repository moved either folder. A `journey-without-spec`,
   `signature-mismatch`, or `label-drift` on a journey in this run means its spec no longer
   proves it — leave that journey out and name `scenario-derive` — and an `unknown-profile`
   leaves it out too. A `legacy-page` means `032-scenarios-md` has not run: stop and name
   `devbook:update`. A run of a stale spec records a signature the journey no longer has.
2. **Bring the application up** through the repository's `run` procedure, unless the profile's
   portals point at an environment already running, and set every `env:<NAME>` the profile
   names: an unset one fails setup.
3. **Pick the specs**: for one journey, the spec whose `// scenario:` header names its address;
   for all, every spec with that header. Confirm `playwright.config.ts` lists
   `.devbook/_tools/scenarios/report.mjs` as a reporter; without it nothing is written, so stop
   and say so.
4. **Run** `npx playwright test <spec files>`, with no `--grep`, `.only`, or line filter: a
   filtered run writes nothing, by design. Each journey runs under its own `profile`. Leave
   `SCENARIO_PROFILE` unset unless the person asked for one profile across every journey, and
   say so when it was set.
5. **Report** from `<scenarios file without .md>/<journey>/run.json`: per journey its signature
   and profile, per part its `outcome` — `passed`, `failed`, or `not-run` — and for a failed
   part the step and message its `failure` holds and the screenshot its `failureShot` names.
   Name each label's PNG. A part a `test.fixme()` holds back reads `not-run`: report it as
   unfinished, not as a defect.
6. **Leave the files in the working tree.** `run.json` and the PNGs are committed with the change
   on the target branch. A label the run did not reach keeps its earlier file, and one the
   journey dropped is pruned by the reporter.

## Do not

- Fix a failing part by editing the journey or a title in the spec. A failing step is a defect
  in the application or in the step's body; say which.
- Retry until green, or edit, delete, or copy a `run.json` or a PNG by hand. A part that needed a
  retry is recorded as `failed`.
