---
name: flow-domain
description: 'Run any change to .domain/ — the context map, or a bounded context''s domain model, features, model and flow diagrams, dependencies, and naming. Use for a new aggregate or domain service, a changed invariant, a feature breakdown, a cross-context dependency, a term or alias, or scaffolding a new bounded context. Routes modeling to the `domain` role under the repository''s own domain instruction files. DO NOT USE FOR: a field, entity, or method inside an existing aggregate that leaves the documented model unchanged (flow-feature), or the architecture decision behind a context boundary (flow-arc42).'
---

# Flow: Domain Model (`.domain/`)

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`. What a chapter must look like is
the repository's rule, not this flow's: the instruction files that govern the target path and
the check the repository ships own structure, metadata, templates, and status. This flow
restates none of them.

## Input Expectations

- Target scope: the context map, or one bounded context and which of its files are in scope.
- Change goal, and whether it is new scaffolding or a refinement of an existing context.

If either is not stated, derive it in Stage 1 from the request and the folder's contents, and
continue.

## Stage 1: Context Loading

- Confirm the repository keeps `.domain/`, at the root or under `.devbook/`. If it does not,
  stop and say so: adopting a folder is the devbook convention's own install, never a flow's.
- Load the instruction files that govern the target path, task-scoped. Load only the context's
  files in scope plus the context map, never the whole folder.
- Note the cross-references and aliases elsewhere that the change may have to update.
- State the derived scope and goal before continuing.

**Agents:** none

## Stage 2: Domain Modeling

- Hand off to the `domain` role. Fallback: model inline under the same instruction files.
- Record every aggregate rule in its invariants table with the point that enforces it. A rule
  the session cannot settle stays as an open row carrying the question: never answer for the
  domain expert, and never drop it to make the table look finished.
- Keep the model diagram structural and the flow diagram lifecycle-oriented; never mix them.
- Name every cross-context relationship with its DDD pattern.

**Agents:** the `domain` role

## Stage 3: Check & Review

- Every touched chapter and file carries the `meta` block its instruction file requires. Never
  write the `approved` rung: that is a person's decision at a gate, not an author's.
- Aliases still resolve to their canonical chapter; every `depends-on` resolves.
- Update every reference elsewhere when a heading or file was renamed or moved.
- Run `node .devbook/_tools/devbook-meta/build.mjs --check` when the repository ships it, and
  fix what it reports here. Never regenerate `_meta/` in this run: the refresh is the
  repository's own path.
- Summarize the changed chapters for the user.

**Agents:** the `domain` role

## Final Phases (Shared)

Documentation/config tier of `resources/flow-phases.md`, in order: Personal
Validation → Create Pull Request → Work Item Update → Summary. That file defines them; change
them there, for every flow.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-domain"` and stages: Context Loading, Domain Modeling,
  Check & Review, Personal Validation, Create Pull Request, Work Item Update, Summary.
- During Domain Modeling, open/update `render_diagram` with any changed aggregate, context-map,
  or event-flow diagram.
