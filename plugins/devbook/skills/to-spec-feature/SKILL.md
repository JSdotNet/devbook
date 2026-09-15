---
name: to-spec-feature
description: 'To-spec direction (capture), feature kind: read a shipped capability and write or refresh its `type: feature` or `type: sub-feature` chapter in .domain/<context>/features.md, including feature-flag and depends-on. Use when: a capability ships but features.md does not list it, the feature breakdown is stale, a feature flag has no chapter, document the features we built, capture the feature by using it. Runs the application and captures screenshots of the flow as primary evidence, alongside source and tests, then routes the write through the `.domain` flow. DO NOT USE FOR: turning an agreed but unbuilt feature chapter into work (use from-spec-feature), or for the aggregate, domain-service, or bounded-context chapters around it (use the matching to-spec-* skill).'
---

# Capture a feature from code

## Purpose

A capability is shipped and reachable by users, and
`.domain/<context>/features.md` — or `skills.md`, where the context describes
skills rather than product features — does not describe it, or describes a
sub-feature breakdown the product has since outgrown. This skill runs the
application and uses the feature, reads the implementation and its tests, states
the capability in business language, and routes a grounded chapter through
the `.domain` flow.

`features.md` is written in **business and ubiquitous language**, not
implementation terms. The evidence comes from code, but the chapter does not
describe endpoints, controllers, or components — it describes what the product
lets someone do and the value that delivers. A chapter that lists routes has
captured the wrong thing.

Feature chapters are the only `.domain` chapters that carry `depends-on` and
`feature-flag`, and both need care.

Read `assets/code-sync-protocol.md` before starting. It carries the counterpart
resolution ladder, the evidence rules, the five-way drift verdict, the status
rules, index regeneration, and the report table — none of which are repeated
here.

## Inputs

- **Target bounded context.** The `.domain/<context>/` folder whose
  `features.md` gains or updates the chapter.
- **Target capability.** Named as a feature heading, a flag key, or a described
  user-facing behaviour.
- **A runnable environment.** Local or disposable, never shared or production.
  How the repository starts the app, and any credentials or seed data needed to
  reach the feature.
- **Repository root.** Default to the current working directory.

## Spec-to-code mapping

The feature chapter's parts and the code that evidences each one:

| Chapter element | Code, test, and runtime evidence |
|---|---|
| Heading (the bare name) | The capability's name in business language, reconciled with `domain.md` — not the controller, component, or flag name |
| Capability description | What a user can now do, established from the reachable paths through the application: endpoints, screens, commands, jobs — and confirmed by **running the application and using the feature** |
| Observed behaviour | What the running application actually does when the feature is exercised: the steps a user takes, the state changes they see, the wording the interface uses, and where the flow ends |
| Screenshots | Captures of each distinguishable step of the flow, used as the evidence behind the capability description and its sub-feature breakdown |
| Business value | Why the capability exists, as far as the code, tests, and observed behaviour support it. Where they do not, leave it as an open question rather than inventing a rationale |
| Sub-features | Distinguishable parts of the capability that a user would name separately, each becoming a `###` chapter with `type: sub-feature` |
| `feature-flag` | The flag key actually checked in code to gate this capability. One key, or several when several flags together deliver the chapter |
| `depends-on` | Other features in `features.md` that must be delivered before this one — established from a genuine ordering constraint, not from a code reference |
| `related` | The `domain.md` aggregates, events, and services the capability exercises |
| Authorization | The role check or authorization attribute gating the capability. Evidence about the **actor**, not about the feature: it is the fourth beat of an actor chapter in `stakeholders.md`, and never a line in `features.md` |

The `feature-flag` link is an **identity** link only: it says this chapter and
that flag are the same capability. It is deliberately **not** a status mapping.
The chapter's `status` describes how settled the written model is; the flag's
own maturity describes whether the running behaviour can be relied on. Never
translate one into the other, in either direction — a flag at 100% rollout does
not make a chapter `active`, and a `draft` chapter does not mean the flag is
unsafe.

`depends-on` records delivery ordering between features, not code coupling. Two
features that share an aggregate are not dependent; a feature that cannot ship
until another one exists is. When the ordering is not evident, omit the field.

## Running the application is part of this pass

`features.md` is the one chapter written from the **user's** point of
view, and a feature is the one kind whose subject you can go and look at.
Reading a controller tells you a route exists; using the feature tells you what
the product lets someone do, in what order, with what wording — which is exactly
what this chapter has to say and the part that cannot be recovered from source
alone. So a capture pass here runs the application and exercises the feature.

