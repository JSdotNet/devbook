# Kind: domain-service

What `sync-specs`, `apply-change`, and `verify-change` need to know about a
domain service, policy, or process manager that `assets/code-sync-protocol.md`
does not already say. The protocol carries the resolution ladder, the evidence
rules, the five verdicts, the status rules, the brief contract, and the report
table; this file carries the kind.

| | |
|---|---|
| Chapters | The service's `##` chapter, `type: domain-service`, plus every `## <EventName>` the service itself raises, `type: domain-event` |
| File | `.domain/<context>/domain.md` |
| Folder rule | `devbook-domain.md`, with `devbook-chapter-metadata.md` |
| Context to load | The target context's `domain.md`, the chapters of every aggregate the service coordinates, and `dependencies.md` when it reaches across a context boundary. Never the whole `domain/` folder |
| Write path | The `domain/` flow, per **Where the spec-side write goes** in the protocol |
| Index scope | `--scope domain` |

## The deliberate exception to the aggregate rule

A domain service coordinates across aggregates, or holds domain logic no single
root owns. It is defined by *not* belonging to one boundary, so folding it into
an aggregate's pass would be backwards: it keeps its own pass and owns the
events it raises itself. An event raised by an aggregate root is `aggregate.md`
scope — say which side raises it and leave the other alone.

Process-manager and policy behaviour is captured **here**, in the service's
chapter. This convention has no `policy.md` file and no separate `Policy`
chapter type; do not introduce one.

The hard part of the kind is telling a domain service from an **application
service**. An application service opens a transaction, checks authorization,
maps DTOs, and calls a single aggregate method; it is not part of the domain and
gets no chapter. A type named `...Service` is not evidence either way.

## Mapping

| Chapter element | Evidence when capturing | What building it requires |
|---|---|---|
| Heading (the bare name) | The service type name, resolved through `domain.md` aliases | A type whose name resolves to this term through the aliases |
| Responsibility | What the service's methods accomplish in domain terms, taken together | Methods that accomplish what the chapter describes, and no transaction or transport concerns beyond it — check for the same logic inlined in a handler |
| Why not on an aggregate | Which roots it loads, which it mutates, what it reads across boundaries | The behaviour placed in a service rather than pushed onto one root — check whether it currently sits inside an aggregate that should not own it |
| Coordinated aggregates and policies | Every aggregate the service loads, mutates, or saves, and every other service or policy it invokes | Each named aggregate loaded, mutated, or saved as the chapter states |
| Invocation semantics | One of: command-invoked (a command handler or endpoint), scheduled (a timer, cron, or background service registration), query or composition oriented (read-only across roots), event-triggered policy / process manager (subscribed to a domain event) — from the registration and call sites, never the type name | The specific invocation path the chapter names, stated as a requirement in its own right: "event-triggered policy, subscribed to `OrderConfirmed`" is buildable; "coordinates refunds" is not |
| Process state | For a process manager: where in-flight state lives — a persisted saga record, a correlation id, or nothing, meaning the process cannot resume | Persisted in-flight state where the chapter says the process resumes |
| Transactional behaviour | Whether the service mutates several aggregates in one transaction or in separate ones — the fact consumers most need and prose most often omits | One transaction or several, exactly as stated — and where they are separate, what happens when the second one fails |
| Events raised | Publication sites the service itself owns, with condition, payload, registered consumers, and dispatch mechanism | Each event raised at the condition its chapter names, carrying every named payload field, with each named consumer subscribed |

An event raised by the service is captured as its own `## <EventName>` chapter
with `### Payload`, `### Consumers`, and `### Published language rules` as
structural sub-sections carrying no `meta` blocks. An outward integration
contract belongs in `dependencies.md` as a published language, not here.

## Capturing — `sync-specs`

Read the service type in full, its registration in the dependency container,
every call site, and the aggregates it touches. Then mine the tests: one that
arranges several aggregates and asserts all changed establishes the
coordination, and one asserting one changed while another did not establishes
that it spans transactions; one that drives the service by publishing an event
or advancing a clock states the invocation path more plainly than the
registration does; one that interrupts a process manager and resumes it is the
evidence that in-flight state persists; test names describing the policy in
business terms are usually the chapter's phrasing.

Where a service is invoked in more than one way — a command path and a scheduled
path — record both; each carries different concurrency and failure assumptions.
Draft with `type: domain-service`, and say what it coordinates and whether the
mutations share a transaction; for a process manager, where the state lives or
that there is none.

## Applying — `apply-change`

The invocation semantics is the part of the brief that most constrains
delivery: a scheduled service and an event-triggered policy are different work
with different failure modes, and a brief that leaves it implicit gets built as
a plain command handler. Where coordination spans transactions, the brief states
what happens when the second one fails — that is the invariant a process
manager exists to protect.

Ubiquitous language: the service's term, every coordinated aggregate's, and any
triggering event's, each with `aliases`. Out of scope: the aggregates' own
invariants, the application-service layer that will call it, any adjacent policy
with its own chapter. Acceptance checks: the service is reached by the named
invocation path, each coordinated aggregate is affected as stated, the
transactional behaviour holds, and an interrupted process manager resumes.

## Do not

- Do not create or brief a `policy.md` file or a separate policy type.
- Do not capture an application service as a domain service, and do not brief
  transaction control, authorization, or DTO mapping into one.
- Do not infer the kind from a `...Service` suffix.
- Do not omit the invocation semantics — unrecorded, it reads as
  command-invoked, which is often wrong.
- Do not describe the coordination without saying whether it is transactional,
  or brief it without the failure behaviour where it is not.
- Do not choose the scheduler, message broker, or saga library.
