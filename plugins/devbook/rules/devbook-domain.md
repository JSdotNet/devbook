---
name: devbook-domain
description: Structure and authoring rules for the domain devbook folder, including root strategic DDD context mapping and per-bounded-context documentation.
---

# Domain documentation (`.domain`)

`.domain` is the durable, ubiquitous-language record of the domain model,
organized by bounded context. It is the authoritative source for "what the
domain looks like" — complementary to `.arc42` (system architecture), `.tech`
(technology stack), and `.design` (UX guidelines).

## Context-loading policy

- `.domain` is **not** baseline repository context. Load it only for domain
  modeling, bounded-context, or ubiquitous-language tasks, normally after
  routing through the repository's domain flow or a domain specialist
  agent.
- When `.domain` is needed as task context, load only the relevant bounded
  context's chapters instead of reading the whole folder by default.
- Implementation work consults `.domain` when the change touches domain
  behavior, an aggregate boundary, or naming — not by default.

## Structure

`.domain/` contains one root strategic artifact plus one folder per bounded
context.

Each bounded context gets its own subfolder, named in kebab-case after the
context (e.g. `.domain/order-management/`). Use the same name consistently
across `.domain`, ADRs, and code module names where practical.

```
.domain/
  context-map.md
  <bounded-context-name>/
    domain.md
    stakeholders.md  # who operates this context, and who it acts toward
    features.md      # what the context lets a user do, in business language
    skills.md        # the alternative to features.md, for a repository whose
                     # product is procedures rather than a running application
    model.md
    flow.md          # optional: when the context has lifecycle/process flows
    flow.<name>.md   # optional: one flow, split out of flow.md when it is
                     # large enough or invoked often enough to stand alone
    dependencies.md
```

When starting a new bounded context, create the folder with `domain.md`,
`stakeholders.md`, `model.md`, `dependencies.md`, and one of `features.md` or
`skills.md`, using the templates below. Add `flow.md` when the context has
lifecycle or process flows.

**A context takes `features.md` or `skills.md`, never both.** They answer the
same question — what does this context let someone do — for two different kinds
of repository, so a context holding both has split one answer across two files.
Pick per context, not per repository, though in practice a repository lands on
one of them throughout.

**`stakeholders.md` says who; the rest of the context says what.** No other
chapter states which role the someone in "the case worker files a request" is.
This file is that record, and it carries two chapter types. An `actor` operates
the system inside this context — it has an account, it needs a right, and it
issues the actions the feature chapters describe. A `party` is a person or
organization the context acts toward or models without operating it: a creditor
answering a request, a bank receiving a file, a judge whose ruling unblocks a
case. Actors first, then parties, with no grouping headings — `type` already
says which is which.

It is a stakeholder file and deliberately not a persona file. An `actor` is the
EventStorming and Domain Storytelling actor, the role that issues a command:
ubiquitous language, stable, and something an invariant can depend on. A persona
is a UX archetype of goals and frustrations, is none of those things, and belongs
in `.design` where a repository wants one. A context nobody operates directly —
a library, or one reached only by another context — omits the file, and its
absence is not a missing file.

**The ubiquitous language is the model, so it lives on the model.** A term that
is already a chapter — an aggregate, an entity, a value object, an enum, a
domain service, a domain event, an actor — carries its surface names in that
chapter's `aliases` field and earns no second chapter. Only a term with no
chapter to sit on — a role word, a process word, a name a consumer uses for
something this context never models as a thing — becomes a `term` chapter, under
the `## Ubiquitous Language` grouping at the end of `domain.md`. There is no
separate glossary file: a registry that names what the model already names is a
second copy, and it goes stale on the side nobody reads.

**`flow.<name>.md` splits one flow out of `flow.md`.** The suffix is the flow's
own name — for a procedure the repository ships, its skill name, so
`flow.flow-code.md` sits beside `flow.flow-spec.md`. It carries `type: flow`
like the file it came from, because it is the same kind of document at a
smaller scope. Split when a flow is large enough that `flow.md` stops being
readable, or when readers arrive looking for one flow rather than for the
context's flows; keep `flow.md` for the flows that are still better read
together, and drop it when every flow has been split out.

