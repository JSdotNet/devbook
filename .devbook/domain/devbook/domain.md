# Devbook

```meta
index: root
type: domain
related: [".devbook/domain/context-map.md#devbook", ".devbook/arc42/adr/6-flat-devbook-folders-only.md"]
```

What this context is responsible for: that a chapter can be addressed, that the reference
pointing at it still resolves, and that a repository can adopt the convention, upgrade it, and
be told when the two have drifted apart.

Inside the boundary: the `meta` block and its field set, the address a chapter is reached by,
the annotation fence, the derived documents the check builds, the reconcile that materializes
the convention into a repository, and the two directions between a chapter and the code that implements it.

Outside it: what a chapter should *say*. The folder rules describe a shape, not content, and
the procedure for changing a chapter belongs to [Delivery](../delivery/domain.md). Who reviews
a chapter and who approved it belongs to
[Devbook Collaboration](../devbook-collaboration/domain.md).

## Chapter

```meta
type: aggregate
aliases: [section, heading, node]
```

The consistency boundary of this context, and the unit everything else is expressed in terms
of. A chapter is one heading that carries a `meta` block, together with the block and every
annotation anchored inside it. Its identity is its address — the file path plus the slug of its
heading — which is derived and never stored, so a heading rename is a re-identification and
every reference to the old address stops resolving in the same pass.

A chapter is not a file. One file holds many, and the file itself is a chapter too: the
top-level heading carries a block of its own describing the document as a whole.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| A heading is an addressable chapter if and only if it carries a `meta` fence | parse | `unit:node:plugins/devbook/tools/devbook-meta/status-optional.test.mjs`, `unit:node:plugins/devbook/tools/devbook-meta/schema-gate.test.mjs` |
| The fence stays even when the block is empty | parse | untested |
| Every file carries a file-level block under its top-level heading | parse | untested |
| `type` is present wherever the folder defines a value set for the level | parse | `unit:node:plugins/devbook/tools/devbook-meta/schema-gate.test.mjs` |
| A resting `status` is written by omitting the field, never as `active` | parse | `unit:node:plugins/devbook/tools/devbook-meta/status-optional.test.mjs` |
| `status: approved` carries both `approved-by` and `approved-at`, and neither outlives it | parse | untested |
| A chapter's kind lives in `type` and never in the heading text | parse | untested |
| Every `related` and `depends-on` entry resolves to an existing chapter or file | graph build | untested |
| Every `tests` entry parses as `<level>:<runner>:<selector>` | parse | `unit:node:plugins/devbook/tools/devbook-meta/tests-field.test.mjs` |
| An `ext.*` key is carried through untouched, unvalidated, and produces no edge | graph build | untested |
| An annotation's ordinal counts within its own heading and never reaches a subchapter's notes | parse, write | `unit:node:plugins/devbook/tools/devbook-meta/annotations-write.test.mjs` |
| A folder-specific field describes a chapter, so the file-level block carries none of them | parse | `unit:node:plugins/devbook/tools/devbook-meta/field-scope.test.mjs` |
| `.domain`'s `depends-on` and `feature-flag` sit on a `feature` or `sub-feature`; `aliases` sits on any chapter that is also a term | parse | `unit:node:plugins/devbook/tools/devbook-meta/field-scope.test.mjs` |
| An `approved` chapter never carries an open `kind: question` fence — the open question outranks the rung | parse | `unit:node:plugins/devbook/tools/devbook-meta/field-scope.test.mjs` |
| `.ai`'s `stage` is omitted inside a stage file, where the file already says it | parse | `unit:node:plugins/devbook/tools/devbook-meta/field-scope.test.mjs` |

### Meta Block

```meta
type: value-object
aliases: [meta fence, metadata block]
```

The fenced `meta` (YAML) block under a heading: flat keys, no nesting, and equal by value. It
is what turns a heading into a node, so deleting it as noise silently drops the chapter out of
the graph and out of every reference pointing at it.

The field set is closed except for one seam. `status`, `type`, `related`, `issue`, `effort`,
`roadmap`, `date`, `tests`, `approved-by`, `approved-at`, `number`, and `index` are devbook's,
each with a documented meaning per folder; `ext.<plugin>.<key>` belongs to whoever namespaced
it. Empty collections and nulls are omitted rather than written out, so absence has exactly one
spelling.

