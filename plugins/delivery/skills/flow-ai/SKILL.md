---
name: flow-ai
description: 'Run any change to .ai/ — the record of how the team develops with AI: which practice, agent, skill, hook, model, or guardrail is used at which stage of the development flow, the concepts underneath, and how far adoption has got. Use for recording a usage, promoting or retiring an adoption status, adding a stage, or adding a concept. Routes authoring to the `docs` role under the repository''s own ai instruction files. DO NOT USE FOR: registering a tool with its vendor and version (flow-tech), or AI shipped inside the product (flow-arc42, flow-domain, flow-tech).'
---

# Flow: AI Adoption Record (`.ai/`)

`.ai` records a way of working and never instructs one: a stage file per position in how the
work happens, a chapter per thing used there, and one question every chapter answers — at
this point in how we work, what do we use AI for, and is that real yet.

Agent transitions follow `resources/flow-phases.md`; per-stage model choice
follows `resources/flow-model-selection.md`. What a chapter must look like is
the repository's rule, not this flow's: the instruction files that govern the target path and
the check the repository ships own structure, metadata, and the adoption ladder. This flow
restates none of them.

## Input Expectations

- Target scope: the adoption map, one or more stage files, or the concepts file. Stage names
  are the repository's; read the adoption map's stage table to find them.
- Change goal, and whether the tool underneath the usage is already registered in `.tech/`.

If either is not stated, derive it in Stage 1 from the request and the folder's contents, and
continue.

## Stage 1: Context Loading

- Confirm the repository keeps `.ai/`, at the root or under `.devbook/`. If it does not,
  stop and say so: adopting a folder is the devbook convention's own install, never a flow's.
- Load the instruction files that govern the target path, task-scoped. Load the adoption map
  plus only the stage files in scope.
- State the derived scope and goal before continuing.

**Agents:** none

## Stage 2: Placement & Boundary Check

Three questions, in order, before anything is written; state the answers.

1. **Is this a `.ai` fact at all?** A tool with a vendor and a version is a `.tech` chapter.
   AI inside the product is `.arc42`, `.domain`, or `.tech`. Route it away rather than write it.
2. **Which stage?** Where the usage is *used*, not where the tool is configured. One idea
   applied throughout is a concept carrying a stage list.
3. **Is the tool registered?** A `depends-on` into `.tech` with no chapter there goes through
   `flow-tech` first; an unresolved link fails the check.

**Agents:** none

## Stage 3: Authoring

- Hand off to the `docs` role. Fallback: author inline under the same instruction files.
- Fill **Adopted by** and **Evidence** honestly; `none yet` is a legitimate value, and a
  demotion is a normal edit never to be softened.
- Retire rather than delete: a dropped usage keeps its chapter, retired, with a sentence on why.

**Agents:** the `docs` role

## Stage 4: Check & Review

- Every touched chapter and file carries the `meta` block its instruction file requires. Never
  write the `approved` rung: that is a person's decision at a gate, not an author's.
- The adoption map's stage table and diagram match the stage files exactly; every `depends-on`
  resolves, and no `.tech` chapter points back at `.ai`.
- Run `node .devbook/_tools/devbook-meta/build.mjs --check` when the repository ships it, and
  fix what it reports here. Never regenerate `_meta/` in this run: the refresh is the
  repository's own path.
- Summarize the changed chapters for the user, naming every status change.

**Agents:** the `docs` role

## Final Phases (Shared)

Documentation/config tier of `resources/flow-phases.md`, in order: Personal
Validation → Create Pull Request → Work Item Update → Summary. That file defines them; change
them there, for every flow.

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`. With no
surface bound, skip the calls, say so once, and continue — file artifacts remain the source
of truth.

- `start_run` with `skillId: "flow-ai"` and stages: Context Loading, Placement & Boundary
  Check, Authoring, Check & Review, Personal Validation, Create Pull Request, Work Item Update,
  Summary.
- During Check & Review, open/update `render_diagram` with the adoption map diagram.