Reading order comes from this convention, not from a metadata field and not from
filenames. `context-map.md` is `.domain`'s root document and is read first,
followed by the bounded contexts in alphabetical order; inside a context,
`domain.md` is the root document and the rest read in the order listed in the
tree above — `stakeholders.md`, `skills.md` or `features.md`, `model.md`,
`flow.md`, `dependencies.md`, then any `flow.<name>.md` in filename order.
Adding a context or a file needs no declaration anywhere; just regenerate
`_meta/`. See `devbook-chapter-metadata.md`.
## File responsibilities

- **context-map.md** — Strategic DDD view across bounded contexts at the
  `.domain` root.
  - Documents the subdomain landscape/classification (core/supporting/generic
    as applicable).
  - Captures bounded-context relationships in a context map.
  - Records published languages/contracts used across context boundaries.
  - States strategic rules that constrain cross-context collaboration.
- **domain.md** — One chapter per Aggregate, Domain Service, Domain Event, or
  Shared Value Objects / Shared Enums grouping in the context.
  - Aggregate chapters include sub-chapters for their owned Entities, Value
    Objects, and Enums, each carrying its own metadata block.
  - Aggregate chapters also carry an `### Invariants` table — the rules the
    aggregate guarantees, one row per rule. See the folder rules below.
  - Domain Service chapters describe the service's responsibility and the
    aggregates/policies it coordinates.
  - Domain Event chapters are first-class addressable chapters and carry
    metadata blocks like other `domain.md` chapters.
  - Value Objects and Enums **shared across multiple aggregates** within the
    context get their own separate chapter — do not duplicate them under each
    aggregate that uses them.
- **stakeholders.md** — Who works with this bounded context: one chapter per
  role or party, headed by its name alone, with `type` carrying which of the two
  it is.
  - **`type: actor`** — a human role that operates the system inside this
    context. Four beats, in order, skipping any the context has no answer for:
    who it is, in one sentence, naming the term the screens use where it differs
    from the model term; what it does here, in business language, with `related`
    pointing at the feature chapters those actions live in; what the model holds
    it to, named only where the model actually records the role — a required
    field, an audit trail, a recorded submitter; and which right it needs, and
    where that right is configured.
  - **`type: party`** — a person or organization the context acts toward or
    models without operating it. Three beats: who it is, what the context needs
    from it or does toward it, and how it appears in the model.
  - A beat the repository cannot answer is left out and recorded as an
    `annotation` fence, never filled in with a plausible sentence. "Nobody has
    stated which right this needs" is information; an invented right is not.
  - Another bounded context, a module, or a technical system is a dependency and
    belongs in `dependencies.md`. Name a bank or a portal here only as the
    organization the domain corresponds with, and leave its contract to
    `dependencies.md`. A tenant is not a stakeholder either: it appears as the
    administrator role that changes settings.
  - Rights are stated here, not argued. Why a right is split — separation of
    duties, four eyes — is a modeling decision and belongs in a decision record.
    A context whose rights need a screen-to-right matrix closes the file with one
    `## Rights` section carrying that table.
- **features.md** — The features and sub-features this bounded context
  supports, in business language. Group sub-features under their parent
  feature.
- **skills.md** — The same question for a repository whose product is
  procedures rather than a running application: one chapter per skill the
  context ships, in the language of what the skill does for whoever runs it.
  A skill *is* a feature here, so its chapters carry `type: feature` and
  `type: sub-feature` like `features.md`'s — the file name says which kind of
  repository is being described, and the chapter type stays the same because
  the thing being described has not changed.
  - One chapter per skill, headed by the skill's own name, so the chapter is
    addressable by the name a user types.
  - Group a skill's own stages or modes under it as sub-chapters; do not give a
    stage a chapter of its own at `##` level.
  - Describe what the skill lets someone do and what it guarantees, not how it
    is implemented. Where it needs a diagram, that belongs in `flow.md` or in
    its own `flow.<skill-name>.md`.
- **model.md** — The structural domain model: relationships between
  aggregates, entities, and value objects, ideally as a Mermaid class diagram,
  plus relationship notes. Lifecycle/process flows live in `flow.md`, not
  here.
- **flow.md** — Lifecycle and process flows for the context (state machines,
  sequence diagrams, flowcharts) — how aggregates move through their states and
  how work moves across the context over time. Moved out of `model.md` so
  `model.md` stays purely structural. Include only when the context actually
  has a flow. Its `##` sections do not carry metadata blocks.
