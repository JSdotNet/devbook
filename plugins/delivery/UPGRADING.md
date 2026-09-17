# Upgrading delivery

Behaviour changes a consumer would notice, newest first.

## Unreleased: every skill opens with its plugin version

Each `delivery` skill now opens its reply with `delivery@<version>`, the version read from the
plugin manifest beside it (`.devbook/arc42/adr/75-every-skill-opens-with-its-plugin-version.md`).
Nothing a repository holds changes, so there is nothing to reconcile.

## 1.0.1: the flow context file is retired

`.claude/flow-context.md` is gone as a convention, and so is the `repo-flow-context` slot
(`.devbook/arc42/adr/71-the-start-skill-holds-the-runtime-facts.md`). Its eight sections
had three homes already and get one more:

| Was | Now |
| --- | --- |
| `## Application`, `## How to Run`, `## Base URLs`, `## Test Credentials`, `## Healthy Startup` | The repository's `start` skill, `.agents/skills/start.md` — the seed now carries a section for each fact beside the procedure |
| `**Runnable application:** none` | `extensions.app.start: null` in `.devbook/config.json` |
| `## QA Depth` value | `policy.qa.depth`, which already outranked it |
| `## QA Depth` caveats | `AGENTS.md` or an `.agents/rules/` rule for now |
| `## MCP Servers`, `## Repo-Native Flow Skills` | Nothing — `.mcp.json` and skill discovery already answered them |

Nothing reads the file at either path any more; `devbook-config`'s report names a leftover.
A repository that bound `bindings["delivery.slots"]["repo-flow-context"]` now fails
`check.mjs` on an unknown key — remove the binding. The `start` seed changed, so a copy a
repository never edited is replaced on the next `delivery:install`; an edited copy is
reported as customized and left alone, and the new sections are yours to add by hand.

## 1.0.0: the first release

Nothing precedes it. Every version this plugin carried before 1.0.0 was published to no
consumer, and that history was collapsed into this baseline at the reset, per
`.devbook/arc42/adr/64-1-0-0-is-the-first-release.md`. There is nothing to upgrade from.
