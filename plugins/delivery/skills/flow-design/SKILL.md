---
name: flow-design
description: 'Run any change to .design/ — UX principles, color tokens, typography and layout, interaction guidelines, accessibility, and component libraries. Use for refreshing tokens from the design source, adding an interaction or accessibility rule, or evaluating a component library, including small rule additions. Routes authoring to the `ux` role under the repository''s own design instruction files. DO NOT USE FOR: wireframes, user flows, prototypes, and UI reviews (the `ux` role directly), UI implementation (flow-feature, flow-bug), or UI dependency changes (flow-update-packages).'
---

# Flow: Design Guidelines (`.design/`)

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`. What a chapter must look like is
the repository's rule, not this flow's: the instruction files that govern the target path and
the check the repository ships own structure, metadata, and status. This flow restates none
of them.

## Input Expectations

- Target scope: which guideline files are in scope.
- Change goal, and whether it is a new guideline or a refinement of an existing one.

If either is not stated, derive it in Stage 1 from the request and the folder's contents, and
continue.

## Stage 1: Context Loading

- Confirm the repository keeps `.design/`, at the root or under `.devbook/`. If it does not,
  stop and say so: adopting a folder is the devbook convention's own install, never a flow's.
- Load the instruction files that govern the target path, task-scoped. Load only the files in
  scope, and an `.arc42/` chapter only when the change depends on a documented constraint.
- State the derived scope and goal before continuing.

**Agents:** none

## Stage 2: Authoritative Grounding

- Identify the repository's authoritative design source: a design-system MCP server bound to
  `spec`, a published design system, or a brand specification. Query it for the guidance in
  scope, and for tokens whenever a token file is touched.
- Materialize the values into the repository as concrete tokens; never leave a bare link.
- With no source, or one that is unavailable, say so, mark the affected chapters `draft`, and
  record the gap in the chapter.

**Agents:** none

## Stage 3: Design Authoring

- Hand off to the `ux` role. Fallback: author inline under the same instruction files.
- Apply the repository's own standing product rules on every edit; never import another
  product's.
- Keep rules prescriptive and testable: tables and token names over prose, tokens declared
  once and referenced elsewhere.

**Agents:** the `ux` role

## Stage 4: Check & Review

- Every touched chapter and file carries the `meta` block its instruction file requires. Never
  write the `approved` rung: that is a person's decision at a gate, not an author's.
- Every pointer or gesture rule has a keyboard alternative and an announced state change in
  the accessibility guideline.
- Update every reference elsewhere when a heading or file was renamed or moved.
- Run `node .devbook/tools/devbook-meta/build.mjs --check` when the repository ships it, and
  fix what it reports here. Never regenerate `_meta/` in this run: the refresh is the
  repository's own path.
- Summarize the changed chapters for the user.

**Agents:** the `ux` role

## Final Phases (Shared)

Documentation/config tier of `resources/flow-phases.md`, in order: Personal
Validation → Create Pull Request → Work Item Update → Summary. That file defines them; change
them there, for every flow.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-design"` and stages: Context Loading, Authoritative
  Grounding, Design Authoring, Check & Review, Personal Validation, Create Pull Request, Work
  Item Update, Summary.
- During Design Authoring, open/update `render_markdown` with the drafted guideline.
