---
name: to-spec-design-component
description: 'To-spec direction (capture), design-component kind: read the component library and component usage actually in the code and write or refresh the component chapters in .design/component-libraries.md, with adoption, token usage, and known gaps. Use when: a component library is in use with no chapter, the recommendation is stale, components were hand-rolled around a gap, document the component adoption we have. Reads source and manifests as evidence, defers to the authoritative design source, and routes the write through the `.design` flow. DO NOT USE FOR: turning an agreed but unbuilt design-component chapter into work (use from-spec-design-component), or for the building-block, deployment, or feature chapters around it (use the matching to-spec-* skill).'
---

# Capture component adoption from code

## Purpose

A component library is in use, and `.design/component-libraries.md` does not
record it — or records a recommendation the product moved away from, or misses
the components hand-rolled around a gap. This skill reads the manifests and the
usage sites and routes a grounded chapter through the `.design` flow.

**`.design` is different from the other folders in one decisive way: when the
repository has an authoritative design source — a design-system MCP server, a
published style guide, a design-tokens package — that source wins, and code does
not override it.** So this capture pass is deliberately narrower than its
siblings. It records **observed adoption**: which library is in use, which
components are used, which tokens they consume, and where the product had to
hand-roll something. It does **not** rewrite a rule that came from the
authoritative source because the code does something else. Code contradicting
the authoritative source is a `conflict` in the code, not staleness in the
chapter.

`.design` folder rules that apply:

- **No `type` field.** `.design` defines no value set; setting `type` is
  reported as a warning.
- **`status` is only `draft`, `active`, or `deprecated`**, plus the shared
  `approved` rung every folder carries. There is no `proposed`.
- **Guideline level only.** Wireframes, user flows, prototypes, and screenshots
  are not stored in `.design`.
- **No dependency changes.** `component-libraries.md` records a recommendation
  with rationale; it does not add or pin a package. Dependency changes go
  through the repository package-update workflow, and the adopted result is
  recorded in `.tech`.

Read `assets/code-sync-protocol.md` before starting. It carries the counterpart
resolution ladder, the evidence rules, the five-way drift verdict, the status
rules, index regeneration, and the report table — none of which are repeated
here.

## Inputs

- **Repository root.** Default to the current working directory.
- **Channel or channels in scope.** Which front ends the pass covers — the
  chapter records a recommendation per channel.
- **Authoritative design source.** Whether the repository has one, and whether
  it is reachable right now.

If `.design/` does not exist, stop and run `devbook:install` for the
`.design` adoption path. If the authoritative design source exists but cannot be
reached, say so, keep the affected chapters at `status: draft`, and note the gap
in the chapter itself — the folder rules require exactly that.

## Spec-to-code mapping

The chapter's parts and the code that evidences each one:

| Chapter element | Code and test evidence |
|---|---|
| Component library in use, per channel | The library packages in the front-end manifests, confirmed by actual import sites — a package present but never imported is not in use |
| Version and adoption breadth | The declared version, and how widely the library is imported: everywhere, one area, or a single screen |
| Components in use | The library components actually imported and rendered, as distinct from the library catalog |
| Token usage | Which design tokens the components consume, and whether they come from the tokens declared in `color-scheme.md` and `typography-and-layout.md` or from hard-coded values |
| Known gaps | Components hand-rolled in the repository that the library also offers, and components the product needs that the library does not have — the gaps the chapter exists to record |
| Keyboard equivalence | Whether pointer-only interactions built on these components have keyboard equivalents. The folder rules require them, so an absence is a finding |
| Accessibility posture | The accessibility affordances the components are used with, against the thresholds in `accessibility.md` |

Hard-coded values where a token exists are the most useful finding this pass
produces, and they are directly observable: a hex literal, a raw pixel size, or
a font stack written inline where `color-scheme.md` or
`typography-and-layout.md` declares a token. Record each one — the folder rules
say tokens are declared once and referenced by name everywhere else.

A pointer-only interaction with no keyboard equivalent is a **rule violation**,
not a design variant. The folder rules are unconditional: drag-and-drop,
hover-revealed affordances, and gesture shortcuts must be fully operable without
a pointer. Report it as a finding against the code, and do not write it into the
chapter as accepted practice.

## Workflow

1. **Load governed context.** Read `assets/code-sync-protocol.md`,
   `devbook-design.md`, and
   `devbook-chapter-metadata.md`. Read
   `.design/component-libraries.md`, `color-scheme.md`,
   `typography-and-layout.md`, `interaction-guidelines.md`, and
   `accessibility.md`. Consult the authoritative design source when the
   repository has one.

