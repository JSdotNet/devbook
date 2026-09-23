# Checks and Indexes

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/building-blocks/devbook.md#index-generator", ".devbook/arc42/tdr/5-derived-index-is-not-optional.md", ".devbook/arc42/adr/chapter-schema.md", ".devbook/arc42/adr/plugin-boundaries.md", ".devbook/arc42/adr/surfaces.md"]
```

Three checks gate this repository, and `.github/workflows/repo-checks.yml` runs all of them on
every pull request: `tools/check-assets.mjs` over the manifests, agents, hooks, rules, and skills; the
generator's `build.mjs --check` over `.devbook/`, which runs the schema validator on every
file; and `claude plugin validate --strict`, deliberately unpinned. The checker — the
validator, the graph, the outline, the fence writer, the `check`, `annotation-sweep`, and
`tech-update` skills — is `devbook`'s. `build.mjs` checks by default, emits the same documents
on `--print`, and writes only on `--write`. The committed `_meta/` index and everything that
exists to keep it fresh — the refresh script, the nightly workflow, the drift warning, the
`devbook-derived-artifacts.md` rule, the `refresh` skill, the deny snippet — is
`devbook-derived`'s, an L1 a repository enables only when it wants the index committed. A
session runs `--check` and never regenerates.

## Why

```meta
```

**Automation owns the refresh.** A session that could refresh will, in the same commit as its
chapter edit, and two branches that each touched one chapter then rewrite the same JSON — a
conflict resolvable only by running the generator again. So the on-demand half is a skill a
person invokes on purpose, the schedule owns the rest, and three things enforce it because prose
decays across a long session: `.claude/settings.json` denies `Read(_meta/**)`, which blocks
`Edit` and `Write` too; `AGENTS.md` states the rule for Copilot, which has no equivalent lever;
and the rendered section names the owner at the point where the check is run.

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

**The committed index is optional, and the line is a flag.** Nothing in this repository read
the `_meta/` files: the canvas calls `buildGraph` on open, the gate reads the chapter, and the
one reader was a desktop application in another repository that could run the generator itself.
Removing the writer altogether was tried and reversed the same day: the owner wants the index
phased out, not now, and a checker without a generator beside it does not earn a plugin. Moving
the whole tooling folder into `devbook-derived` was tried next and reversed the same day too —
it left `devbook` with rules it could not check and a `check` procedure it did not own, and made
a lower layer name a higher one's path in five places. So the split runs through one option on
one CLI rather than through a folder: `--check` and `--print` are the convention's, `--write` is
the derived plugin's, passed at `.devbook/_tools/devbook-meta/build.mjs`, the path devbook's
install materializes — a higher layer naming the lower one's path, which is the ordinary
direction. Phasing the committed index out is disabling one plugin, and a repository that never
enables it never sees a derived file, a refresh script, or a nightly pull request, and still has
the full check.

## Rejected

```meta
```

- A session regenerating after an edit; an on-demand refresh nobody has to ask for.
- Keeping the graph's per-block lint loops beside the validator.
- Running the checks from the schedule, or extending the catalog with a skill for one consumer.
- Pinning the CLI in the workflow.
- Computing the documents and never committing them — the reader that cannot run Node still
  needs a file, and `--print` survives from the attempt.
- The checker and the generator in `devbook-derived` together, with `devbook` naming its path.

The nine Node suites under `plugins/*/tools/` are still run by nobody; adding them is a
separate call.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-23 | A weekly `devbook-verify` schedule runs `verify-change` over every adopted folder through `delivery-schedule`'s wrapper and opens an issue per uncovered `code-ahead` or `conflict` row; like the validate schedule it targets the wrapper, and unlike it, it writes nothing. |
| 2026-09-22 | `verify-change` takes a folder or a bounded context as scope, one kind per run and one table; the other two converters stay at one target, because only the report-only one can widen without deciding more. |
| 2026-09-17 | The checker, fence writer, and three skills return to `devbook`; `build.mjs` writes only on `--write`; `devbook-derived` is the committed index alone, with the canvas and a `refresh` skill. |
| 2026-09-17 | The whole `tools/devbook-meta/` folder and the canvas move to a new `devbook-derived` plugin — superseded the same day. |
| 2026-09-17 | `devbook-meta` writes no file; `--print` emits the documents — superseded the same day, `--print` kept. |
| 2026-09-09 | `repo-checks.yml` runs the three checks on every pull request and push to `main`; the validator is unpinned. |
| 2026-09-09 | `buildGraph` runs `validateDocument` per file; the graph's own lint loops removed. |
| 2026-09-07 | The `_meta/` refresh is the schedule's alone; a session runs `--check` and `.claude/settings.json` denies the folder. |
