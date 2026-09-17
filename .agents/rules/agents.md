---
name: agents
description: Frontmatter, tools and handoff rules for a plugin agent file.
paths:
  - "plugins/*/agents/**/*.agent.md"
---

# Agents

- `description` is required — Claude refuses to load an agent without one.
- No `model` pin unless the value is `opus`/`sonnet`/`haiku`/`fable`/`inherit` or a real
  `claude-*` id; anything else fails to load. Put the preference in a `## Model` body section.
- `tools` is an exact-match allowlist. Include `Skill` to let the agent reach plugin skills,
  and `Agent` only when it delegates. Only a runner plugin's agent carries flow control —
  `.devbook/arc42/adr/plugin-boundaries.md`.
- For MCP, grant the whole server and emit both spellings — `mcp__plugin_<plugin>_<server>`
  (plugin-provided, namespaced) and `mcp__<server>` (from a repo `.mcp.json`) — because the
  prefix depends on how the server was registered.
- Claude ignores the `handoffs` key: name every handoff target in the body prose.
- An instruction file reaches Claude only when something references its path — a plugin
  cannot ship rules. Reference every one explicitly from the agent that depends on it, per
  `.agents/rules/plugin-rules.md`.

Body budget 80 lines: [AUTHORING.md](../../AUTHORING.md). `node tools/check-assets.mjs`
enforces the frontmatter and tool rules above.
