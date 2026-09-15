---
name: to-spec-aggregate
description: 'To-spec direction (capture), aggregate kind: read an implemented aggregate whole — the root plus every entity, value object, and enum it owns, the shared value-object and enum groupings, and the domain events it raises — and write or refresh those chapters in .domain/<context>/domain.md. Use when: an aggregate exists in code but has no chapter, the chapter is a stub, sub-chapters are missing or stale, an event is raised with no chapter, the code has grown invariants the chapter never recorded, document the aggregate we built. Reads source and unit tests as evidence and routes the write through the `.domain` flow. DO NOT USE FOR: turning an agreed but unbuilt aggregate chapter into work (use from-spec-aggregate), or for the domain-service, feature, or bounded-context chapters around it (use the matching to-spec-* skill).'
---

# Capture an aggregate from code

## Purpose

An aggregate is implemented and running, and `.domain/<context>/domain.md` does
not say so — the chapter is missing, or it is a one-line stub, or it describes a
consistency boundary and a set of invariants the code has since moved past. This
skill reads the implementation, establishes what the aggregate actually
guarantees, and routes grounded chapters through the `.domain` flow.

**The aggregate is captured whole, in one pass.** An aggregate is a consistency
boundary, and its parts are only meaningful in terms of that boundary: an entity
matters because the root controls its lifetime, a value object matters because
it is immutable inside that boundary, an event matters because it is what the
boundary announces when it changes. Capturing them separately means reading the
same root three times and deciding the boundary three times, with three chances
to decide it differently. So one pass covers:

- The aggregate root's `##` chapter — `type: aggregate`.
- Every `###` sub-chapter it owns — `type: entity`, `type: value-object`,
  `type: enum`.
- The `## Shared Value Objects` and `## Shared Enums` groupings, when a type
  this aggregate uses turns out to be used by another aggregate in the context
  too. The pass has to count users to place a type at all, so it is already
  holding the fact that decides this.
- Every `## <EventName>` chapter for a domain event this aggregate raises —
  `type: domain-event` — including its `### Payload`, `### Consumers`, and
  `### Published language rules` sub-sections.

**Domain services are not part of this pass.** A domain service coordinates
across aggregates or holds logic no single root owns — it is defined by *not*
belonging to one boundary, so folding it into a boundary's pass would be
backwards. It has its own pair: `to-spec-domain-service`.

Read `assets/code-sync-protocol.md` before starting. It carries the counterpart
resolution ladder, the evidence rules, the five-way drift verdict, the status
rules, index regeneration, and the report table — none of which are repeated
here.

## Inputs

- **Target bounded context.** The `.domain/<context>/` folder whose `domain.md`
  gains or updates the chapters. Derive it from the code's location and
  `.domain/context-map.md` when not stated.
- **Target aggregate.** The aggregate root, named either as a chapter heading or
  as a code type. Either end is a valid starting point; counterpart resolution
  closes the gap.
- **Repository root.** Default to the current working directory.

If the repository has no `.domain/` folder, stop and run `devbook:install`
first for the `.domain` adoption path. If the bounded context folder does not
exist, stop — this skill does not create one. A context's `domain.md`,
`features.md` or `skills.md`, `model.md`, `dependencies.md`, and the context's
term chapters are created
together by the `.domain` flow, and creating only `domain.md` leaves the folder
malformed.

## Spec-to-code mapping

### The aggregate root

| Chapter element | Code and test evidence |
|---|---|
| Heading (the bare name) | The aggregate root type's name, after resolving through `domain.md` aliases — the heading carries the canonical term, not the class name, when they differ |
| Identity | The root's id type and how it is assigned: constructor argument, factory-generated, database-assigned |
| Responsibility | What the root's public methods, taken together, let a caller do — not what any one method is called |
| Consistency boundary | Which types are loaded, mutated, and saved in one transaction: the repository interface's granularity, what the root's collections own, what it references by id only |
| Invariants | Guard clauses in the constructor and in every mutating method, the exceptions they throw, validation that is actually enforced, and passing tests that assert a rule holds |
| Lifecycle | Creation path (constructor, static factory, or builder), the state transitions the mutating methods allow, and the terminal states — completed, cancelled, archived, deleted |

