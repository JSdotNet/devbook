# 29. Automation Owns the _meta Refresh

```meta
date: 2026-09-07
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/28-devbook-owns-one-section-of-agentsmd.md", ".devbook/arc42/adr/57-a-workflow-gates-the-checks-the-schedule-cannot.md", ".devbook/arc42/adr/78-derived-artifacts-are-computed-never-committed.md"]
```

The derived-artifacts convention says a repository owes contributors two refresh paths: an
on-demand command, and a scheduled job reconciling the default branch. This repository ships
neither — no `.github/workflows/`, no `build/` — and the root instruction file had filled the
gap by telling every session to regenerate `_meta/` after a chapter edit, which is the one
thing the convention forbids by name.

**The refresh is automation's, and only automation's.** The `devbook-check` schedule already
does it: check, fix the Markdown, refresh the indexes, open a pull request when they moved. So
this repository keeps one refresh path rather than two, and the on-demand half is deliberately
absent. A session that could refresh is a session that will, in the same commit as its chapter
edit, and the merge conflict that follows is resolvable only by running the generator again.

Three things enforce it, because prose alone decays across a long session:

- `.claude/settings.json` denies `Read(_meta/**)`. A `Read` deny also blocks `Edit` and
  `Write`, and matches the directory name at any depth, so one rule covers the root rollup and
  all five scoped folders. `build.mjs` is a subprocess and reaches the files anyway.
- `AGENTS.md` states the rule for Copilot. Content exclusion is not an equivalent lever — it
  does not apply to Copilot CLI or to agent mode — so prose is the whole mechanism there.
- `AGENTS.md` names the schedule as the owner, at the point where the check is run. `CLAUDE.md`
  is a one-line import of it, so the rule is authored once and reaches both hosts.

**The `AGENTS.md` section diverges from its template, in two lines.** `agents-section.md` named
`./build/Update-DevbookIndex.ps1` and `.github/tools/devbook-meta/build.mjs` outright: correct
in a repository that ran `devbook:install`, wrong in the one that authors the convention and
vendors the generator under `plugins/devbook/tools/`. The section here names this repository's
real path and the schedule instead of the script.

**The template now resolves both, rather than hardcoding either.** It renders the generator
path from `generatorPath` — the conventional location where devbook materialized the folder, a
repo-relative path where the repository vendors it — and keeps the on-demand refresh sentence
only where `build/Update-DevbookIndex.ps1` was materialized, naming the scheduled job alone
where it was not. An adopting repository still gets the two refresh paths the convention asks
of it; this one keeps its single path. The section here was written by hand, so no stamp claims
it and no reconcile reports it as customized — but a later `devbook:install` run over this
repository now renders the paths it actually has instead of overwriting them.

**Narrowed by [record 57](57-a-workflow-gates-the-checks-the-schedule-cannot.md) on
2026-09-09.** "This repository ships neither" was an observation about the refresh, and it read
as a standing bar on workflows. It is not one: `.github/workflows/repo-checks.yml` now runs the
three checks on every pull request. The rule above is untouched — that workflow calls `--check`
and nothing else, so it never regenerates, never commits `_meta/`, and the refresh is still
`devbook-check`'s alone.

**Superseded on 2026-09-17 by [record 78](78-derived-artifacts-are-computed-never-committed.md).**
The generator writes no `_meta/` any more, so there is no refresh for automation to own: the
deny rule, the `AGENTS.md` paragraph, and the schedule's refresh half are gone with the files.
