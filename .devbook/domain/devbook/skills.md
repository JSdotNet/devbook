# Devbook

```meta
type: skills
related: [".devbook/domain/context-map.md#devbook"]
```

> Eight skills: five that own the convention in a repository, and three that cross the
> boundary between a chapter and the code implementing it, each over five chapter kinds. None of them is a flow — this context
> ships the shape and the check, and the procedure for carrying a change belongs to the engine.

## install

```meta
type: feature
related: [".devbook/domain/devbook/domain.md#reconciler", ".devbook/domain/devbook/flow.md"]
```

Bring a repository level with the installed release in one idempotent operation: detect, resolve,
plan, migrate, materialize, stamp and verify. First install, an upgrade, a change in which folders
are adopted, and an outstanding migration are the same run, and the stamp says which.

It is the only writer of everything it materializes — the rules and their per-host wrappers, the CI
workflows, the tooling, and one marker-fenced section of the repository's agent instructions.

### Leave a Customized File Alone

```meta
type: sub-feature
```

A materialized file that changed underneath is reported and left, never overwritten. An edit inside
a marker-fenced section makes the next reconcile skip the section, which is what the markers exist
for.

## devbook-check

```meta
type: feature
related: [".devbook/domain/devbook/domain.md#reconciler", ".devbook/domain/devbook/domain.md#index-generator"]
```

The check-only half of the same protocol. It asks the same three questions — does the Markdown
satisfy the schema, is the migration ledger current, does the stamp still describe what is on disk
— then repairs what it can prove and hands every other write back.

Two writers for one file is how a reconcile stops being idempotent, which is why this half is
deliberately narrow.

## devbook-tech-update

```meta
type: feature
related: [".devbook/domain/delivery/skills.md#flow-spec"]
```

Refresh a repository's technology graph from deterministic package inventories, then analyse the
repository for what appears in no package manifest — runtimes, services, platforms, protocols,
tooling — and hand the authoring to the folder's own write path.

## prose-check

```meta
type: feature
related: [".devbook/domain/devbook/skills.md#devbook-check", ".devbook/domain/devbook/domain.md#chapter"]
```

The prose half beside `devbook-check`'s structural half: read every adopted folder and report
the sentence that says nothing a reader needs or names something the tree no longer has — a
stale name after a fold, a term defined twice, a hedge on a fact. It writes nothing. A chapter
is content, so the standard is narrower than an instruction tightening and a record stays as
it was taken: an edit is a person's, through the folder's flow.

## annotation-sweep

```meta
type: feature
related: [".devbook/domain/devbook/domain.md#annotation", ".devbook/arc42/adr/60-the-annotation-lifecycle-ends-in-devbook.md"]
```

Delete every resolved annotation fence in one chapter and nothing else — the last step of the
lifecycle, where `resolved` lives only the rest of the branch and gone is the resting state.
Chapter-scoped, so a person sees what is about to go before it does.

## sync-specs

```meta
type: feature
related: [".devbook/domain/devbook/domain.md#spec-converter", ".devbook/domain/devbook/flow.md", ".devbook/arc42/adr/69-the-converters-are-three-skills-named-after-openspec.md"]
```

Read an implementation and its unit tests and write the chapter that was missing, thin, or
stale, for any of the five kinds. The kind is the chapter's `type`, or the file where the folder
defines none, and what a kind needs is read from its own file rather than carried in the skill.

The aggregate is the unit and not its parts: a consistency boundary decided twice is a boundary
decided differently. A domain service is the deliberate exception — defined by coordinating
across boundaries rather than living in one, it is its own kind and owns the events it raises.

### Run the Application for a Feature

```meta
type: sub-feature
```

`features.md` is the one chapter written from the user's point of view, so the feature kind is
the one capture that **runs the application**. Reading a controller tells you a route exists;
using the feature tells you what the product lets someone do, in what order, with what wording.
Screenshots are report evidence and are never committed into a devbook folder.

## apply-change

```meta
type: feature
related: [".devbook/domain/devbook/domain.md#spec-converter", ".devbook/arc42/adr/69-the-converters-are-three-skills-named-after-openspec.md"]
```

Turn an agreed but unbuilt chapter of any of the five kinds into a change brief — outcomes,
invariants, ubiquitous language, out of scope, acceptance checks — plus a change category, and
hand it to the flow that implements a change of that category, resolved the way the spec-side
write is: a repo-native flow first, then the engine's, and nowhere when no engine is installed,
where it stops with the brief. It never edits a source or test tree itself.

### Read Code Without Changing It

```meta
type: sub-feature
related: [".devbook/domain/devbook/domain.md#drift-verdict"]
```

Establishing what already exists is what lets the brief ask only for the delta, and it is how
the change category is decided: new functionality, a change to existing behaviour, or a defect.

## verify-change

```meta
type: feature
related: [".devbook/domain/devbook/domain.md#drift-verdict", ".devbook/arc42/adr/69-the-converters-are-three-skills-named-after-openspec.md"]
```

Report the drift verdict per chapter and write nothing — no chapter, no brief, no status. The
report's action column names which of the other two a verdict calls for. It is the step both of
the others take before they write, offered on its own for the question "is this chapter still
true".