- **flow.<name>.md** — One flow, split out of `flow.md`. Same `type: flow`,
  same rule that its `##` sections carry no metadata blocks, and the same
  subject at a smaller scope. The suffix is the flow's own name; for a
  procedure the repository ships, that is its skill name. Where the flow
  belongs to a skill, the file and that skill's chapter in `skills.md` are two
  halves of one subject — the chapter says what it does, the flow file draws
  how it moves — and each carries a `related` reference to the other.
- **dependencies.md** — Outbound dependencies on other bounded contexts or
  modules, and known inbound dependents.
  - Use explicit DDD relationship semantics (`ACL`, `Customer/Supplier`,
    `Partnership`, `OHS + Published Language`, etc.) instead of ad hoc
    integration prose.
  - For each relationship, document DDD pattern, integration mechanism,
    contract, and why/what the dependency relies on.
  - A `stakeholders.md` chapter never restates one of these relationships:
    another bounded context, a module, or a technical system is a dependency,
    not a stakeholder. One file describes a relationship, so the two have no way
    of contradicting each other.

## Folder rules

These rules describe the persisted shape of `.domain` assets only. Authoring
workflow, routing, and cross-document governance are handled by separate
instructions.
- Every Aggregate, Domain Service, Domain Event, Shared Value Objects, and
  Shared Enums chapter in `domain.md`, every Entity/Value Object/Enum
  sub-chapter inside an Aggregate, every Feature/Sub-feature chapter in
  `features.md` or `skills.md`, every Actor and Party chapter in
  `stakeholders.md`, and every Term chapter under `domain.md`'s
  `## Ubiquitous Language` grouping must carry a
  metadata block as described in
  `devbook-chapter-metadata.md`. `type` is required; `status` is
  optional here (see below); the optional cross-folder tags (`related`) and
  issue link (`issue`) are included only when they have a value.
- Every file in `.domain` — `context-map.md` and, per bounded context,
  `domain.md`, `stakeholders.md`, `features.md` or `skills.md`, `model.md`,
  `flow.md` and each `flow.<name>.md` (when present), and `dependencies.md` —
  must also carry the file-level
  metadata block described in
  `devbook-chapter-metadata.md`, placed directly
  under the file's top-level `#` heading. This applies even to
  `context-map.md`, `model.md`, `flow.md`, `flow.<name>.md`, and
  `dependencies.md`, whose `##` sections do not carry their own per-chapter
  blocks — the file-level block is the only metadata those files carry.
- The metadata block's `status` field uses `draft`, `proposed`, `active`, or
  `deprecated` in this folder. This folder describes the current (or
  agreed-future) model, not a task queue, so there is no `done`: `active`
  means "this is the current model", `deprecated` means superseded.
- On top of that ladder sits the shared `approved` rung, defined once in
  `devbook-chapter-metadata.md`: a person approved this chapter,
  recorded with `approved-by` and `approved-at`. It is written explicitly, never
  rested at, and comes off the moment the content changes.
- **`active` is this folder's resting value, so it is written by omitting the
  field.** State `status` only while the chapter is in transition (`draft`,
  `proposed`) or carries a standing warning (`deprecated`); drop the line when
  it settles. Most of a mature bounded context is the current model, and
  restating that on every chapter says nothing while hiding the few chapters
  that are genuinely moving. Writing `status: active` explicitly is reported.
- The metadata block's `type` field records what kind of thing the chapter or
  file is — the classification that is **never** written into the heading. This
  folder's value sets are:

  | Level | Values |
  |---|---|
  | Chapter | `aggregate`, `entity`, `value-object`, `enum`, `shared-value-objects`, `shared-enums`, `ubiquitous-language`, `domain-service`, `domain-event`, `feature`, `sub-feature`, `actor`, `party`, `term` |
  | File | `context-map`, `domain`, `stakeholders`, `features`, `skills`, `model`, `flow`, `dependencies` |

  There is no `skill` chapter type, deliberately. A skill in `skills.md` is a
  `feature` and its stages are `sub-feature`s: the file already says which kind
  of repository is being described, and a second vocabulary for the same
  relationship would make every consumer of the graph branch on the filename to
  learn nothing.

  Each file's `type` matches its filename: `domain.md` is `type: domain`,
  `features.md` is `type: features`, `skills.md` is `type: skills`, and so on,
  with `context-map.md` at the `.domain` root carrying `type: context-map`. A
  `flow.<name>.md` carries `type: flow`, because the suffix narrows the scope
  and not the kind.
