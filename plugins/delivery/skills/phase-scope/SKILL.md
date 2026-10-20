---
name: phase-scope
description: "Scope phase of flow-code and flow-spec: derives the kind and acceptance criteria, finds impacted paths and rules, selects the chapters, writes the spec. flow-runner only."
context: fork
---

# Phase: Scope

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Does:

- Restates the request and derives the kind and acceptance criteria (flow-spec: the folder and the chapter kind)
- **Selects the relevant devbook chapters**: those naming the impacted paths or the scope's terms, then their `related` and `depends-on` links, read through the devbook database where present
- Finds the impacted paths and the rules that govern them
- Resolves the journeys and parts the item references, directly or through the requirements it touches
- For code: turns it into the spec implement builds on, with backend unit seams, constraints, integration points, and for a refactor the target layout and references to update
- Escalates a new decision or bounded context to flow-spec
- Writes the scope record and the chapter list every later brief draws from

Doesn't:

- Implement anything
- Load a devbook folder whole, or read annotation fences as content
- Write devbook chapters (drafting and spec-check do)
- Adopt a folder (that's devbook:init or update)

## Context

Loads the brief's request and origin, the repository instructions, the rule files whose `paths` match the impacted paths, and the chapters it selects. Never loads the run transcript, a whole devbook folder, an `annotation` fence, or anything under `_meta/`. Refuse a brief that asks for more.

## Steps

1. **Restate** the request in one or two sentences — for a defect, observed versus expected. Derive the kind from the table in the calling flow's `SKILL.md`; in `flow-spec`, the folder and the chapter kind. A folder the repository has not adopted stops here: say so.
2. **Criteria.** At least one measurable acceptance criterion — for a defect, what the regression test proves; for a refactor, the expected tree, updated references, and a green build.
3. **Paths and rules.** The impacted paths and the integration points they touch — for a refactor, every surface encoding the old layout: solution files, manifests, scripts, CI path filters, links, architecture tests — and the instruction files and guideline ADRs that govern them.
4. **Chapters.** Select from the corpus as `node .devbook/_tools/devbook-meta/build.mjs --print` emits it, else by search over the adopted folders: each chapter that names an impacted path or a scope term, then one hop of its `related` and `depends-on`. Each gets an id and one line of why.
5. **Journeys.** From the `scenarios` register in the same `--print` output — `scopes["."].scenarios.scenarios`, built from the Markdown, never `_meta/scenarios.json` — select every journey with a part the item references: directly, where the request, its origin, or a selected chapter names the journey's address, a part as `<scenarios file>#<anchor>`, or a label as `scenario:<context>/<scenarios file>#<label>`; or through a selected requirement whose case's `Proved by:` names a part, as that part's `provedBy` lists it. Record each journey once — address, profile, the referenced parts by anchor, and the requirement or reference that brought each in. A journey runs whole, so its other parts stay listed as unreferenced, never dropped. With no register, no `domain/`, or nothing referenced, write `none`.
6. **Facts from outside.** When a fact the repository cannot answer decides scope — an API's behaviour, a library's limits, a standard — ask the `research-brief` skill when it is available and put its brief's answer and citations in the scope record. Without it, cite the primary source for each such fact, or list it under open questions.
7. **Spec, for code.** Unit seams for the backend area only — each public boundary, the behaviour it proves, the criterion it covers — derived from the selected chapters: each invariant's `Enforced at:` line is a unit seam, each `#### Scenario:` an e2e or integration seam recorded for `phase-verify` and the e2e suite, never for implement — one whose `Proved by:` names a part is that part's spec, carried by step 5's list. A frontend slice gets no unit seams; its behaviour is proved by those scenarios. Then the constraints and integration points; for a refactor, the target layout and the references to update. A spec the brief carries approved is returned unchanged.
8. **Escalate, never decide.** A new architectural decision, bounded context, or cross-cutting redesign is a question for `flow-spec` per **Escalation** in `../../resources/flow-execution-model.md`; return it, do not resolve it.

## Output

Write `scope.md` into the run folder the brief names: request, kind, criteria, paths, rules, the chapter list, the journeys, seams and the rest of the spec, open questions. Return its path and a five-line summary, never file contents. The flow-runner accepts the record, asks what only the user can answer, and persists the kind. Phase order: `../../resources/flow-phases.md`.
