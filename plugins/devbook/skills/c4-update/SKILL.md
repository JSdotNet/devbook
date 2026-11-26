---
name: c4-update
description: 'Regenerate the C4 model files the code owns under .devbook/arc42/c4/generated/ — the code level, one Mermaid class diagram per component of its aggregate roots, entities, and value objects, with the image views that show them — and report a marked type no domain/ chapter names. Writes the files and lands nothing. Use when: refresh the C4 model from code, regenerate the code diagrams, "c4 update". DO NOT USE FOR: the hand-written workspace (flow-spec).'
---

# Devbook C4 update

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Regenerate every file under `.devbook/arc42/c4/generated/` from the code, never by hand: the
next run replaces it. With no `.devbook/arc42/workspace.dsl`, stop and adopt `arc42/` first,
through `devbook:update`.

1. **Load context.** The *C4 model* section of `devbook-arc42.md`, and the building blocks
   whose `code` folders hold the solution's projects.
2. **Code level.** Restore the solution, then run the code-model console from the repository
   root with the .NET SDK, `<code-model>` being `../../tools/devbook-c4/code-model` resolved
   from this file; its `README.md` is the usage:

   ```bash
   dotnet restore <solution>
   dotnet run --project <code-model> -- --solution <solution>
   ```

   Pass `--markers <root>,<entity>,<value>,<event>` when the repository names its markers
   otherwise, and keep the names it uses. The console writes `code/<component>.mmd` per
   component and `code.dsl`; include `c4/generated/code.dsl` inside `views` in
   `workspace.dsl` once, and embed each image view in its building block's `## Structure`.
3. **Act on what it reports.** `no-alias` is a class name no `domain/` chapter carries in
   `aliases`: add it to the chapter of the concept it implements, or report the concept as
   unmodelled. `unmapped` is a root in no block's `code` folder: name the folder in the
   block that owns it. Neither is fixed in the generated files.
4. **Hand over.** This skill lands nothing: a `flow-spec` run or the C4 refresh schedule carries
   the files. Run `node .devbook/_tools/devbook-meta/build.mjs --scope arc42 --check` and repair
   what it reports per `devbook:validate`. Never refresh `_meta/` here.