### Annotation

```meta
type: entity
aliases: [note, comment, thread]
```

A review note living in the chapter, in a second fenced block, beside the passage it is about.
It has identity within its chapter — an index, an author, a body, and replies — and it inherits
position as its anchor, git as its sync, the pull request as its review, and `git blame` as its
authorship record.

Its address is scoped to its own heading, not to the chapter's line range: the index counts
only the notes under that heading, so a note under a subheading belongs to the subchapter and a
parent's index never reaches it. Every operation that reads or writes a note counts the same
way, because an index that means one thing to a reader and another to a writer resolves to the
wrong note.

An annotation is an open loop rather than a record: resolving one means deleting it. It is
never chapter content, so a reader loading a chapter as task context skips every fence, and a
chapter carrying an open question is not agreed whatever its `status` says.

### Chapter Status

```meta
type: enum
```

Where the content stands. Each folder defines its own ladder — `.domain` uses `draft`,
`proposed`, `active`, `deprecated` — and one shared rung, `approved`, sits on top of all of
them. Three folders have a resting value written by omitting the field; two make the field
mandatory because there the value is a rating, and unrated is not the same as the lowest rung.

### Chapter Type

```meta
type: enum
```

What kind of thing the chapter is: the classification that is never written into the heading.
Three folders define a value set, at chapter level and at file level separately; `.arc42` and
`.design` deliberately define none, because their only kind distinction is already carried by
heading level.

## Devbook Folder

```meta
type: aggregate
related: [".devbook/domain/plugin-authoring/domain.md#devbook-folder", ".devbook/arc42/adr/6-flat-devbook-folders-only.md"]
```

One of the five folders the convention governs, and the unit of adoption: a repository takes a
subset, and the tooling builds one scope per folder that actually exists. The reading order of
the files inside it comes from each folder's convention rather than from a stored field.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| A repository uses one layout for every folder and never mixes them | layout detection | `unit:node:plugins/devbook/tools/devbook-meta/nested-layout.test.mjs` |
| A nested folder drops the leading dot — `.devbook/.domain` resolves to nothing | layout detection | `unit:node:plugins/devbook/tools/devbook-meta/nested-layout.test.mjs` |
| An address is the chapter's real repository path under either layout | graph build | `unit:node:plugins/devbook/tools/devbook-meta/nested-layout.test.mjs` |
| A repository containing both layouts is an error, not a preference | layout detection | untested |
| Dropping a folder from `adopted` orphans its materialized files rather than deleting them | reconcile | untested |

### Folder Layout

```meta
type: value-object
```

Flat or nested, and nothing else: the five folders at the repository root, or the same five
under one `.devbook/` parent with the leading dot dropped. The value is detected rather than
declared, and it changes no other rule.

### Folder Kind

```meta
type: enum
```

`arc42`, `domain`, `tech`, `design`, `ai`. The kind decides which rule file governs the folder,
which `status` ladder applies, and which `type` value set is legal — which is why it is a closed
set and adding a sixth is a contract change rather than a folder.

## Reference Graph

```meta
type: aggregate
aliases: [graph]
related: [".devbook/arc42/adr/76-derived-artifacts-are-computed-never-committed.md"]
```

Every chapter as a node and every `related` / `depends-on` entry as an edge, derived by walking
the corpus and owned by nobody who writes prose. It is the answer to *what points at this*,
which no single chapter can hold, and it is the reason a reference is a first-class field
rather than a Markdown link.

The graph is derived, never authored, and never committed: it is built in memory wherever it
is read — by the check, by the canvas, by a viewer — so it can neither go stale nor conflict
on merge.

### Invariants

| Rule | Enforced at | Evidence |
|---|---|---|
| One node per heading that carries a `meta` fence, and none per heading without one | graph build | untested |
| An edge exists only where a reference field resolves; an unresolved one is an error, not a dangling edge | graph build | untested |
| Two headings that slugify identically claim one anchor: the first keeps it, the later one is dropped, and the collision is an error where either is a chapter | graph build | `unit:node:plugins/devbook/tools/devbook-meta/anchor-collision.test.mjs` |
| `roadmap`, `aliases`, `alternatives`, `tests`, and `ext.*` stay node attributes and produce no edge | graph build | `unit:node:plugins/devbook/tools/devbook-meta/tests-field.test.mjs` |
| Output is deterministic — no timestamps — so two builds over one commit agree byte for byte | document build | untested |
| Nothing writes the graph to disk | `build.mjs` | untested — the CLI has no write path |

