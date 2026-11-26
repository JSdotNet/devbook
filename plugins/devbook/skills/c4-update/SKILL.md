---
name: c4-update
description: 'Regenerate the C4 container and component levels of an arc42 workspace from code — containers from the Aspire AppHost''s resources and references, components from the .NET project graph — into .devbook/arc42/c4/generated/, and report what has no mapping or description. Writes the generated files and lands nothing. Use when: refresh the C4 model from code, update containers.dsl or components.dsl, the generated C4 files are stale. DO NOT USE FOR: hand-written elements or views (the arc42 flow).'
---

# C4 model update

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Rewrite the generated part of `.devbook/arc42/workspace.dsl` from the code, per "C4 model" in
`devbook-arc42.md`. With no `arc42/` folder, stop and adopt it through `devbook:update`. The
generators are this plugin's own; `<tools>` below is `../../tools/devbook-c4/`, resolved
from this skill's folder, while every command runs from the repository root.

1. **Containers**, where `aspire ls` finds an AppHost and the hand-written mapping
   `.devbook/arc42/c4/aspire-map.json` exists; else skip the level and say which is missing. Start your own instance, so a developer's running one is never touched:

   ```bash
   aspire start --apphost <apphost> --isolated --non-interactive --format Json   # note its pid
   aspire describe --apphost <apphost> --format mermaid --non-interactive > <scratch>/describe.mmd
   aspire stop --apphost <apphost> --pid <pid> --non-interactive
   node <tools>/containers.mjs --root . --describe <scratch>/describe.mmd
   ```

   Stop the instance even when `describe` fails. Keep the describe output out of the repository.
2. **Components:** `node <tools>/components.mjs --root .`, where any `.csproj` exists.
3. **Read the reports.** An unmapped resource, a project in no block's `code`, and an element
   with no description are each a person's call: list them, and never invent an identifier, a
   `drop` entry, or a description to silence one. The mapping and each `<Description>` are
   theirs; the files under `generated/` are the generators'.
4. **Check:** where `workspace.dsl` does not yet `!include` a file this run wrote, say so —
   after the systems and containers it reopens. Then run
   `node .devbook/_tools/devbook-meta/build.mjs --scope arc42 --check` and repair what it
   reports per `devbook:validate`.
5. **Land nothing.** Hand the files to the `arc42/` flow, unless this skill already runs inside
   it or a schedule carries the result. Never refresh `_meta/`: the rendered views belong to
   their scheduled job.
