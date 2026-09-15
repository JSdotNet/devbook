---
name: to-spec-building-block
description: 'To-spec direction (capture), building-block kind: read the implemented module and component structure and write or refresh .arc42/05-building-block-view.md, with its decomposition levels, responsibilities, interfaces, and diagram. Use when: the building block view is missing or stale, projects were added or restructured, the decomposition diagram no longer matches the solution, document the structure we built. Reads source and project structure as evidence and routes the write through the `.arc42` flow. DO NOT USE FOR: turning an agreed but unbuilt building-block chapter into work (use from-spec-building-block), or for the deployment, bounded-context, or design-component chapters around it (use the matching to-spec-* skill).'
---

# Capture the building block view from code

## Purpose

The solution has a module and component structure, and
`.arc42/05-building-block-view.md` does not describe it — or describes a
decomposition from before projects were split, merged, or renamed. This skill
reads the structure, establishes the decomposition levels and each block's
responsibility and interfaces, and routes the chapter through
the `.arc42` flow.

This view is the second rung of counterpart resolution for every other skill in
this family. An accurate building block view is what lets a capture or build
pass narrow to one project when `domain.md` has no alias — so keeping it current
has value well beyond the chapter itself.

`.arc42` has its own folder rules, and they differ from `.domain`:

- **No `type` field.** `.arc42` defines no value set; setting `type` is reported
  as a warning. The heading level already distinguishes chapter from section.
- **No `depends-on`.** Architecture chapters describe standing structure, not
  sequenced work. Cross-references use `related`.
- **The top-level chapter's `meta` block doubles as the file-level block.** An
  `.arc42` file is always exactly one top-level chapter — do not add a second,
  duplicate block.

Read `assets/code-sync-protocol.md` before starting. It carries the counterpart
resolution ladder, the evidence rules, the five-way drift verdict, the status
rules, index regeneration, and the report table — none of which are repeated
here.

## Inputs

- **Repository root.** Default to the current working directory.
- **Scope.** The whole view, or one `##` section of it — a single container, or
  one level of decomposition.
- **Level depth.** How far down to decompose. Default to level 1 (containers)
  and level 2 (the blocks inside the containers that carry real responsibility).

If `.arc42/` does not exist, stop and run `devbook:install` for the `.arc42`
adoption path. Create the file only if the chapter will have real content — the
folder rules forbid scaffolding empty placeholders.

## Spec-to-code mapping

The view's parts and the code that evidences each one:

| Chapter element | Code and test evidence |
|---|---|
| Level 1 blocks | The deployable or independently runnable units: solution-level projects that produce an executable or a service, an Aspire AppHost's registered resources, compose services |
| Level 2 blocks | The modules inside each level 1 block that carry a distinct responsibility: projects, top-level namespaces, or feature folders that other blocks depend on as a unit |
| Responsibilities | What each block owns, taken from its public surface and what depends on it — not from its name |
| Interfaces | How a block is reached: HTTP routes, gRPC services, message contracts consumed and published, public library API, dependency-injected abstractions crossing the block line |
| Dependencies between blocks | Project and package references, dependency-container registrations, and client instantiations — the actual edges, in their actual direction |
| Diagram | A Mermaid diagram whose nodes are the blocks and whose edges are the observed dependencies, in the observed direction |
| Bounded-context alignment | Which `.domain` bounded context each block belongs to, where the mapping is clean — recorded as a `related` reference, not restated |

Prefer diagrams over long prose here; the folder rules say so explicitly. A
Mermaid diagram of the blocks and their real dependency edges carries more than
several paragraphs, and drifts more visibly when it goes stale.

Record dependency **direction** from the references, not from the intended
layering. A block that depends upward is exactly the finding this view exists to
surface, and a diagram redrawn to look correct hides it.

Do not restate ADR or TDR content in this chapter. Local decision records live
under `.arc42/adr/` and `.arc42/tdr/` and are linked from
`09-architecture-decisions.md` and `11-risks-and-technical-debt.md` — link, do
not copy.

## Workflow

