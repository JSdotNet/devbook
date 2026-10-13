---
name: flow-spec
description: "Run any change to a devbook folder — an arc42/ chapter, decision record, debt record, or proposal; the domain/ model; the tech/ graph; design/ guidelines; the ai/ adoption record — through drafting, the repository's check, and personal approval before the pull request. The escalation target for a new decision, a cross-cutting redesign, a boundary question, and accepted debt. DO NOT USE FOR: the code that implements a chapter, or the dependency behind a tech/ entry (flow-code), or wireframes, prototypes, and UI reviews (the ux agent directly)."
---

# Flow: Devbook Folder (`arc42/`, `domain/`, `tech/`, `design/`, `ai/`)

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

What a chapter must look like is the repository's rule, not this flow's: the instruction files
that govern the target path and the check the repository ships own structure, metadata,
templates, status, and every folder-specific rule. This flow restates none of them.

Required input: the change goal. The folder, the chapters in scope, and the kind are derived in
`phase-scope`.

## Phases

Its own, shorter tier, defined in `resources/flow-phases.md`; who runs each phase is resolved
per `resources/phase-resolution.md`:

`phase-update-base` → `phase-scope` → `phase-drafting` → `phase-check-review` → `phase-ready`,
back to `phase-drafting` while not ready → `phase-personal-validation` → `phase-create-pr` →
`phase-report-back` → `phase-summary`

- **Scope** settles the folder and the kind. For `arc42/`: chapter content, a decision record,
  a debt record, or a proposal, which is a decision record in `proposed` status. A folder the
  repository has not adopted stops the run there: adopting one is devbook's own `init` or
  `update`.
- **An `ai/` usage whose tool has no `tech/` chapter,** or a `tech/` entry whose choice is an
  open decision, runs this flow for that folder first.

## Folder → Drafting Entry

The folder qualifies `phase-drafting`, so each folder names its own agent, model, and effort:

| Folder | `phases` entry | Drafts |
|---|---|---|
| `arc42/` | `phase-drafting:arc42` | Architecture chapters, decision and debt records |
| `domain/` | `phase-drafting:domain` | The context map and bounded contexts |
| `tech/` | `phase-drafting:tech` | The technology graph and its ratings |
| `design/` | `phase-drafting:design` | Principles, tokens, component guidelines |
| `ai/` | `phase-drafting:ai` | The AI adoption record |

## Surface Reporting

Per **Reporting Contract** in `resources/surface-contract.md`, which also covers no surface bound.

- `start_run` with `skillId: "flow-spec"`, `sessionId: "${CLAUDE_SESSION_ID}"` per the
  `session-id` slot, and one stage per phase above in order, each named by its phase skill's
  title: Update Base, Scope, Drafting, Check & Review, Ready, Personal Validation, Create Pull
  Request, Report Back, Summary.
- During Drafting, render the drafted chapter with `render_markdown` and any changed Mermaid
  with `render_diagram`.
