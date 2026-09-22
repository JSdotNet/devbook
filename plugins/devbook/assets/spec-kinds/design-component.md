# Kind: design-component

What `sync-specs`, `apply-change`, and `verify-change` need to know about a
component guideline that `assets/code-sync-protocol.md` does not already say.
The protocol carries the resolution ladder, the evidence rules, the five
verdicts, the status rules, the brief contract, and the report table; this file
carries the kind.

| | |
|---|---|
| Chapters | A component chapter in the component library, recording a recommendation per channel |
| File | `.devbook/design/component-libraries.md` |
| Folder rule | `devbook-design.md`, with `devbook-chapter-metadata.md` |
| Context to load | `component-libraries.md`, `color-scheme.md`, `typography-and-layout.md`, `interaction-guidelines.md`, and `accessibility.md`; the authoritative design source when the repository has one |
| Write path | The `design/` flow, per **Where the spec-side write goes** in the protocol |
| Index scope | `--scope design` |
| Extra input | The channel or channels in scope — capture covers each, a brief covers one at a time — and whether an authoritative design source exists and is reachable |

## The authoritative source wins

`design/` differs from the other folders in one decisive way: when the
repository has an authoritative design source — a design-system MCP server, a
published style guide, a design-tokens package — that source wins, and code does
not override it. So capture here is narrower than for the other kinds. It
records **observed adoption**: which library is in use, which components, which
tokens they consume, where the product hand-rolled something. It never rewrites
a rule that came from the source because the code does something else: that is
a `conflict` finding against the code, not staleness in the chapter, and only
observations the source does not speak to become chapter content on the
strength of code alone. If the source exists but cannot be reached, say so, keep
the affected chapters at `draft`, and note the gap in the chapter — the folder
rules require exactly that.

`design/` folder rules that apply:

- **No `type` field.** `design/` defines no value set.
- **`status` is `draft`, `active`, or `deprecated`.** There is no `proposed`,
  and no `approved` or `accepted` rung — the two decision rungs are `domain/`'s.
  The gate's `draft` rule applies unchanged.
- **Guideline level only.** No wireframe, user flow, prototype, or screenshot is
  stored in `design/`.
- **No dependency changes.** `component-libraries.md` records a recommendation
  with rationale; it never adds or pins a package. A brief may state that a
  package is required and never installs it — dependency changes go through the
  repository package-update workflow, and the adopted result is recorded in
  `tech/`.

If `design/` does not exist, stop and run `devbook:install`.

## Mapping

| Chapter element | Evidence when capturing | What building it requires |
|---|---|---|
| Component library in use, per channel | The library packages in the front-end manifests, confirmed by import sites — a package present but never imported is not in use | The recommended library used for new and converted components in that channel |
| Version and adoption breadth | The declared version, and how widely it is imported: everywhere, one area, a single screen | — |
| Components in use | The library components actually imported and rendered, as distinct from the catalog | Library components used where the guideline says, replacing hand-rolled equivalents — check the hand-rolled components and their usage sites |
| Token usage | Which tokens the components consume, and whether they come from `color-scheme.md` and `typography-and-layout.md` or from hard-coded values | Every color, type, and spacing value referencing a declared token — no literals |
| Known gaps | Components hand-rolled that the library also offers, and components the product needs that the library lacks | Each gap handled as the chapter says: an accepted hand-rolled component, or an accepted deviation |
| Keyboard equivalence | Whether pointer-only interactions built on these components have keyboard equivalents | Every pointer-only interaction operable without a pointer — check `interaction-guidelines.md` against the interaction code |
| Accessibility posture | The affordances the components are used with, against the thresholds in `accessibility.md` | Those thresholds met — check contrast, focus handling, and labelling |
| Testable rules, one `### Requirement:` chapter each | The token, keyboard, and accessibility rules the guideline states as thresholds, and the tests that assert them | Each rule kept, with its `#### Scenario:` cases as the acceptance checks |

**The testable rules take the same `### Requirement:` shape as a bounded
context's**, under this component's own chapter in `.devbook/design/` — one
SHALL sentence, `#### Scenario:` cases beneath it, `tests` naming what asserts
it. What differs is the block: `design/` defines no `type` value set, so these
chapters carry the empty `meta` fence every `design/` chapter carries and take
no `type: requirement`. The fence is still what makes the heading addressable,
so it is never dropped. The coverage warnings that hold a `domain/` requirement
to `e2e` do not fire here, because they key on a `type` this folder does not
have; the level a design rule is proved at follows what asserts it — a contrast
threshold is a unit assertion, a keyboard path an `e2e` one.

Hard-coded values where a token is declared are the most useful finding this
kind produces, and directly observable: a hex literal, a raw pixel size, a font
stack inline where a token exists. Record each one. A pointer-only interaction
with no keyboard equivalent is a **rule violation**, not a design variant — the
folder rules are unconditional — so report it against the code and never write
it into the chapter as accepted practice.

## Capturing — `sync-specs`

Read the front-end manifests, then the import sites, then the component usage,
then the styling — looking for hard-coded values where a token is declared and
for pointer-only interactions. Mine the tests: one driving an interaction by
keyboard is the evidence the pointer-only rule is satisfied, and its absence on
a drag, hover, or gesture affordance is a finding; contrast, focus-order, and
label assertions establish the accessibility posture; the components rendered
in tests confirm real adoption as distinct from an installed package.

Compare the code against the authoritative source where there is one, and record
divergence as `conflict`. Draft with `status` and no `type`. Write the known
gaps as the chapter's own section, with a comparison table where more than one
library is in play, prescriptive and testable — token names and thresholds, not
prose.

## Applying — `apply-change`

Component adoption is nearly always `change to existing behaviour`: something
already renders, and the guideline asks it to render through the library and
its tokens instead. So the brief lists the replacement sites — "adopt the
library" without them is not actionable. The token and accessibility rules are
the **invariants**, and the part most easily dropped: keyboard equivalence for
every pointer-only interaction, and every value referencing a declared token.
Where the chapter states them as `### Requirement:` chapters, quote each one as
it stands and carry its scenarios as the acceptance checks; where it does not,
write them out with the token names. Where the guideline comes from the
authoritative source, carry its rules through rather than reinterpreting them.

Ubiquitous language: the component and token names the `design/` chapters
declare, and the `domain.md` terms for any user-facing copy. Out of scope: other
channels, dependency changes, visual redesign beyond what the guideline states,
and wireframes or prototypes. Acceptance checks a test or a lint rule can
assert: no hard-coded value where a token is declared, every pointer-only
interaction reachable by keyboard, the accessibility thresholds met, the
hand-rolled component no longer imported at the replacement sites.

## Do not

- Do not overwrite guidance grounded in the authoritative source with an
  observation from code, or reinterpret a rule that came from it.
- Do not add, remove, or pin a dependency.
- Do not set `type`, or use `proposed`.
- Do not store or produce a wireframe, prototype, screenshot, or user flow.
- Do not record a pointer-only interaction as acceptable because the code does
  it, and do not drop the token and keyboard-equivalence invariants from a brief.
- Do not repeat raw token values — reference the declared names.
- Do not record a library as in use because its package is present.
- Do not restate channel or stack facts that belong in `arc42/` or `tech/`.
- Do not brief "adopt the library" without the replacement sites, more than one
  channel at a time, a visual redesign, or a component design.