An id-only reference to another aggregate is the strongest single signal of
where the consistency boundary runs. Record it: it is the fact a reader most
needs and the one a prose-only chapter most often loses.

### Owned entities — `type: entity`

| Chapter element | Code and test evidence |
|---|---|
| Heading | The entity type name, via `domain.md` aliases |
| Identity | The id type and its **scope**: globally unique, or unique only within this aggregate. A local-only id is a strong signal the type is an entity rather than a root |
| Role within the aggregate | Which of the root's methods create, mutate, or remove it |
| Lifecycle | Whether it can be removed independently, and whether removal cascades from the root |
| Invariants | Guard clauses on the entity's own constructor and mutating methods |
| Relationships | Whether it back-references the root, references siblings, or is reachable only through the root's collection |

Reachability decides placement. A type reachable only through this root is an
entity of this aggregate; a type with **its own repository and its own
transactional boundary is an aggregate root** and needs its own `##` chapter.
When the code says root and the chapter says entity, or the reverse, that is a
`conflict` — stop and ask.

### Owned value objects and enums — `type: value-object`, `type: enum`

| Chapter element | Code and test evidence |
|---|---|
| Heading | The type name, via `domain.md` aliases |
| Meaning | What it represents, from its members and the operations offered on it |
| Equality semantics | How value equality is actually implemented: a record type, a struct, an overridden `Equals`/`GetHashCode`, an `IEquatable` implementation, or comparison on a component list |
| Immutability | Absence of setters, init-only or readonly members, and copy-style mutation returning a new instance |
| Validation rules | Guard clauses in the constructor, factory, or parse method — the rules that make an invalid instance impossible to construct |
| Enum members | Every member of the value set, with what each one means in business terms — never just the identifier list |
| Conversions | Parse, `TryParse`, conversion operators, and serialization mappings that constrain the external form |

Value equality plus immutability is the evidence that a type is a value object.
Being small, or wrapping a string, is not. A mutable type with identity is an
entity, whatever its size.

Write each construction guard as a rule an instance satisfies, not as a
description of the check: "a postal code is four digits followed by two letters"
is the rule; "the constructor throws when the regex does not match" is its
implementation.

### Shared value objects and enums

A type used by **exactly one** aggregate is a `###` sub-chapter under it. A type
used by **two or more** aggregates in the context belongs under
`## Shared Value Objects` or `## Shared Enums` and is **not** duplicated under
each user. Counting the users is part of this pass. A type used by one aggregate
today but obviously general is still placed under that aggregate — placement
records the current model, not a prediction.

### Domain events raised by this aggregate — `type: domain-event`

| Chapter element | Code and test evidence |
|---|---|
| Heading | The event type name, via `domain.md` aliases |
| Trigger | The exact publication site: which of the root's methods raises it, **and under what condition**. An event raised inside a conditional branch has that condition as part of its trigger |
| Payload | Every field, with meaning and shape expectations — nullability, units, identifier form, whether an id refers to another aggregate |
| Consumers | Registered handlers and subscribers: dispatcher registrations, bus subscriptions, outbox mappings, and the contexts they belong to |
| Published language rules | What consumers may rely on: field stability, versioning actually implemented, ordering and delivery semantics visible in the dispatch mechanism |
| Dispatch mechanism | In-process dispatch, transactional outbox, or direct broker publish — this determines what consumers can assume about timing and delivery |

Distinguish a **domain event** from an **integration event**. A domain event is
raised inside the model and describes something that happened in this context;
an integration event is a translated contract published outward, often with a
different shape. When the code has both, the `domain.md` chapter documents the
domain event, and the outward contract belongs in `dependencies.md` as a
published language. Documenting the integration payload as the domain event's
payload is a common and quiet error.

Do not describe what a handler does as part of the event's meaning. The event
says what happened; the handler's behaviour is the handler's own concern.

An event may be raised by a domain service rather than by this root. When it is,
it belongs to `to-spec-domain-service` — record it as out of scope and say which
service raises it.

