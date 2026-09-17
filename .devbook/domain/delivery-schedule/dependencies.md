# Delivery Schedule

```meta
type: dependencies
related: [".devbook/domain/context-map.md#delivery-schedule", ".devbook/arc42/adr/plugin-boundaries.md"]
```

> What this context depends on and who depends on it. It is an L1 extension over the engine it
> calls into, and it is the one plugin here whose subject is a host capability — a divergence
> taken on purpose.

## Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| [Delivery](../delivery/dependencies.md) | Customer-Supplier, declared `delivery >=1.0.0 <2.0.0` | Its entry points call the engine's flows and phases | `resources/flow-phases.md`, `resources/surface-contract.md`, the parking rule at a gate | The entry points are adapters onto flows. The dependency is real, and it is the only declared one. |
| [Devbook](../devbook/dependencies.md) | Separate Ways | One catalog entry names `prose-check`, and two of its own wrappers invoke `devbook:check` and `devbook:tech-update` as targets | The skill names alone | Naming is not depending: a trigger whose target plugin the repository has not enabled is reported and skipped, never scheduled. |
| [Fleet](../fleet/dependencies.md) | Separate Ways | A schedule may name a `fleet-*` skill as a target | The skill name alone | Same relationship. A `fleet-*` skill holds no gate, which is what makes it schedulable where a flow is not. |
| The host's scheduler | Conformist, resolved at run time | Whatever the live session exposes that turns a name, a cron, a repository, and a prompt into a scheduled session | Resolution by capability, never by name | One capability with two host names — Routines and Automations — and adopting either would name a host. **No scheduler is a normal outcome.** |
| A bound tracker | Binding, never a dependency | Pull requests from dated branches, issues labelled `schedule-report` | The engine's tracker binding | Publishing is how an unattended run reaches a person, and which system holds it is the repository's choice. |
| Plugin Authoring | Shared Kernel | Plugin folder, two manifests, marketplace entry, `resources/` contracts, the `components.schedule` stamp | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | It is packaged, installed, and stamped like everything else here. |
| A consuming repository | Customer-Supplier, this context supplying | `components.schedule` in the stack config: the selection and any cadence overrides | The stamp shape, and the schedule names | The selection is a repository fact; everything personal about a schedule stays in the scheduler. |

## Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| [Devbook Config](../devbook-config/dependencies.md) | Conformist, read-only | Reads this plugin's `skills/` folder to report which `schedule-*` procedures the copy on disk ships, and reads `components.schedule` | The `schedule-` prefix and the stamp shape | That the prefix keeps its meaning and the stamp keeps its shape. It writes neither. |
| A maintainer, later | Customer-Supplier, this context supplying | A pull request from `schedule/<name>/<date>`, or an issue labelled `schedule-report` | The branch and label conventions | That every run publishes what it did, and that the next run updates rather than duplicates. |

## Notes

- **Naming a target is deliberately weaker than depending on one.** Three of the ten schedules
  target another plugin's skills, and the plugin declares one dependency. A target that is not
  enabled costs that trigger and nothing else, which is the same degrade-rather-than-fail shape
  the engine uses for a role.
- **The host-capability divergence is recorded, not hidden.** Nothing else in this marketplace
  names a host capability as its subject. The catalog itself stays host-neutral data and only the
  scheduler resolution knows a tool answered — see
  [the decision](../../arc42/adr/plugin-boundaries.md).
- **This context owns no flow, holds no gate, and adds no extension point.** That is what makes
  it an extension rather than a second engine: everything it runs, the engine already had.
- **The line between committed and personal is the one to hold.** The selection and the cadence
  overrides go in the repository; the environment, the model, and the scheduler ids stay in the
  scheduler, so nothing in the file would be wrong for the next person who opens it.