### Graph Node

```meta
type: entity
```

One chapter or file, identified by its address, carrying the parsed block, the composed label,
and the folder it belongs to. The label composes the heading with the `type` where that adds
something — `Order Platform (context-map)` — so the kind stays visible in a graph drawn from
several repositories at once.

### Graph Edge

```meta
type: value-object
```

A directed pair of addresses plus which field produced it. Equal by value, and carrying no
state of its own: an edge is a restatement of a field in some chapter's block, so it is rebuilt
rather than maintained.

## Reconciler

```meta
type: domain-service
related: [".devbook/domain/devbook/domain.md#reconcile", ".devbook/arc42/adr/38-an-install-is-not-a-sync.md", ".devbook/arc42/adr/39-every-install-skill-is-called-install.md"]
```

Brings a repository level with the installed release, in six phases — detect, resolve, plan,
migrate, materialize, stamp and verify. First install, a plugin upgrade, a change in which
folders are adopted, and an outstanding migration are one idempotent operation, and the stamp
says which of the four this run is.

Invocation semantics: command-invoked, by `devbook:install`. Its check-only half writes nothing
and asks the same three questions — does the Markdown satisfy the schema, is the ledger
current, does the stamp still describe what is on disk — then hands every write back, because
one writer is what makes re-running safe.

