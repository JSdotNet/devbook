# Fleet

```meta
type: dependencies
related: [".devbook/domain/context-map.md#fleet", ".devbook/arc42/tdr/2-fleet-names-the-cli-directly.md"]
```

> What this context depends on and who depends on it. It is an L1 extension: one declared
> dependency, and one undeclared coupling to a host capability that is logged as debt.

## Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| [Delivery](../delivery/dependencies.md) | Customer-Supplier, declared `delivery >=1.0.0 <2.0.0` | A worker runs one of the engine's flows and phases inside its own session; every skill here follows the engine's reporting contract | `resources/flow-phases.md`, `resources/surface-contract.md` | Fan-out is the exception the engine states the rule for, so it has to live where no flow can reach it — and still call into the engine it is the exception to. |
| The host's fan-out capability | **Undeclared** — see [debt record 2](../../arc42/tdr/2-fleet-names-the-cli-directly.md) | Launching each worker as an independent background session, tracking them, and running their stages through the host's workflow tool | The host's own CLI and tools, named directly | It belongs behind a `session-spawn` slot the engine declares and a repository binds. Until that lands, this context is effectively one host's and its manifest does not say so. |
| A bound tracker | Binding, never a dependency | The pickup labels, and the items themselves | `ready-for-pickup`, `in-progress`, `needs-validation` | A claim has to be legible from the tracker alone. GitHub answers it today; the binding is what keeps that from being a dependency. |
| A surface | Resolved at run time, never declared | Tool names matched by pattern from the live tool list | `delivery`'s reporting contract | No surface bound is a normal outcome: the manifest, the result files, and the brief are the source of truth. |
| Plugin Authoring | Shared Kernel | Plugin folder, two manifests, marketplace entry, `resources/` contract | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | It is packaged like everything else here. |
| The local filesystem, outside every repository | Conformist | `~/.claude/issue-sweep/<sweepId>/`, overridable, resolved once to an absolute path | `resources/fleet-issue-sweep-contract.md` | A spawned worker does not inherit the dispatcher's working directory, and the state must survive worktree removal without showing up in `git status`. |

## Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| [Delivery Schedule](../delivery-schedule/dependencies.md) | Separate Ways | A schedule may name a `fleet-*` skill as its target, the same way it names any other non-flow target | The skill name alone | Nothing but the name — and that a `fleet-*` skill holds no gate, which is what makes it schedulable where a flow is not. |
| [Devbook Config](../devbook-config/dependencies.md) | Conformist, read-only | Reports whether this plugin is installed, enabled, and at what version | The marketplace entry and the manifest | That the plugin name and version stay where they are. It writes nothing here. |
| A person, later | Customer-Supplier, this context supplying | A parked worktree, its `needs-validation` label, and the handoff brief inside it | The brief format | That parking is an outcome with a note attached rather than a quiet failure. |

## Notes

- **This context owns no flow and holds no gate**, and both absences are load-bearing. A flow
  owns a run, a gate, and a user turn, none of which survives a session boundary — so a fan-out
  built as a bigger flow would have had to weaken one of the three.
- **What replaces the gate is a guarantee, not an absence.** A pull request opens only when the
  change proved itself; everything else parks with a brief. Nothing merges unread either way.
- **The host-capability row is the honest gap.** Naming a host's CLI directly is the thing every
  other plugin here stopped doing, and the fix is a slot the engine has not declared yet. Until
  then the parallelism is treated as required in practice, and the sweep degrades visibly rather
  than silently on a host that cannot dispatch.
- **The tracker relationship runs both ways and is still a binding.** Labels are this context's
  vocabulary written into somebody else's system: their names are part of the contract, and
  nothing here assumes which system holds them.
