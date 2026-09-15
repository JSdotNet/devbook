# Delivery

```meta
type: flow
related: [".devbook/domain/delivery/skills.md#flow-create-mvp", ".devbook/domain/delivery/flow.md"]
```

> `flow-create-mvp` — the first runnable increment of a product, at whatever size that is. What
> the skill does is in [skills.md](skills.md#flow-create-mvp); the shared spine every flow runs is
> in [flow.md](flow.md).

## flow-create-mvp

```mermaid
flowchart TD
    base["Update Base"]
    s0["Scope Discovery"]
    s1["MVP Scope Intake"]
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

- **Scope is what the gate is really about here.** For every other code flow the gate reviews a
  change; for this one it reviews a decision about what not to build yet.
- MVP Scope Intake and Implementation Planning are two stages because prioritising features and
  sequencing the build are different arguments, and collapsing them buries the first.
- “Minimum” is not a size claim. The flow runs the same way for a weekend prototype and for a
  first release, because what makes it an MVP is that it runs, not that it is small.

The roles and MCP servers each stage resolves are in the engine's own `FLOW-DIAGRAMS.md`, which
is where a binding table belongs — this chapter is the model, not the wiring.
