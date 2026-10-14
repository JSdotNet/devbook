---
name: provider-resolution
description: How devbook-config:doctor resolves every agent and provider id the effective stack configuration binds, and which unresolved id is hard and which a warning.
---

# Provider resolution

`devbook-config:doctor` runs this as its provider step. It writes nothing.

## Read the effective configuration

Run `node <installPath>/tools/stack-config/check.mjs --print`, `installPath` being delivery's
from the report, with the repository as the working directory — it resolves
`.devbook/config.json` from there — and read `config` from its stdout. Never merge the layers
by hand. A non-zero exit is hard, with the checker's lines as the finding. With delivery not
installed, say the providers are unchecked, and why.

## Collect the ids

- From every entry of every map under `phases`: its `agent`, its `skill`, `phase-verify`'s
  `app` provider, and each `before` and `after` chore's id, less any `--flag` arguments after
  it.
- Under `bindings`: `openspec.grill`, and a `delivery.tracker` provider that is not `github`,
  `jira`, `markdown`, or `backlog`.

`mcp` names servers, not providers. `null` is a deliberate choice, not a finding.

## Resolve each

| Id | Resolves to |
|---|---|
| an `agent`, `plugin:<agent>` | `agents/<agent>.agent.md` under that plugin's `installPath` |
| an `agent`, bare `plugin` | the one agent the plugin ships; more than one is a warning to name it |
| an `agent`, `repo:<agent>` | `.claude/agents/<agent>.md` or `.github/agents/<agent>.agent.md` |
| any other `plugin:skill` | `skills/<skill>/SKILL.md` under that plugin's `installPath` |
| `repo:<skill>` | `.agents/skills/<skill>.md`, `.claude/skills/<skill>/SKILL.md`, or `.github/skills/<skill>/SKILL.md` in the repository |

## Grade what does not resolve

- An id in the **Old** column of devbook's `migrations/015-openspec-verbs/MIGRATION.md` is
  hard: name its successor from the **New** column, and say `devbook:update` runs the
  migration that rewrites it.
- Any other id that resolves to nothing is a warning naming the file and key that bind it. The
  flow degrades past it, so it never fails the run.
- A plugin the report does not list is outside this catalog: say it is unchecked.
