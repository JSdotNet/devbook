---
name: phase-plan
description: 'Shared Plan phase of flow-code, create kind only. Maps the recorded design for a new module, service, or first runnable increment onto the project structure — contracts, wiring, health and observability, slices — before phase-implement writes any code. Delegated by the flow-runner agent, never invoked directly.'
---

# Phase: Plan

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

**Does**
- Maps the design onto the project structure: contracts, wiring, health and observability, slices

**Doesn't**
- Run for any kind but create
- Write code

`flow-code`, after `phase-scope`, for a `create` run only; any other kind skips it without a
stage. It runs delegated, through the agent its `phases` entry names, per
`resources/phase-resolution.md`. Its input is the scope record: the design, the seams, the
constraints, and the chapters every brief loads.

1. **Place the unit** in the repository's existing layout: its project or folder, and what
   references it.
2. **Define the contracts**: the data contracts and their error handling at each seam scope
   recorded.
3. **Plan the wiring.** For a service: service discovery, the host project's references such
   as the AppHost, and the configuration model.
4. **Name the health and observability signals** the unit exposes, so `phase-verify` has
   something to check.
5. **Plan the integration points** with what already exists.
6. **Break the work into slices**, each a seam or an area, in the order `phase-implement`
   works through them and `phase-review` reviews them.

A design question the scope record does not answer is not settled here: return
`revise: phase-scope` with the question, and escalate a new decision per **Escalation** in
`resources/flow-execution-model.md`.

**Output:** `plan.md`, written into the run folder the brief names — the brief
`phase-implement` loads for a `create` run. Return its path and a short summary, and make no
surface calls: the flow-runner reports the stage from what you return. Its place in the
order: `resources/flow-phases.md`.
