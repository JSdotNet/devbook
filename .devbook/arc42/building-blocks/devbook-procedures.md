# devbook-procedures

```meta
related: [".devbook/arc42/building-blocks/README.md", ".devbook/arc42/building-blocks/devbook.md#dependencies", ".devbook/arc42/adr/plugin-boundaries.md", ".devbook/arc42/adr/install.md"]
```

Responsible for one thing: that a repository has, by name, the five procedures every
repository has and no plugin can write — `start`, how its application comes up; `show`, how
the feature being built is put in front of a reviewer; `capture`, how evidence is taken;
`debug`, how a cause is found inside the running application — and that each one's goal reads
the same in every repository while how it is done never does.

Inside the block: the five seeds and their goals, the wrapper per host that carries a goal, the
`init` that puts them in a repository and records which were adopted, and the rule that a
body is the repository's from its first edit.

Outside it: everything a procedure is *for*. The engine's Validation phase says what it does
with evidence and when capture is required; a session that wants a demo invokes `show`; none
of that is this block's. It owns no flow, no gate, and no state beyond its stamp.

## Interfaces

```meta
related: [".devbook/arc42/building-blocks/devbook.md#interfaces", ".devbook/arc42/08-crosscutting-concepts.md#published-languages"]
```

Two skills: `init`, which puts the adopted procedures and their wrappers in place, and `update`, which keeps them current. The five
procedures themselves are the repository's skills once they land, and this block runs none of
them.

| Interface | Kind | Reached by |
| --- | --- | --- |
| `init` | skill | A person, or `devbook-config:init` during setup and a fan-out |
| `update` | skill | A person, or `devbook-config:update` during a fan-out |
| `start`, `show`, `capture`, `debug`, `estimate` | seeds under `assets/skills/`, each with a `goal` | Materialized into `.agents/skills/<name>.md` with a wrapper per host; then any session, either host, by name |
| `SessionStart` | hook pair | Either host, at session start |

### init and update

```meta
related: [".devbook/arc42/building-blocks/devbook-procedures.md#dependencies", ".devbook/arc42/building-blocks/devbook-procedures.md#procedure", ".devbook/arc42/building-blocks/devbook.md#update"]
```

`init` materializes `.agents/skills/<name>.md` and a wrapper per host for every name the
user adopts, then stamps `components.devbook-procedures`; it refuses where that stamp exists.
`update` takes the list from the stamp's `adopted`, refreshes, and re-stamps; it refuses where
no stamp exists. Payload-only: hash-matching is its whole migration mechanism, per
devbook's reconcile protocol. A present body this component never stamped — a `start` an
earlier engine seeded — is asked about once and kept as the repository's own or replaced; a
wrapper is replaced without asking. A name dropped from `adopted` orphans its three files,
reported and never deleted.

## Structure

```meta
related: [".devbook/arc42/adr/install.md", ".devbook/arc42/08-crosscutting-concepts.md#plugin-rule"]
```

### Procedure

```meta
related: [".devbook/arc42/building-blocks/devbook-procedures.md#goal", ".devbook/arc42/building-blocks/devbook-procedures.md#init-and-update", ".devbook/arc42/08-crosscutting-concepts.md#plugin-rule"]
```

Also called: procedure skill, repository skill, seeded skill.

One of five named things a repository knows how to do and a plugin cannot: `start`, `show`,
`capture`, `debug`. In a repository it is three files — the body at
`.agents/skills/<name>.md`, and a wrapper per host at `.claude/skills/<name>/SKILL.md` and
`.github/skills/<name>/SKILL.md` — and one stamp entry per file under
`components.devbook-procedures.materialized`. The body is seeded once and is the repository's
from its first edit: a hash matching no shipped release marks it `managed: false`, reported on
every reconcile and never overwritten. The wrappers stay managed. A name in the stamp's
`adopted` list is a procedure the repository has; one dropped from the list orphans its three
files, reported and never deleted.

`show` is the one procedure that names two others: it invokes `start` and `capture` by name
and stops when either is absent. None is a dependency of anything.

| Invariant | Enforced at | Evidence |
| --- | --- | --- |
| A procedure is three files — the body and one wrapper per host — with one stamp entry each | `init`, `update` | untested |
| A body whose hash matches no shipped release is marked `managed: false`, reported on every reconcile and never overwritten | `init`, `update` | untested |
| The wrappers stay managed whatever the body's state | `init`, `update` | untested |
| A name dropped from `adopted` orphans its three files, reported and never deleted | `init`, `update` | untested |
| `show` invokes `start` and `capture` by name and stops when either is absent | the `show` seed | untested |

