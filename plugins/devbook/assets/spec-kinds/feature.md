# Kind: feature

What `sync-specs`, `apply-change`, and `verify-change` need to know about a
feature that `assets/code-sync-protocol.md` does not already say. The protocol
carries the resolution ladder, the evidence rules, the five verdicts, the status
rules, the brief contract, and the report table; this file carries the kind.

| | |
|---|---|
| Chapters | A `##` chapter, `type: feature`, and its `###` parts, `type: sub-feature` |
| File | `.devbook/domain/<context>/features.md` — or `skills.md`, where the context describes skills rather than product features — or the `features.<name>.md` / `skills.<name>.md` the chapter was split into |
| Folder rule | `devbook-domain.md`, with `devbook-chapter-metadata.md` |
| Context to load | The target context's `features.md`, `context.md` — the switches and the actors — and `domain.md`, the aggregates the capability exercises, plus `actors.md` where the context has split it out; when applying, every chapter in `depends-on`, `feature-flag`, and `setting`, and every `related` `domain.md` chapter too |
| Write path | The `domain/` flow, per **Where the spec-side write goes** in the protocol |
| Index scope | `--scope domain` |
| Extra input | A runnable environment for capturing: local or disposable, never shared or production, plus how the repository starts the app and what it takes to reach the feature |

## Business language, from the user's point of view

`features.md` is written in **business and ubiquitous language**. The evidence
comes from code, but the chapter does not describe endpoints, controllers, or
components — it describes what the product lets someone do and the value that
delivers. A chapter that lists routes has captured the wrong thing; a capability
that cannot be stated without naming a technical artifact is an implementation
detail, not a feature.

Feature chapters are the only `domain/` chapters that carry `depends-on`,
`feature-flag`, and `setting`. `feature-flag` and `setting` are references to
the switch chapters in the context's `context.md` — the `setting` kind covers
those — and each is an **identity** link only: this chapter and that switch are
the same capability, never a status mapping in either direction. A flag at full
rollout does not make a chapter `active`, and a `draft` chapter says nothing
about the flag. `depends-on` records delivery ordering between features, not
code coupling: two features sharing an aggregate are not dependent; one that
cannot ship until another exists is. Omit any of the three when it has no
value.

## Mapping

| Chapter element | Evidence when capturing | What building it requires |
|---|---|---|
| Heading (the bare name) | The capability's name in business language, reconciled with `domain.md` — not the controller, component, or flag name | A capability a user can name, reachable in the product |
| Capability description | The reachable paths — endpoints, screens, commands, jobs — **confirmed by running the application and using the feature** | The described behaviour reachable end to end — check which partial paths already deliver some of it |
| Observed behaviour | What the running application does when exercised: the steps, the state changes, the wording the interface uses, where the flow ends | — |
| Screenshots | One per distinguishable step, as report evidence behind the description and the breakdown | — |
| Business value | Why it exists, as far as code, tests, and observed behaviour support it; otherwise an open question, never an invented rationale | — |
| Sub-features | The parts a user would name separately, each a `###` with `type: sub-feature` | Each delivered, or explicitly deferred — check which already exist |
| `feature-flag`, `setting` | The switch chapter whose `key` is the one actually checked in code to gate the capability; several when several together deliver it — a key with no chapter is a `setting`-kind capture first | The switch existing at the level its chapter names and gating the capability — check `context.md` and the checks in code |
| `depends-on` | A genuine ordering constraint between features, not a code reference | Every prerequisite delivered before this one starts — check the referenced chapters' own counterparts |
| `related` | The `domain.md` aggregates, events, and services the capability exercises | Those chapters present and correct, with their counterparts |
| Authorization | The role check or attribute gating a path — evidence about the **actor**, and the fourth beat of a `user` chapter in `context.md` or `actors.md`, never a line in `features.md`; the checked name is that chapter's `role` | The `user` whose `role` matches the check and whose chapter points at this feature, holding the right that chapter states — check the actor chapters and the repository's authorization configuration |

## Capturing — `sync-specs`: run the application

This is the one chapter written from the **user's** point of view, and the one
kind whose subject you can go and look at. Reading a controller tells you a
route exists; using the feature tells you what the product lets someone do, in
what order, with what wording — the part that cannot be recovered from source.
Watching the flow is also what makes the sub-feature breakdown visible: one
handler may serve three sub-features or three handlers one, and only the seams a
user meets settle it.

