# Delivery

```meta
index: root
type: context
related: [".devbook/domain/context-map.md#delivery", ".devbook/arc42/tdr/4-delivery-depends-on-devbook.md", ".devbook/arc42/adr/surfaces.md"]
```

What this context is responsible for: that one unit of work reaches a review-ready change
inside one session, that a person decided it was ready, and that a repository can shape the run
without being able to weaken it.

Inside the boundary: the staged procedures, the closed set of extension points a repository
binds providers to, the human gates it may add and never remove, the four engine-owned keys of
the stack config, and the pull-request lane at the end.

Outside it: deploy, which is where "delivery" stops here; expertise, which is a role a
repository binds; visibility, which is a [surface](../delivery-surface-dashboard/domain.md)
resolved at run time; and fan-out, which is [Fleet](../fleet/domain.md)'s and is the one thing
a flow may never do.

## Dependencies

What this context depends on and who depends on it. Its `dependencies` array is empty and its
README devotes a section to what it never depends on — one row below says that is not the
whole truth.

### Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| Plugin Authoring | Shared Kernel | Plugin folder, two manifests, marketplace entry, `resources/` contracts | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | It is packaged like everything else here, and the kernel is what "packaged" means. |
| [Devbook](../devbook/context.md#dependencies) | **Undeclared** | `flow-spec` is named for the folders and expects every chapter to carry devbook's `meta` block | None, on either side | Three of four flows work with devbook absent, so it is not an L1 extension; declaring it would demote all fourteen skills. Logged as [debt record 4](../../arc42/tdr/4-delivery-depends-on-devbook.md). |
| A bound role provider | Binding, never a dependency | Named in `bindings["delivery.roles"]`, consulted by name | The role key and the fallback each reference states | One missing advisor must not demote every skill that names it. No provider for any role ships in this marketplace. |
| A bound tracker | Binding, never a dependency | Named in `bindings["delivery.tracker"]` — GitHub, Jira, or Markdown chapters | One set of operations behind one name | No repository should end up with Jira installed because it enabled the flows. Unbound, a flow runs to its file artifacts and opens nothing. |
| A bound MCP server | Binding, per point | Named in `bindings["delivery.mcp"]`, resolved from the live tool list | The tool-name pattern, never one spelling | A server that does not answer costs a stage its grounding, never the run. |
| A surface | Resolved at run time, never declared | Tool names matched by pattern from the live tool list | `resources/surface-contract.md`, three capability groups | No surface bound is a normal outcome. It costs a view, never a capability. |
| Claude Code and Copilot Plugin APIs | Conformist | Manifests, skills, the `flow-runner` agent, `hooks/hooks.json` and `hooks.json` | Each host's own schemas | The host decides what loads. Host divergence is absorbed through a slot rather than a branch. |
| A consuming repository | Customer-Supplier, this context supplying | `.devbook/config.json`, four engine-owned keys; the `start` and `capture` skills it names by name and reads at `.agents/skills/<name>.md`, whoever seeded them | `resources/config.schema.json`, validated by `check.mjs` | Configuration is how a repository shapes a run without being able to weaken it. |

### Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| [Fleet](../fleet/context.md#dependencies) | Customer-Supplier, declared `delivery >=1.0.0 <2.0.0` | Its workers run this context's flows and phases inside their own sessions | Flow names, the phase contract, the reporting contract | That a flow ends at a gate — which is exactly what it trades away, deliberately, for a pull request nobody merges unread. |
| [Delivery Schedule](../delivery-schedule/context.md#dependencies) | Customer-Supplier, declared `delivery >=1.0.0 <2.0.0` | Its entry points call these flows and phases | Flow names, the phase contract, the parking rule at a gate | That an unattended run parks where Personal Validation would be, and that no schedule may target a flow. |
| [Delivery Surface Dashboard](../delivery-surface-dashboard/context.md#dependencies) | Conformist to a Published Language | Implements `delivery.surface.lifecycle@1`, `.render@1`, `.export@1` | `resources/surface-contract.md` | The tool names and their shapes. It names no engine, and the engine names no surface. |
| [Delivery Surface Canvas](../delivery-surface-canvas/context.md#dependencies) | Conformist to a Published Language | Implements `.render@1` only | Same contract, one group | That a caller resolves each group separately, so an unanswered group renders nowhere rather than finding a stub. |
| [Delivery Surface Collector](../delivery-surface-collector/context.md#dependencies) | Conformist to a Published Language | Implements `.lifecycle@1` and `.export@1` | Same contract, two groups | The same. Its absent render group is a declaration, not an omission. |
| [Devbook Config](../devbook-config/context.md#dependencies) | Conformist, read-only | Reads the four engine keys, every binding, every gate, and the `skills/` folder on disk | The config schema and the skill naming convention | That the four keys keep their shape and the `flow-*` / `phase-*` prefixes keep their meaning. It writes the four keys and nothing else. |
| A repo-native `flow-*` skill | Open Host Service | Declares its own tier and reads the phase contracts by name | `resources/flow-phases.md`, `resources/surface-contract.md` | That the phase and point vocabulary is stable, and that a repo-native skill takes precedence for the categories it covers. |

### Notes

- **Every binding row is a dependency this context refused to declare, and each refusal has the
  same reason:** a missing provider must cost capability rather than a load. Twenty-four skills
  demoted because one specialist is absent is the failure mode the whole indirection exists to
  prevent.
- **The undeclared devbook row is the exception, and it is exceptional in the wrong direction.**
  The coupling is real in one flow; what is missing is the declaration. The debt record's first
  remediation was taken by the 2026-09-15 fold — `flow-spec` runs the repository's own check,
  restates no schema rule, and the README says it stops where the folder is not adopted — and
  the folder names and the `meta` block it expects are what remain, still undeclared.
- **Nothing here names a host.** Five slots absorb what would otherwise be host branches, and two
  of the five are answered by the live session rather than by configuration, so the hosts cannot
  re-diverge the moment one gains what the other has.
- **Fan-out is not a dependency in either direction.** A flow owns a run, a gate, and a user
  turn, none of which survives a session boundary — so the mechanism that spawns a session per
  item lives where no flow can reach it.
