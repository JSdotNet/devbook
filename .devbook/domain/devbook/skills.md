# Devbook

```meta
type: skills
related: [".devbook/domain/context-map.md#devbook"]
```

> Five skills: two that own the convention in a repository, and three that cross the
> boundary between a chapter and the code implementing it, each over five chapter kinds. None
> of them is a flow, and none runs a tool — this context ships the shape, the check and the
> sweep are [Devbook Derived](../devbook-derived/skills.md)'s, and the procedure for carrying
> a change belongs to the engine. A skill here says "run the check the repository's
> `AGENTS.md` names" and names no plugin.

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

## prose-check

```meta
type: feature
related: [".devbook/domain/devbook-derived/skills.md#check", ".devbook/domain/devbook/domain.md#chapter"]
```

The prose half beside `devbook-check`'s structural half: read every adopted folder and report
the sentence that says nothing a reader needs or names something the tree no longer has — a
stale name after a fold, a term defined twice, a hedge on a fact. It writes nothing. A chapter
is content, so the standard is narrower than an instruction tightening and a record stays as
it was taken: an edit is a person's, through the folder's flow.

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
