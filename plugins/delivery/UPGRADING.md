# Upgrading delivery

Behaviour changes a consumer would notice, newest first.

## Unreleased: the Build & Test point is `validate`, and `verify` is the spec check

The service point Build & Test serves was `verify` and is now `validate`, so that `verify`
can mean what it means in OpenSpec — checking the change set against the specification it
was built from (`.devbook/arc42/adr/72-verify-is-the-spec-check-and-build-and-test-is-validate.md`).
Rename the key wherever a repository wrote it; `check.mjs` rejects the old spelling as unknown:

| Was | Now |
| --- | --- |
| `extensions.verify` | `extensions.validate` |
| `policy["verify.retryBudget"]` | `policy["validate.retryBudget"]` |
| `bindings["delivery.mcp"].verify` | `bindings["delivery.mcp"].validate` |
| a gate with `"at": "verify"` | `"at": "validate"` |

The engine default behind the point is unchanged: `phase-build-test` when unbound,
`microsoft-learn` as its MCP server. A binding a coding plugin filled as `verify` fills
`validate` now — it was always the build and the suites, and the name follows the work.

## Unreleased: the flow context file is retired

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
