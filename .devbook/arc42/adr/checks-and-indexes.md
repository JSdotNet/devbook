# Checks and Indexes

```meta
date: 2026-09-09
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/domain/devbook/domain.md#index-generator", ".devbook/arc42/tdr/5-derived-index-is-not-optional.md", ".devbook/arc42/adr/chapter-schema.md"]
```

Three checks gate this repository, and `.github/workflows/repo-checks.yml` runs all of them on
every pull request: `tools/check-assets.mjs` over the manifests, agents, hooks, and rules; the
generator's `build.mjs --check` over `.devbook/`, which runs the schema validator on every
file; and `claude plugin validate --strict`, deliberately unpinned. The derived `_meta/`
indexes are refreshed by the `devbook-check` schedule alone, which opens a pull request when
they moved. A session runs `--check` and never regenerates.

## Why

```meta
```

**Automation owns the refresh.** A session that could refresh will, in the same commit as its
chapter edit, and two branches that each touched one chapter then rewrite the same JSON — a
conflict resolvable only by running the generator again. So this repository keeps one refresh
path and the on-demand half is absent. Prose decays across a long session, so three things
enforce it: `.claude/settings.json` denies `Read(_meta/**)`, which blocks `Edit` and `Write`
too; `AGENTS.md` states the rule for Copilot, which has no equivalent lever; and `AGENTS.md`
names the schedule as the owner at the point where the check is run. The rendered section
names this repository's real generator path and the schedule, not the materialized script.

**The hard gate runs the validator.** `validateDocument` is the only implementation of the
per-block rules — status ladders, value shapes, unrecognized fields, a heading with no `meta`
block — and nothing on the `--check` path called it, so an out-of-ladder `status` exited `0`
and merged. `buildGraph` now runs it once per file with severities intact, and the graph's own
seven lint loops are removed rather than kept beside it, because a gate that says everything
twice is a gate people stop reading. The first run found zero errors and 140 warnings, every one
a structural heading without a block; that class cannot be driven to zero and fails nothing.

**A workflow, because a check that cannot block a merge is a report.** All three checks passed
when run by hand and nothing ran them. The schedule was the alternative and fails twice: it runs
daily on the default branch, after the merge it should have stopped, and a schedule is a trigger
that names a skill, while `check-assets` is repo-local and no skill runs it. The workflow calls
`--check` only, so the refresh rule stands untouched. The CLI validator is unpinned because it
tracks the host's schema, which is the one thing it exists to catch; a red gate after a CLI
release is read, not pinned around.

## Rejected

```meta
```

- An on-demand refresh command beside the schedule, and a session regenerating after an edit.
- Keeping the graph's per-block lint loops beside the validator.
- Running the checks from the schedule, or extending the catalog with a skill for one consumer.
- Pinning the CLI in the workflow.

The nine Node suites under `plugins/*/tools/` are still run by nobody; adding them is a
separate call.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-09 | `repo-checks.yml` runs the three checks on every pull request and push to `main`; the validator is unpinned. |
| 2026-09-09 | `buildGraph` runs `validateDocument` per file; the graph's own lint loops removed. |
| 2026-09-07 | The `_meta/` refresh is the schedule's alone; a session runs `--check` and `.claude/settings.json` denies the folder. |