- Heading text in `.domain` carries the **name only** — `## Order`, not
  `## Aggregate: Order`. Anchors are therefore slugs of the bare name
  (`.domain/order-management/domain.md#order`). The two exceptions are the
  `## Shared Value Objects` and `## Shared Enums` chapters, whose headings name
  a grouping rather than a single thing, so the descriptive text *is* the name.
  `## Ubiquitous Language` is a third of the same kind.
  File titles are the bounded-context name alone (`# Order Management`), with
  the file's own `type` distinguishing the files of a context. A
  `flow.<name>.md` is the one exception, and it is still not a kind in the
  heading: the file title stays the context name and the flow's own name goes
  in its `##` heading, exactly as it did inside `flow.md`.

  `context-map.md` is the one `.domain` file that is not about a single bounded
  context, so it has no context name to carry. Prefer titling it after the
  system or product the map covers — `# Order Platform` — with
  `type: context-map` carrying the kind, exactly as everywhere else. The
  generator composes its node label as `Order Platform (context-map)`, so the kind
  stays visible in the graph and the label stays distinct when several
  repositories' devbook folders are viewed together.

  A plain `# Context Map` is also accepted, and the generator suppresses the
  redundant suffix so it renders as `Context Map` rather than
  `Context Map (context-map)`. It restates the `type` in the heading, which is
  mildly against the grain of this convention, but it reads unambiguously and
  reasonable people prefer it. Pick one per repository and stay with it; do not
  churn an existing title to switch.

  A `.domain` folder written the old way (kind prefixes in headings, no `type`,
  `#### <Name>` sub-chapters under `### Entities`) is migrated with the steps in
  the devbook plugin README under "Migrating to schema version 2".
- `features.md` and `skills.md` Feature/Sub-feature chapters may carry an
  additional `depends-on` field: a list of `<path>#<heading-slug>` references (see
  `devbook-chapter-metadata.md` for the reference
  format) to other features that must be delivered first, e.g.
  `depends-on: [.domain/order-management/features.md#refunds]`.
  `domain.md` chapters (Aggregates, Domain Services, Domain Events, Shared
  Value Objects/Enums) do not use `depends-on` — they describe standing
  structure, and their relationships belong in `model.md`/`dependencies.md` or
  the `related` field instead.
- `features.md` and `skills.md` Feature/Sub-feature chapters may carry an
  additional `feature-flag` field: the key (or keys) of the application feature flag that
  delivers this chapter in the running product, e.g. `feature-flag: inbox-pane`
  or, when several flags together deliver one chapter,
  `feature-flag: [inbox-pane, inbox-filters]`. One flag may equally appear on
  several chapters. Unlike `related`/`depends-on`, entries are plain
  application identifiers, not `<path>#<heading-slug>` references — the flag
  lives in the application's own catalog, not in this repository, so the field
  produces no graph edge and the key itself is never validated here. Omit the
  field when the chapter has no flag. `domain.md` chapters and `term` chapters do
  not use `feature-flag`: a flag delivers a capability, not a structural
  element or a term.

  This link is an **identity** link only — it says "this chapter and that flag
  are the same capability". It is deliberately **not** a status mapping. The
  `status` values above describe how settled the written model is; a feature
  flag's own maturity describes whether the running behaviour can be relied on.
  Those answer different questions, so do not translate one vocabulary into the
  other, and do not infer a chapter's `status` from its flag's maturity or the
  reverse.
- In `dependencies.md`, use explicit DDD relationship terminology for each
  cross-context row when applicable (for example: `ACL`,
  `Customer/Supplier`, `Partnership`, `OHS + Published Language`) and identify
  the contract/published language entry used by consumers.
- Every Aggregate chapter in `domain.md` carries an `### Invariants`
  sub-section directly under its prose: a table with one row per rule the
  aggregate guarantees. It is a structural sub-section of that one chapter, not
  an addressable chapter, so it carries no metadata block — like `### Payload`
  under a Domain Event. Entity and Value Object sub-chapters may carry the same
  table when they enforce rules of their own; where they do not, their prose
  validation rules are enough and the aggregate's table is the record.

  | Column | Holds |
  |---|---|
  | `Rule` | One rule, in the domain's own language, stated as a claim that is either true or false. One rule per row — a row holding three related rules cannot be checked, enforced, or accepted as one thing. |
  | `Enforced at` | Where the aggregate guarantees it: `constructor`, a named transition (`Confirm()`, `AddLine()`), or `all mutations` when it genuinely holds across every one. |
  | `Evidence` | What establishes that it holds: a selector from the chapter's `tests` field, or `untested` when a guard clause enforces the rule and no test asserts it. |

  `Enforced at` is the column that prose loses. An invariant is what the type
  guarantees no matter who calls it, and *where* it is guaranteed is what tells
  an `apply-change` pass whether a guard clause belongs in the constructor or in one
  transition. A rule whose enforcement point cannot be named is usually a
  caller's rule rather than an invariant — see `assets/code-sync-protocol.md`.

  `untested` is a real and useful state: write it rather than leaving the cell
  empty. An empty cell reads as "not filled in yet", which is a different claim,
  and a rule nothing asserts is one refactor away from being gone.
