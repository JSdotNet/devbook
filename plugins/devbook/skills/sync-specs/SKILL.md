---
name: sync-specs
description: 'Bring a devbook chapter level with the code that implements it: read the implementation and its unit tests and write or refresh the chapter, for any of five kinds — an aggregate whole (root, owned entities, value objects, enums, the events it raises) or a domain service in .domain/<context>/domain.md, a feature in features.md (this one runs the application), the building block view in .arc42, or a component guideline in .design. Use when: the code has something the chapter does not, a chapter is missing, a stub, or stale, an event is raised with no chapter, a feature shipped that features.md does not list, projects were restructured, a library is in use with no guideline, document what we built, capture from code, .domain is stale. Routes the write through the folder''s flow and never edits source or tests. DO NOT USE FOR: turning an agreed but unbuilt chapter into work (propose-change), or checking drift without writing (verify-change).'
---

# sync-specs

Read `assets/code-sync-protocol.md` first, then the kind's file under
`assets/spec-kinds/`, then the folder rule that file names. Nothing in them is
repeated here.

**Kind.** One kind and one target per run. The chapter's `type` decides it —
`aggregate` (with its owned `entity`, `value-object`, `enum`, the shared
groupings, and its `domain-event`s), `domain-service` (with the events it
raises itself), `feature` and `sub-feature` — and the file decides it where the
folder has no `type`: `.arc42/05-building-block-view.md` is `building-block`,
`.design/component-libraries.md` is `design-component`. Starting from code with
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
3. Read the implementation, breadth first, then the unit tests as a step of
   their own. The kind's file says what to read and what the tests establish.
   Only code that executes and tests that pass are evidence.
4. Reach a verdict per chapter. `code-ahead` is the case this skill exists for.
   `aligned`: report and stop. `spec-ahead`: stop and hand the scope to
   `propose-change`. `conflict` or `unresolved`: stop and ask.
5. Draft the chapters to the folder rule's template, as the kind's file says.
   New chapters start at `status: draft`; an existing `status` is left exactly
   as it is. Put the tests that assert each chapter in `tests`. Where a
   counterpart resolved by inference, propose a term with the code name as an
   `alias`.
6. Route the write through the folder's flow, per **Where the spec-side write
   goes**; hand over the drafts, the evidence behind each claim, and the
   proposed terms. Name the rung that answered, once.
7. Regenerate and check the index at the kind's scope, per the protocol.
8. Close with the protocol's report table, one row per chapter in scope,
   `aligned` rows included.

## Do not

- Do not write a devbook file directly, and never edit a source or test tree.
- Do not write an `annotation` fence: an open question belongs in review.
- Do not drop or promote a `status` because the code exists — code is not
  agreement, and only the approval gate writes `approved`.
- Do not treat a comment, a TODO, a docstring, or a disabled test as evidence.
