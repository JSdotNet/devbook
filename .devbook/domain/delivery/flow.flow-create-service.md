# Delivery

```meta
type: flow
related: [".devbook/domain/delivery/skills.md#flow-create-service", ".devbook/domain/delivery/flow.md"]
```

> `flow-create-service` — a new service in an existing project, or an existing area extracted into
> one. What the skill does is in [skills.md](skills.md#flow-create-service); the shared spine
> every flow runs is in [flow.md](flow.md).

## flow-create-service

```mermaid
flowchart TD
    base["Update Base"]
    s0["Scope Discovery"]
    s1["Specification Intake"]
    s2["Implementation Planning"]
    s3["Implementation"]
    c0["Build & Test"]
    c1["QA Validation"]
    c2["Personal Validation"]

    base --> s0
    s0 --> s1
    s1 --> s2
    s2 --> s3
    s3 --> c0
    c0 --> c1
    c1 --> c2
    c2 --> g{"approve, revise, or decline"}
    t0["Create Pull Request"]
    t1["Spec Verification"]
    t2["Work Item Update"]
    t3["Summary"]
    g -->|approve| t0
    t0 --> t1
    t1 --> t2
    t2 --> t3
    g -->|revise| s0
    g -->|decline| blocked(["Blocked"])
```

It closes through the code-modifying tier. Every tier opens with Update Base, prepended by the
runner and named by no skill.

- Same shape as [flow-create-module](flow.flow-create-module.md), different unit. What differs is
  what Implementation Planning has to settle: a service adds a process boundary, so wiring,
  configuration, and how it is started are part of the plan rather than of the implementation.
- Extracting an existing area into its own service runs here too, for the same reason a carve runs
  through the module flow.
- The service has to start before Personal Validation, which is why QA Validation is not optional
  for this one even when the change looks like configuration.

The roles and MCP servers each stage resolves are in the engine's own `FLOW-DIAGRAMS.md`, which
is where a binding table belongs — this chapter is the model, not the wiring.