- A rule that is **not yet settled** is recorded in the same table as a row with
  `open` in `Enforced at` and the open question itself in `Evidence`. This is
  the hot spot of an Event Storming session kept in place rather than resolved
  by guessing, and it is where `assets/code-sync-protocol.md` means a rule to go
  when it says to record it as an open question instead of capturing it as fact.

  An `open` row does not stop a chapter reaching `active` — a model can
  be the current one and still carry a known unanswered question. It does stop
  that one rule being *built*: an `apply-change` pass names it as needing a decision
  instead of briefing an implementation of a rule nobody has agreed.
- In Domain Service chapters, state invocation semantics when it clarifies
  behavior boundaries: whether logic is command-invoked, scheduled,
  query/composition-oriented, or event-triggered policy/process-manager
  behavior.
- Do not introduce a separate `policy.md` or a distinct `Policy` chapter type
  just to document process-manager behavior; keep that semantics in the
  relevant Domain Service chapter unless a separate structure is later decided
  explicitly.
- Any chapter may carry an `aliases` field: a list of plain-string surface
  names the thing is also known by — a code class or identifier name, a
  snake_case id field, a consumer context's local copy name, a host's own word
  for it. Unlike `related`/`depends-on`, `aliases` entries are plain strings,
  not `<path>#<heading-slug>` references. Omit the field when there are none;
  the file-level block may not carry it, like every other folder-specific
  field. This is how a modelled concept is its own glossary entry: the aggregate
  chapter `## Order` with `aliases: [OrderRoot, order_id]` is the term *Order*,
  and every synonym resolves to that one chapter. A `term` chapter exists only
  for a word that has no chapter to carry the field, and its `related` field
  points at the chapters it is about.

## Templates

### context-map.md

```markdown
# <System or Product Name>

\`\`\`meta
status: draft
type: context-map
\`\`\`

> `.domain`'s root document. Prefer titling it after the system the map covers,
> since the `type` above already carries the kind and the generator labels this
> node `<System Name> (context-map)`; a plain `# Context Map` is also accepted.
> Its structural `##` sections — the four below — carry no metadata blocks; the
> file-level block above is the only metadata they need.
>
> A `##` section naming **one bounded context** is the exception, and it takes
> `type: bounded-context`. Give a context its own section and block when another
> chapter needs to address it — `.domain/context-map.md#order-management` — which
> is how a building block, a technology, or an arc42 chapter points at the
> context it belongs to. A repository whose contexts are only listed in the
> tables below needs no such sections.

## Subdomain landscape

| Subdomain | Classification | Bounded context |
|---|---|---|
| <Subdomain> | Core / Supporting / Generic | <Bounded Context Name> |

## Context map

<Diagram or table of the relationships between bounded contexts, using
explicit DDD relationship terminology — ACL, Customer/Supplier, Partnership,
OHS + Published Language.>

## Published languages

<The contracts used across context boundaries, and which contexts consume
each one.>

## Strategic rules

<Rules that constrain cross-context collaboration.>
```

### domain.md

```markdown
# <Bounded Context Name>

\`\`\`meta
status: draft
type: domain
\`\`\`

> One chapter per Aggregate, Domain Service, Domain Event, or Shared Value
> Objects / Shared Enums grouping in this bounded context.
> Aggregate chapters include sub-chapters for their owned Entities, Value
> Objects, and Enums. Value Objects/Enums shared across multiple aggregates
> get their own chapter at the end instead of being duplicated.

## <AggregateName>

\`\`\`meta
status: draft
type: aggregate
\`\`\`

Responsibility, lifecycle, and why this aggregate exists as a consistency
boundary. The rules it guarantees go in the `### Invariants` table below rather
than in this prose.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| <One rule, as a claim that is either true or false> | <constructor / <Transition>() / all mutations / open> | <tests selector / untested / the open question> |