### Goal

```meta
related: [".devbook/arc42/building-blocks/devbook-procedures.md#procedure", ".devbook/arc42/08-crosscutting-concepts.md#published-languages"]
```

The one sentence a procedure must satisfy whatever its body says: what a caller gets back.
`start` leaves the application running and reports the command, the health verdict, and the
entry points; `show` puts the branch's feature in front of a reviewer with evidence cited by
path; `capture` returns one file per checkpoint and per failure, under the worktree root, the
form named honestly; `debug` names a cause and proves it, doing the debugging itself and
leaving nothing behind; `estimate` returns story points off 1/2/3/5/8/13/21 per unit of work,
sized against the repository's own finished work and naming the reference compared with, so
that a pace measured in points means the same across plans. It is the `goal` field of the
plugin's seed, rendered into both wrappers above the pointer, and refreshed on every upgrade.
A repository edits the body to meet it and never edits it.

| Invariant | Enforced at | Evidence |
| --- | --- | --- |
| Every seed carries a `goal`, rendered into both wrappers above the pointer | `init`, `update` | untested |
| A goal is refreshed on every upgrade, so a repository meets it by editing the body and never the goal | `init`, `update` | untested |

## Dependencies

```meta
related: [".devbook/arc42/building-blocks/devbook.md#dependencies", ".devbook/arc42/08-crosscutting-concepts.md#layer"]
```

An L1 extension: exactly one declared dependency, on the convention whose reconcile protocol
it follows.

### Outbound

```meta
```

| Depends on | Pattern | Mechanism | Contract | Why |
| --- | --- | --- | --- | --- |
| [devbook](devbook.md#dependencies) | Customer-Supplier, declared `devbook >=1.0.0 <2.0.0` | Follows `assets/reconcile-protocol.md` — the stamp's two shared fields, the hash rules, the plan-before-write phase — and stamps `components.devbook-procedures` | The protocol's **The stamp** section | It copies files and records hashes exactly the way devbook's rules land, and invents no second way. |
| [The plugin kernel](../08-crosscutting-concepts.md) | Shared Kernel | Plugin folder, two manifests, the seeds under `assets/skills/`, the stamp | [Chapter 8](../08-crosscutting-concepts.md) | It is packaged, installed, and stamped like every other plugin here. |
| Claude Code and Copilot Plugin APIs | Conformist | Manifests, the `init` and `update` skills, the hook pair, and the skill wrappers they write | Each host's own skill schema | A skill is reached by name only through a folder the host scans, which is what the wrapper is for. |
| A consuming repository | Customer-Supplier, this block supplying | `devbook-procedures:init` materializes `.agents/skills/<name>.md` and a wrapper per host for each adopted name; `components.devbook-procedures` records `adopted` and every hash | The seed's `goal`, rendered into the wrapper | The body is the repository's from its first edit; only the goal is refreshed. |

### Inbound

```meta
```

| Consumer | Pattern | Mechanism | Contract | What it relies on |
| --- | --- | --- | --- | --- |
| [delivery](delivery.md#dependencies) | Separate Ways | Names `start` at its `app.start` point and `capture` inside Validation, and reads `.agents/skills/<name>.md` when the flow-runner finds it | The skill names and the path — never this plugin | Nothing: a repository may hand-write both, and a flow that finds one absent does without and says so. |
| [devbook-config](devbook-config.md#dependencies) | Conformist, read-only | Reads `components.devbook-procedures`, invokes `init` during setup and `update` during a fan-out, and answers its adoption question from the engine keys it just wrote | The stamp shape and the install skill's name | That the stamp exists and keeps its shape; it writes none of it. |
| Any session, either host | Conformist | Invokes `start`, `show`, `capture`, `debug`, or `estimate` by name | The goal in the wrapper | That the goal holds whatever the body says. |

**The goal is the seam.** Every procedure's body differs per repository; the one sentence that
does not is what a caller may rely on, and it lives in the file the plugin keeps rewriting
rather than the one the repository owns.

**Nothing below names this block.** The engine names two skill names and a path; a repository
that never enables this plugin and writes both by hand is indistinguishable to it. That is
what lets this block sit over `devbook` without the engine following it.
