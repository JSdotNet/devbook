# Plugin Boundaries

```meta
date: 2026-09-17
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#plugin-folder", ".devbook/arc42/05-building-block-view.md#config-plugin", ".devbook/arc42/05-building-block-view.md#schedule-plugin", ".devbook/arc42/05-building-block-view.md#fan-out-state", ".devbook/domain/context-map.md", ".devbook/domain/plugin-authoring/domain.md#plugin", ".devbook/domain/plugin-authoring/domain.md#layer", ".devbook/domain/plugin-authoring/domain.md#role", ".devbook/domain/plugin-authoring/domain.md#fleet-skill", ".devbook/domain/plugin-authoring/domain.md#schedule", ".devbook/arc42/tdr/4-delivery-depends-on-devbook.md", ".devbook/arc42/adr/flow-engine.md", ".devbook/arc42/adr/surfaces.md"]
```

Every plugin is self-contained under `plugins/<name>/` and either works alone or declares
what it needs. There are three ways to couple — a declared dependency on a lower layer, a
bridge plugin depending on both sides, a surface capability resolved from the live tool list —
and a lower layer never names a higher one. What the marketplace ships is the convention
(`devbook`), the engine (`delivery`), one extension each for review, the committed index,
fan-out, and unattended work, three surfaces, and a guide that names every plugin and depends on
none. An extension owns procedure, never schema or state. The specialists
are published from another marketplace and are bound per repository, never depended on.

## Why

```meta
```

**Fan-out and the unattended lane are separate plugins.** A flow owns a run, a gate, and a
user turn, none of which survives being split across sessions; shipping the session-spawning
mechanism inside the engine would put it one skill reference away from every flow that must not
use it. A separate plugin makes the reach impossible rather than discouraged. The same shape
holds everything that runs with nobody watching: fourteen entry points and their triggers in one
folder, one dependency, one enable, and a schedule is a trigger that names an entry point and
never a procedure — a flow ends at a gate no unattended run can pass.

**A role plugin holds no flow control.** The ported specialists each arrived with a mandatory
approve-handoff sequence, session-spawning tools, and a plan-and-checkpoint loop of their own.
A gate a plugin owns cannot be governed — configuration may add a gate and never remove one,
and a gate in an instruction file is outside that in both directions; two sequencers disagree
silently; and spawning in a role is fan-out through the back door. A specialist used bare is
less guided, which is the honest trade, and the checker refuses those tools on any non-runner
agent.

**The specialists left, and the by-name references with them.** Deleting seven plugins changed
no mechanism, which is the evidence the boundary was already right. `delivery` carried two
hundred `plugin:asset` references into them, and naming is not depending — but this marketplace
naming a plugin published from another is a coupling nothing here can check. Every stage names
the point it fills, and a repository's config is the only place a specialist's name appears, so
`delivery` alone is visibly capability-free at five roles and five services.

**Flows belong to `delivery`.** `devbook` enforces what a folder holds; the engine holds the
flow for each folder. The bridge that once held them was not a bridge: both foundations named
it, and it restated devbook's rules. No bridge is needed because rules reach a session through
the host, not a flow — the install materializes them and any session reads them by path — so
the engine names folders and never the `devbook` plugin. What remains real and undeclared is
[debt 4](../tdr/4-delivery-depends-on-devbook.md).

**The guide is its own plugin.** A skill that explains the stack must name every part of it,
and a lower layer never names a higher one; both cannot hold in one plugin, so `devbook-config`
has an empty `dependencies` array and stays reachable with `devbook` absent. Its write skills
stop at the engine keys and invoke `devbook:install` for the stamp. It names a host's own
plugin directories on purpose: where a plugin is installed is a fact about a host and nothing
else, and no slot exists for it.

**The committed index is an extension.** A repository that wants `_meta/` committed enables
`devbook-derived` and runs its install; one that does not never sees a derived file. The
review plugin has the same shape after its state moved into devbook's schema: four skills, no
rule, no install, no stamp ([annotations](annotations.md), [checks and
indexes](checks-and-indexes.md)).

## Rejected

```meta
```

- Fan-out or scheduling as skills inside the engine; the triggers outside and the procedures in.
- Keeping the specialists with their references, on the argument that an unresolvable reference
  degrades one stage.
- The guide as a skill inside `devbook`, or as an L1 extension over it.
- A `devbook-flows` bridge holding the folder flows.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-17 | `devbook-derived` is the committed index's plugin; the review plugin ships skills only. |
| 2026-09-07 | The five folder flows move into `delivery`; the `devbook-flows` bridge is removed. |
| 2026-09-07 | `delivery-schedule` holds every unattended entry point and its triggers; a schedule is never a procedure. |
| 2026-09-07 | Seven specialist plugins leave; every stage names a point, and no plugin names one published elsewhere. |
| 2026-09-07 | `devbook-config` is a plugin of its own with no dependencies. |
| 2026-09-04 | A role plugin holds no gate, no sequencing, no spawning, no delegation. |
| 2026-09-03 | The sweep skills land in `fleet`, an L1 extension over `delivery`. |
| 2026-09-02 | One folder per plugin; dependency, bridge, and surface are the three ways to couple. |
