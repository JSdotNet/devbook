# Kind: aggregate

What `sync-specs`, `apply-change`, and `verify-change` need to know about an
aggregate that `assets/code-sync-protocol.md` does not already say. The protocol
carries the resolution ladder, the evidence rules, the five verdicts, the status
rules, the brief contract, and the report table; this file carries the kind.

| | |
|---|---|
| Chapters | The root's `##` chapter, `type: aggregate`; every `###` it owns, `type: entity`, `value-object`, `enum`; the `## Shared Value Objects` and `## Shared Enums` groupings; every `## <EventName>` it raises, `type: domain-event` |
| File | `.domain/<context>/domain.md` |
| Folder rule | `devbook-domain.md`, with `devbook-chapter-metadata.md` |
| Context to load | The target context's `domain.md`, `.domain/context-map.md`, and the dependency tables — `context.md`'s `## Dependencies`, or `dependencies.md` once split out — for the published-language entries event consumers rely on. Never the whole `domain/` folder |
| Write path | The `domain/` flow, per **Where the spec-side write goes** in the protocol |
| Index scope | `--scope domain` |

## The aggregate is the unit, not its parts

An aggregate is a consistency boundary, and its parts are only meaningful in
terms of that boundary: an entity matters because the root controls its
lifetime, a value object because it is immutable inside the boundary, an event
because it is what the boundary announces. Capturing them separately means
reading the same root three times and deciding the boundary three times; building
them separately produces work items that cannot land independently. So one pass —
one set of chapters, one brief — covers the root, everything it owns, the shared
groupings it draws from, and the events it raises.

**Domain services are not part of this pass.** A domain service is defined by
*not* belonging to one boundary; it is its own kind, `domain-service.md`, and
owns the events it raises itself. An event raised by a service rather than by
this root is out of scope here — say which service raises it.

If the repository has no `domain/` folder, stop and run `devbook:install`. If
the bounded-context folder does not exist, stop — the context's files are created
together by the `domain/` flow, and creating only `domain.md` leaves the folder
malformed.

## Mapping

### The aggregate root

| Chapter element | Evidence when capturing | What building it requires |
|---|---|---|
| Heading (the bare name) | The root type's name, resolved through `domain.md` aliases — the heading carries the canonical term, not the class name, when they differ | A root type whose name resolves to this term through the aliases |
| Identity | The id type and how it is assigned: constructor argument, factory-generated, database-assigned | An id type and an assignment path |
| Responsibility | What the root's public methods, taken together, let a caller do — not what any one method is called | Public methods that let a caller do what the chapter describes, and nothing beyond it |
| Consistency boundary | Which types are loaded, mutated, and saved in one transaction: the repository's granularity, what the root's collections own, what it references by id only | One transactional unit: a repository whose granularity is this root, owned collections inline, other aggregates referenced by id |
| Invariants, one `### Invariants` row each | Guard clauses in the constructor and every mutating method, the exceptions they throw, validation actually enforced, and passing tests asserting the rule | Enforcement at the row's `Enforced at` point — that constructor or that named transition — on the root itself, never in a caller |
| Lifecycle | The creation path, the state transitions the mutating methods allow, and the terminal states | The creation path plus exactly the transitions the chapter allows — and no transition it does not |

An id-only reference to another aggregate is the strongest single signal of
where the boundary runs. Record it: it is the fact a reader most needs and the
one prose most often loses.

### Owned entities — `type: entity`

| Chapter element | Evidence when capturing | What building it requires |
|---|---|---|
| Heading | The entity type name, via aliases | — |
| Identity | The id type and its **scope**: globally unique, or unique only within this aggregate. A local-only id is a strong signal of an entity rather than a root | An id at the scope the sub-chapter states |
| Role within the aggregate | Which of the root's methods create, mutate, or remove it | Creation through the root |
| Lifecycle | Whether it can be removed independently, and whether removal cascades from the root | Removal with the cascade behaviour stated |
| Invariants | Guard clauses on the entity's own constructor and mutating methods | The same enforcement rule as the root's rows |
| Relationships | Whether it back-references the root, references siblings, or is reachable only through the root's collection | Held by the root and saved in its transaction — **never given a repository of its own** |

Reachability decides placement. A type reachable only through this root is an
entity of this aggregate; a type with **its own repository and its own
transactional boundary is a root** and needs its own `##` chapter. Code saying
root where the chapter says entity, or the reverse, is a `conflict`.

### Owned value objects and enums — `type: value-object`, `type: enum`

| Chapter element | Evidence when capturing | What building it requires |
|---|---|---|
| Heading | The type name, via aliases | — |
| Meaning | What it represents, from its members and the operations on it | — |
| Equality semantics | How value equality is implemented: a record type, a struct, an overridden `Equals`/`GetHashCode`, an `IEquatable`, comparison on a component list | Value equality: two instances with the same components are the same value |
| Immutability | No setters, init-only or readonly members, copy-style mutation returning a new instance | No setters; mutation returns a new instance |
| Validation rules | Guard clauses in the constructor, factory, or parse method | Construction that rejects every invalid instance, so an invalid one cannot exist |
| Enum members | Every member, with what each means in business terms — never just the identifier list | Exactly the members the sub-chapter names, and no others |
| Conversions | Parse, `TryParse`, conversion operators, serialization mappings | — |
| Shared placement | The count of aggregates in the context that use the type | One shared type where the chapter places it in the shared grouping — not a copy per aggregate |

Value equality plus immutability is the evidence that a type is a value object.
Being small, or wrapping a string, is not; a mutable type with identity is an
entity whatever its size. Write each construction guard as a rule an instance
satisfies — "a postal code is four digits followed by two letters" — not as a
description of the check.

