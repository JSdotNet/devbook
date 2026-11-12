---
name: scenario-derive
description: 'Write or re-derive the Playwright spec that runs a journey, from the journey in scenarios.md, leaving step bodies to the implementer. Use when: a journey has no spec, its steps or parts changed, or the coverage check reports journey-without-spec, spec-without-journey, signature-mismatch, or label-drift. DO NOT USE FOR: writing the journey (scenario-write), running it (scenario-run), or the suite''s fixtures.'
---

# devbook scenario-derive

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Brings the spec to the journey, never the journey to the spec. Builds on
`qa:playwright-e2e-authoring` for the e2e folder, the test conventions, and how a step body is
written; without it, follow the specs already there. The contract is
`.devbook/_tools/scenarios/README.md`, which `devbook:update` materializes once `domain/` is
adopted.

## Steps

1. **Sign the journey**: `node .devbook/_tools/scenarios/signature.mjs <scenarios file>#<journey>`
   prints `<signature>  <address>`; the first field is the signature. Add `--scenario-folder
   <dir>` to it and to `check.mjs` when the reporter's options set `scenarioFolder`, and
   `--specs <dir>` to `check.mjs` when the specs sit under a dot-folder.
2. **Find the spec** whose first lines read `// scenario: <address>`. After a journey was
   retitled or moved, it is the one `check.mjs` reports as `spec-without-journey` under the old
   address: re-point its header rather than starting over. With none, create
   `<context>/<scenarios file without .md>/<journey>.spec.ts` in the e2e folder. The reporter
   in `playwright.config.ts` must already exist; when it does not, stop and name what the
   README asks the repository to add.
3. **Write the header** as the first two lines — `// scenario: <scenarios file from the
   repository root>#<journey>` and `// signature: <signature>` — and import `shot` from the
   materialized `shot` module by relative path.
4. **Write the shape** per the README under *The contract*: one test per part titled exactly as
   its `###`, in order, and one `test.step` per step titled as written without the bold. Group
   the parts, and apply the journey's setup fields, the way the repository's other journey
   specs do, through its own fixtures. With none to follow, parts that continue one walk run
   serially.
5. **Re-derive in place.** Keep every step body whose text is unchanged; add, remove, reorder,
   and retitle parts, steps, and `shot` calls to match the journey; write the signature last.
6. **Fill what the journey says**, per `qa:playwright-e2e-authoring`: a **When** is the action,
   a **Then** an assertion on what the user sees. A body that needs what the journey cannot say
   — a selector, a seeded id, an endpoint — calls `test.fixme()` with a comment naming what the
   implementer must supply, so its part runs as `not-run` until then. Never invent an assertion.
7. **Check**: `node .devbook/_tools/scenarios/check.mjs` reports nothing for this journey, and
   `npx playwright test --list <spec>` lists one test per part.

Never edit the suite's fixtures, `profiles.json`, or the journey: a setup field the fixtures
cannot apply yet, or a step that needs new setup, is reported to the implementer. Never write a signature by hand.
