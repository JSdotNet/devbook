---
name: update
description: 'Move a repository''s whole configured stack forward in one run — refresh the catalog, report which installed plugins are behind, then fan out to every adopted component''s own install skill so outstanding migrations run and stale files are re-materialized, and re-validate the engine-owned keys of .devbook/config.json and the overlays over it. Skips what this machine has not installed and what this checkout has not enabled, without ever dropping a stamp. Use when: upgrading the stack, a plugin is out of date, a migration is outstanding, or the config no longer validates after an upgrade. Triggers on: "update the stack", "upgrade the stack", "update everything", "am I on the latest", "update my plugins", "run outstanding migrations", "the config stopped validating", "the stack config is still in .github", "there is still a flow-context.md".'
---

# devbook-config update

Open the reply with `devbook-config@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

One skill for the whole stack. It is `devbook-config:setup`'s other half — setup writes the
engine keys into a repository that has none, this moves an already-configured one forward —
and it owns the same four keys with the same boundary: a `components.<name>` stamp is written
by that component's own install skill and by nothing else.

So this **orchestrates and never installs**. It resolves what is in scope, runs each
component's own install skill in order, and re-validates the engine keys around them. A
migration applied from here would leave the ledger describing something that did not happen.

Run it whole every time. A version bump, a migration, and a config change are one operation.

## Scope

`scripts/report.mjs` prints a `scope` verdict per plugin from three orthogonal facts:
`installed` is about this machine, `enabled` about this checkout, and the `components.<name>`
stamp about the repository and everyone who shares it.

| Scope | Do |
| --- | --- |
| `reconcile` | Run its install skill. |
| `blocked` | Report it, skip it, **change nothing**. |
| `frozen` | Report it; offer to enable it here. Skip if declined. |
| `adoptable` | Ask once whether to adopt. Never impose. |
| `available` | One line. |
| `out-of-scope` | A footnote. |

**Never remove a `components.<name>` entry because this machine lacks the plugin.** A stamp is
committed and shared; installed-ness is personal and per-machine. Dropping the entry un-adopts
that component for everyone on the repository at the next commit, from a fact about one
laptop. `blocked` means *this machine cannot reconcile it*, and skipping is the whole action.

## Steps

1. **Refresh, then look.** Update the marketplace catalog through the host, then run
   `node scripts/report.mjs --root <repository>` from this plugin's root. A clone older than
   the source is the common cause of "already latest" being wrong.

   If the report finds no `.devbook/config.json`, this repository was never set up — run
   `devbook-config:setup` and stop.

2. **Show the drift and let the user choose.** The report's scope table, the `update
   available` rows, and anything installed but missing from the catalog. Change nothing yet.

3. **Update the plugins the user approves**, through the host's own plugin command. This skill
   does not reach into the host's plugin cache, so **this step is the user's to run**. Print
   the exact commands, say that re-running this skill is how the run continues, and stop there
   until they have. Every step is idempotent, so resuming costs nothing.

4. **Fan out, in the report's order.** For each `reconcile` row, invoke that component's own
   install skill — `devbook:install`, then `devbook-collaboration:install`, then
   `delivery:install`, then `delivery-schedule:install` — and let it run its migrations oldest
   first, overwrite what is stale, leave what is customized, and rewrite its own stamp.

   The order is load-bearing at both ends: collaboration's install refuses to run until
   `components.devbook` names an adopted folder, and schedule checks its targets against what
   the repository enables. `delivery:install` re-seeds the `start` and `capture` copies and
   depends on no other component. Each is **required**: a failure does not abort the rest, and
   does make the whole run report as failing.

5. **Re-validate the engine keys.** Run the delivery plugin's `tools/stack-config/check.mjs`
   against the config; take its checkout root from the report's catalog line, or the plugin's
   `installPath` from `--json`. It picks up every overlay on its own — the checkout's beside
   the committed file, the user's from the devbook config directory and the committed `id`.
   An upgrade can retire a key, and an unknown key is an error rather than a
   silently absent setting. Fix against `resources/surface-contract.md` in that same plugin.

6. **Verify and report honestly.** Re-run the report and each component's own check skill.
   Name what was upgraded, what migrations ran, what was left customized, what was skipped and
   under which scope, and anything still outstanding. Pass on the report's *Bindings nobody has
   enabled* section as the warning it is — enablement is personal to this checkout — and change
   neither file for it. An update that ends on a failing check is reported as failing.

## Do not

- Do not write, edit, or remove a `components.<name>` key, and do not apply a component's
  migration yourself. Both belong to that component's install skill.
- Do not enable or install a plugin on the user's behalf. Report it and let them decide.
- Do not edit a generated file to make a check pass. Fix the source it was generated from.
- Do not silently drop a key an upgrade retired — say it was removed and why.