1. **Load governed context.** Read `assets/code-sync-protocol.md`,
   `devbook-arc42.md`, and
   `devbook-chapter-metadata.md`. Read
   `.arc42/05-building-block-view.md` as it stands, plus
   `03-context-and-scope.md` for the system boundary. Load
   `.domain/context-map.md` only for the bounded-context alignment.

2. **Resolve the counterpart.** Work the resolution ladder from the protocol:
   `domain.md` aliases first, then `.arc42/05-building-block-view.md`, then the
   observed naming convention. Record which rung matched. Stop at `unresolved`
   if the ladder yields no single candidate or more than one.

3. **Read the implementation and its tests.** Read the solution and project
   files, the project and package references, the dependency-container
   registrations, the public API surfaces, and any AppHost or compose file that
   declares the runnable units. Apply the protocol's evidence rules.
   Then mine the unit tests, per **Unit tests are first-class evidence** in the
   protocol, for:

   - **Architecture tests.** Where they exist, they are the most direct
     statement of the intended dependency direction, and comparing them against
     the real reference graph surfaces exactly the discrepancies this view
     should record.
   - **Test project structure.** Which test project covers which block is good
     evidence of where the responsibility boundaries actually fall.
   - **Contract tests.** These name the interfaces a block genuinely exposes, as
     distinct from everything its public surface happens to permit.


4. **Settle the decomposition levels.** Establish level 1 from what actually
   runs independently, and level 2 from what other blocks depend on as a unit. A
   project that nothing depends on separately is not a level 2 block, whatever
   its name. Stop decomposing where the blocks stop having distinct
   responsibilities.

5. **Reach a verdict.** Compare what the code establishes against what the
   chapter currently says, and land on exactly one of the protocol's five
   verdicts. `code-ahead` is the case this skill exists for. On `spec-ahead`,
   stop and hand the scope to `from-spec-building-block`. On `conflict`, stop and
   ask; never resolve it by overwriting the chapter.

6. **Draft the chapter.** Write to the template in
   `devbook-arc42.md`. The heading carries the bare name; the
   `meta` block carries `status` and no `type` — `.arc42` defines no `type`
   value set, and setting one is reported as a warning. A new chapter starts at
   `status: draft`; an existing chapter's `status` is left untouched. Include
   optional fields only where they have a value.

7. **Draw the diagram from the observed edges.** Build the Mermaid diagram from
   the references that actually exist, in their actual direction. Where an edge
   contradicts the intended layering, draw it as it is and note it — that is the
   finding.

8. **Route the write through the `.arc42` flow.** Hand over the drafted content and the
   evidence behind each claim. The `.arc42` flow owns template conformance, the metadata
   blocks, and the consistency review. Do not write `.arc42/` files directly. The rung
   that answers is resolved per **Where the spec-side write goes** in `assets/code-sync-
   protocol.md`.

9. **Regenerate and validate.** After the write lands, per the protocol:

   ```bash
   node .devbook/_tools/devbook-meta/build.mjs --scope .arc42
   node .devbook/_tools/devbook-meta/build.mjs --scope .arc42 --check
   ```

10. **Report.** Close with the protocol's report table, one row per chapter
    touched or checked, including the `aligned` ones.

## Do not

- Do not write `.arc42/` files directly — the write routes through
  the `.arc42` flow.
- Do not write an `annotation` fence. A capture records what the code does; an
  open question about it belongs in review, not in a chapter this skill writes.
- Do not drop a chapter's `status` line because the implementation exists. An
  omitted status means the resting value `active` — agreed — and code existing is
  not agreement that the code is the intended model.
- Do not set a `type` field. `.arc42` defines no value set and a `type` there is
  reported as a warning.
- Do not add `depends-on`. `.arc42` has no such field; use `related`.
- Do not add a second, file-level `meta` block. The top-level chapter's block is
  the file's block.
- Do not redraw a dependency edge to match the intended layering. Draw what
  exists and note the discrepancy.
- Do not restate ADR or TDR content. Link to `.arc42/adr/` and `.arc42/tdr/`.
- Do not scaffold an empty chapter. Create the file only when it has real
  content.
- Do not restate `.tech` package or version facts here — that is
  `devbook-tech-update` and the `.tech` flow scope.

