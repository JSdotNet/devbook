# Kind: actor

What `capture-specs`, `apply-change`, and `verify-change` need to know about a
user or technical actor that `assets/code-sync-protocol.md` does not already
say. The protocol carries the resolution ladder, the evidence rules, the five
verdicts, what is agreed, the brief contract, and the report table; this file
carries the kind.

| | |
|---|---|
| Chapters | A `##` actor chapter, `type: user` or `type: technical` — never `organisation` |
| File | `.devbook/domain/<context>/actors.md`, or `context.md` while the actor chapters still live there |
| Folder rule | `devbook-domain.md`, with `devbook-chapter-metadata.md` |
| Context to load | The page the actor sits on, its `## Rights` matrix where the file has one, the feature chapters its `related` names and those whose prose names it, and the dependency tables for a `technical` actor; when applying, the code those feature chapters resolve to |
| Plan target | A chapter of the `domain/` folder, drafted to its rule and delivered in the capture plan, per **The capture plan** in the protocol |
| Index scope | `--scope domain` |
| Extra input | Where the repository keeps its authorization configuration — role and claim declarations, policy registrations, identity-provider client registrations, scheduler and webhook registrations — since a role or a client is resolved there and never guessed |

## Two types, one kind, and the one left out

A `user` is a person who signs in and is granted a role; code represents it by
the role, claim, or group its sign-in carries and the policies that admit it. A
`technical` actor is a system or a timer that triggers a use case with no person
behind it; code represents it by a client registration — a client id, a service
account, an API key or certificate identity — or by the job or callback
registration that fires it. The evidence is the same in both: an identity the
authorization layer knows, and the actions it lets through. What differs is how
the identity is issued, and that is the `type`, not a second procedure.

An `organisation` is not this kind. The context acts toward it or models it and
never authenticates it, so nothing in code represents it and its chapter roots
no sync unit. A client registration found for a bank's file drop is the
`technical` actor that delivers the file, or a dependency row — never the bank.

`domain/` folder rules that apply:

- **The heading is the name, `role` is the identifier.** A chapter headed by a
  role constant has captured the wrong thing; the name is the one the business
  and the screens use, and `role` carries the spelling the code checks.
- **`role` is a plain string or a list of them.** Never a reference. It is
  usual on a `user`, rare on a `technical` actor, and on no other chapter.
- **Who, never what.** An actor chapter names the feature chapters its actions
  live in and does not restate them; a `technical` actor's contract lives in the
  dependency tables, and another context is a dependency, never an actor.
- **Not a persona, not an actor-model object.** A UX archetype belongs in
  `design/`, a mailbox object or grain in `arc42/`.

## Counterpart ladder

The protocol's ladder resolves by naming. An actor's counterparts sit in the
authorization layer, so this kind climbs its own rungs first, in this order,
and stops at the first that yields one unambiguous identity:

1. **Role.** Each `role` entry, searched where the authorization layer declares
   it: a role or claim constant, a group mapping, an app-role manifest. This is
   the rung `role` exists for.
2. **Policy.** The authorization policies whose requirement that role or claim
   satisfies, and through them every endpoint, command handler, and screen
   guard they protect. A policy that admits two actors' roles resolves to both,
   and the chapter's rights are read per role.
3. **Client registration.** For a `technical` actor: the client registration in
   the identity configuration, the service account, the API key or certificate
   identity, and the scheduler job or inbound webhook registration that fires
   it, with the signature or credential check it passes.

Then the protocol's own rungs: the chapter's `aliases` — a policy name, a client
id, a job name — the building-block view, and the observed convention. A role
that two actor chapters both list is `unresolved`, never split between them.

## Mapping

