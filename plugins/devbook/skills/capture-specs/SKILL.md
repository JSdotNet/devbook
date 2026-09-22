---
name: capture-specs
description: 'Read an implementation and its tests and plan the devbook chapter that is missing, thin, or stale, for any of six kinds — an aggregate whole (root, owned entities, value objects, enums, the events it raises) or a domain service in .devbook/domain/<context>/domain.md or a domain.<name>.md split from it, a feature in features.md or a split of it (this one runs the application), a feature flag or setting in context.md, the building block view in arc42/, or a component guideline in design/ — with the invariants their unit tests establish and the requirements their e2e tests do. Use when: the code has something the chapter does not, a chapter is missing, a stub, or stale, an event is raised with no chapter, a feature shipped that features.md does not list, projects were restructured, a library is in use with no guideline, document what we built, capture from code, domain/ is stale. Delivers a capture plan as a Markdown artifact and writes nothing — no chapter, no source, no test. DO NOT USE FOR: implementing an agreed but unbuilt chapter (apply-change), or checking drift without planning a chapter (verify-change).'
---

# capture-specs

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Read `assets/code-sync-protocol.md` first, then the kind's file under
`assets/spec-kinds/`, then the folder rule that file names. Nothing in them is
repeated here.

**Kind.** One kind and one target per run. The chapter's `type` decides it —
`aggregate` (with its owned `entity`, `value-object`, `enum`, the shared
groupings, and its `domain-event`s), `domain-service` (with the events it
raises itself), `feature` and `sub-feature`, `feature-flag` and `setting` (one
kind, `setting`, for both levels) — and the file decides it where the
folder has no `type`: `.devbook/arc42/05-building-block-view.md` and a file under
`.devbook/arc42/building-blocks/` are `building-block`,
`.devbook/design/component-libraries.md` is `design-component`. Starting from code with
no chapter yet, take the kind the user names, or infer it from the code's shape
and say so. Any other chapter is out of scope: say which flow owns it.

**Inputs.** The target — a chapter as `<path>#<heading-slug>` or heading, or a
code type; either end resolves to the other — the bounded context where the kind
has one, and the repository root. The kind's file lists what else it needs.

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
5. Draft the content to the folder rule's template, as the kind's file says:
   the invariants with the `Enforced at:` line and the requirements as SHALL
   sentences, each with its `#### Scenario:` cases and the evidence behind it.
   Put the tests that assert each one in `tests`. Where a counterpart resolved
   by inference, propose a term with the code name as an `alias`.
6. Assemble the capture plan — the drafts as a delta against the target file,
   `ADDED` / `MODIFIED` / `REMOVED` by heading, per **The capture plan** in the
   protocol — and close it with the protocol's report table, one row per
   chapter in scope, `aligned` rows included.
7. Deliver the plan to the person as a Markdown artifact, and stop there.

## Do not

- Do not write a devbook file, and never edit a source or test tree. The plan
  is the result; carrying it into a chapter is a person's move, through the
  folder's flow.
- Do not put a `status` line in the plan, for a new chapter or an existing one.
  Code is evidence, not agreement, and a status is a decision a person makes.
- Do not plan over a chapter someone is still deciding about. Where the target
  is a `draft`, report what the code has beside what the draft says and propose
  no replacement for it.
- Do not write an `annotation` fence: an open question belongs in review.
- Do not treat a comment, a TODO, a docstring, or a disabled test as evidence.
