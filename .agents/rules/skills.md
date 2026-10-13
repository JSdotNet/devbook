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

Keep the description under 1024 characters, the Agent Skills cap, and aim for 400. Every
installed skill's description shares one listing budget, and a host that overflows it drops
descriptions — a skill whose description was dropped never triggers on its own. State what it
does, `Use when`, and `DO NOT USE FOR` or a refusal; leave the procedure to the body and quote
at most one literal trigger. `node tools/check-assets.mjs` fails a description over 1024, and
`--budgets` lists those over 500.

The first body line after the title is the version line, verbatim with the plugin's own name:

> Open the reply with `<plugin>@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

It is authored in every skill because an installed plugin never sees this rule, and read
from the manifest because a version spelled in the skill is a second copy a release would
have to move in every skill; `node tools/check-assets.mjs` fails a skill without it.

Reference instruction and resource files by relative path. Neither host auto-applies an
instruction file from inside a plugin, so the explicit reference is what loads the guidance —
in both. See [plugin-rules.md](plugin-rules.md).

Body budget 40 lines: [AUTHORING.md](../../AUTHORING.md).
