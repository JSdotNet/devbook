# Delivery

```meta
type: flow
related: [".devbook/domain/delivery/skills.md#flow-create-module", ".devbook/domain/delivery/flow.md"]
```

> `flow-create-module` — a new module in an existing project, or an existing area carved into one.
> What the skill does is in [skills.md](skills.md#flow-create-module); the shared spine every flow
> runs is in [flow.md](flow.md).

## flow-create-module

```mermaid
flowchart TD
    base["Update Base"]
    s0["Scope Discovery"]
    s1["Specification Intake"]
    s2["Implementation Planning"]
    s3["Implementation"]
    c0["Build & Test"]
    c1["QA Validation"]
    cv["Spec Verification"]
    c2["Personal Validation"]

    base --> s0
    s0 --> s1
    s1 --> s2
    s2 --> s3
    s3 --> c0
    c0 --> c1
    c1 --> cv
    cv --> c2
    c2 --> g{"approve, revise, or decline"}
    t0["Create Pull Request"]
    t1["Documentation Update"]
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

- **Carving an existing area out is the same flow as creating a new one.** Both end with a module
  that has a boundary somebody agreed, and the interesting work in each is deciding where the line
  runs.
- Implementation Planning is its own stage so the boundary is settled before code moves. A module
  whose boundary is decided while implementing it is a folder.
- Missing specification or boundary context is derived in Scope Discovery rather than being a
  reason to refuse the run.

The roles and MCP servers each stage resolves are in the engine's own `FLOW-DIAGRAMS.md`, which
is where a binding table belongs — this chapter is the model, not the wiring.
