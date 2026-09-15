# Delivery

```meta
type: flow
related: [".devbook/domain/delivery/skills.md#flow-project", ".devbook/domain/delivery/flow.md"]
```

> `flow-project` — from nothing to a project that builds: the repository, its governance, and the
> scaffold. What the skill does is in [skills.md](skills.md#flow-project); the shared spine every
> flow runs is in [flow.md](flow.md).

## flow-project

```mermaid
flowchart TD
    base["Update Base"]
    r0["Repository Creation"]
    r1["Stack Setup"]
    r2["README and Repository Instructions"]
    r3["Repository Governance"]
    s1["GitHub Actions Workflows"]
    s2["Specification & Architecture Intake"]
    s3["Tooling & Dependencies"]
    s4["Implementation"]
    c0["Build & Test"]
    c1["Validation"]
    c2["Personal Validation"]

    base --> r0
    r0 --> r1
    r1 --> r2
    r2 --> r3
    r3 --> s1
    s1 --> s2
    s2 --> s3
    s3 --> s4
    s4 --> c0
    c0 --> c1
    c1 --> c2
    c2 --> g{"approve, revise, or decline"}
    t0["Create Pull Request"]
    t1["Verification"]
    t2["Work Item Update"]
    t3["Summary"]
    g -->|approve| t0
    t0 --> t1
    t1 --> t2
    t2 --> t3
    g -->|revise| r1
    g -->|decline| blocked(["Blocked"])
```

It closes through the code-modifying tier. Every tier opens with Update Base, prepended by the
runner and named by no skill.

- **It starts before the repository exists and enters wherever the repository has got to.** Creating
  the repository stays manual; every later stage opens by checking what is there, so a governed
  repository with no project runs the scaffold and a bare one runs everything.
- **It writes no stack config of its own.** Stack Setup runs `devbook-config:setup`, which owns the
  engine keys, the MCP files, and each component's install; the flow fills the `start` skill's facts
  afterwards, because those are the project's, not the config's.
- It is code-tier because what it scaffolds has to build. A scaffold that was never compiled is a
  guess about somebody else's toolchain.
- Governance and CI land before the scaffold, so the first build runs under the protection and the
  workflow that will run every later one.

The roles and MCP servers each stage resolves are in the engine's own `FLOW-DIAGRAMS.md`, which
is where a binding table belongs — this chapter is the model, not the wiring.