### <EntityName>

\`\`\`meta
status: draft
type: entity
\`\`\`

Role within the aggregate, identity, and lifecycle notes.

### <ValueObjectName>

\`\`\`meta
status: draft
type: value-object
\`\`\`

Meaning, equality semantics, and validation rules.

### <EnumName>

\`\`\`meta
status: draft
type: enum
\`\`\`

Values and what each one means in business terms.

## <NextAggregateName>

...

## <DomainServiceName>

\`\`\`meta
status: draft
type: domain-service
\`\`\`

Responsibility of the service, which aggregates/policies it coordinates, and
why the behavior does not belong on a single aggregate.

Invocation semantics: <command-invoked | scheduled |
query/composition-oriented | event-triggered policy/process manager>.

## <EventName>

\`\`\`meta
status: draft
type: domain-event
\`\`\`

Published when <business trigger>.

### Payload

- `<field>` - <meaning and type/shape expectations>

### Consumers

- <Consumer context/service and why it consumes the event>

### Published language rules

- <contract stability and interpretation rules for consumers>

## Shared Value Objects

\`\`\`meta
status: draft
type: shared-value-objects
\`\`\`

> Value Objects used by more than one aggregate in this bounded context.

### <SharedValueObjectName>

\`\`\`meta
status: draft
type: value-object
\`\`\`

Meaning, equality semantics, validation rules, and which aggregates use it.

## Shared Enums

\`\`\`meta
status: draft
type: shared-enums
\`\`\`

> Enums used by more than one aggregate in this bounded context.

### <SharedEnumName>

\`\`\`meta
status: draft
type: enum
\`\`\`

Values and what each one means in business terms, and which aggregates use it.

## Ubiquitous Language

\`\`\`meta
status: draft
type: ubiquitous-language
\`\`\`

> The terms this context owns that are not chapters above. A term that is a
> chapter carries its aliases on that chapter instead. A grouping heading, so
> its descriptive text *is* its name; omit the grouping when there are none.

### <Canonical Term>

\`\`\`meta
status: draft
type: term
aliases: [<AliasA>, <AliasB>]
related: [.domain/<context>/domain.md#<heading-slug>]
\`\`\`

Definition of the term and, where useful, when each alias appears.
```

The Entity, Value Object, and Enum sub-chapters sit directly under their
aggregate as `###` headings. There are no `### Entities` / `### Value Objects`
/ `### Enums` grouping headings — `type` already says which is which, and the
grouping headings only pushed every real chapter a level deeper and added
anchors nobody references.

`### Invariants` under an Aggregate, and `### Payload`, `### Consumers`, and
`### Published language rules` under a Domain Event, are structural
sub-sections of that one chapter rather than addressable chapters, so they carry
no metadata block. `build.mjs --check` warns on each of them, as it does on
every structural heading: the validator cannot know which headings a folder means
to be addressable, so the warning is expected here and never driven to zero.
`## Rights` in `stakeholders.md` is the same case one level up — a structural
section of the file rather than an addressable chapter — and warns the same way.

### stakeholders.md

```markdown
# <Bounded Context Name>

\`\`\`meta
status: draft
type: stakeholders
\`\`\`

> Who works with this bounded context: the roles that operate it, then the
> parties it acts toward. Another bounded context, module, or technical system
> is a dependency and belongs in `dependencies.md`, never here.

## <Role Name>

\`\`\`meta
status: draft
type: actor
related: [.domain/<context>/features.md#<heading-slug>]
\`\`\`

Who this role is, in one sentence, naming the term the screens use where it
differs from the model term.

What it does in this context, in business language, pointing at the feature
chapters those actions live in.

What the model holds it to: the required field, audit trail, or recorded
submitter where the model actually records the role.

Which right it needs, and where that right is configured.

## <Party Name>

\`\`\`meta
status: draft
type: party
\`\`\`

Who this party is, what the context needs from it or does toward it, and how it
appears in the model.

## Rights

| Action | <Role> | <Role> |
|---|---|---|
| <what can be done> | <the right it needs, or —> | <the right it needs, or —> |
```

The `## Rights` section is present only where the context's rights want a matrix.
It is the file's one structural section: it carries no metadata block, and it
comes last.

### features.md

