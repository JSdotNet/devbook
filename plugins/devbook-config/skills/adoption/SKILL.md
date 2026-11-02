---
name: adoption
description: 'Check whether the ai/ adoption record still describes the stack the repository has — installed and enabled plugins, the flows and schedules on disk, what the stack config wires — and hand every edit to flow-spec. Reports drift; writes and rates nothing. Use when: the adoption record is stale after an upgrade, a plugin was added or removed, "refresh the adoption record".'
---

# devbook-config adoption

Open the reply with `devbook-config@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Say whether `ai/` still describes the stack this repository has, and hand what moved to the
flow that owns the write. Only half the folder is derivable: what is installed, enabled, and
wired is a fact with a file behind it; whether anyone actually works that way is not. This
skill reports the first half and never asserts the second.

## Steps

1. **Look.** Run `node scripts/report.mjs --root <repository> --json` from this
   plugin's root. If the report shows no `ai` folder, stop — adopting a devbook folder is
   `devbook:update`, or `devbook:init` where devbook has no stamp, not this.

2. **Read the record task-scoped.** The adoption map plus the stage files, nothing else in
   the folder.

3. **Diff only what the report sources.**

   | From the report | Checks |
   | --- | --- |
   | `plugins[]` — installed, enabled, version | A chapter naming a plugin, skill, agent, hook, or MCP server not installed here; something installed with no chapter at all |
   | `deliverySkills`, `scheduleSkills` | Every `flow-*`, `phase-*`, or `schedule-*` name or count quoted in prose |
   | `repository` — tracker, phases, areas, policy, gates | Which slots a run resolves, and which take their unbound default |
   | `repository.folders` | Which folders exist, and in which layout |

4. **Sort the drift into three.** A quoted fact that moved; something on disk with no
   chapter; a chapter naming something no longer installed, which is a `retired` candidate
   for a person to decide. Name the file behind every row.

5. **Stop at the judgment.** `status`, **Adopted by**, **Evidence**, and **Limits** are not
   in the report and are not inferred from one. Show the drift and ask: promoting or demoting
   a `status` is a person's call, because an install proves only that people could work this
   way.

6. **Hand off the write.** `delivery:flow-spec` carries every edit under the repository's own
   `ai/` instruction files. A usage whose `depends-on` names an unregistered technology goes
   through the same flow for `tech/` first, or the reference will not resolve.

7. **Report honestly.** What moved, what was handed off, and what the report could not see.
