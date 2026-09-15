# 74. Four Flows, Named for What Changes

```meta
date: 2026-09-15
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/34-flows-belong-to-delivery.md", ".devbook/arc42/adr/69-the-converters-are-three-skills-named-after-openspec.md", ".devbook/arc42/adr/64-1-0-0-is-the-first-release.md", ".devbook/arc42/tdr/4-delivery-depends-on-devbook.md", ".devbook/domain/delivery/flow.md", ".devbook/domain/delivery/domain.md#flow", ".devbook/domain/delivery/domain.md#change-kind", ".devbook/domain/plugin-authoring/domain.md#flow-skill"]
```

`delivery` ships four flows, and a flow is named for *what changes*, not for the task that
changes it. `flow-code` carries every change to the source, test, tooling, and configuration
trees — a feature, a defect, a refactor, a new module, service, or first product increment, and
the tooling, CI, and housekeeping work that used to fall through to a fallback. `flow-spec`
carries every change to a devbook folder — `.arc42/`, `.domain/`, `.tech/`, `.design/`, `.ai/`.
`flow-update-packages` carries a dependency move, an Aspire or framework upgrade included.
`flow-project` creates, governs, and scaffolds a repository. Twelve skills are gone:
`flow-feature`, `flow-bug`, `flow-structure`, `flow-create-module`, `flow-create-service`,
`flow-create-mvp`, and `flow-fallback` into `flow-code`; `flow-arc42`, `flow-domain`,
`flow-tech`, `flow-design`, and `flow-ai` into `flow-spec`; `flow-aspire-update` into
`flow-update-packages`; `flow-repo` into `flow-project`.

**Sixteen names drew lines the bodies did not.** The three `create-*` flows were `flow-feature`
with one planning stage added and the nouns changed, and each escalated to the other two when
Stage 0 found the request was "really" a module or "really" a service — the kind was a Stage 0
derivation dressed as a category. `flow-structure` added one planning stage of its own.
`flow-bug` added two, and once the flow is named for the code rather than for features, a defect
sitting outside it is the odd one. `flow-aspire-update` was `flow-update-packages` plus a
baseline gate and a feature-adoption stage, both of which any framework upgrade wants. The five
folder flows shared four of their five stages line for line. The devbook plugin had already made
the same call from its side: the code-side ladder in `code-sync-protocol.md` routes every brief
category to `flow-feature` or `flow-bug` and never named a `create-*` flow, and the spec-side
ladder resolves the folder flow by a name pattern rather than a list.

**The kind is settled inside the flow, the way record 34 settled it for `.arc42`.** That record
folded four architecture flows into one because a chapter, a decision, and a debt record are one
shape with three templates. The same argument reaches the whole catalog. `flow-code` derives the
kind in Scope Discovery and runs one middle stage for it — Implementation Planning for a new
module, service, or increment; Refactor Planning for a move; Reproduction and Root Cause for a
defect; none for a documentation or configuration change — and Validation depth follows the
change kind the run already persists, so nothing the sixteen distinguished is lost, and the
distinctions now live where a reader can compare them. `flow-spec` derives the folder and maps
it to the role and the model category through one table: `architecture` for `.arc42` and
`.tech`, `domain`, `ux` for `.design`, `docs` for `.ai`. A repository still binds a different
agent per folder through `bindings["delivery.roles"]`, and a person still picks a different
model per folder through the category each role resolves to — the folder never decided either;
the role did, and the role is unchanged.

**Restated rules go, and the payload path with them.** Record 34 claimed the folder flows
restated none of devbook's rules; [debt record 4](../tdr/4-delivery-depends-on-devbook.md) found
that they did, and this change takes that record's first option. `flow-design`'s keyboard rule
is `devbook-design.md`'s, `flow-tech`'s edge check is `devbook-tech.md`'s, `flow-domain`'s
alias check is `devbook-domain.md`'s, `flow-ai`'s vendor-and-version test is `devbook-ai.md`'s,
and `flow-design`'s authoritative-source stage is that rule's *Authoritative source* section.
`flow-spec` carries none of them: it loads the instruction files that govern the target path
and runs the check the repository's own `AGENTS.md` devbook section names, never a path devbook
installs to. What stays in the flow is procedure — derive the folder and the kind, load the
rules task-scoped, draft through the role, check, close through the documentation tier — and
the one `.arc42` note that a proposal not yet decided is a record in `proposed` status.

**There is no fallback because there is nothing left to fall through.** Every change to a
repository is either to a devbook folder or not, so `flow-fallback`'s category list —
testing, tooling, CI, scripting, housekeeping — is `flow-code` with the documentation/config
kind. Its one distinct behaviour, picking the closing tier from the change kind, is now
`flow-code`'s, and "no flow found" stops being a state a session can be in: a task that
changes nothing in the repository needs no flow, and the hook says so instead of naming a
last resort. Its rule that unmet preconditions are not inapplicability already lived in
`flow-execution-model.md` and loses only the two names it cited.

**`flow-repo` was half done by the setup.** `devbook-config:setup` writes the MCP files and the
config keys its Stage 3 wrote, and `devbook:install` writes the root instruction files and the
rules its Stage 4 wrote; `flow-project`'s own first stage duplicated the config write. What
survived — create the repository, expand the README, protect the branch, add the templates and
the governance — is a set of opening stages, not a category, and `flow-project` now opens with
them and hands the config to the setup skill rather than writing it.

Consequence: the routing hook, `start-session-from-issue`, and devbook's two routing ladders
route by what changes; `flow-<folder>` in the spec-side ladder becomes `flow-spec`, and
`flow-feature`/`flow-bug` in the code-side ladder becomes `flow-code`. `flow-phases.md` names
four flows across its tiers, and `flow-code` resolves its tier from the change kind.
`flow-model-selection.md` gains a category for the `ux` role, which `flow-design` had been
leaving unclassified. `delivery` holds fourteen skills. Record 34's argument stands and
its count does not; the plugin stays at 1.0.0, no migration ships, and `UPGRADING.md` carries
no entry — 1.0.0 is installed nowhere, per [record 64](64-1-0-0-is-the-first-release.md), and a
skill rename before the first install is a rename and nothing more.
