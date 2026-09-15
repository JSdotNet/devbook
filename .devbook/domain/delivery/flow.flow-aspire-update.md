# Delivery

```meta
type: flow
related: [".devbook/domain/delivery/skills.md#flow-aspire-update", ".devbook/domain/delivery/flow.md"]
```

> `flow-aspire-update` — a plan-first upgrade, where the plan is refined before anything changes.
> What the skill does is in [skills.md](skills.md#flow-aspire-update); the shared spine every flow
> runs is in [flow.md](flow.md).

## flow-aspire-update

```mermaid
flowchart TD
    base["Update Base"]
    s0["Upgrade Intake & Baseline"]
    s1["Plan Refinement"]
    s2["Implementation"]
    s3["New Feature Adoption"]
    c0["Build & Test"]
    c1["Validation"]
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
    t1["Verification"]
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

- **Baseline first.** The intake stage records what works before the upgrade, because after it there
  is no way to tell a pre-existing failure from one the upgrade caused.
- Plan Refinement is a separate stage from Implementation so the staging of a multi-step upgrade is
  agreed while backing out is still cheap.
- New Feature Adoption is its own stage so an upgrade does not quietly become a feature change. What
  the new version makes possible is a decision, taken visibly, after the version moved.

The roles and MCP servers each stage resolves are in the engine's own `FLOW-DIAGRAMS.md`, which
is where a binding table belongs — this chapter is the model, not the wiring.