It coordinates the [Devbook Folder](#devbook-folder) aggregate and the component stamp, and it
is the only thing in this context that touches a file outside a devbook folder: the rule
wrappers each host reads, the CI workflow templates, and devbook's own marker-fenced section of
`AGENTS.md`.

## Index Generator

```meta
type: domain-service
related: [".devbook/domain/devbook/domain.md#derived-document"]
```

Walks the corpus once and projects it per scope, building the reference graph, the outline, and
the annotation index for the repository and for each adopted folder, in memory and on demand.
It writes no file, and it is the only thing that decides whether a problem is an error or a
warning: an
unresolved reference fails, a heading with no block is reported and tolerated. Every
per-block rule reaches the gate through the schema validator the graph build calls per file
(`unit:node:plugins/devbook/tools/devbook-meta/schema-gate.test.mjs`).

Invocation semantics: command-invoked, and scheduled — `--check` runs in CI on every pull
request and the daily `devbook-check` schedule opens a pull request when the output moved.

## Spec Converter

```meta
type: domain-service
related: [".devbook/domain/devbook/domain.md#drift-verdict", ".devbook/domain/devbook/skills.md#sync-specs", ".devbook/arc42/adr/69-the-converters-are-three-skills-named-after-openspec.md"]
```

The two directions between a chapter and the code that implements it, plus the check that
says which one a chapter needs, as three skills over five kinds: `sync-specs` reads an
implementation and writes the chapter, `apply-change` reads an agreed chapter and turns it into
a change brief for the flow that implements it, touching no source or test tree itself, and
`verify-change` reports the drift verdict and writes nothing. The names are OpenSpec's verbs for
the same moves, one of them approximate — debt record 6 holds the exact one.

Invocation semantics: command-invoked, one skill and one kind per run. The kind is the
chapter's `type`, or the file where the folder defines none, and everything a kind needs lives
once in its own file rather than in a skill per kind and direction. The aggregate is the unit
rather than its parts, because a consistency boundary decided twice is a boundary decided
differently; a domain service is the deliberate exception and is its own kind.

Counterpart resolution uses **no metadata field** linking a chapter to a code path — a path in
a block rots on the first refactor and gives no signal when it does. It resolves through
`domain.md` aliases, then the building-block view, then the observed naming convention, and
reports `unresolved` rather than guessing.

## Shared Value Objects

```meta
type: shared-value-objects
```

> Value objects used by more than one aggregate in this context.

### Chapter Address

```meta
type: value-object
aliases: [reference, anchor, path#slug]
```

`<path>#<heading-slug>` for a chapter, or the bare `<path>` for a file: the repository-relative
path plus a GitHub-style slug of the heading text. It is exactly what renders as the heading's
link target, which is why it stays correct in any Markdown viewer and never has to be kept in
sync by hand. "Exactly" includes letters and digits outside ASCII: `## Café Ordering` addresses
as `café-ordering`, because an ASCII-only slug would agree with nothing the reader can click.

Equal by value and derived from the content, so it is a re-identification rather than a rename
when the heading changes. That is the cost the convention accepts in exchange for having no
stored ids to reconcile.

Because nothing is assigned, two headings in one file that slugify identically claim one
address. The **first** keeps it — the one GitHub leaves unsuffixed — and the later one is
dropped rather than overwriting it; last-writer-wins would silently move an address. A heading
carrying no `meta` block claims its anchor the same way, so the rule is about headings, not
about chapters.

The graph reports the collision where a chapter is on either side of it, because a chapter that
cannot be addressed is a chapter that has left the graph. Two structural headings sharing an
anchor is not reported: it is the ordinary shape of a chapter file, where every aggregate
carries its own `### Invariants`, and such a heading is only ever materialized when something
cites it.

### Test Reference

```meta
type: value-object
aliases: [tests entry, test link]
```

`<level>:<runner>:<selector>`, where only the first two colons delimit — a selector routinely
carries its own. It means *this test asserts what this chapter claims*, never "this is roughly
the area of code involved".

Admissible where a code path is not, for one reason: it is executable. An entry that stops
resolving fails a run, out loud, in the same CI that runs the suite. A runner outside the known
table is a warning rather than an error — the pairing still holds, only the run command is
lost.

## Ubiquitous Language

```meta
type: ubiquitous-language
```

> The terms this context owns that are not chapters above. A term naming an aggregate, service,
> event, or field carries its aliases on that chapter instead. The kernel vocabulary — plugin,
> layer, stamp, migration, host — is defined once in [Plugin Authoring](../plugin-
> authoring/domain.md#ubiquitous-language).

### Derived Document

```meta
type: term
date: 2026-09-08
aliases: [derived index, generated index, build output]
related: [".devbook/domain/devbook/domain.md#index-generator", ".devbook/arc42/adr/76-derived-artifacts-are-computed-never-committed.md"]
```

One of the three documents the generator builds from the chapters — the graph, the reading
order, and the annotation index — deterministic, so two builds over one commit agree.

None is ever written to disk or committed. A reader that wants one builds it: the check and
the canvas import the modules, a viewer that cannot reads `build.mjs --print`. There is
nothing to refresh, nothing to go stale, and nothing for two branches to conflict on.

### Adoption

```meta
type: term
date: 2026-09-08
aliases: [adopted folders, scope]
related: [".devbook/domain/devbook/domain.md#devbook-folder", ".devbook/domain/plugin-authoring/domain.md#devbook-folder"]
```

Which of the five folders a repository has taken on, and in which layout. It is partial by
design: the tooling emits scopes for the folders that exist, so a folder nobody adopted has no
index, no rule firing, and no line in a report.

Adoption is the convention's own install and never a flow's job — a folder flow in a repository
that has not adopted the folder stops and says so.

### Reconcile

```meta
type: term
date: 2026-09-08
aliases: [install, upgrade, sync]
related: [".devbook/domain/devbook/domain.md#reconciler", ".devbook/arc42/adr/38-an-install-is-not-a-sync.md"]
```

Bringing a repository level with the installed release in one idempotent operation covering
first install, upgrade, a change of adopted folders, and an outstanding migration.

*Sync* is the word to avoid: it suggests two sides converging, and this one only ever moves the
repository toward the release, reporting what a person has customized rather than restoring it.

### Drift Verdict

```meta
type: term
date: 2026-09-08
aliases: [aligned, code-ahead, spec-ahead, conflict, unresolved]
related: [".devbook/domain/devbook/domain.md#spec-converter", ".devbook/domain/devbook/flow.md"]
```

Where a chapter and its implementation stand relative to each other, in five values. `aligned`
reports and stops, `code-ahead` and `spec-ahead` say which side moves, and `conflict` and
`unresolved` both stop and ask — never guess.

The verdict is what makes the two converter directions one subject rather than two. It is
established before anything is written, from source and tests alone.
