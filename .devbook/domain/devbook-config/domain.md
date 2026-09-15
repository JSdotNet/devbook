# Devbook Config

```meta
index: root
type: domain
related: [".devbook/domain/context-map.md#devbook-config", ".devbook/arc42/adr/23-the-guide-names-every-plugin-and-depends-on-none.md"]
```

What this context is responsible for: that a repository's stack configuration exists before
anything installs itself, that it can be moved forward in one run, and that every answer it gives
about the stack names the file it came from.

Inside the boundary: the four engine-owned keys of the stack config, the read-only report behind
every fact, the scope verdict that decides what an update touches, and the drift report against
the adoption record.

Outside it: every `components.<name>` stamp, which belongs to that component's own install skill;
the schema of the four keys, which is [Delivery](../delivery/domain.md)'s; and writing a chapter,
which is a flow's. This context names every plugin in the marketplace and declares none.

## Stack Report

```meta
type: aggregate
related: [".devbook/domain/devbook-config/domain.md#report"]
```

What is on disk, read and nothing else: the catalog in the working tree and in the host's clone,
the host's installed-plugin state, three settings layers merged nearest-last, the stack config
and every machine overlay layer, the devbook folders in both layouts, and the `skills/` folders of the
engine and the schedule plugin.

It is the aggregate because a fact here is only usable with its source attached. "Already latest"
is usually wrong because a clone is older than the catalog it is being compared to — so the
report prints both, and the commit behind each.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| Every fact names the file it came from, and every file that was absent is named too | report | untested |
| It reads and takes no network | report | untested |
| A plugin it names but cannot find is reported as not installed, never as an error | report | untested |
| An empty table is legible as "this file was absent", never as "there is nothing" | report | untested |
| The three scope inputs stay orthogonal — installed is per machine, enabled is per checkout, stamped is per repository | scope resolution | untested |

### Plugin Row

```meta
type: entity
```

One plugin as the report sees it: the newest published version, the version on disk, whether this
checkout enables it, its stamp if the repository has one, and the scope that follows. Identity is
the plugin name, which is also why a name is never reused after release.

### Fact Source

```meta
type: value-object
related: [".devbook/domain/devbook-config/domain.md#report"]
```

The path a fact was read from, carried with the fact. It is what makes an answer checkable rather
than authoritative, and it is why an absent file produces an empty row with a named source
instead of silence.

### Scope Verdict

```meta
type: enum
aliases: [reconcile, blocked, frozen, adoptable, available, out-of-scope]
```

What an update does with one component: `reconcile`, `blocked`, `frozen`, `adoptable`,
`available`, `out-of-scope`. It is derived from three orthogonal inputs — installed, enabled,
stamped — and never from a version comparison.

`blocked` is the one worth stating twice. A stamp is committed and shared while installed-ness is
personal and per-machine, so a component this machine lacks is skipped and **left stamped**:
dropping the entry would un-adopt it for everyone on the next commit.

## Engine Configuration

```meta
type: aggregate
related: [".devbook/domain/delivery/domain.md#stack-config", ".devbook/arc42/adr/10-one-config-file-two-kinds-of-key.md"]
```

