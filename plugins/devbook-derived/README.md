# devbook-derived

The tooling over [devbook](../devbook)'s chapters: the checker and the generator, one
program, in one plugin. `devbook` is the convention — the folder rules, the `meta` block
schema, the converters. This plugin is what enforces it and what derives from it.

An L1 extension: it depends on `devbook` and nothing else. Enable it and run
`devbook-derived:install`; a repository that adopts devbook without it has readable,
addressed Markdown and no gate.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `devbook-derived` with `/plugin` and run `devbook-derived:install` in the
repository. `devbook` is a declared dependency, so the host installs and enables it
alongside; run `devbook:install` first, because there is nothing to check until a folder
is adopted.

## What it ships

| Part | What it is |
|---|---|
| `tools/devbook-meta/` | `build.mjs` parses every `meta` block, resolves every reference, and writes `graph.json`, `index.json`, and `annotations.json` into a `_meta/` beside each adopted folder's chapters and, for the repository rollup, into `.devbook/_meta/`. `--check` validates and writes nothing; `--print` emits the same documents on stdout. `annotations.mjs` is the only writer of an annotation fence. Shape and rules: [`tools/devbook-meta/README.md`](tools/devbook-meta/README.md) |
| `tools/devbook-tech/` | Deterministic .NET and frontend package inventories, the evidence `tech-update` grounds `.tech` chapters in |
| `extensions/devbook-graph/` | Two Copilot canvases: the reference graph, rendered from the same modules the generator writes with, and a single chapter beside its parsed block |
| `assets/workflows/devbook-meta.yml` | The CI check: fails on a broken reference or a schema violation, warns on a drifted index |
| `assets/workflows/devbook-meta-nightly.yml` | The scheduled refresh: one pull request when the indexes moved, nothing when they did not |
| `assets/build/Update-DevbookIndex.ps1` | The on-demand refresh, with `-Scope` and `-Check`; says which index files moved |
| `rules/devbook-derived-artifacts.md` | Placement, naming, and envelope rules for everything under `_meta/`, installed as a trio so both hosts apply it |
| `assets/agents-section.md` | The plugin's own marker-fenced section of `AGENTS.md`: the `_meta/` rule, the refresh paths, the check command |
| `assets/settings-snippet.md` | The `Read(_meta/**)` deny rule for `.claude/settings.json`, offered and never applied |
| `hooks/` | A session-start guardrail: `_meta/` is tool input, never regenerated in a session |

## Skills

| Skill | What it does |
|---|---|
| `install` | Materializes the table above into a repository — the tools under `.devbook/_tools/`, the workflows, the script, the rule trio, its own `AGENTS.md` section — and stamps `components.derived`. Payload-only: no contract version and no migration ledger, per devbook's `assets/reconcile-protocol.md`. Idempotent |
| `check` | Runs the checker and writes nothing, then reads devbook's migration ledger and stamp for drift, and repairs what it can prove. The daily `devbook-check` schedule's target |
| `annotation-sweep` | Deletes every resolved annotation fence in one chapter through `annotations.mjs`, the last step of devbook's annotation lifecycle |
| `tech-update` | Refreshes a `.tech` graph from the inventory scripts and repository analysis, and hands the write to the `.tech` flow |

## Who calls the tool

Nothing in `devbook` does. devbook's skills say "run the check the repository's
`AGENTS.md` names", and this plugin's section of that file is what names it — so a
repository without this plugin has no check to run and its skills say so. `devbook-collaboration`
declares this plugin because every finding goes through the fence writer. The reason the
convention and its tool are two plugins is
`.devbook/arc42/adr/77-the-tooling-is-devbook-deriveds.md`.

## Refresh

Never in a session. Two branches that each touch one chapter both rewrite the same JSON,
and the conflict is only resolvable by re-running the generator — so refresh is
`./build/Update-DevbookIndex.ps1` on demand, or the nightly workflow on the default branch,
and a pull request that only edits chapters carries no regenerated index. The CI check
warns on drift and never fails on it.

## License

MIT
