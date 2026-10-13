---
name: flow-code
description: "Run any change to a repository outside its devbook folders, end to end — a feature, bug fix, refactor, new module or service, tooling, CI, scripting, housekeeping, a dependency or framework move, or scaffolding a repository — with review, verification, and personal approval before the pull request. DO NOT USE FOR: a devbook chapter (flow-spec)."
---

# Flow: Code Change

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Required input: one line naming the outcome — the behaviour, the broken behaviour, the move, the
update, or the thing to create. Everything else is derived in `phase-scope`.

## Phases

One tier for every kind, defined in `resources/flow-phases.md`; who runs each phase is resolved
per `resources/phase-resolution.md`:

`phase-update-base` → `phase-scope` → `phase-plan` (`create` only) → `phase-implement` ⇄
`phase-review`, per slice → `phase-build-test` → `phase-verify` → `phase-spec-check` →
`phase-ready` → `phase-personal-validation` → `phase-create-pr` → `phase-report-back` →
`phase-summary`

## Kinds

`phase-scope` derives the kind from this table and persists it as `changeKind`. The kind changes
what happens inside `phase-implement` — in full in `resources/implement-kinds.md` — and how deep
`phase-verify` goes, never which phases run:

| Kind | Covers | Inside `phase-implement` | `phase-verify` depth |
|---|---|---|---|
| `feature` | New or changed behaviour, a small UI tweak | Tests first at each backend seam, none on the frontend; frontend, backend, or both | Full with capture for new behaviour, targeted for a change |
| `create` | A new module, service, or first runnable increment; carving one out | The unit `phase-plan` laid out | Full with capture |
| `refactor` | Folder, project, or solution layout, test placement, reference updates — behaviour held still | The moves and reference updates scope listed | Targeted, on the affected flows |
| `defect` | Something is broken | The failing test that reproduces it, then the fix | Targeted: the reproduction plus the regression scenario |
| `config` | Tooling, CI, scripts, documentation outside the devbook folders, housekeeping | The change, unsplit | Startup only, or `skipped` with nothing to run |
| `dependency` | Package, SDK, and framework moves | Analysis, the baseline for a framework upgrade, reversible batches, the security scan, feature adoption | Startup only; smoke checks for a framework upgrade |
| `project` | Creating and scaffolding a repository | Stack setup, README and instructions, governance, CI, tooling, then the scaffold | Full with capture: the app host, health endpoints, smoke checks |

- A request that is "really" a service, a move, or a scaffold is a different kind, not a
  different flow.
- A new architectural decision, bounded context, or cross-cutting redesign escalates to
  `flow-spec` per **Escalation** in `resources/flow-execution-model.md`.
- `project`: creating the repository stays manual and happens before the run; Update Base
  skips while there is no remote.
- `dependency`: a major version is raised with the user before it is taken, and nothing merges
  its own dependency bump.

## Surface Reporting

Per **Reporting Contract** in `resources/surface-contract.md`; with no surface bound, say so
once and continue on the file artifacts.

- `start_run` with `skillId: "flow-code"`, `sessionId: "${CLAUDE_SESSION_ID}"` per the
  `session-id` slot, and one stage per phase above in order, each named by its phase skill's
  title: Update Base, Scope, Plan (a `create` run only), Implement, Review, Build & Test, Verify,
  Spec Check, Ready, Personal Validation, Create Pull Request, Report Back, Summary.
- `set_run_context` with `changeKind` as soon as Scope derives it.
- Render the scope record, the plan, or the drafted bug report with `render_markdown`, and its
  Mermaid with `render_diagram`.
