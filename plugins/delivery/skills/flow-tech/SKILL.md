---
name: flow-tech
description: 'Run any change to .tech/ — the technology graph of platforms, runtimes, frameworks, libraries, packages, services, and tools. Use for adding a technology, pinning a version, promoting or retiring a status, adding a layer, or refreshing the graph diagram. Routes the reasoning to the `architecture` role under the repository''s own tech instruction files. DO NOT USE FOR: changing the dependency itself in a project file (flow-update-packages), or the decision that picks a technology (flow-arc42, which .tech then records the outcome of).'
---

# Flow: Technology Graph (`.tech/`)

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`. What a chapter must look like is
the repository's rule, not this flow's: the instruction files that govern the target path and
the check the repository ships own structure, metadata, the status ladder, and the layer
rules. This flow restates none of them.

## Input Expectations

- Target scope: the graph file, the shared file, or one or more layer files. Layer names are
  the repository's; read the graph file's layer table to find them.
- Change goal, and whether it follows a decision already recorded in `.arc42/` or is still an
  open choice.

If either is not stated, derive it in Stage 1 from the request and the folder's contents, and
continue.

## Stage 1: Context Loading

- Confirm the repository keeps `.tech/`, at the root or under `.devbook/`. If it does not,
  stop and say so: adopting a folder is the devbook convention's own install, never a flow's.
- Load the instruction files that govern the target path, task-scoped. Load the graph file plus
  only the layer files in scope, and the `.arc42/` decision the change follows when there is one.
- State the derived scope and goal before continuing.

**Agents:** none

## Stage 2: Technology Reasoning

- Hand off to the `architecture` role. Fallback: reason inline under the same instruction files.
- A change that is a genuine architecture decision is recorded through `flow-arc42` first;
  `.tech` then records the outcome with a link to it.
- A technology belongs in exactly one layer; anything two layers use belongs in the shared file.

**Agents:** the `architecture` role

## Stage 3: Check & Review

- Every touched chapter and file carries the `meta` block its instruction file requires. Never
  write the `approved` rung: that is a person's decision at a gate, not an author's.
- The graph diagram's nodes and edges match the `depends-on` fields exactly; every
  `depends-on` resolves to a `.tech` chapter.
- Update every reference elsewhere when a heading or file was renamed or moved.
- Run `node .devbook/tools/devbook-meta/build.mjs --check` when the repository ships it, and
  fix what it reports here. Never regenerate `_meta/` in this run: the refresh is the
  repository's own path.
- Summarize the changed chapters for the user, naming every status change.

**Agents:** the `architecture` role

## Final Phases (Shared)

Documentation/config tier of `resources/flow-phases.md`, in order: Personal
Validation → Create Pull Request → Work Item Update → Summary. That file defines them; change
them there, for every flow.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-tech"` and stages: Context Loading, Technology Reasoning,
  Check & Review, Personal Validation, Create Pull Request, Work Item Update, Summary.
- During Check & Review, open/update `render_diagram` with the graph diagram.
