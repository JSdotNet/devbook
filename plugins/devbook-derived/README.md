# devbook-derived

The committed devbook index. [devbook](../devbook) ships the convention and its checker;
this plugin keeps what that checker can derive — the reference graph, the reading outline,
and the open-note index — **in the repository's tree**, for a reader that cannot run the
checker itself, and owns everything that keeps those files fresh.

An L1 extension: it depends on `devbook` and nothing else. Enable it to commit the index;
disable it to stop. The check is devbook's either way, and a repository without this plugin
never sees a derived file, a refresh script, or a nightly pull request.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `devbook-derived` with `/plugin` and run `devbook-derived:install` in the
repository, after `devbook:install` — there is nothing to derive until a folder is adopted.

## What it ships

| Part | What it is |
|---|---|
| `assets/build/Update-DevbookIndex.ps1` | The on-demand refresh: runs devbook's `build.mjs --write` and says which index files moved. `-Scope` narrows it, `-Check` validates without writing |
| `assets/workflows/devbook-meta-nightly.yml` | The scheduled refresh: one pull request when the indexes moved, nothing when they did not |
| `assets/workflows/devbook-meta-drift.yml` | The pull-request drift warning: reports a committed index that no longer matches the Markdown, and never fails on it |
| `rules/devbook-derived-artifacts.md` | Placement, naming, and envelope rules for everything under `_meta/`, installed as a trio so both hosts apply it |
| `assets/agents-section.md` | The plugin's own marker-fenced section of `AGENTS.md`: the `_meta/` rule and the refresh paths |
| `assets/settings-snippet.md` | The `Read(_meta/**)` deny rule for `.claude/settings.json`, offered and never applied |
| `hooks/` | A session-start guardrail: `_meta/` is tool input, never regenerated in a session |

### Skill: `install`

Materializes the table above and stamps `components.derived` in `.devbook/config.json`.
Payload-only: no contract version and no migration ledger, per devbook's
`assets/reconcile-protocol.md`. Idempotent; first install and upgrade are one run.

## The line

devbook's `build.mjs` checks by default and writes only on `--write`. Nothing in devbook
passes that flag; everything here does — at `.devbook/_tools/devbook-meta/build.mjs`, the
path devbook's install materializes. That one option is the whole boundary between the two
plugins: `.devbook/arc42/adr/79-the-checker-is-devbooks-the-committed-index-is-derived.md`.

## Refresh

Never in a session. Two branches that each touch one chapter both rewrite the same JSON,
and the conflict is only resolvable by re-running the generator — so refresh is
`./build/Update-DevbookIndex.ps1` on demand, or the nightly workflow on the default branch,
and a pull request that only edits chapters carries no regenerated index. The drift
workflow warns and never fails.

## License

MIT
