---
name: scenario-page-check
description: How Spec Check judges each scenario page Scope listed — a referenced part with no proof is spec-ahead, and a page whose signature no longer matches its run.json is stale — and the table it lists them in.
---

# Scenario Page Check

`skills/phase-spec-check/SKILL.md` checks every scenario page Scope listed itself, whatever
skill is bound: the bound skill reports only the pages a requirement in scope points at, so a
page referenced directly would otherwise go unchecked. Pass the list in the skill's brief so
the two agree.

The scenario folder is `.devbook/scenarios/` unless `playwright.config.ts` sets
`scenarioFolder`; pass that folder to every tool below as `--scenario-folder <dir>` whenever
it is set, because a page's data sets hash from under it.

## spec-ahead

A referenced part with no proof: no spec's `// scenario:` header names its page, that spec has
no `part` titled as the part's heading, or the page's current run records the part `not-run` —
a step still held by `test.fixme()`.

For a part a requirement's case points at, this is that requirement's row in the verdict
table, naming the part, the missing spec or the held step, and `devbook:scenario-derive` or
`phase-implement` as the action. A part referenced directly, with no requirement, is a row of
its own.

## stale

A page whose signature no longer matches its run: the first field
`node .devbook/_tools/scenarios/signature.mjs <page>` prints is not the `signature` in
`<scenario folder>/<stem>/run.json`, or there is no `run.json`.

`stale` qualifies a page's run and is never a sixth verdict, so it never appears in the
verdict table. List every listed page after the verdict table, one row each:

| Page | Page signature | Run signature | Run | Action |
| --- | --- | --- | --- | --- |
| path | from `signature.mjs` | from `run.json`, or `none` | `current` or `stale` | `devbook:scenario-run`, or `devbook:scenario-derive` first when the spec's own `// signature:` differs too |

A stale run is no evidence: the requirements it would prove get none from it. When Verify did
not run the page at its depth, the run Spec Check judges is the one already committed.
