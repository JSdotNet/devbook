---
name: to-spec-domain-service
description: 'To-spec direction (capture), domain-service kind: read an implemented domain service, policy, or process manager and write or refresh its `type: domain-service` chapter in .domain/<context>/domain.md, including invocation semantics. Use when: coordinating logic exists in code with no chapter, a policy or process manager is undocumented, the chapter omits which aggregates the service coordinates, document the domain services in this context. Reads source and tests as evidence and routes the write through the `.domain` flow. DO NOT USE FOR: turning an agreed but unbuilt domain-service chapter into work (use from-spec-domain-service), or for the aggregate, feature, or bounded-context chapters around it (use the matching to-spec-* skill).'
---

# Capture a domain service from code

## Purpose

Behaviour that coordinates several aggregates, or that belongs to the domain but
not to any single aggregate, is implemented — and `.domain/<context>/domain.md`
does not record it, or records it without saying what it coordinates or how it
is invoked. This skill reads the implementation and routes a grounded chapter
through the `.domain` flow.

Process-manager and policy behaviour is captured **here**, in the relevant
domain service chapter. This convention deliberately has no `policy.md` file and
no separate `Policy` chapter type; do not introduce one.

The hard part of this pass is distinguishing a domain service from an
application service. A domain service holds domain logic that has no natural
aggregate home; an application service orchestrates transactions, authorization,
and transport. The latter is not part of the domain and does not get a chapter.

Read `assets/code-sync-protocol.md` before starting. It carries the counterpart
resolution ladder, the evidence rules, the five-way drift verdict, the status
rules, index regeneration, and the report table — none of which are repeated
here.

## Inputs

- **Target bounded context.** The `.domain/<context>/` folder.
- **Target service.** Named either as a chapter heading or as a code type, or
  described as the behaviour to be documented.
- **Repository root.** Default to the current working directory.

## Spec-to-code mapping

The domain service chapter's parts and the code that evidences each one:

| Chapter element | Code and test evidence |
|---|---|
| Heading (the bare name) | The service type name, after resolving through `domain.md` aliases |
| Responsibility | What the service's methods accomplish in domain terms, taken together |
| Why not on an aggregate | The evidence that the behaviour spans aggregates or needs data no single root owns: which roots it loads, which it mutates, what it reads across boundaries |
| Coordinated aggregates and policies | Every aggregate the service loads, mutates, or saves, and every other service or policy it invokes |
| Invocation semantics | One of: command-invoked (called from a command handler or endpoint), scheduled (registered with a timer, cron, or background service), query or composition oriented (read-only, composes across roots), or event-triggered policy / process manager (subscribed to a domain event and reacting) |
| Process state | For a process manager: where the in-flight state lives — a persisted saga record, a correlation id, or nothing at all, meaning the process cannot resume |
| Transactional behaviour | Whether the service mutates several aggregates in one transaction or in separate ones — this is the fact consumers most need and prose most often omits |
| Events raised | Domain events the service itself publishes, rather than any aggregate: the publication site and its condition, the payload, the registered consumers, and the dispatch mechanism |

An event raised by the service rather than by an aggregate belongs to **this**
pass. Capture it as its own `## <EventName>` chapter with `type: domain-event`,
carrying the `### Payload`, `### Consumers`, and `### Published language rules`
sub-sections — those are structural sub-sections of that one chapter and carry
no `meta` blocks of their own. Distinguish it from an **integration event**: a
translated outward contract belongs in `dependencies.md` as a published
language, not here. An event raised by an aggregate root is `to-spec-aggregate`
scope — say which side raises it and leave the other alone.

Invocation semantics is the field that most changes how a reader understands the
service, and it is directly observable: a scheduler registration, an endpoint
route, a subscription, or a read-only signature. State it explicitly, in those
terms.

An **application service** — one that opens a transaction, checks authorization,
maps DTOs, and calls a single aggregate method — is not a domain service. Report
it as a finding and do not give it a chapter. A type named `...Service` is not
evidence either way.