This matters most for the two things this chapter gets wrong when written from
code only:

- **The capability, stated as a capability.** A route list produces a chapter
  full of implementation nouns. Watching the flow produces one a non-engineer
  recognizes.
- **The sub-feature breakdown.** What a user would name as separate parts is
  visible in the flow — distinct steps, distinct screens, distinct outcomes —
  and is not reliably visible in the code, where one handler may serve three
  sub-features or three handlers may serve one.

**Use the repository's own way of starting the app.** Where the repository ships
a runtime or QA workflow skill, prefer it over improvising — one that brings an
Aspire-orchestrated app up, one that captures screens, and one that drives the
flow rather than only viewing it. These are recommended, not required — if the
repository has none, start
the app the way the repository's own README or launch configuration says to and
capture screens with whatever is available. If the application cannot be started
at all, say so in the report, capture the chapter from code and tests, and mark
the capability description as unconfirmed rather than silently downgrading the
pass.

**Screenshots are evidence, not chapters.** Treat them the way
`devbook-tech-update` treats its inventory JSON: they justify what the chapter
says and belong in the report, not in `.domain/`. `features.md` stays prose in
business language, and `.design` explicitly does not hold screenshots either.
Keep them out of the devbook folders, and where the repository has a
convention for run artifacts, put them there.

**Do not mutate data you do not own.** Exercising a feature can create, change,
or delete records. Run against a local or disposable environment. Never drive a
feature in a shared or production environment to document it, and never exercise
a destructive path — deleting, cancelling, sending, paying, or notifying — just
to see what it does. Where a flow's only remaining step is destructive, capture
up to that point and record the rest from code and tests.

## Workflow

1. **Load governed context.** Read `assets/code-sync-protocol.md`,
   `devbook-domain.md`, and
   `devbook-chapter-metadata.md`. Read only the target context's
   `features.md` and `domain.md`, plus `domain.md` for the aggregates the
   capability exercises and `stakeholders.md` where the context has one.

2. **Resolve the counterpart.** Work the resolution ladder from the protocol:
   `domain.md` aliases first, then `.arc42/05-building-block-view.md`, then the
   observed naming convention. Record which rung matched. Stop at `unresolved`
   if the ladder yields no single candidate or more than one.

3. **Read the implementation and its tests.** Trace the reachable user-facing
   paths — endpoints, screens, commands, scheduled jobs — and the flag checks
   and role checks that gate them, then read the tests that describe the
   behaviour in user terms. Acceptance and end-to-end test names are often the best available
   statement of a capability in business language. Apply the protocol's evidence
   rules without exception: code that executes and tests that pass are evidence;
   comments, TODOs, doc comments, and disabled tests are not.

   A role check or authorization attribute on one of those paths is the right an
   **actor** needs — the fourth beat of that actor's chapter in
   `.domain/<context>/stakeholders.md`, and the one beat this pass can establish
   from code. Carry it into the same routed write. Where no actor chapter names
   the role, report the missing actor instead: an actor chapter needs three beats
   a role check cannot supply, and filling them in is how a stakeholder page
   starts describing a system rather than a domain.

   Then mine the unit tests, per **Unit tests are first-class evidence** in the
   protocol, for:

   - **Scope.** The set of scenarios covered maps closely onto the sub-features
     the chapter should list; a scenario nobody tests is worth noting as thinly
     covered.
   - **Flag behaviour.** A test that runs the same scenario with the flag on and
     off establishes what the flag actually gates — which is the identity link
     the chapter records, and never a statement about the chapter status.
   - **Outcomes, not routes.** Where a test names an endpoint rather than a
     capability, it is evidence of the path but not of the feature. Keep the
     chapter in business language.


4. **Run the application and use the feature.** Start it the repository's own
   way — its own runtime workflow skill for an Aspire-orchestrated app,
   otherwise whatever the README or launch configuration specifies — against a
   local or disposable environment. Then walk the feature end to end as a user
   would, and capture a screenshot of each distinguishable step, driving the flow
   rather than only viewing it where it has to be driven. Record:

   - **The steps**, in the order a user meets them, and where the flow ends.
   - **The wording the interface actually uses** — this is real evidence about
     the ubiquitous language, and it often disagrees with both the code and
     `domain.md`. A disagreement is worth reporting rather than quietly
     normalising.
   - **The observable outcome** of each step: what the user sees change.
   - **The sub-feature seams**: which parts a user would name separately.
   - **Where the flow is gated** by the feature flag, exercised with the flag
     both on and off where that is possible without changing shared state.

   Do not exercise a destructive step — deleting, cancelling, sending, paying,
   notifying — just to document it; capture up to that point and take the rest
   from code and tests. If the application cannot be started, say so in the
   report and mark the capability description as unconfirmed rather than
   pretending the pass was complete. Screenshots are evidence for the report,
   not content for `.domain/`.

