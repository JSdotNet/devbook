# Checks and Indexes

```meta
date: 2026-10-01
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/building-blocks/devbook.md#index-generator", ".devbook/arc42/tdr/5-derived-index-is-not-optional.md", ".devbook/arc42/adr/chapter-schema.md", ".devbook/arc42/adr/plugin-boundaries.md", ".devbook/arc42/adr/surfaces.md"]
c4: ["marketplace.devbook.index-generator", "marketplace.devbook-derived.refresh-paths", "marketplace.devbook-derived.canvas"]
c4-touches: ["github"]
```

Four checks gate this repository, and `.github/workflows/repo-checks.yml` runs all of them on
every pull request: `tools/check-assets.mjs` over the manifests, agents, hooks, rules, and skills; the
generator's `build.mjs --check` over `.devbook/`, which runs the schema validator on every
file; `node --test` over every `*.test.mjs` under `plugins/` and `tools/`, each file named;
and `claude plugin validate --strict`, deliberately unpinned. The checker — the
validator, the graph, the outline, the fence writer, the `validate`, `annotation-sweep`, and
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

**The term register is devbook's, and reads fields only.** `build.mjs` writes a fourth
document per scope, `_meta/naming.json`: `domain/`'s ubiquitous language as a list, each term
with its lede as its definition, its `aliases`, and its `related` chapters. A reader that
wants to show what a term means had only the graph, whose term nodes carry a label and nothing
else, and the alternative was parsing Markdown in another language. It is built from the graph
the check already holds — the walk keeps each chapter's lede beside the nodes, off them, so
`graph.json` does not change shape — and devbook owns it like the other three; devbook-derived
commits it like the other three. A term is a `term` chapter or any other `domain/` chapter
with `aliases`. The chapters of `arc42/12-glossary.md` are not terms: their "Also called" line
is prose, not a field ([debt record 8](../tdr/8-the-domain-rule-is-not-exercised-here.md)), and
a generator that read it would make a writing habit part of the schema. So this repository's
own register is empty until a `domain/` is adopted. The register carries its own
`schemaVersion`, starting at 1, because its first reader, spec-manager, lives outside this
repository and pins it; a contract bump that leaves the register alone must not break that
reader. Adding a derived file changes no chapter schema, so no migration ships with it.

**The scenario register is devbook's too, and carries what a page's parts cannot.** `build.mjs`
writes a fifth document per scope, `_meta/scenarios.json`: every `type: scenario` page with its
stem, path, title, and declared status, its six setup fields as written, its screenshot labels
with the part each sits in, and its parts — title and anchor — each with the requirement cases
whose `Proved by:` names it. A part owes no block, so it is no node in the graph, and the
pointers at it sit in requirement prose rather than a field, so spec-manager and Backlog each
had only the corpus to parse. It is built by the scenario pass the check already runs, kept
beside the nodes like the ledes so `graph.json` does not change shape, and it carries its own
`schemaVersion`, starting at 1, for the reason the term register does. Run state stays out:
a run is a file the suite writes, and a reader compares its signature with the page's. A new
derived file changes no chapter schema, so no migration ships and the contract stays at 30.

**A rule is not a term, so the register leaves requirements and invariants out.** A
`requirement` or `invariant` chapter's `aliases` hold the codes the rule is cited by — a
requirement code from the document it was captured from — not surface names of a concept, and
`devbook-domain.md` says so. Rules split from one source row each keep its code, so a code is
expected on several rules, and a register that read them was mostly rules and warned mostly
about that: over spec-manager's devbook at `e2186d2f` it held 1668 terms, 1426 of them rules,
and 839 of its 859 collisions came from shared codes. Without them it holds 242 terms and 18
collisions, each a real clash between two model or feature chapters. The field stays legal on
a behaviour chapter and nothing in a chapter moves, so the change is to the derived file and a
rule's prose only, and no migration is owed. `verify-change`'s dead-alias search skips the same
two kinds, since a code names no identifier by design.

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
- Reading the arc42 glossary into the term register by parsing its "Also called" line.
- The register on the contract version: a consumer pinning it would break on every bump.
- Scenario parts as graph nodes, with `proves` edges from the requirements: every node in every
  committed `graph.json` would move for one reader's list, and a part's labels and setup fields
  are no edge.