| Chapter element | Evidence when capturing | What building it requires |
|---|---|---|
| Heading (the bare name) | The name the feature chapters and the screens use for whoever holds the role — never the role constant | An actor a person can name in business language |
| `type` | Who authenticates: an interactive sign-in is `user`; a client credential, a timer, or a signed callback with no person is `technical` | The identity issued the way the type says — a `user` reached through a shared service account is the wrong level |
| `role` | The role, claim, or group as the authorization layer spells it, found at its declaration | The role existing in the configuration, spelled exactly so |
| What it does | The actions the policies on its role guard, resolved to the feature chapters they implement | Each action reachable by this actor and refused to everyone the chapter does not name |
| What the model holds it to | The recorded submitter, audit field, or required reference the model writes for it | The model recording it where the chapter says |
| Which right, and its `## Rights` column | The policy on each action, and the authorization tests that assert who is admitted and who is refused | Each cell guarded as stated, and `—` refused |
| What it triggers (`technical`) | The job schedule, the callback route, the client's granted scopes, and the use case each invokes | The trigger registered, authenticated, and invoking the use case, with no scope beyond it |
| `related` | The feature chapters its actions live in; the dependency table for a `technical` actor | Those chapters present and resolving |

A role, policy, or client registration in code that no actor chapter holds is
the most useful finding this kind produces: either a who the context never
named, or a right granted to nobody. Report it rather than inventing an actor
around it. A guard that admits more than the chapter and its `## Rights` column
grant is a **conflict**, never `code-ahead`: capturing it would write a
privilege into the record on the strength of the code that leaked it.

## Capturing — `capture-specs`

Start from the authorization configuration. List every role, claim, group,
policy, client registration, scheduled job, and inbound callback in the
context's code, and follow each policy to the actions it guards. Mine the
tests: an authorization test that admits one role and refuses another is the
evidence for a `## Rights` cell, and an action with no such test is a finding.
Those tests are `integration` or `e2e` — a unit test of a policy class proves
the policy, not that the action is behind it.

Group roles into actors by who holds them, from the feature chapters and the
screens: one actor may hold several roles, and lists them. Decide `user` or
`technical` from how the identity is issued, never from the role's spelling.
Draft with `type`, `role` where there is one, and `related`;
write the four beats the folder rule's template asks for. The `## Rights`
matrix is the file's, not a unit's: a pass over one actor drafts that actor's
column, and adds the matrix only when the context has several actors and
several guarded actions. Do not write who the actor is in business language
from a role constant alone — where nothing names it, report it.

## Applying — `apply-change`

A new actor is an `addition`: the brief names the role or client to register,
the policies that admit it, and the actions each policy guards. A right granted
or withdrawn is a `change to existing behaviour` whose brief lists the guarded
sites. The **invariants** a brief drops first are the refusals: every action
outside the actor's column refused to its role, the role spelled exactly as
`role` gives it, and a `technical` client held to the scopes it triggers and
authenticated on every call. Write them out.

Ubiquitous language: the actor's name from the heading, the action names from
the feature chapters, the role as the code spells it. Out of scope: the
identity provider's own setup outside the repository, assigning people to
roles, the features the actor uses, and personas. Acceptance checks a test can
assert: a caller holding the role reaches each granted action; a caller without
it is refused; a `technical` client outside its scopes is refused; the job or
callback invokes the use case and an unauthenticated one is rejected.

## Verifying — `verify-change`

Read the authorization configuration and the authorization tests the chapter's
features name, as files. An actor is `aligned` when its role exists as spelled,
every guard on its column matches, and nothing admits it further. A wider grant
is `conflict` against the code, per the mapping above; a role in code no
chapter lists is reported beneath the table.

## Do not

- Do not capture an `organisation` as this kind, or root a unit on one.
- Do not head the chapter by its role, or write `role` as a reference.
- Do not decide `user` or `technical` from a role's spelling — decide it from
  how the identity is issued.
- Do not capture a grant wider than the chapter as stale chapter content.
- Do not restate a feature or a dependency contract in the actor chapter.
- Do not brief the identity provider's setup or the assignment of people.
- Do not invent an actor for a role nobody can name in business language —
  report it.
