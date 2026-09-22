# Kind: setting

What `sync-specs`, `apply-change`, and `verify-change` need to know about a
feature flag or a setting that `assets/code-sync-protocol.md` does not already
say. The protocol carries the resolution ladder, the evidence rules, the five
verdicts, the status rules, the brief contract, and the report table; this file
carries the kind.

| | |
|---|---|
| Chapters | A `##` chapter in `context.md`, `type: feature-flag` or `type: setting` |
| File | `.devbook/domain/<context>/context.md` |
| Folder rule | `devbook-domain.md`, with `devbook-chapter-metadata.md` |
| Context to load | The target context's `context.md`, and the `features.md` or `skills.md` chapters that point at the switch through `feature-flag` or `setting`; when applying, the code those feature chapters resolve to |
| Write path | The `domain/` flow, per **Where the spec-side write goes** in the protocol |
| Index scope | `--scope domain` |
| Extra input | Where the repository keeps its flag catalog and its configuration — a flag provider, an options class, a settings table, an environment file — since the key is resolved there and never guessed |

## Two types, one kind

A `feature-flag` is decided at release, from configuration: the team turns it
on for an environment, a ring, or everyone, and retires it when the capability
is simply there. A `setting` is a value a person chooses at runtime — a user
for themselves, an administrator for a tenant, an operator for the system —
which is what its `scope` records; whether the value turns a capability on or
shapes how it behaves is the value's business, not a third type. The same kind
covers both because the evidence is the same: a key the code reads, and the
branch it takes on each value. What differs is who holds the key, and that is
a field, not a second procedure.

`domain/` folder rules that apply:

- **The heading is the name, `key` is the identifier.** A chapter headed by
  its key has captured the wrong thing; the key is the field, in business
  language above it.
- **`key` is a single plain string.** Never a reference, never a list — one
  chapter per switch, and a capability delivered by two flags is two chapters
  the feature points at.
- **`default` is `on` or `off` on a flag** and the shipped value on a setting.
  `scope` is `user`, `tenant`, or `system` on a setting and absent on a flag.
- **`status` is `draft`, `proposed`, `active` (by omission), or `deprecated`**,
  plus `domain/`'s two decision rungs, `approved` and `accepted` above it. A
  retired flag is `deprecated` until the chapter is removed with its last
  reference.
- **Identity, never status.** The switch's rollout or value says nothing about
  the chapter's `status`, and the reverse.

## Mapping

| Chapter element | Evidence when capturing | What building it requires |
|---|---|---|
| Heading (the bare name) | The capability the switch delivers, in business language, reconciled with the feature chapter that points at it — never the key | A switch a user or an operator can name |
| `key` | The identifier as the code spells it, found where it is read: the flag check, the options binding, the settings lookup | The key existing in the catalog or the configuration schema, spelled exactly so |
| `type` | Where the value comes from: configuration read at startup or from a flag provider is `feature-flag`; a value a person changes through the product is `setting`, an on/off one included | The value read from the level the type names — a `setting` bound to an environment variable is the wrong level |
| `default` | The value the code takes when the key is absent: the fallback in the read, the seed in the settings table | The fallback in code matching the chapter |
| `scope` | Who the code lets change it: the user record, the tenant record, a system-wide store | The change path guarded at that scope, and no wider |
| What each value does | The branches the read selects, walked end to end: what is reachable, what is hidden, what behaves differently | Each value producing the behaviour the chapter states — check the branches and their tests |
| Owner and retirement (flag) | Only what the catalog or the code states; otherwise an open question, never an invented owner | — |
| `related` | The feature chapters that point back through `feature-flag` or `setting` | Those chapters present, and their `feature-flag` or `setting` resolving here |

A key read in code with no chapter is the most useful finding this kind
produces: a switch nobody can name in business language is either a capability
`features.md` does not list or a leftover the code should lose. Report it
rather than inventing a chapter around it.

## Capturing — `sync-specs`

Start from the reads. Find every flag check and configuration read in the
context's code, resolve each to its key and its fallback, and follow each
branch to what it changes. Mine the tests: one asserting behaviour under each
value is the evidence for the "what each value does" prose, and its absence on
a branch is a finding. Decide `feature-flag` or `setting` from where the value
is stored and who writes it, never from the key's name. A key that is read but
never written from the product is a flag, however it is spelled.

Reconcile the heading with the feature chapter that already describes the
capability — usually it exists, and the switch takes its name. Then propose
the feature side: `feature-flag` or `setting` on that chapter, pointing here.
Draft with `status: draft`, `type`, `key`, and `default`; `scope` on a
setting; `related` to the feature chapters. Do not write an owner or a
retirement condition the catalog does not state.

## Applying — `apply-change`

A new switch is an `addition` — the key does not exist yet — and the brief
names the level: registered with the flag provider or added to the
configuration schema for a `feature-flag`, added to the settings model with its
change path for a `setting`. The **invariants** are the ones a brief drops
first: the fallback matching `default`, the change path guarded at `scope`, and
every branch behaving as the chapter says under each value. Write them out.
Turning a flag on is not a change to this chapter and gets no brief; it is a
release decision. Retiring a flag is a `change to existing behaviour` whose
brief removes the read, keeps the `on` branch, and drops the chapter's last
reference.

Ubiquitous language: the switch's name from the heading, the capability's name
from the feature chapter, the key as the code spells it. Out of scope: the
capability the switch delivers, which is the feature's brief; the rollout
itself; the catalog tooling. Acceptance checks a test can assert: the key is
read at the level the type names, the fallback is `default`, each value
produces the stated behaviour, the change path refuses a caller outside
`scope`.

## Do not

- Do not head the chapter by its key, or write the key as a list or a
  reference.
- Do not decide `feature-flag` or `setting` from the key's spelling — decide
  it from where the value is stored and who writes it.
- Do not invent an owner, a rollout plan, or a retirement date.
- Do not infer `status` from the switch's rollout, or the reverse.
- Do not brief a rollout, or the capability the switch delivers.
- Do not write a switch chapter for a key nobody can name in business
  language — report it.