A type used by **exactly one** aggregate is a `###` sub-chapter under it. A type
used by **two or more** aggregates in the context belongs under the shared
grouping and is not duplicated under each user. Placement records the current
model, not a prediction.

### Domain events raised by this aggregate — `type: domain-event`

| Chapter element | Evidence when capturing | What building it requires |
|---|---|---|
| Heading | The event type name, via aliases | — |
| Trigger | The exact publication site: which of the root's methods raises it, **and under what condition** — a conditional branch is part of the trigger | A publication site at exactly the condition the chapter names — not broader, not narrower |
| Payload | Every field, with meaning and shape: nullability, units, identifier form, whether an id refers to another aggregate | Every field the chapter names, with the shape it states, and no undeclared extras |
| Consumers | Registered handlers and subscribers, and the contexts they belong to | Each named consumer subscribed and handling the event |
| Published language rules | What consumers may rely on: field stability, versioning actually implemented, ordering and delivery semantics visible in the dispatch mechanism | The stated stability and evolution rules, honoured by the payload shape |
| Dispatch mechanism | In-process dispatch, transactional outbox, or direct broker publish | A dispatch path that can deliver what the rules promise |

A **domain event** is raised inside the model and describes something that
happened in this context; an **integration event** is a translated contract
published outward. The chapter documents the domain event; the outward contract
belongs in the dependency tables as a published language. Do not describe what a
handler does as part of the event's meaning.

## Capturing — `sync-specs`

Read the root type in full, then every type it owns, then its repository or
persistence mapping, then the sites that raise its events and the handlers
registered for them — the full inventory before writing anything, because every
placement decision depends on knowing every member of the boundary. Then mine
the tests for the root and each owned type: a rejected construction or
transition names the invariant more precisely than the guard clause; test names
carry the ubiquitous language (`CannotConfirmAnAlreadyCancelledOrder` gives the
term, the transition, and the rule); the values a test rejects give the actual
boundary; tests walking a root through its states enumerate the legal and the
illegal transitions; an event asserted raised on one path and *not* on the
near-miss path establishes the trigger's condition; equality and immutability
tests are the direct evidence for those fields.

An invariant is what the type guarantees no matter who calls it — enforced in
the constructor or the mutating method itself, not in an application service
upstream. Record caller-side rules as such or leave them out. Write one
`### Invariants` row per rule: `Enforced at` from the guard clause's location,
`Evidence` from the test selector that asserts it, or `untested` where none does.
A rule visible only in a disabled test, a TODO, or a comment becomes an `open`
row with the question in `Evidence`, never a fact. Never merge rows — a row is
what a brief quotes and an acceptance check is derived from.

Settle every placement from that inventory: a type with a store of its own is a
root and gets its own pass; identity and mutability decide entity against value
object; the user count decides owned against shared. Reach a verdict **per
chapter** — root, each sub-chapter, each event drift independently.

Draft to the `domain.md` template. Owned `###` sub-chapters sit directly under
the aggregate's `##` — there are no `### Entities` / `### Value Objects` /
`### Enums` grouping headings — and each carries its own `meta` block. An event's
`### Payload`, `### Consumers`, and `### Published language rules` are structural
sub-sections of one chapter and carry no `meta` blocks.

## Applying — `apply-change`

Apply the status gate **per chapter**. A root at `active` with a sub-chapter at
`draft` is the common case: brief the settled parts and name the unsettled ones
as needing a decision.

Two failure modes are the default outcome unless the brief forbids them in
writing: an owned entity given its own repository, and a shared value object
copied per aggregate. A primitive standing in for a value object or an enum is
the usual finding, makes the category `change to existing behaviour`, and the
brief lists every place the primitive appears — replacing it is the bulk of the
work.

Carry each `### Invariants` row into the brief as its own invariant, quoting the
`Rule` and carrying its `Enforced at`. A row whose `Evidence` is a passing test
is already enforced: verify and drop it from the ask. A row at `untested` still
gets its acceptance check — an unasserted rule is one refactor from gone. A row
with `open` in `Enforced at` is not briefed; name it as needing a decision.

Raising an event is rarely the whole change: say which named consumers must be
subscribed and which are out of scope. A missing payload field on an event
already published is a **contract change**, and existing consumers may need to
tolerate it.

Ubiquitous language: the root's term, every owned type's, every enum member's,
each event's and its payload fields', and any aggregate referenced by id, each
with its `aliases`. Out of scope: sibling aggregates, any domain service that
coordinates this one, the `features.md` chapters that consume it, cross-context
integration in the dependency tables, consumer-side behaviour beyond subscribing,
and every sub-chapter the gate left unsettled. Acceptance checks: one per
invariant row and per outcome — invalid construction rejected, forbidden
transition throws, equal components equal, owned entity reachable and savable
only through its root, the enum has exactly the named members, the event raised
on the trigger **and not on the near-miss path**, each consumer receives it,
another aggregate reachable only by id.

## Do not

- Do not write a kind prefix into a heading — `## Order`, never `## Aggregate: Order`.
- Do not classify a type as a value object because it is small, or as an entity
  because it has an id field.
- Do not duplicate a value object or enum under an aggregate when another one
  uses it too; do not brief a per-aggregate copy of a shared type.
- Do not record an enum as a bare identifier list; do not brief members the
  chapter does not name.
- Do not record an integration event's outward payload as the domain event's.
- Do not capture or brief an event a domain service raises, or a domain service
  alongside the aggregate.
- Do not brief a repository, store, or DAO for an owned entity.
- Do not add `depends-on` to a `domain.md` chapter.
- Do not extend the pass into `context.md`, `features.md`, `model.md`,
  `flow.md`, or `dependencies.md`.
