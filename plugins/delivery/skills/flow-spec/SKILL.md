---
name: flow-spec
description: 'Run any change to a devbook folder — an arc42/ chapter, decision record, debt record, or proposal; a domain/ context map or bounded context; the tech/ technology graph; design/ tokens and guidelines; the ai/ adoption record. One flow for the five folders: it derives the folder and the kind, loads the repository''s own instruction files for that folder, drafts through the role the folder maps to, runs the repository''s check, and closes through the documentation tier. The escalation target for a new decision, a cross-cutting redesign, a boundary question, and accepted debt. DO NOT USE FOR: the code that implements a chapter (flow-code), the dependency behind a tech/ entry (flow-update-packages), or wireframes, prototypes, and UI reviews (the ux role directly).'
---

# Flow: Devbook Folder (`arc42/`, `domain/`, `tech/`, `design/`, `ai/`)

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Agent transitions follow `resources/flow-phases.md`; per-stage model choice follows
`resources/flow-model-selection.md`. What a chapter must look like is the repository's rule,
not this flow's: the instruction files that govern the target path and the check the
repository ships own structure, metadata, templates, status, and every folder-specific rule.
This flow restates none of them.

## Input Expectations

- Target folder and scope: which chapters or files are in scope.
- Change goal, and whether it is new scaffolding or a refinement of what exists.
- For `arc42/`, the kind: chapter content, decision record, debt record, or a proposal not
  yet decided.

If any of these is not stated, derive it in Stage 1 from the request and the folder's
contents, and continue.

## Folder → Role

The folder decides who drafts, and the role decides the model category:

| Folder | Role | Model category (`flow-model-selection.md`) |
|---|---|---|
| `arc42/` | `architecture` | Architecture & Design |
| `domain/` | `domain` | Domain Design |
| `tech/` | `architecture` | Architecture & Design |
| `design/` | `ux` | Design Authoring |
| `ai/` | `docs` | Documentation & Low-Complexity |

A repository binds a different agent per folder through `bindings["delivery.roles"]`; a
person picks a different model per folder through the personal override for that category.

## Stage 1: Context Loading

- Confirm the repository keeps the target folder, at the root or under `.devbook/`. If it
  does not, stop and say so: adopting a folder is the devbook convention's own `init` or `update`, never
  a flow's.
- Load the instruction files that govern the target path, task-scoped. Load only the chapters
  in scope plus the ones the change links to — never the whole folder.
- Settle the kind. A `arc42/` proposal, comparison, or target-architecture draft is a
  decision record in `proposed` status: written to be decided, not left as a loose document.
  A `ai/` usage whose tool has no `tech/` chapter, or a `tech/` entry whose choice is an
  open decision, routes through this flow for that folder first.
- State the derived folder, scope, kind, and goal before continuing.

**Agents:** none

## Stage 2: Drafting

- Hand off to the role the table maps the folder to. Fallback: draft inline under the same
  instruction files.
- Link to a decision or debt record; never restate one inside a chapter. Keep terms aligned
  with the ubiquitous language in `domain/` when that folder exists.
- Never write the `approved` rung: that is a person's decision at a gate, not an author's.

**Agents:** the role from the table

## Stage 3: Check & Review

- Every touched chapter carries the `meta` block its instruction file requires.
- Update every reference elsewhere when a heading or file was renamed or moved.
- Run the check the repository's `AGENTS.md` devbook section names, and fix what it reports
  here. Never regenerate `_meta/` in this run: the refresh is the repository's own path.
- Summarize the changed chapters for the user, naming every status change.

**Agents:** the role from the table

## Final Phases (Shared)

Documentation/config tier of `resources/flow-phases.md`, in order: Personal
Validation → Create Pull Request → Work Item Update → Summary. That file defines them; change
them there, for every flow.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-spec"` and stages: Context Loading, Drafting, Check &
  Review, Personal Validation, Create Pull Request, Work Item Update, Summary.
- During Drafting, open/update `render_markdown` with the drafted chapter, and
  `render_diagram` with any changed Mermaid diagram.
