---
name: flow-arc42
description: 'Run any change to .arc42/ — an architecture chapter, section, or diagram; a new or updated architecture decision record; a technical debt record; or an architecture proposal, comparison, or target-architecture draft, which lands as a record in proposed status. Use for every architecture documentation task, from a one-line chapter correction to recording a cross-cutting decision. Routes drafting to the `architecture` role under the repository''s own arc42 instruction files. DO NOT USE FOR: the domain model (flow-domain), the technology graph (flow-tech), or implementing what a decision says (flow-feature, flow-create-service).'
---

# Flow: Architecture Documentation (`.arc42/`)

One flow for the folder, whatever kind of chapter the change produces. A decision, a debt
record, and a chapter are three templates under one set of folder rules, and the procedure
around them is the same: load the rules, draft through the role, check, gate.

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`. What a chapter must look like is
the repository's rule, not this flow's: the instruction files that govern the target path and
the check the repository ships own structure, metadata, and status. This flow restates none
of them.

## Input Expectations

- The kind: chapter content, decision record, debt record, or a proposal that has not been
  decided yet.
- Target chapter or record, and the change goal.
- Whether the change links to an existing record rather than restating one.

If any of these is not stated, derive it in Stage 1 from the request and the folder's
contents, and continue.

## Stage 1: Context Loading

- Confirm the repository keeps `.arc42/`, at the root or under `.devbook/`. If it does not,
  stop and say so: adopting a folder is the devbook convention's own install, never a flow's.
- Load the instruction files that govern the target path, task-scoped. Load only the chapters
  in scope, plus the decision and debt chapters the change links to.
- Settle the kind. A proposal, comparison, or target-architecture draft is a decision record
  in `proposed` status: it is written to be decided, not left as a loose document.
- State the derived scope, kind, and goal before continuing.

**Agents:** none

## Stage 2: Drafting

- Hand off to the `architecture` role. Fallback: draft inline under the same instruction files.
- A decision records context, the alternatives weighed, the choice and its reasons, and the
  consequences. A debt record records origin, current impact, and the remediation path. A
  chapter prefers a Mermaid diagram to prose for structure and runtime views.
- Link to a decision or debt record; never restate one inside a chapter.
- Keep glossary terms aligned with the ubiquitous language in `.domain/` when that folder exists.

**Agents:** the `architecture` role

## Stage 3: Check & Review

- Every touched chapter carries the `meta` block its instruction file requires. Never write
  the `approved` rung: that is a person's decision at a gate, not an author's.
- Check the number, date, and status of a new record against the existing set, and name the
  dependent chapter updates it implies.
- Update every reference elsewhere when a heading or file was renamed or moved.
- Run `node .devbook/tools/devbook-meta/build.mjs --check` when the repository ships it, and
  fix what it reports here. Never regenerate `_meta/` in this run: the refresh is the
  repository's own path.
- Summarize the changed chapters for the user.

**Agents:** the `architecture` role

## Final Phases (Shared)

Documentation/config tier of `resources/flow-phases.md`, in order: Personal
Validation → Create Pull Request → Work Item Update → Summary. That file defines them; change
them there, for every flow.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-arc42"` and stages: Context Loading, Drafting, Check &
  Review, Personal Validation, Create Pull Request, Work Item Update, Summary.
- During Drafting, open/update `render_markdown` with the drafted chapter or record, and
  `render_diagram` when it carries Mermaid diagrams.
