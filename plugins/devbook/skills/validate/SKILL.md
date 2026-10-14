---
name: validate
description: 'Run the devbook check over the chapters and repair what it reports in the source Markdown — broken references, malformed or missing meta blocks, fields the schema no longer defines. Never writes a generated file and never judges the installation (stamps, migrations). Use when: the devbook-meta check fails, a reference does not resolve, "devbook validate".'
---

# devbook validate

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Check the authored Markdown against the schema and repair in the chapters whatever the check
reports. Whether the installation is current — the stamp, the migration ledger, the
`AGENTS.md` section — is not this skill's question. Nothing under `_meta/` is ever written
here: the committed indexes are refreshed by their scheduled job, never in a session beside a
chapter edit, where the generated JSON conflicts on merge.

1. **Check** from the repository root — `--root <path>` from elsewhere, `--scope <folder>` to
   narrow the run to one folder:

   ```
   node .devbook/_tools/devbook-meta/build.mjs --check
   ```

   When `.devbook/_tools/devbook-meta/` is absent, run `devbook:update`, or `devbook:init`
   where devbook has no stamp yet. Never copy the checker in by hand: a hand copy lands
   unstamped, and the next reconcile reads it as customized.

   | Exit | Meaning and action |
   |------|--------------------|
   | `0` | Every reference resolves and every block matches the schema. Done. |
   | `1` | One or more problems at `error` severity. Go to step 2. |
   | `2` | No devbook folder under `.devbook/`, or `--scope` names one not adopted. Wrong directory or scope; a repository that has not adopted the convention — run `devbook:init`; or folders at the repository root, which the message names — move them under `.devbook/`. |

2. **Repair** each problem in the source Markdown of the file it names, per `repairs.md` beside
   this file — read it only now. Repoint a dangling reference; never delete its target to
   silence it.
3. **Re-run the check** until it exits `0`.

Never weaken or remove the CI workflow to turn a pull request green, and leave migrations and
the stamp to `devbook:update`.

## When CI fails but local is clean

CI fails only on what step 1 reports; drifted `_meta/` files raise a `::warning::` and never
fail the run. Compare against the merge result rather than the branch tip — a reference can
break when two branches land together though each was clean on its own.
