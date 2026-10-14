---
name: update
description: 'Move a repository''s whole configured stack forward in one run: report which plugins are behind, run every adopted component''s own update so migrations run and stale files are replaced, and re-validate .devbook/config.json and its overlays. Skips what this machine has not installed or enabled, never dropping a stamp. Use when: "update the stack", upgrading plugins, a migration is outstanding, the config stopped validating.'
---

# devbook-config update

Open the reply with `devbook-config@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

This file exceeds the 40-line body budget on purpose: it is one staged procedure over every component — look, plan, fan out, re-validate — and the scope table is what keeps a stamp from being dropped.

## Purpose

One skill for the whole stack. It is `devbook-config:init`'s other half — init writes the
engine keys into a repository that has none, this moves an already-configured one forward —
and it owns the same engine keys with the same boundary: a `components.<name>` stamp is written
by that component's own `init` and `update` and by nothing else.

So this **orchestrates and never installs**. It resolves what is in scope, runs each
component's own `update` in order, and re-validates the engine keys around them. A
migration applied from here would leave the ledger describing something that did not happen.

Run it whole every time. A version bump, a migration, and a config change are one operation.

## Scope

`scripts/report.mjs` prints a `scope` verdict per plugin from three orthogonal facts:
`installed` is about this machine, `enabled` about this checkout, and the `components.<name>`
stamp about the repository and everyone who shares it.

| Scope | Do |
| --- | --- |
| `reconcile` | Run its `update`. |
| `blocked` | Report it, skip it, **change nothing**. |
| `frozen` | Report it; offer to enable it here. Skip if declined. |
| `adoptable` | Ask once whether to adopt; on a yes, run its `init`. Never impose. |
| `enabled` | One line. It stamps nothing by design — a surface, the review plugin, this one — so enabling it was the adoption. |
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

   If the report finds no `.devbook/config.json`, this repository was never set up — say "not
   initialized, run `devbook-config:init`" and stop.

2. **Show the drift and let the user choose.** The report's scope table, the `update
   available` rows, and anything installed but missing from the catalog. Change nothing yet.

3. **Update the plugins the user approves**, through the host's own plugin command. This skill
   does not reach into the host's plugin cache, so **this step is the user's to run**. Print
   the exact commands, say that re-running this skill is how the run continues, and stop there
   until they have. Every step is idempotent, so resuming costs nothing.

4. **Fan out, in the report's order.** For each `reconcile` row, invoke that component's own
   `update` — `devbook:update`, then `devbook-derived:update`, then
   `devbook-openspec:update`, then `delivery:update`, then
   `delivery-schedule:update` — and
   let it run its migrations oldest first, overwrite what is stale, leave what is customized,
   and rewrite its own stamp. `devbook-collaboration` has no `init` or `update`: enabling it is the
   whole adoption.

   The order is load-bearing: each later `update` reads what an earlier one rewrote. Show the
   diff and the notes each one shows. When the change lane's `update` stops on an OpenSpec CLI
   outside its stamped range, print the install command and never run it. Each is
   **required**: a failure does not abort the rest, and does make the whole run report as
   failing.

5. **Re-validate the engine keys.** Run the delivery plugin's `tools/stack-config/check.mjs`
   against the config; take its checkout root from the report's catalog line, or the plugin's
   `installPath` from `--json`. It picks up both overlays on its own, from the devbook
   config directory and the committed `id`.
   An upgrade can retire a key, and an unknown key is an error rather than a
   silently absent setting. A committed flow map that leaves a phase out, names one its flow
   lacks, or sits under a retired flow fails here by name. Fix against
   `resources/engine-contract.md` in that same plugin, under *Phases*; never by hand where
   the report's *Retired keys* section names a key `delivery:update` rewrites.

6. **Verify.** Re-run the report and `devbook-config:doctor`. Pass on the report's *Bindings
   nobody has enabled* section as the warning it is — enablement is personal to this checkout
   — and change neither file for it. An update that ends on a failing check is reported as
   failing.

7. **Offer `devbook-config:local`** when the report says no user overlay exists for the
   person running this — the stack runs at the team's defaults on this machine until they
   say otherwise, and that is theirs to decide, once — or names a leftover
   `model-selection.md`, which `local` converts into overlay phase entries and retires.

8. **Close on `devbook-config:report`**, a run that changed nothing included, passing step
   6's doctor findings; for *This run*, each component's stamp before and after step 4, the
   migrations it ran, what it left customized, and every skipped row with its scope; and
   for *Still open*, the unenabled bindings and whatever is still outstanding.

Fix a failing check in the source a generated file came from, never in the file, and say so
when an upgrade retired a key — never drop one silently.