## Workflow

1. **Load governed context.** Read `assets/code-sync-protocol.md`,
   `devbook-domain.md`, and
   `devbook-chapter-metadata.md`. Then read only the target
   context's `domain.md` and `domain.md`, plus `.domain/context-map.md` for
   cross-context relationships and `dependencies.md` for the published-language
   entries any event consumers rely on. Do not read the whole `.domain` folder.

2. **Resolve the counterpart.** Work the resolution ladder from the protocol:
   `domain.md` aliases first, then `.arc42/05-building-block-view.md`, then the
   observed naming convention of the context's sibling aggregates. Record which
   rung matched. Stop at `unresolved` if the ladder yields no single candidate
   or more than one.

3. **Read the implementation, breadth first.** Read the root type in full, then
   every type it owns, then its repository or persistence mapping, then the
   sites that raise its events and the handlers registered for them. Build the
   full inventory before writing anything — the placement decisions later in
   this pass depend on knowing every member of the boundary.

4. **Read the unit tests, deliberately**, per **Unit tests are first-class
   evidence** in the protocol. Read the test class for the root and for each
   owned type, and mine them for:

   - **Invariants.** A test asserting that construction or a transition is
     rejected is the strongest available statement that the rule holds. It also
     shows *which* rule — the exception type or message usually names it more
     precisely than the guard clause does.
   - **Ubiquitous language.** Test and fixture names are written by people
     describing behaviour, so they frequently carry the exact business phrasing
     the chapter needs: `CannotConfirmAnAlreadyCancelledOrder` gives you the
     term, the transition, and the rule in one line. Prefer this phrasing over
     paraphrasing the code.
   - **Boundary and validation cases.** The specific values a test rejects tell
     you the actual rule, where the guard clause only tells you that there is
     one.
   - **Lifecycle and state transitions.** Tests that walk a root through its
     states enumerate the legal transitions, and the ones asserting a throw
     enumerate the illegal ones. Both belong in the chapter.
   - **Event publication.** A test asserting an event is raised establishes the
     trigger, and one asserting it is *not* raised on a near-miss path
     establishes the trigger's condition.
   - **Equality and immutability.** Value object tests asserting two instances
     with equal components are equal, or that a mutation returns a new instance,
     are the direct evidence for those chapter fields.

5. **Establish the invariants.** For each rule the code enforces, decide whether
   it is an invariant of the aggregate or a rule of one caller. An invariant is
   what the type guarantees no matter who calls it — enforced in the constructor
   or in the mutating method itself, not in an application service upstream.
   Record caller-side rules as such, or leave them out; do not promote one call
   site to an invariant.

   Write the surviving rules into the chapter's `### Invariants` table, one row
   each, per `devbook-domain.md`. Step 3 gives you `Enforced at` —
   the constructor or the named transition the guard clause actually sits in —
   and step 4 gives you `Evidence`: the test selector that asserts the rule, or
   `untested` where a guard clause enforces a rule no test covers. Do not
   collapse several rules into one row to keep the table short. A row is the unit
   a `from-spec-*` pass quotes and an acceptance check is derived from, so a merged
   row silently merges two acceptance checks into one.

   Both of step 4's informative absences land in this table rather than being
   dropped. A rule the code enforces with no test becomes a row whose `Evidence`
   is `untested` — a real finding, and the quickest view of where the suite is
   thin. A rule visible only in a disabled test, a TODO, or a comment is never
   recorded as holding; it becomes an `open` row with the question itself in
   `Evidence`.

6. **Settle every placement.** Working from the step 3 inventory and the step 4
   tests, decide for each type:
   - Is it an aggregate root of its own? Check for a repository or store whose
     granularity is that type. If there is one, it is not part of this boundary
     — report it and let it have its own pass.
   - Is it an entity or a value object? Identity and mutability decide, not
     size.
   - Is it owned by this aggregate alone, or shared? Count the aggregates in the
     context that use it.

