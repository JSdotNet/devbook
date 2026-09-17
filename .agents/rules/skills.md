---
name: skills
description: Frontmatter and prose rules for a plugin skill.
paths:
  - "plugins/*/skills/**/SKILL.md"
---

# Skills

`skills/<name>/SKILL.md` with `name` and `description` frontmatter. The description is the
trigger — say when to use it, in the words a user would use. Keep host-specific tool names out
of skill prose.

The first body line after the title is the version line, verbatim with the plugin's own name:

> Open the reply with `<plugin>@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

It is authored in every skill because an installed plugin never sees this rule, and read
from the manifest because a version spelled in the skill is a second copy a release would
have to move in every skill; `node tools/check-assets.mjs` fails a skill without it.

Reference instruction and resource files by relative path. Neither host auto-applies an
instruction file from inside a plugin, so the explicit reference is what loads the guidance —
in both. See [plugin-rules.md](plugin-rules.md).

Body budget 40 lines: [AUTHORING.md](../../AUTHORING.md).
