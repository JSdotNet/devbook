---
name: init
description: 'Put this repository''s schedules into the host''s scheduler for the first time — Routines in Claude Code, Automations in the Copilot app — asking which to enable and stamping components.schedule. Refused once that stamp exists. Triggers on: "schedule init", "set up my routines", "set up my automations", "schedule this repository".'
---

# schedule init

Open the reply with `delivery-schedule@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

First setup of this repository's schedules. Everything it reads and writes is in
`resources/schedule-catalog-contract.md`.

**Refuse when `components.schedule` exists.** Say "already initialized, run
`delivery-schedule:update`" and stop: the stamp holds a selection somebody made, and asking
again would overwrite it.

1. **Choose.** Read every `resources/schedules/*.schedule.md` in this plugin and ask which to
   enable, offering every schedule whose `requires` are met as the default.
2. **Schedule and stamp.** Run steps 2–8 of `../update/SKILL.md` with that selection — resolve
   the repository and its checkout, check `requires`, resolve the local scheduler, retire
   cloud copies, create each selected schedule, write `components.schedule`, and report. Its *Do not* list holds here
   unchanged.
