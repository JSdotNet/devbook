---
name: capture-specs
description: 'Read an implementation and its tests and plan the devbook chapter that is missing, thin, or stale, for any chapter kind. Delivers a capture plan and writes nothing, except in write mode under a spec-check binding. Use when: document what we built, capture from code, the code has something the chapter does not, domain/ is stale. DO NOT USE FOR: implementing an agreed chapter (apply-change) or checking drift alone (verify-change).'
updates: true
---

# capture-specs

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Read `assets/code-sync-protocol.md` first, then the kind's file under
`assets/spec-kinds/`, then the folder rule that file names. Nothing in them is
repeated here.

**Kind.** One target per run, and one kind unless it is a sync group. The
chapter's `type` decides it — `aggregate` (with its owned `entity`,
`value-object`, `enum`, the shared groupings, and its `domain-event`s), `domain-service` (with the events it
raises itself), `feature` and `sub-feature`, `feature-flag` and `setting` (one
kind, `setting`, for both levels), `user` and `technical` (one kind, `actor`; an
`organisation` is no unit) — and the file decides it where the
folder has no `type`: `.devbook/arc42/05-building-block-view.md` and a file under
`.devbook/arc42/building-blocks/` are `building-block`, read with `workspace.dsl`,
`.devbook/design/component-libraries.md` is `design-component`, and a `*.demo.html` is
`demo`, which capture reports and never writes — `/prototype` revises a demo. Starting from code with
no chapter yet, take the kind the user names, or infer it from the code's shape
and say so. Any other chapter is out of scope: say which flow owns it.
A journey is no kind: it is evidence for the requirements whose cases point at its parts, per **A journey is evidence, not a kind** in the protocol.

**Mode.** Plan, the default, writes nothing. Write, when the caller asks for it — a
`phase-spec-check` binding does — carries the plan in per **Carrying a plan in** in the
protocol.

**Inputs.** The target — a chapter as `<path>#<heading-slug>` or heading, a code
type, or a sync unit or group per **The sync unit** in the protocol — the bounded
context where the kind has one, and the repository root.

## Steps

1. Load the protocol, the kind's file, and its folder rule. Read only the
   chapters the kind's file names — never a folder whole.
2. Resolve the counterpart by the protocol's ladder; record the rung. No single
   match is `unresolved`: stop and report.
3. Read the implementation, breadth first, then its tests as a step of their
   own: the unit tests for what a type guarantees, the e2e tests — and, for a
   feature, the running product — for what it promises. The kind's file says
   what to read and what the tests establish. Only code that executes and tests
   that pass are evidence.
4. Reach a verdict per chapter. `code-ahead` is the case this skill exists for.
   `aligned`: report and stop. `spec-ahead`: stop and hand the scope to
   `apply-change`. `conflict` or `unresolved`: stop and ask.
5. Draft the content to the folder rule's template, as the kind's file says, in the
   prose and diagrams `devbook-writing.md` asks for — a building block's DSL too:
   the invariants as claims with the `Enforced at:` line, the requirements as SHALL
   sentences with their `#### Scenario:` cases, each with the evidence behind it.
   Put the tests that assert each one in `tests`. Where a counterpart resolved
   by inference, propose a term with the code name as an `alias`.
6. Assemble the capture plan — the drafts as a delta against the target file,
   `ADDED` / `MODIFIED` / `REMOVED` by heading, per **The capture plan** in the
   protocol — and close it with the protocol's report table, one row per
   chapter in scope, `aligned` rows included.
7. Plan mode: deliver the plan to the person as a Markdown artifact, and stop there.
   Write mode: carry in the `code-ahead` entries, run the check, and return the report
   table with every chapter edit listed — file, verdict row, what changed.

Never edit a source or test tree, and outside write mode write no devbook file: carrying the
plan in is a person's move. The protocol's **What is agreed** and **Evidence rules** bind every
step — no field the schema moved to tooling in either mode, no plan over an open change — and an open question belongs in review, posted by `chapter-review`, never written here.