## Workflow

1. **Load governed context.** Read `assets/code-sync-protocol.md`,
   `devbook-domain.md`, and
   `devbook-chapter-metadata.md`. Read only the target context's
   `domain.md` and `domain.md`, plus `dependencies.md` when the service reaches
   across a context boundary.

2. **Resolve the counterpart.** Work the resolution ladder from the protocol:
   `domain.md` aliases first, then `.arc42/05-building-block-view.md`, then the
   observed naming convention. Record which rung matched. Stop at `unresolved`
   if the ladder yields no single candidate or more than one.

3. **Read the implementation and its tests.** Read the service type in full, its
   registration in the dependency container, every call site, and the aggregates
   it touches. Apply the protocol's evidence rules.
   Then mine the unit tests, per **Unit tests are first-class evidence** in the
   protocol, for:

   - **Coordination.** A test that arranges several aggregates and asserts all
     of them changed establishes the coordination the chapter has to record —
     and a test asserting one changed while another did not establishes that the
     coordination spans transactions.

   - **Invocation semantics.** A test that drives the service by publishing an
     event, or by advancing a clock, states the invocation path more plainly
     than the registration does.

   - **Ubiquitous language.** Test names describing the policy in business terms
     are usually better phrasing for the chapter than the method names.

   - **Resumption.** For a process manager, a test that interrupts a run and
     resumes it is the evidence that in-flight state actually persists.


4. **Classify the invocation semantics.** Establish which of the four semantics
   applies, from the registration and call sites rather than from the type name.
   Where a service is invoked in more than one way — a command path and a
   scheduled path — record both, because each carries different assumptions
   about concurrency and failure.

5. **Reach a verdict.** Compare what the code establishes against what the
   chapter currently says, and land on exactly one of the protocol's five
   verdicts. `code-ahead` is the case this skill exists for. On `spec-ahead`,
   stop and hand the scope to `from-spec-domain-service`. On `conflict`, stop and
   ask; never resolve it by overwriting the chapter.

6. **Draft the chapter.** Write to the template in
   `devbook-domain.md`. The heading carries the bare name; the
   `meta` block carries `status` and `type: domain-service`. A new chapter
   starts at `status: draft`; an existing chapter's `status` is left untouched.
   Include optional fields only where they have a value.

7. **Record what it coordinates, and how transactionally.** List every aggregate
   the service loads, mutates, or saves, and say whether the mutations share a
   transaction. For a process manager, say where the in-flight state lives, or
   that there is none.

8. **Route the write through the `.domain` flow.** Hand over the drafted content and the
   evidence behind each claim. The `.domain` flow owns template conformance, the
   metadata blocks, and the consistency review. Do not write `.domain/` files directly.
   The rung that answers is resolved per **Where the spec-side write goes** in
   `assets/code-sync-protocol.md`.

9. **Regenerate and validate.** After the write lands, per the protocol:

   ```bash
   node .devbook/_tools/devbook-meta/build.mjs --scope .domain
   node .devbook/_tools/devbook-meta/build.mjs --scope .domain --check
   ```

10. **Report.** Close with the protocol's report table, one row per chapter
    touched or checked, including the `aligned` ones.

## Do not

- Do not write `.domain/` files directly — the write routes through
  the `.domain` flow.
- Do not write an `annotation` fence. A capture records what the code does; an
  open question about it belongs in review, not in a chapter this skill writes.
- Do not drop a chapter's `status` line because the implementation exists. An
  omitted status means the resting value `active` — agreed — and code existing is
  not agreement that the code is the intended model.
- Do not create a `policy.md` file or a separate `Policy` chapter type. Process
  manager semantics stay in the domain service chapter.
- Do not capture an application service as a domain service. Transaction
  control, authorization, and DTO mapping are not domain logic.
- Do not infer the kind from a `...Service` suffix.
- Do not omit the invocation semantics. A service whose invocation is unrecorded
  reads as command-invoked by default, which is often wrong.
- Do not describe the coordination without saying whether it is transactional.

