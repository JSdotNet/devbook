# 78. Derived Artifacts Are Computed, Never Committed

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/5-devbook-still-ships-the-graph-canvas.md", ".devbook/arc42/adr/29-automation-owns-the-_meta-refresh.md", ".devbook/arc42/adr/57-a-workflow-gates-the-checks-the-schedule-cannot.md", ".devbook/arc42/adr/62-the-chapter-gate-is-devbook-collaborations-and-reads-the-chapter.md", ".devbook/arc42/adr/64-1-0-0-is-the-first-release.md", ".devbook/arc42/adr/68-the-generator-lives-under-devbook.md", ".devbook/arc42/tdr/5-derived-index-is-not-optional.md", ".devbook/domain/devbook/domain.md", ".devbook/arc42/05-building-block-view.md", ".devbook/arc42/adr/79-the-tooling-is-devbook-deriveds.md"]
```

`devbook-meta` writes no file. `build.mjs --check` is the gate it always was, and
`build.mjs --print` emits the same graph, outline, and annotation documents as JSON on standard
output for a viewer that cannot import the modules in-process. Nothing under `_meta/` exists
any more: not the per-folder indexes, not the repository rollup, and not the machinery that
existed to keep them fresh — `build/Update-DevbookIndex.ps1`, `devbook-meta-nightly.yml`, the
drift step of `devbook-meta.yml`, the `devbook-derived-artifacts.md` rule and its `**/_meta/**`
wrappers, the `_meta/` paragraphs of the `AGENTS.md` section, and the index regeneration step
of the three converters and `devbook-tech-update`. This repository drops its own `_meta/`
folders, the `Read(_meta/**)` deny rule, and the workspace-search exclusions with them.

**Nothing read the files.** [Debt record 5](../tdr/5-derived-index-is-not-optional.md) established
it on 2026-09-08 and [record 62](62-the-chapter-gate-is-devbook-collaborations-and-reads-the-chapter.md)
confirmed it on the one consumer the design had named: the canvas calls `buildGraph` on open,
the gate reads the chapter, `chapter-review-queue` scans when no index is there, and the sole
reader was a desktop application in another repository reading the JSON off disk because it
could not run the generator. That reader can. The generator is plain Node with no host in it
([record 68](68-the-generator-lives-under-devbook.md)), its three parsing modules are the
surface the canvas already imports, and a viewer in any language can spawn `--print` and read
one JSON document. A parser run on open is cheaper than a file that is wrong until a schedule
runs.

**The merge conflict was managed three times over, on behalf of nobody.** Two branches touching
one chapter both rewrote the same JSON, so [record 29](29-automation-owns-the-_meta-refresh.md)
built a deny rule, a paragraph in `AGENTS.md`, and a nightly refresh with its own pull request
to keep sessions from regenerating — and the converters regenerated anyway, in four places the
debt record counted and nothing checked. A team weighing devbook sees generated files in its
tree and a workflow that opens pull requests to fix them before it sees a chapter. Removing
the writer removes all of it: the rule, the enforcement, the schedule's refresh half, and the
objection.

**The check loses nothing.** `--check` never opened a `_meta/` file: it builds every document in
memory and reports problems from there, and only the write was gated on the flag. Unresolved
references, missing roots, duplicate numbers, and every per-block schema rule are found exactly
where they were. What `--print` adds is the same documents on standard output, diagnostics on
standard error so the stream stays parseable, and the `schemaVersion` envelope kept so a viewer
can refuse a shape it does not know. The `annotations-index.mjs` builder stays as the document
`--print` and `chapter-review-queue` read; only its destination is gone.

**What is given up.** A consumer that cannot run Node at all — a static site, a shell script
over `jq` — has no file to read. When one appears, a workflow generates the documents into a
build artifact or a release asset, and never into a commit; that is one job in the adopting
repository, not a convention every adopter carries.

**Version and contract.** `contractVersion` covered "the metadata schema a repository authors
and the derived artifacts a consumer reads"; it now covers the schema alone and stays at 9,
because no authored chapter changes shape. Assets leave the materialize table without a
migration to pull them from installed repositories, on [record 64](64-1-0-0-is-the-first-release.md)'s
rule that the obligation starts at the first install and none has happened. The plugin
version moves to 1.1.0 with every other plugin, on request; `UPGRADING.md` carries no entry.

Consequence: record 29 is superseded — there is no refresh for automation to own, and the
`devbook-check` schedule checks and fixes Markdown only. [Record 57](57-a-workflow-gates-the-checks-the-schedule-cannot.md)
stands with one clause fewer: `--check` still never regenerates, because nothing does.
[Record 5](5-devbook-still-ships-the-graph-canvas.md)'s blocker moves: the generator modules
are now the published surface rather than a private import, so lifting `devbook-graph` is a
move plus a manifest again. Debt record 5 is resolved, and the "never in a session" rule it
found broken in six places is no longer a rule because it no longer has a subject.

**Superseded on 2026-09-17 by [record 79](79-the-tooling-is-devbook-deriveds.md).** The writer
is restored and the committed indexes stay for now; the check and the generator move together
into `devbook-derived`. `--print` survives. Record 29 stands again.
