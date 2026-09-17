---
name: adoption
description: 'Check whether a repository''s ai/ adoption record still describes the stack it actually has — which plugins are installed and enabled, which flows and schedules the copies on disk ship, and what the stack config wires — then hand every edit to flow-spec. Reports drift; never writes a chapter and never rates one. Use when: the adoption record has gone stale after an upgrade, a plugin was added or removed, or you are reviewing how this repository works with AI. Triggers on: "refresh the adoption record", "is my ai/ still accurate", "update .devbook/ai", "which plugins are missing from the adoption map", "does the ai folder match what is installed".'
---

# devbook-config adoption

## Purpose

Say whether `ai/` still describes the stack this repository has, and hand what moved to the
flow that owns the write. Only half the folder is derivable: what is installed, enabled, and
wired is a fact with a file behind it; whether anyone actually works that way is not. This
skill reports the first half and never asserts the second.

## Steps

1. **Look.** Run `node scripts/report.mjs --root <repository> --json` from this
   plugin's root. If the report shows no `ai` folder, stop — adopting a devbook folder is
   `devbook:install`, not this.

2. **Read the record task-scoped.** The adoption map plus the stage files, nothing else in
   the folder. Skip `annotation` fences: review notes, not content.

3. **Diff only what the report sources.**

   | From the report | Checks |
   | --- | --- |
   | `plugins[]` — installed, enabled, version | A chapter naming a plugin, skill, agent, hook, or MCP server not installed here; something installed with no chapter at all |
   | `deliverySkills`, `scheduleSkills` | Every `flow-*`, `phase-*`, or `schedule-*` name or count quoted in prose |
   | `repository` — roles, tracker, mcp, extensions, policy, gates | Which slots a run resolves, and which take their unbound default |
   | `repository.folders` | Which folders exist, and in which layout |

4. **Sort the drift into three.** A quoted fact that moved; something on disk with no
   chapter; a chapter naming something no longer installed, which is a `retired` candidate
   for a person to decide. Name the file behind every row.

5. **Stop at the judgment.** `status`, **Adopted by**, **Evidence**, and **Limits** are not
   in the report and are not inferred from one. Show the drift and ask.

6. **Hand off the write.** `delivery:flow-spec` carries every edit under the repository's own
   `ai/` instruction files. A usage whose `depends-on` names an unregistered technology goes
   through the same flow for `tech/` first, or the reference will not resolve.

7. **Report honestly.** What moved, what was handed off, and what the report could not see.

## Do not

- Do not write, edit, or create a chapter, a stage file, or the adoption map. That path is
  `flow-spec`'s, and a chapter written here bypasses the folder's own check.
- Do not propose promoting a `status`. The ladder rates whether people work this way; an
  install proves only that they could. Demotion is equally a person's call.
- Do not register a technology in `tech/`, and do not read or regenerate `_meta/`.
