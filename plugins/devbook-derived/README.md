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
| `extensions/devbook-graph/` | Two Copilot canvases: the reference graph, rendered from the same modules the generator writes with, and a single chapter beside its parsed block |
| `assets/workflows/devbook-meta.yml` | The CI check: fails on a broken reference or a schema violation, warns on a drifted index |
| `assets/workflows/devbook-meta-nightly.yml` | The scheduled refresh: one pull request when the indexes moved, nothing when they did not |
| `assets/build/Update-DevbookIndex.ps1` | The on-demand refresh, with `-Scope` and `-Check`; says which index files moved |
| `rules/devbook-derived-artifacts.md` | Placement, naming, and envelope rules for everything under `_meta/`, installed as a trio so both hosts apply it |
| `assets/agents-section.md` | The plugin's own marker-fenced section of `AGENTS.md`: the `_meta/` rule, the refresh paths, the check command |
| `assets/settings-snippet.md` | The `Read(_meta/**)` deny rule for `.claude/settings.json`, offered and never applied |
| `hooks/` | A session-start guardrail: `_meta/` is tool input, never regenerated in a session |

### Skill: `install`

Materializes the table above into a repository — the tool under `.devbook/_tools/devbook-meta/`,
the workflows, the script, the rule trio, its own `AGENTS.md` section — and stamps
`components.derived` in `.devbook/config.json`. Payload-only: no contract version and no
migration ledger, per devbook's `assets/reconcile-protocol.md`. Idempotent; first install
and upgrade are one run.

## Who calls the tool

devbook's own skills name the materialized path and say what they do when it is absent:
`devbook:install` runs the check in its last phase, `devbook-check` runs it first, the
converters run it when a pass closes, and `annotation-sweep` deletes fences through
`annotations.mjs`. `devbook-collaboration` declares this plugin for the same reason. Each
degrades to a report naming `devbook-derived:install` rather than failing; the reason the
convention names its tool this way round is
`.devbook/arc42/adr/77-the-tooling-is-devbook-deriveds.md`.

## Refresh

Never in a session. Two branches that each touch one chapter both rewrite the same JSON,
and the conflict is only resolvable by re-running the generator — so refresh is
`./build/Update-DevbookIndex.ps1` on demand, or the nightly workflow on the default branch,
and a pull request that only edits chapters carries no regenerated index. The CI check
warns on drift and never fails on it.

## License

MIT