Start the app the repository's own way. Prefer its runtime or QA workflow skills
where it ships any — one that brings an Aspire-orchestrated app up, one that
captures screens, one that drives the flow — and otherwise whatever the README
or launch configuration says. Walk the feature end to end as a user would and
capture a screenshot of each distinguishable step. Record the steps in order and
where the flow ends, the wording the interface uses (real evidence about the
ubiquitous language, and worth reporting when it disagrees with the code or
`domain.md`), the observable outcome of each step, the sub-feature seams, and
where the flag gates the flow — exercised on and off where that changes no
shared state. If the app cannot be started, say so in the report, capture from
code and tests, and mark the description unconfirmed rather than silently
downgrading the pass.

**Do not mutate data you do not own.** Run only against a local or disposable
environment. Never exercise a destructive path — deleting, cancelling, sending,
paying, notifying — to see what it does; capture up to it and take the rest from
code and tests. Never toggle a flag in an environment other people use.

**Screenshots are evidence, not chapters.** They belong in the report, and where
the repository has a convention for run artifacts, there. `features.md` stays
prose; `design/` explicitly does not hold screenshots either.

From the code, trace the reachable paths and the flag and role checks gating
them, then read the acceptance and end-to-end tests — their names are often the
best statement of a capability in business language. Mine the unit tests for
scope (the scenarios covered map onto the sub-features; an untested one is
thinly covered), flag behaviour (a scenario run with the flag on and off
establishes what it gates), and outcomes (a test naming an endpoint is evidence
of the path, not the feature). A role check is the actor's right: carry it into
the same routed write as the fourth beat and the `role` of that `user` chapter, and where no
`user` chapter carries the role, report the missing actor — three beats a role
check cannot supply are needed before one is written.

Restate everything as what the product lets someone do, in the context's terms,
preferring the observed flow over the code's structure where they suggest
different breakdowns. Draft with `type: feature` or `type: sub-feature`, and set
`feature-flag`, `setting`, and `depends-on` only from a real switch chapter
and a real ordering — a key with no chapter is a `setting`-kind capture first.

## Applying — `apply-change`

Check `depends-on` first. A feature whose prerequisites are themselves unbuilt
cannot be briefed as one change: report the chain and let the user decide the
order.

A feature brief is the one place in this family where the outcomes are the
substance, since the chapter is written in business language. The invariants
come from the `related` `domain.md` chapters, not from the feature chapter:
quote their `### Invariants` rows with each `Enforced at`, and report `open`
rows as decisions the feature depends on. The actor comes from
the actor chapters where the context has them — the brief carries the `role` and
the right, so the build authorizes the capability rather than meeting the
question afterwards; a right the chapter leaves open is reported like an `open`
row, never guessed.

Ubiquitous language: the capability's term, the terms of the aggregates and
events it exercises, and the flag key, each with `aliases`. Out of scope:
sub-features the chapter lists but this pass defers (stated, never silent),
sibling features in the same file, and aggregate modelling that would be a
separate pass. Acceptance checks, in user terms: the capability is reachable, it
behaves as described under the flag, each in-scope sub-feature works, and the
invariants from the `related` chapters hold.

## Do not

- Do not write endpoints, controllers, components, table names, routes,
  selectors, or screenshots into `features.md`.
- Do not write an authorization rule into `features.md`, or create a `user`
  chapter from a role check alone.
- Do not infer `status` from a flag's maturity, or a flag's state from `status`;
  do not infer that a feature is delivered because its flag exists.
- Do not set `depends-on` from a code reference or a shared aggregate, and do
  not brief a feature whose prerequisites are unbuilt without reporting the
  chain.
- Do not invent a business rationale or invariants for a feature.
- Do not write out an empty `feature-flag`, `setting`, `depends-on`, or `related`.
- Do not capture from code alone when the app can be started, and do not claim
  the flow was observed when it was not.
- Do not run the feature against a shared, staging, or production environment;
  do not exercise a destructive step to document it.
- Do not commit screenshots into `domain/` or `design/`.
- Do not design the user interface, the API shape, or the screen flow in a brief.