```markdown
# <Bounded Context Name>

\`\`\`meta
status: draft
type: features
\`\`\`

> Features and sub-features this bounded context supports, described in
> business/ubiquitous language rather than implementation terms.

## <FeatureName>

\`\`\`meta
status: draft
type: feature
feature-flag: <application-feature-key>
\`\`\`

Short description of the capability and the business value it delivers.

### <SubFeatureName>

\`\`\`meta
status: draft
type: sub-feature
\`\`\`

Description of the sub-feature and how it fits under the parent feature.

### <NextSubFeatureName>

...

## <NextFeatureName>

...
```


### skills.md

The alternative to `features.md`, for a repository whose product is procedures.
A skill is a feature here, so the chapter types are the same.

```markdown
# <Bounded Context Name>

\`\`\`meta
status: draft
type: skills
\`\`\`

> One chapter per skill this bounded context ships, described by what it lets
> someone do rather than by how it is implemented.

## <skill-name>

\`\`\`meta
status: draft
type: feature
related: [.domain/<context>/flow.<skill-name>.md]
\`\`\`

What the skill does for whoever runs it, what it guarantees, and where it
stops. Name the skill exactly as a user types it, so the anchor is the name.

### <Stage or Mode Name>

\`\`\`meta
status: draft
type: sub-feature
\`\`\`

One stage of the skill, or one mode it can run in.

## <next-skill-name>

...
```

### model.md

```markdown
# <Bounded Context Name>

\`\`\`meta
status: draft
type: model
\`\`\`

> Structural view of the domain model for this bounded context: aggregates,
> entities, value objects, and their relationships. Keep this in sync with
> `domain.md` (which describes responsibilities/invariants in prose) — this
> file focuses on structure and relationships.

## Model diagram

\`\`\`mermaid
classDiagram
    class AggregateName {
        +Identity Id
        +Value fields...
    }
    class EntityName
    class ValueObjectName

    AggregateName "1" --> "many" EntityName : contains
    AggregateName --> ValueObjectName : has
\`\`\`

## Relationship notes

- Describe cardinalities, ownership direction, and any relationships that
  aren't obvious from the diagram alone (e.g. why an association is one-way,
  or why two aggregates only relate by id reference rather than direct
  object reference).
```

### flow.md

```markdown
# <Bounded Context Name>

\`\`\`meta
status: draft
type: flow
\`\`\`

> Lifecycle and process flows for this bounded context: how aggregates move
> through their states and how work moves across the context over time.
> Complementary to `model.md` (structure) and `domain.md`
> (responsibilities/invariants).

## <Flow Name>

\`\`\`mermaid
<mermaid state/sequence/flow diagram>
\`\`\`

- Optional notes: transitions, emitted events, and which state is persisted
  vs. which is a workflow-only phase.
```


### flow.<name>.md

One flow split out of `flow.md`, with the same `type` and the same rule that its
`##` sections carry no metadata blocks.

```markdown
# <Bounded Context Name>

\`\`\`meta
status: draft
type: flow
related: [.domain/<context>/skills.md#<skill-name>]
\`\`\`

> One flow: <what moves, and from where to where>. Structure is in
> [model.md](model.md); what the skill does is in
> [skills.md](skills.md#<skill-name>).

## <Flow Name>

\`\`\`mermaid
<mermaid state/sequence/flow diagram>
\`\`\`

- Optional notes: transitions, emitted events, and which state is persisted
  vs. which is a workflow-only phase.
```

### dependencies.md

```markdown
# <Bounded Context Name>

\`\`\`meta
status: draft
type: dependencies
\`\`\`

> Dependencies this bounded context has on other bounded contexts or
> modules, and known dependents. Use explicit DDD relationship semantics,
> integration mechanism details, and contract references.

## Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| <OtherContext> | <ACL / Customer-Supplier / Partnership / OHS + Published Language> | <event, API call, registry lookup, id link, etc.> | <published language / contract chapter reference> | <reason this context needs it> |

## Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| <OtherContext> | <ACL / Customer-Supplier / Partnership / OHS + Published Language> | <how the consumer integrates> | <published language / contract chapter reference> | <what would break if changed> |

## Notes

- Prefer explicit DDD pattern names over free-text integration wording.
- Flag any dependency that crosses a bounded-context boundary without an
  anti-corruption layer or published language, so it can be revisited.
- Link to the relevant `domain-interaction-diagram` / `context-mapping`
  artifact if one exists for this relationship, instead of duplicating it.
```

