# 79. The Checker Is devbook's; the Committed Index Is devbook-derived's

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/5-devbook-still-ships-the-graph-canvas.md", ".devbook/arc42/adr/29-automation-owns-the-_meta-refresh.md", ".devbook/arc42/adr/60-the-annotation-lifecycle-ends-in-devbook.md", ".devbook/arc42/adr/64-1-0-0-is-the-first-release.md", ".devbook/arc42/adr/77-the-tooling-is-devbook-deriveds.md", ".devbook/arc42/tdr/5-derived-index-is-not-optional.md", ".devbook/domain/devbook/domain.md#index-generator", ".devbook/domain/devbook-derived/domain.md", ".devbook/domain/plugin-authoring/domain.md#layer"]
```

`tools/devbook-meta/` is `devbook`'s again — the schema validator, the reference graph, the
outline, the fence writer, the `build.mjs` CLI, and the `devbook-graph` canvas that imports
them — and so are the three skills that run it: `check`, `annotation-sweep`, and `tech-update`
with its `tools/devbook-tech/` inventories. `build.mjs` checks by default and writes only on
`--write`. `devbook-derived` keeps exactly what derives: the committed `_meta/` product — the
refresh script and the nightly workflow that pass `--write`, the drift warning, the
`devbook-derived-artifacts.md` rule, its `AGENTS.md` section, the deny snippet, and the install
that materializes them. This supersedes [record 77](77-the-tooling-is-devbook-deriveds.md) and
its amendment, the same day.

**It is debt record 5's first option, arrived at the long way round.** [Debt record 5](../tdr/5-derived-index-is-not-optional.md)
proposed on 2026-09-08 that "devbook keeps `tools/devbook-meta/`, `devbook-meta.yml`, and the
`--check` gate" and an L1 "invokes `build.mjs` at the path devbook already materializes it
to". Record 77 declined that and moved the whole folder; its amendment then moved the skills
after it to keep devbook from naming a plugin, and left devbook with rules it could not check
and a `check` procedure it did not own. The owner's correction is that the check and the
`.tech` refresh are devbook's business — a convention that ships its own gate — and only the
tool that belongs to a moved skill moves with it. Nothing belongs to the committed index but
the writing of it.

**The line is now a flag.** Before this record the line between the two plugins ran through a
folder; now it runs through one option on one CLI. `--check` (the default) and `--print` are
devbook's: every devbook skill, its CI workflow, and this repository's gate call the tool that
way and never write. `--write` is devbook-derived's: `Update-DevbookIndex.ps1`, the nightly
refresh, and the drift-warning workflow pass it, at `.devbook/_tools/devbook-meta/build.mjs`,
the path devbook's install materializes. A lower layer naming a higher one is gone; a higher
layer naming the lower one's materialized path is the ordinary direction.

**What comes back with the checker, and why.** `annotations.mjs` lives in the same folder and
is the only writer of a fence, so `annotation-sweep` returns per [record 60](60-the-annotation-lifecycle-ends-in-devbook.md)'s
original argument — the foundation's lifecycle is finishable without an extension.
`devbook-graph` imports the modules by relative path, so it returns with them and
[record 5](5-devbook-still-ships-the-graph-canvas.md) reopens exactly as it was. The CI check
workflow returns because it runs `--check`; the drift warning that used to be its second step
becomes `devbook-derived`'s own `devbook-meta-drift.yml`, because drift is a question about the
committed index. `devbook-collaboration` drops its dependency on `devbook-derived`: its findings
go through devbook's fence writer again.

**What devbook-derived is for.** A repository that wants `_meta/` committed — for a reader
that cannot run Node — enables it and runs its install; one that does not never sees a
derived file, a refresh script, or a nightly pull request, and still has the full check.
Phasing the committed index out is disabling one plugin, which is what the owner asked for
on 2026-09-17 and what record 77's shape could not offer, because there the check went with it.

**Version and contract.** `contractVersion` stays at 9; the materialized paths do not change;
no migration ships, on [record 64](64-1-0-0-is-the-first-release.md)'s rule; `UPGRADING.md`
carries no entry. `devbook-derived`'s stamp keeps its name and shape, with three fewer entries.

Consequence: the schedule catalog's `devbook-check` and `tech-update` entries target
`delivery-schedule`'s own `schedule-devbook-check` and `schedule-tech-update` wrappers, which
invoke `devbook:check` and `devbook:tech-update` the way the other twelve entry points invoke
what they sequence — the catalog names a schedule skill, never a foundation skill directly.
Record 77's context chapters — Index Generator, Canvas, Fence Writer, Tech Inventory — return
to devbook's `domain.md`; `devbook-derived`'s context keeps the Derived Index and gains the
Refresh it runs. Debt record 5 is resolved by its own first option.