- A separate field for a requirement code, or the code in the requirement's name: either moves
  every code in every adopted repository, which is a migration bought for a field name, and the
  name would put one code in several anchors.
- Keeping rules in the register and counting no collision between rules of one behaviour file:
  the register would still be mostly rules, and a rule is not a word of the language.

The nine Node suites under `plugins/*/tools/` are still run by nobody; adding them is a
separate call.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-10-19 | The change folder leaves the graph: its proposals and deltas are still checked — `checkDelta` for each delta, the proposal's lint, rungs, and fingerprint — but none is a node. A delta naming a chapter only its own change adds failed as an unresolved reference, so moving chapters into a change broke the check. References run one way: a devbook chapter's `related`, `depends-on`, or prose link into `openspec/changes/` is an error, because a change is not agreed and moves to `archive/` when it lands. Supersedes the 2026-09-28 row. |
| 2026-10-08 | `build.mjs` writes `_meta/scenarios.json`, the scenario register, per scope beside the other four: every scenario page with its stem, setup fields, labels, and parts, each part with the requirement cases that point at it; its own `schemaVersion: 1`, and `graph.json` unchanged. |
| 2026-10-02 | All three converters also take a sync unit or group as scope, its chapters exactly as `units.mjs` lists them; `capture-specs` and `apply-change` widen this far and no further, because a unit is what one pull request changes and the tool, not the pass, decides what it holds. Any `conflict` stops the group, and an unattended run lands a draft pull request with added chapters at `draft`. `verify-change`'s table gains each chapter's effective `sync` and the sweep that will act. |
| 2026-10-02 | The term register leaves `requirement` and `invariant` chapters out: their `aliases` are the codes a rule is cited by, shared by rules split from one row, and `verify-change` no longer reports one as a dead alias. Over spec-manager's devbook, 1668 terms and 859 collisions became 242 and 18. No migration: the field stays legal and no chapter changes. |
| 2026-10-01 | `build.mjs` writes `_meta/naming.json`, the term register, per scope beside the other three, from `domain/`'s `term` and aliased chapters; `arc42/`'s glossary is not read, and the register carries its own `schemaVersion: 1`. |
| 2026-09-28 | The checker indexes the change folder's proposals and deltas into the repository rollup only, with no scope or `_meta/` of its own, since OpenSpec would read one as a change; each delta is checked by `delta.mjs`'s `checkDelta`, the same function a merge runs, so an indexed delta fails the check exactly when it would fail to merge. |
| 2026-09-27 | `repo-checks.yml` runs the tools' `*.test.mjs` files through `node --test`, listed with `git ls-files` because the directory form loads nothing on Windows and misses a test in a new folder silently. |
| 2026-09-26 | This repository materializes `devbook-derived`'s refresh script and both workflows, the nightly at 02:17 UTC so it runs ahead of the 03:00 `devbook-validate` schedule. Its `AGENTS.md` section keeps the never-in-session sentence and is stamped `managed: false`: the stricter rule here outranks the template's on-demand refresh, and the script serves `-Check` and the drift warning's hint. |
| 2026-09-23 | A weekly `devbook-verify` schedule runs `verify-change` over every adopted folder through `delivery-schedule`'s wrapper and opens an issue per uncovered `code-ahead` or `conflict` row; like the validate schedule it targets the wrapper, and unlike it, it writes nothing. |
| 2026-09-22 | `verify-change` takes a folder or a bounded context as scope, one kind per run and one table; the other two converters stay at one target, because only the report-only one can widen without deciding more. |
| 2026-09-17 | The checker, fence writer, and three skills return to `devbook`; `build.mjs` writes only on `--write`; `devbook-derived` is the committed index alone, with the canvas and a `refresh` skill. |
| 2026-09-17 | The whole `tools/devbook-meta/` folder and the canvas move to a new `devbook-derived` plugin — superseded the same day. |
| 2026-09-17 | `devbook-meta` writes no file; `--print` emits the documents — superseded the same day, `--print` kept. |
| 2026-09-09 | `repo-checks.yml` runs the three checks on every pull request and push to `main`; the validator is unpinned. |
| 2026-09-09 | `buildGraph` runs `validateDocument` per file; the graph's own lint loops removed. |
| 2026-09-07 | The `_meta/` refresh is the schedule's alone; a session runs `--check` and `.claude/settings.json` denies the folder. |
