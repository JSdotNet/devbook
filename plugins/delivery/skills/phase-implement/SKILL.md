---
name: phase-implement
description: "Implement phase of flow-code: plans the slices, then builds one per call, tests first at backend seams, with the spec as fixed input. flow-runner only."
context: fork
model: opus
effort: high
---

# Phase: Implement

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Does:

- Tests first at each backend seam, then the code
- Decides frontend, backend or both, and in order or in parallel
- Carries the per-kind work: dependency moves, project bootstrap, defect reproduction
- Derives the spec of every scenario page scope lists, through `devbook:scenario-derive`
- Runs only compile and the touched tests

Doesn't:

- Redesign the spec: it returns revise: scope
- Edit a scenario page, the setup hook, or `profiles.json`
- Run the full suite (build-test does)
- Commit, or review its own work

## Context

Loads the brief's run folder and slice, and from `scope.md` (and `plan.md` for a `create`): the spec, criteria and seams, the scenario pages, the impacted paths, the rule files whose `paths` match them, and the guideline ADRs and chapters it names, by id. A fix brief adds that slice's open blockers from `review.md`; a ready brief, the open items. Never loads the run transcript, any other chapter, QA evidence, or review findings outside a fix brief. Refuse a brief that asks for more.

## Context: frontend

On top of **Context**, for its area only: `.agents/rules/ui-components.md` and `storybook.md` where they exist, the `design/` chapters the scope names, the component library, and the backend slice's interface summary. Never backend source outside that summary, nor a `domain/` chapter.

## Context: backend

On top of **Context**, for its area only: the `domain/` chapters and guideline ADRs the scope names. Never a `design/` chapter, a UI rule, or the component library.

## Steps

1. **Plan the slices** when the brief names none, and return without building. Each seam is tagged with its area; with `areas` in the effective config, the first matching glob decides, else the rule `paths` and project names, else one area. Order: backend first when the frontend consumes a contract it builds; parallel only when the two share no file and neither needs the other's new code — one worktree. A frontend slice has no test-first seams. A backend slice with no seams recorded: name them first, per `../../resources/tdd-rules.md`, never skip. The `dependency`, `project` and `config` kinds are one unsplit slice.
2. **Build the slice** by its kind in `../../resources/implement-kinds.md`, red → green one seam at a time per `../../resources/tdd-rules.md`.
3. **Scenario specs.** For each page `scope.md` lists, invoke `devbook:scenario-derive` on it in the first slice whose area its journey crosses, before that slice's code — the frontend slice when there is one. It writes or re-derives the spec in place; this slice then fills each step body the change builds, and leaves `test.fixme()` on a step whose behaviour it does not. A page the skill cannot derive — no setup hook or reporter, an `unknown-profile` — is recorded with what the skill named and returned as `revise: phase-scope`. Without the skill, record each page as not derived and continue: Spec Check reports its parts `spec-ahead`.
4. **Fast loop only.** Compile and the touched test files or projects, as often as useful; for a derived spec, `npx playwright test --list <spec>` and the scenario coverage check. Never the full suite, never the app.
5. **Spec is fixed.** A seam that cannot be built as specified, a criterion that contradicts another, a missing contract: stop and return `revise: phase-scope` with the reason. A new decision escalates per **Escalation** in `../../resources/flow-execution-model.md`.
6. **Fix round.** Address only the brief's blockers or open items, each marked `fixed` or with why not.

## Output

Write `implement.md` in the run folder: the slice plan — id, area, seams, `after`, `parallel-with` — then per slice the tests added, the scenario specs derived with each page's signature and its `fixme` steps, files touched, inner-loop result, and for a backend slice its interface summary. Return its path, the slice done, its round — `1` for its first build, one more per fix brief — and the next, never file contents; the flow-runner sends the round as `execution.round` on the Implement stage, per **Stage Counts** in `../../resources/surface-contract.md`. The flow-runner resolves `phase-implement:<area>` per slice and runs `phase-review` on it. Phase order: `../../resources/flow-phases.md`.
