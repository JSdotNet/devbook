# Delivery

```meta
type: flow
related: [".devbook/domain/delivery/skills.md#flow-update-packages", ".devbook/domain/delivery/flow.md"]
```

> `flow-update-packages` — dependencies moved forward, with the security question asked before the
> build. What the skill does is in [skills.md](skills.md#flow-update-packages); the shared spine
> every flow runs is in [flow.md](flow.md).

## flow-update-packages

```mermaid
flowchart TD
    base["Update Base"]
    s0["Dependency Analysis"]
    s1["Update Planning"]
    s2["Implementation"]
    s3["Security Validation"]
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

- **Security Validation sits between the change and the build.** A dependency update that compiles
  is not the same as one that is safe, and asking after Build & Test would mean asking about a
  change already treated as good.
- QA depth is startup-only by change kind: the application has to come up, and nothing more is
  claimed. That depth is recorded rather than presented as full validation.
- It lands as a pull request. Nothing here merges its own dependency bump.

The roles and MCP servers each stage resolves are in the engine's own `FLOW-DIAGRAMS.md`, which
is where a binding table belongs — this chapter is the model, not the wiring.
