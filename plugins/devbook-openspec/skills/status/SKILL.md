---
name: status
description: 'Report where a change under openspec/changes/ stands — artifact progress, each step''s state and scenario pages, the verify-change verdict per delta, both gates and whether their fingerprints hold — and name the next move. With --replan, re-check a change''s plan against main. Writes nothing. Use when: "where is this change", what is left before accepting, can it be archived, before devbook-openspec:archive.'
---

# devbook-openspec status

Open the reply with `devbook-openspec@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

OpenSpec's `status` answers whether the artifacts are written; this answers whether the change
is agreed, built, and ready to fold in. One change, or every open one when none is named. Write
nothing: every edit this report points at is a person's or another skill's.

1. **Artifacts.** `openspec status --change <name> --json`: each artifact's state and whether
   the change is complete. `node .devbook/_tools/devbook-meta/delta.mjs --check <name>`: every
   delta resolves, or which does not.
2. **Steps.** Each step of `tasks.md` with its state, read exactly as
   `../tracker/SKILL.md` reads it, its `owner`, and the scenario pages
   its `delivers:` names, whole or by part.
3. **Verdicts.** Run `devbook:verify-change` over the chapters the deltas target, which reads
   an agreed change as pending truth. One row per delta: the verdict, and for `code-ahead`
   whether it is `covered by change <name>, step N`. A delta whose target is outside
   `verify-change`'s kinds — a decision or debt record, a prose chapter — reads
   `n/a: no code counterpart`, and acceptance owes it no verdict. A demo delta gets its own
   row, verified through `verify-change`'s `demo` kind. Every scenario page a step delivers
   gets a row too: its run, which `verify-change` reports for the requirements whose
   `Proved by:` names the page — `stale` or `missing` with `devbook:scenario-run` as the
   action, `current` otherwise. Where `verify-change` is not installed, say the column is
   empty and why.
4. **Gates.** From `proposal.md`'s file block: `status`, who approved and accepted it and when,
   and whether each `-hash` still equals `node .devbook/_tools/devbook-meta/chapter-hash.mjs
   openspec/changes/<name>`. A hash that no longer matches is a lapsed gate, not a passed one.
   Any open `kind: question` fence in the proposal or a delta is listed: it blocks both gates.
5. **Next move**, exactly one: approve (`devbook-collaboration:chapter-approve` on the change),
   build the first open step (`/opsx:apply`), fix a verdict, run a stale or missing scenario
   (`devbook:scenario-run`), accept (`devbook-collaboration:chapter-accept` — every step
   `done`, every delta it can verify aligned, and every delivered scenario page's run current), or
   archive (`devbook-openspec:archive` — accepted, both hashes current).

## `--replan`

Bound as a chore after the engine's `phase-scope` with `on-failure: required`, so it runs after
the base is fetched and before a step's scope is acted on. One change — the one the run's item belongs
to — and three checks instead of the report, in order: every delta against its target chapter
as it now stands on `main` (a target changed since `approved-at` is a conflict); every open
step against the code through `devbook:verify-change` (a step whose requirements and
invariants already hold, or whose assumption a merged step broke); and every `depends-on` and
`related` chapter of the proposal (one deprecated or rewritten since). Print one row per flag
and exit non-zero on any, zero on none. Rewrite nothing: revising is `/opsx:update`, and a
revised delta lapses the approval and goes back through `chapter-approve`.
