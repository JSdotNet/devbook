---
name: doctor
description: 'Diagnose this marketplace''s installation in a repository without writing anything — stamps against disk, outstanding migrations, a stale AGENTS.md section, a phase binding that resolves to nothing or a retired key, the OpenSpec CLI and stale proposals, installed against newest plugins — and name the skill that fixes each finding. Use when: after an upgrade, something may be out of date or drifted, "doctor", "is the stack healthy".'
---

# devbook-config doctor

Open the reply with `devbook-config@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Say whether this repository's installation is current, and write nothing. Whether the
chapters are valid is `devbook:validate`'s question; this one reads every component's stamp,
which no single component may. Every fix it names belongs to that component's own `update` —
two writers for one stamp is how a reconcile stops being idempotent.

## Steps

1. **Look.** Run `node scripts/report.mjs --root <repository> --json` from this plugin's root.
   No `.devbook/config.json`: say "not initialized, run `devbook-config:init`" and stop. Report
   every plugin whose installed version is behind the newest published, and every `update
   available` row, with `devbook-config:update` as the fix.
2. **Check the migration ledger.** From devbook's `installPath` in that output, run
   `node migrations/<id>/migrate.mjs --check --root <repository>` for every folder, oldest
   first. Exit `1` is hard drift: work the ledger says is done, or a migration it does not yet
   record. Never apply one here. devbook not installed: say the ledger is unchecked, and why.
3. **Check every stamp** against disk, with the stamp rules in devbook's
   `assets/reconcile-protocol.md` under **The stamp** — hash every `materialized` entry and
   the `AGENTS.md` section between each component's markers:

   | Drift | Severity | Fix |
   |---|---|---|
   | A migration the plugin's `contractVersion` requires is missing from the ledger | hard | `devbook:update` |
   | The stamped `contractVersion` is below `MINIMUM_CONTRACT_VERSION` in devbook's `tools/devbook-meta/graph.mjs` | hard | Upgrade through the previous major's last release first, then `devbook:update` |
   | A file a stamp says was materialized is gone | hard | That component's `update` |
   | A devbook folder on disk that `adopted` does not list, or the reverse | hard | `devbook:update` |
   | A `components.devbook-procedures` entry, which the report marks as folded | hard | `devbook:update`, whose `027-procedures-in-devbook` moves it under `components.devbook` |
   | A component's `AGENTS.md` section, or one of its markers, is missing | hard | That component's `update` |
   | A materialized hash matches an older release | stale | That component's `update`; nothing is broken |
   | An `AGENTS.md` section matches its stamped hash but not what its template renders now | stale | That component's `update` |
   | A materialized hash matches nothing ever shipped | customized | Report it and leave it — often deliberate |
   | An `AGENTS.md` section no longer matches its stamped hash | customized | Report it and leave it; the repository has taken the section over |

4. **Check the phase maps.** The report's *Retired keys* section names every `extensions`,
   `delivery.roles`, `delivery.mcp`, gate on an extension point, and map under a retired flow
   — `phases.flow-update-packages`, `phases.flow-project` — in the committed file or an
   overlay: each is hard, fixed by `delivery:update`. A `model-selection.md` it names as left
   over is a warning — nothing reads it — fixed by `devbook-config:local`.
5. **Resolve every provider** per `../../resources/provider-resolution.md`: a failing checker
   and a retired id are hard, any other id that resolves to nothing a warning.
6. **Check the change lane** when `components.openspec` exists. Run `openspec --version`
   from the repository root: absent, or outside `components.openspec.cli`, is a warning —
   a fact about this machine, like a plugin it lacks — and the fix is
   `npm install -g @fission-ai/openspec@latest`, run by the person, never here. Then each
   `openspec/changes/<name>/` outside `archive/` whose folder `git log -1 --format=%cs` dates
   more than seven days back — or, never committed, whose newest file is — is a warning naming
   the change and its age, fixed by a person deciding it in the host that keeps its state;
   `devbook-openspec:status` names the move.
7. **Report** one table: finding, component, severity, and the skill that fixes it. Fail on
   hard drift; report staleness, customization, and unresolved providers without failing — a
   stale generated file must not block an unrelated pull request.

A component this machine has not installed is not drift: its stamp is shared, and the
report's `blocked` scope already says so.
