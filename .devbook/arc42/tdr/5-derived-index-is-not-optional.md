# 5. The Derived Index Is Not Optional

```meta
date: 2026-09-08
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/arc42/adr/surfaces.md", ".devbook/arc42/adr/annotations.md", ".devbook/arc42/05-building-block-view.md", ".devbook/domain/plugin-authoring/domain.md#layer", ".devbook/domain/devbook/domain.md"]
```

**Remediation state:** identified · **Severity:** medium · **Owner:** the maintainer

## The debt

```meta
```

[Layer](../../domain/plugin-authoring/domain.md#layer) says an optional capability is a plugin
one layer up, and `devbook-collaboration` is the worked example: a `dependencies` array, its own
`install`, its own `components.<name>` entry in the stamp, and a hard stop when `devbook` is
absent. The derived `_meta/` index is optional in fact and mandatory in packaging. A repository
cannot adopt devbook and decline it.

**Nothing in this repository reads the output.** `devbook-graph` calls `buildGraph(REPO_ROOT)`
on open and never opens a `_meta/` file — deliberately, so the view cannot go stale.
`chapter-review-queue` prefers the index and states its own fallback: when there is none, it
scans. The only other mention is a dashboard test asserting that writes to `_meta/index.json`
do not count as session activity. The artifact is written here and read nowhere.

**2026-09-14. The reader the generator itself named did not materialize, on purpose.** The
header of `annotations-index.mjs` listed three consumers the annotation design intended for
the index, and one of them — "the approval gate rendering the objections raised since
`approved-at`" — was built here. It reads the chapter instead.
[the annotations record](../adr/annotations.md)
says why: the gate shows one chapter and has that file open already, every fact it needs is in
it, and the index is refreshed nightly, so the note a reviewer wrote on this branch an hour
ago is exactly the one it would miss. That sharpens this record rather than closing it. A
one-chapter read is the wrong shape of consumer for a corpus index, and the candidate the
design named turned out to be one; what the index is for is the read that spans chapters,
and in this repository that is still `chapter-review-queue` alone, with its scan fallback.
The header now says so.

**Every reconcile installs it anyway.** `assets/build/Update-DevbookIndex.ps1` materializes
`always`, both workflows materialize wherever GitHub Actions is present, and
`devbook-derived-artifacts.md` installs `always` — see the table in
`assets/reconcile-protocol.md`. The `AGENTS.md` section devbook renders states the `_meta/`
rules whether or not the repository has a reader for them.

**The one real consumer is outside this repository.** The Backlog desktop app reads
`_meta/index.json` for folder list views and `_meta/graph.json` for its atlas, its technology
graph, and its roadmap rollups, off disk, in whichever repository it is pointed at. It cannot
run the generator. That is the argument for the artifact existing — and equally the argument for
adopting it per repository rather than shipping it to all of them.

**And the foundation runs the writer.** `devbook-tech-update` and `sync-specs` — the five
`to-spec-*` converters when this was written — call `build.mjs --scope <folder>` with no
`--check`. `AGENTS.md` says
refreshing `_meta/` "belongs to automation, never to a session", and `devbook-check` step 6 says
committing the refresh is "usually not what you want". `devbook-tech-update` already hedges its
own line — indexes regenerated "when the repository ships `devbook-meta`" — which is a
dependency written into prose because there is no field to put it in.

## Origin

```meta
```

Logged on 2026-09-08, from the question of whether `_meta` generation could be made optional and
what a repository without it would lose.

The generator predates the layer model. It was devbook's before `devbook-collaboration`
established that an optional capability is an L1 plugin with its own install and its own stamp
entry, and nothing since has revisited which half of `tools/devbook-meta/` is foundation. The
`--check` half is: unresolved `related` and `depends-on` references are found in `graph.mjs`,
missing root documents and duplicate `number` values in `outline.mjs`, so devbook cannot
validate its own schema without both. The writing half never had that argument made for it.

## Affected components

```meta
```

`devbook`, in three materialized assets, one rule, one section of the rendered `AGENTS.md`, and
six skill call sites. Every repository it reconciles, which receives the refresh script and the
nightly workflow unconditionally. The Backlog app, whose knowledge and roadmap views are the
only thing the committed artifacts are for. `devbook-graph` is untouched — it rebuilds from
Markdown — but its own lift is blocked on the same modules, for a different reason recorded in
[the decision](../adr/surfaces.md).

## Impact

```meta
```

Nothing is broken. The cost is that a per-repository question is answered once for every
repository.

**Every adopter carries the machinery.** A nightly workflow, a refresh script, and a rule
governing a folder it may have no reader for. Turning it off means editing managed assets, which
makes them customized and stops them being refreshed again.

**The merge conflict is managed rather than avoided.** Two branches touching one chapter both
rewrite the same JSON. This repository handles that with a deny rule in `.claude/settings.json`,
a paragraph in `AGENTS.md`, and the `devbook-check` schedule — three mechanisms protecting an
artifact nothing here reads.

**A stated rule is broken in six places and nothing checks it.** The "never in a session" rule
has no enforcement, which is the same shape as
[TDR 1](1-body-budgets-unenforced.md): a threshold stated without the check that would make it
hold.

## Remediation options

```meta
```

| Option | Trade-off |
| --- | --- |
| `devbook-derived`, an L1 extension on the `devbook-collaboration` template, taking `Update-DevbookIndex.ps1`, `devbook-meta-nightly.yml`, `devbook-derived-artifacts.md` with its `**/_meta/**` rule entry, the `_meta/` paragraphs of the `AGENTS.md` section, and `devbook-check` step 6 | What the layer model already describes. devbook keeps `tools/devbook-meta/`, `devbook-meta.yml`, and the `--check` gate, so a devbook-only repository still validates its own schema. L1 invokes `.devbook/_tools/devbook-meta/build.mjs` at the path devbook already materializes it to, so no module crosses a plugin boundary. Costs a migration: assets leaving the materialize table have to be pulled from repositories that do not adopt the new plugin |
| The same split, with `emit()` and the `outputPathFor` / `outlinePathFor` / `annotationsPathFor` placement functions moving too, so the foundation ships no writer at all | The stricter boundary, and honest if placement is L1's rule — it is `devbook-derived-artifacts.md` that governs it, and that rule is moving. But L1's contract becomes twelve exports across three modules, versioned in lockstep by the stamp, in place of one documented CLI invocation |
| Fix only the contradiction: make the six converter call sites `--check`-only and leave the packaging alone | Cheapest, and it removes a rule nobody keeps. Not an alternative to the split — both options above need it first — so this is a prerequisite being taken early, not a resolution |
| Leave it | Every new adopter receives the nightly and the refresh script whether or not anything reads the output, and the "never in a session" rule stays stated and broken in six places |

Take the third now; it falls due whichever way the rest goes. Hold the first until a repository
actually needs to decline the artifact, because a plugin created before it has a second adopter
is the bridge this repository has already removed once. Prefer the first over the second unless
placement turns out to need to move — a CLI is a narrower contract to keep than twelve exports.

**Trigger:** the first repository that adopts devbook with no `_meta/` reader, the next change to
where the derived artifacts are placed, or the next edit to any of the six converter call sites —
whichever comes first.