2. **Resolve the counterpart.** Work the resolution ladder from the protocol:
   `domain.md` aliases first, then `.arc42/05-building-block-view.md`, then the
   observed naming convention. Record which rung matched. Stop at `unresolved`
   if the ladder yields no single candidate or more than one.

3. **Read the implementation and its tests.** Read the front-end manifests, then
   the import sites, then the component usage, then the styling — looking
   specifically for hard-coded values where a token is declared, and for
   pointer-only interactions. Apply the protocol's evidence rules.
   Then mine the unit tests, per **Unit tests are first-class evidence** in the
   protocol, for:

   - **Keyboard equivalence.** A test that drives an interaction by keyboard is
     the evidence that the pointer-only rule is satisfied. Its absence on a
     drag, hover, or gesture affordance is a finding against the code, not a
     design variant.
   - **Accessibility assertions.** Contrast, focus-order, and label assertions
     establish the posture against the thresholds in `accessibility.md`.
   - **Component tests.** Which components are rendered in tests confirms real
     adoption, as distinct from a package merely being installed.


4. **Defer to the authoritative design source.** Where the repository has an
   authoritative design source, compare what the code does against what that
   source says. Where they differ, the source wins: record it as a `conflict`
   finding against the code, not as a chapter update. Only observations the
   source does not speak to — adoption breadth, which components are used, which
   gaps were hit — become chapter content on the strength of code alone.

5. **Reach a verdict.** Compare what the code establishes against what the
   chapter currently says, and land on exactly one of the protocol's five
   verdicts. `code-ahead` is the case this skill exists for. On `spec-ahead`,
   stop and hand the scope to `from-spec-design-component`. On `conflict`, stop and
   ask; never resolve it by overwriting the chapter.

6. **Draft the chapter.** Write to the template in
   `devbook-design.md`. The heading carries the bare name; the
   `meta` block carries `status` and no `type` — `.design` defines no `type`
   value set, and its `status` ladder is only `draft`, `active`, `deprecated`
   plus the shared `approved` rung. A
   new chapter starts at `status: draft`; an existing chapter's `status` is left
   untouched. Include optional fields only where they have a value.

7. **Record the gaps, keep it guideline level.** Write the hand-rolled
   components and the missing capabilities as the chapter's known-gaps section,
   with a comparison table where more than one library is in play. Keep every
   entry prescriptive and testable — token names and thresholds, not prose. Do
   not add a wireframe, a prototype, or a screenshot.

8. **Route the write through the `.design` flow.** Hand over the drafted content and the
   evidence behind each claim. The `.design` flow owns template conformance, the
   metadata blocks, and the consistency review. Do not write `.design/` files directly.
   The rung that answers is resolved per **Where the spec-side write goes** in
   `assets/code-sync-protocol.md`.

9. **Regenerate and validate.** After the write lands, per the protocol:

   ```bash
   node .devbook/tools/devbook-meta/build.mjs --scope .design
   node .devbook/tools/devbook-meta/build.mjs --scope .design --check
   ```

10. **Report.** Close with the protocol's report table, one row per chapter
    touched or checked, including the `aligned` ones.

## Do not

- Do not write `.design/` files directly — the write routes through
  the `.design` flow.
- Do not write an `annotation` fence. A capture records what the code does; an
  open question about it belongs in review, not in a chapter this skill writes.
- Do not drop a chapter's `status` line because the implementation exists. An
  omitted status means the resting value `active` — agreed — and code existing is
  not agreement that the code is the intended model.
- Do not overwrite guidance grounded in the authoritative design source with an
  observation from code. The source wins; the divergence is a `conflict`.
- Do not add or pin a dependency. `component-libraries.md` records a
  recommendation; dependency changes go through the package-update workflow and
  are recorded in `.tech`.
- Do not set a `type` field, and do not use `proposed` — `.design` has only
  `draft`, `active`, `deprecated`, plus the shared `approved` rung, which a
  capture pass never writes.
- Do not store a wireframe, prototype, screenshot, or user flow in `.design`.
- Do not record a pointer-only interaction as acceptable because the code does
  it.
- Do not repeat raw token values here. Reference the token names declared in
  `color-scheme.md` and `typography-and-layout.md`.
- Do not record a library as in use because its package is present. Confirm the
  imports.
- Do not restate channel or stack facts that belong in `.arc42` or `.tech`.

