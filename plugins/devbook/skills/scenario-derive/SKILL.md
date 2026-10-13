---
name: scenario-derive
description: 'Write or re-derive the Playwright spec that runs a scenario page, from the page, leaving step bodies to the implementer. Use when: a scenario page has no spec, its steps or parts changed, or the coverage check reports page-without-spec, spec-without-page, signature-mismatch, or label-drift. DO NOT USE FOR: writing the page (scenario-write), running it (scenario-run), or the setup hook.'
---

# devbook scenario-derive

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Brings the spec to the page, never the page to the spec. Builds on `qa:playwright-e2e-authoring`
for the e2e folder, the test conventions, and how a step body is written; without it, follow the
specs already there. The contract is `.devbook/_tools/scenarios/README.md`, which
`devbook:update` materializes once `domain/` is adopted.

## Steps

1. **Sign the page**: `node .devbook/_tools/scenarios/signature.mjs <page.md>` prints
   `<signature>  <path>`; the first field is the signature. Add `--scenario-folder <dir>` to it
   and to `check.mjs` when `playwright.config.ts` sets `scenarioFolder`, and `--specs <dir>` to
   `check.mjs` when the specs sit under a dot-folder.
2. **Find the spec** whose first lines read `// scenario: <page path>`. After a page was renamed,
   it is the one `check.mjs` reports as `spec-without-page` under the old path: re-point its
   header rather than starting over. With none, create `<stem>.spec.ts` in the e2e folder. The
   setup hook and the reporter in `playwright.config.ts` must already exist; when they do not,
   stop and name what the README asks the repository to add.
3. **Write the header** as the first two lines — `// scenario: <page path from the repository
   root>` and `// signature: <signature>` — and import `scenario` and `shot` from the
   materialized `setup` module by relative path.
4. **Write the shape.** `scenario('<stem>', ({ part }) => { … })` is the setup call: it applies
   the profile, data sets, flags, settings, and sign-in, and opens `start`, so no step repeats
   them. Inside it, one `part('<title>', async ({ page, step, portal }) => { … })` per `##`, in
   page order, titled exactly as the heading; in each, one `await step('<Keyword> <text>', …)`
   per step, titled as written without the bold, and `await shot(page, '<label>')` where the page
   puts each screenshot point. A step that moves to another portal rebinds the page —
   `page = await portal('<name>')` — so later steps and `shot` calls in that part act there.
5. **Re-derive in place.** Keep every step body whose text is unchanged; add, remove, reorder,
   and retitle parts, steps, and `shot` calls to match the page; write the signature last.
6. **Fill what the page says**, per `qa:playwright-e2e-authoring`: a **When** is the action, a
   **Then** an assertion on what the user sees. A body that needs what the page cannot say — a
   selector, a seeded id, an endpoint — calls `test.fixme()` with a comment naming what the
   implementer must supply, so its part runs as `not-run` until then. Never invent an assertion.
7. **Check**: `node .devbook/_tools/scenarios/check.mjs` reports nothing for this page, and
   `npx playwright test --list <spec>` lists one test per part.

## Do not

- Edit the setup hook — the file `scenarioHook` names — `profiles.json`, or the page. A step that
  needs new setup is reported to the implementer, not written into the hook.
- Title a part or a step away from the page's text, add a test the page has no part for, or
  write a signature by hand.
