---
name: manifests
description: What each plugin manifest declares, and what must agree across the three files.
paths:
  - "plugins/*/.claude-plugin/plugin.json"
  - "plugins/*/.github/plugin/plugin.json"
  - ".claude-plugin/marketplace.json"
---

# Manifests

In the Claude manifest, list agent files explicitly under `agents`, including
`agents-internal/` ones, or handoff targets dangle. Omit `skills` and `hooks`: Claude scans
`skills/` and loads `hooks/hooks.json` already, and naming the hooks file makes the plugin
fail with "Duplicate hooks file detected". Declare MCP servers under `mcpServers`.

The two manifests agree on `name`, `version`, and `description`, and a new plugin also needs
an entry in `.claude-plugin/marketplace.json` — `name`, `source` (`./plugins/<name>`),
`description`, `version` — or Claude Code will not offer it. A version change touches all
three. No plugin carries an `UPGRADING.md`: git history is the upgrade note.

`node tools/check-assets.mjs` fails on any disagreement.