7. **Reach a verdict.** Compare what the code establishes against what the
   chapters currently say, and land on exactly one of the protocol's five
   verdicts **per chapter** — the root and each sub-chapter and event can drift
   independently, and a single verdict for the whole aggregate would hide that.
   `code-ahead` is the case this skill exists for. On `spec-ahead`, stop and
   hand that chapter's scope to `from-spec-aggregate`. On `conflict` — the chapter
   states an invariant the code does not enforce, or the code enforces one the
   chapter contradicts — stop and ask; never resolve it by overwriting.

8. **Draft the chapters.** Write to the `domain.md` template in
   `devbook-domain.md`. Headings carry bare names; `meta` blocks
   carry `status` plus `type: aggregate`, `type: entity`, `type: value-object`,
   `type: enum`, `type: shared-value-objects`, `type: shared-enums`, or
   `type: domain-event`. Owned `###` sub-chapters sit **directly** under the
   aggregate's `##` chapter — there are no `### Entities` / `### Value Objects`
   / `### Enums` grouping headings in this convention — and each carries its own
   `meta` block rather than being covered by the parent's. An event's
   `### Payload`, `### Consumers`, and `### Published language rules` are
   structural sub-sections of that one chapter and carry **no** `meta` blocks.
   New chapters start at `status: draft`; existing chapters' `status` is left
   untouched.

9. **Propose the naming entries.** Where a counterpart resolved through the
   observed-convention rung and the type has no `domain.md` term, propose one
   with the discovered code name as an `alias` and a `related` reference back to
   its chapter. Propose it; the write still routes through the `.domain` flow.

10. **Route the write through the `.domain` flow.** Hand over every drafted chapter, the
    placement decisions and the evidence for them, the proposed `domain.md` entries, and
    the evidence behind each claim. The `.domain` flow owns template conformance, the
    metadata blocks, and the consistency review. Do not write `domain.md` directly. The
    rung that answers is resolved per **Where the spec-side write goes** in
    `assets/code-sync-protocol.md`.

11. **Regenerate and validate.** After the write lands, per the protocol:

    ```bash
    node .devbook/_tools/devbook-meta/build.mjs --scope .domain
    node .devbook/_tools/devbook-meta/build.mjs --scope .domain --check
    ```

12. **Report.** Close with the protocol's report table, one row per chapter —
    root, each sub-chapter, each shared grouping, each event — including the
    `aligned` ones.

## Do not

- Do not write `.domain/` files directly — the write routes through
  the `.domain` flow.
- Do not write an `annotation` fence. A capture records what the code does; an
  open question about it belongs in review, not in a chapter this skill writes.
- Do not skip the unit tests. They are where the invariants and the ubiquitous
  language are stated most precisely, and a pass that reads only production code
  will under-record both.
- Do not drop a chapter's `status` line because the aggregate is implemented and
  shipping. An omitted status means the resting value `active` — agreed — and code
  existing is not agreement that the code is the intended model.
- Do not promote a rule enforced at one call site to an aggregate invariant.
- Do not write a kind prefix into any heading — `## Order`, never
  `## Aggregate: Order`. The kind lives in `type`.
- Do not add `### Entities`, `### Value Objects`, or `### Enums` grouping
  headings. The convention removed them and `type` already says which is which.
- Do not treat a sub-chapter as covered by its parent aggregate's `meta` block.
  Each carries its own.
- Do not give an event's `### Payload`, `### Consumers`, or
  `### Published language rules` their own `meta` blocks.
- Do not duplicate a value object or enum under this aggregate when another
  aggregate in the context uses it too. Two users means the shared grouping.
- Do not classify a type as a value object because it is small, or as an entity
  because it has an id field. Equality, mutability, and reachability decide.
- Do not record an enum as a bare list of identifiers.
- Do not record an integration event's outward payload as the domain event's
  payload.
- Do not capture an event raised by a domain service. That is
  `to-spec-domain-service` scope.
- Do not add `depends-on` to a `domain.md` chapter.
- Do not extend the pass into `features.md`, `model.md`, `flow.md`, or
  `dependencies.md` — `features.md` is `to-spec-feature` scope, and the rest are
  out of scope for every skill in this plugin.