5. **Translate into business language.** Restate what the code does and what you
   observed as what the product lets someone do, using the context's `domain.md`
   terms. Prefer the observed flow over the code's structure where they suggest
   different breakdowns — the user's view is what this file records. Drop every
   implementation noun. If the capability cannot be stated without naming a
   technical artifact, the scope is probably an implementation detail rather
   than a feature — say so instead of writing a technical chapter.

6. **Reach a verdict.** Compare what the code establishes against what the
   chapter currently says, and land on exactly one of the protocol's five
   verdicts. `code-ahead` is the case this skill exists for. On `spec-ahead`,
   stop and hand the scope to `from-spec-feature`. On `conflict`, stop and ask;
   never resolve it by overwriting the chapter.

7. **Draft the chapter.** Write to the template in
   `devbook-domain.md`. The heading carries the bare name; the
   `meta` block carries `status` and `type: feature` — or `type: sub-feature`
   for a chapter grouped under a parent. A new chapter starts at
   `status: draft`; an existing chapter's `status` is left untouched. Include
   optional fields only where they have a value.

8. **Set `feature-flag` and `depends-on` deliberately.** Record `feature-flag`
   only from a flag key actually checked in code, and only as an identity link.
   Record `depends-on` only where a real delivery ordering exists between
   features. Omit either field when it has no value — an empty list is not
   written out.

9. **Route the write through the `.domain` flow.** Hand over the drafted content and the
   evidence behind each claim. The `.domain` flow owns template conformance, the
   metadata blocks, and the consistency review. Do not write `.domain/` files directly.
   The rung that answers is resolved per **Where the spec-side write goes** in
   `assets/code-sync-protocol.md`.

10. **Regenerate and validate.** After the write lands, per the protocol:

    ```bash
    node .devbook/_tools/devbook-meta/build.mjs --scope .domain
    node .devbook/_tools/devbook-meta/build.mjs --scope .domain --check
    ```

11. **Report.** Close with the protocol's report table, one row per chapter
    touched or checked, including the `aligned` ones.

## Do not

- Do not write `.domain/` files directly — the write routes through
  the `.domain` flow.
- Do not write an `annotation` fence. A capture records what the code does; an
  open question about it belongs in review, not in a chapter this skill writes.
- Do not drop a chapter's `status` line because the implementation exists. An
  omitted status means the resting value `active` — agreed — and code existing is
  not agreement that the code is the intended model.
- Do not write endpoints, controllers, components, or table names into
  `features.md`. It is business language.
- Do not write an authorization rule into `features.md`. Which right a role
  needs is that role's fourth beat in `stakeholders.md`.
- Do not create an actor chapter from a role check alone. Report the role and
  let the chapter be written where its other three beats can be answered.
- Do not infer the chapter's `status` from the feature flag's maturity, or the
  flag's state from the chapter's `status`. The link is identity only.
- Do not set `depends-on` from a code reference or a shared aggregate. It
  records delivery ordering.
- Do not invent a business rationale the code and tests do not support.
- Do not write out an empty `feature-flag`, `depends-on`, or `related` field.
- Do not create a feature chapter for an implementation detail that cannot be
  stated as something a user can do.
- Do not write the chapter from code alone when the application can be started.
  Using the feature is what makes this chapter a user's-eye view.
- Do not run the feature against a shared, staging, or production environment to
  document it. Use a local or disposable one.
- Do not exercise a destructive step — deleting, cancelling, sending, paying,
  notifying — to see what it does. Capture up to it and take the rest from code
  and tests.
- Do not toggle a feature flag in an environment other people are using.
- Do not commit screenshots into `.domain/` or `.design/`. They are evidence for
  the report; `.design` explicitly does not hold screenshots either.
- Do not embed screenshots, routes, or selectors in `features.md`. It stays
  prose in business language.
- Do not claim the flow was observed when it was not. An unconfirmed capability
  description is fine; a fabricated one is not.