The four keys this context writes into `.devbook/config.json` — `bindings`, `extensions`,
`policy`, `gates` — and nothing else in that file. The schema is
[Delivery](../delivery/domain.md#stack-config)'s and this context conforms to it; what this
context owns is the writing.

The boundary is by key and it is absolute. A `components.<name>` stamp is written by that
component's own install skill, which is the only thing that knows what it materialized — which is
also why `devbook:install` did not move here.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| Only the four engine keys are written here | `setup()`, `update()` | untested |
| No component's stamp is ever written or dropped by this context | `setup()`, `update()` | untested |
| The result validates against the engine's schema, which rejects an unknown key | validation | `unit:node:plugins/delivery/tools/stack-config/check.test.mjs` |
| Setup runs before any component installs itself, and hands each component its own install skill | `setup()` | untested |
| Model choice is never written: it is personal, so there is no repository-level override | `setup()` | untested |

### Machine Overlay

```meta
type: value-object
related: [".devbook/arc42/adr/70-the-overlay-has-three-layers-keyed-by-a-committed-id.md"]
```

An overlay merged over the committed file, holding what is true of this machine only. Three
layers, outermost first: the user's for every repository, the user's for the repository whose
committed `id` names it, and the checkout's own gitignored file. The first two live under the
user's devbook config directory and survive a fresh worktree; the last does not. Each may add
a gate and may never remove one — the same asymmetry the engine holds for configuration,
applied one layer down, at every layer — and none may carry the `id` that found it.

Every layer is absent by default, and none is private: nothing secret goes in any of them.

## Setup

```meta
type: domain-service
related: [".devbook/domain/devbook-config/domain.md#engine-key"]
```

Writes a repository's four engine keys for the first time, then invokes each component's own
install skill rather than reimplementing any of them.

Invocation semantics: command-invoked, and it is a conversation about intent — which roles, which
tracker, which providers, which gates. That is why it stays separate from [Update](#update): the
two answer *what should this repository use?* and *is what it uses current?*, and merging them
would put an interview in front of an operation people run to change nothing.

## Update

```meta
type: domain-service
related: [".devbook/domain/devbook-config/domain.md#scope-verdict"]
```

Moves the whole configured stack forward in one run: version drift, outstanding migrations, a
fan-out to every adopted component's own install skill, and a re-validated config.

Invocation semantics: command-invoked, and it changes nothing about intent. It fans out over the
[scope verdict](#scope-verdict) — running what it can, reporting what this machine has not
installed or this checkout has not enabled, and never dropping a stamp for either reason.

## Ask

```meta
type: domain-service
related: [".devbook/domain/devbook-config/domain.md#report"]
```

Answers one question about this marketplace from what is on disk: what devbook, the engine, the
extensions, the surfaces, and the fan-out lane are and how they fit; which version of each plugin
is installed against the newest published; which are enabled.

Invocation semantics: query-oriented, and it writes nothing. Its state half comes from the
[report](#stack-report) and its concept half from walking the canon — the plugin READMEs, this
folder's chapters, the arc42 chapters, and the engine's surface contract.

It is the only asset allowed to name every plugin, because it is the only one whose subject is
the marketplace rather than a unit of work.

## Adoption Drift

```meta
type: domain-service
aliases: [.ai drift]
```

Reports where the `.ai` adoption record no longer matches what is installed, enabled, and wired,
and hands every edit to the folder's own flow.

Invocation semantics: query-oriented, and it writes nothing at all — deliberately. The derivable
half of that folder goes stale on every upgrade and is exactly what the report already prints;
the other half rates whether people actually work that way, which no file on disk records. So a
status, an adoption line, or a piece of evidence is never derived from an install.

Reporting drift is inside this context's subject. Writing the chapter is not.

## Ubiquitous Language

```meta
type: ubiquitous-language
```

> The terms this context owns that are not chapters above. A term naming an aggregate, service,
> event, or field carries its aliases on that chapter instead. The kernel vocabulary — plugin,
> layer, stamp, migration — is defined once in [Plugin Authoring](../plugin-
> authoring/domain.md#ubiquitous-language)

> The stack config's four keys belong to [Delivery](../delivery/domain.md#stack-config).

### Engine Key

```meta
type: term
date: 2026-09-08
aliases: [bindings, extensions, policy, gates]
related: [".devbook/domain/devbook-config/domain.md#engine-configuration", ".devbook/arc42/adr/10-one-config-file-two-kinds-of-key.md"]
```

One of the four top-level keys of `.devbook/config.json` that the engine owns and this context
writes. Everything else in that file is a `components.<name>` stamp belonging to the component
that materialized it.

The word marks the boundary rather than the file: one file, two kinds of key, and nobody writes
another owner's.

### Report

```meta
type: term
date: 2026-09-08
aliases: [stack report, read-only report]
related: [".devbook/domain/devbook-config/domain.md#stack-report", ".devbook/domain/devbook-config/domain.md#fact-source"]
```

The read-only model behind every answer this context gives, printing the path behind each fact and
naming the files that were absent as well as the ones that were read.

Naming the source is what makes an answer checkable rather than authoritative, and it is why an
empty table here reads as *this file was not there* rather than as *there is nothing*.
