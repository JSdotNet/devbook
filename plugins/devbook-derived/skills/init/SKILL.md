---
name: init
description: 'Bring the committed devbook index into a repository for the first time — the on-demand refresh script, the nightly refresh and drift-warning workflows, the derived-artifacts rule with a wrapper per host, and its own marker-fenced section of AGENTS.md — and stamp it under components.derived in .devbook/config.json. Refused where components.derived already exists: run devbook-derived:update. Use when: adopting devbook-derived, or the _meta indexes have no refresh path. Triggers on: "devbook-derived init", "install devbook-derived", "commit the devbook index", "set up the index refresh".'
---

# devbook-derived init

Open the reply with `devbook-derived@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Materialize the refresh paths the way `devbook` materializes its rules: copy what is stale,
report what is customized, stamp what landed. Read `devbook`'s
`assets/reconcile-protocol.md` first for **The stamp**'s two shared fields, the hash rules,
and the plan-before-write phase; this plugin writes `components.derived` and touches no
other entry. The folder list comes from devbook's stamp, never from disk; every folder
lives under `.devbook/`.

Stop and say so if `components.derived` already exists — "already initialized, run
`devbook-derived:update`". Stop too if `components.devbook` names no adopted folder, or if
`.devbook/_tools/devbook-meta/` is absent: there is nothing to derive from and nothing to
derive with — run `devbook:init` first.

## What lands

| From this plugin | Into the repository | When |
|---|---|---|
| `assets/workflows/devbook-meta-nightly.yml` | `.github/workflows/devbook-meta-nightly.yml` | GitHub Actions present |
| `assets/workflows/devbook-meta-drift.yml` | `.github/workflows/devbook-meta-drift.yml` | GitHub Actions present |
| `assets/build/Update-DevbookIndex.ps1` | `build/Update-DevbookIndex.ps1` | always |
| `assets/agents-section.md` | `AGENTS.md`, between `<!-- devbook-derived:begin -->` and `<!-- devbook-derived:end -->` | always |
| `rules/devbook-derived-artifacts.md` and its `paths` | `.agents/rules/`, `.claude/rules/`, `.github/instructions/` — the trio devbook's `assets/rule-wrappers.md` describes | always |

Both workflows are edited on the way in — branch name, the nightly `cron` and
`REFRESH_BRANCH`, and the path filters trimmed to the adopted folders. The edit makes both
files customized from the first run, which is intended.

The `AGENTS.md` section is rendered whole from `assets/agents-section.md`, appended after
devbook's section, keyed `AGENTS.md#devbook-derived`, and follows devbook's marker rules —
rewritten while its text still hashes to what this plugin wrote, reported and left alone once
it does not. Never write inside devbook's markers.

Offer the `.claude/settings.json` deny rule from `assets/settings-snippet.md`; nothing else
enforces the `_meta/` rule mechanically. Never apply it silently.

## The run

1. **Plan.** One table — `create`, `update`, `skip-customized` — and write nothing. A file
   already present at a path in the table was never stamped: it is `skip-customized`.
2. **Materialize.** Create what is absent; overwrite only a file whose hash matches a
   release this plugin shipped.
3. **Stamp.** Write `components.derived`: `pluginVersion` and `materialized`, each entry
   with the release it came from and its hash. Payload-only: no contract version, no ledger.
4. **Verify.** Run `./build/Update-DevbookIndex.ps1 -Check` (or devbook's `build.mjs --check`)
   and report; a run that ends on a failing check is reported as failing, never as initialized.
5. **Report** what moved, and leave the commit to the user. Without GitHub Actions, say
   plainly that the check runs locally and the refresh is manual.
