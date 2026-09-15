---
name: propose-change
description: 'Turn an agreed devbook chapter the code does not yet satisfy into a change brief — outcomes, invariants, ubiquitous language, out of scope, acceptance checks — plus one change category (new functionality, change to existing behaviour, defect), then stop. Covers five kinds: an aggregate whole or a domain service in .domain/<context>/domain.md, a feature in features.md, the building block view in .arc42, a component guideline in .design. Reads code only to establish what already exists, so the brief asks for the delta; never edits a source or test tree, never names a delivery flow. Use when: build the aggregate we agreed, build this chapter, the chapter says X and the code does not, change brief. DO NOT USE FOR: writing a chapter from code (sync-specs), or checking drift without a brief (verify-change).'
disable-model-invocation: true
---

# propose-change

Read `assets/code-sync-protocol.md` first, then the kind's file under
`assets/spec-kinds/`, then the folder rule that file names. Nothing in them is
repeated here.

**Kind.** One kind and one chapter per run, decided as `sync-specs` decides it:
the chapter's `type`, or the file where the folder has none. An aggregate is
briefed whole, with everything it owns and the events it raises. A chapter that
does not exist is a modelling task for the folder's flow, or a `sync-specs`
pass if the thing is already in code.

**Inputs.** The chapter as `<path>#<heading-slug>` or by heading, the bounded
context where the kind has one, and the repository root.

## Steps

1. Load the protocol, the kind's file, and its folder rule. Read the chapter,
   everything the kind's file says comes with it, and nothing more.
2. Apply the status gate, per chapter where the kind has sub-chapters:
   `approved` and `active` proceed; `draft` or `proposed` stops to confirm —
   say what the chapter claims and that it is not agreed, then ask whether to
   build it as written or settle it first; `deprecated` stops.
3. Resolve the counterpart by the protocol's ladder; record the rung. This
   picks the change category: no counterpart is `new functionality`, one that
   does less is `change to existing behaviour`, one believed to satisfy an
   agreed chapter and not doing so is `defect`.
4. Read what exists, tests included, closely enough to say which claims are
   already met. A passing test asserting a rule means it holds — asking again
   is noise. A disabled test or a TODO means unbuilt. Look for the concept held
   as a bare primitive as well as under its own type.
5. Reach a verdict per chapter. `spec-ahead` is the case this skill exists for.
   `aligned`: stop and say so. `code-ahead`: stop and hand the scope to
   `sync-specs` — stale, not unbuilt. `conflict`: stop and ask; a conflict never
   becomes a `defect` brief on this skill's own authority.
6. Assemble the brief per the protocol, with the kind's file supplying the
   language, the out-of-scope list, and the shape of the acceptance checks.
   Quote every invariant row with its `Enforced at`; name an `open` row as a
   decision, never as work. An update brief lists where the current behaviour
   lives.
7. Emit the brief and stop. No source file opened for editing, no test created,
   no flow named — which flow picks the brief up is the user's decision.
8. Close with the protocol's report table, one row per chapter in scope, with
   the brief attached.

## Do not

- Do not edit the chapter: a wrong chapter is a verdict, not an edit.
- Do not carry an `annotation` fence into the brief: an open question is a
  reason to stop at the gate, not a line item to implement.
- Do not summarize invariants by reference, or drop a row's `Enforced at`.
- Do not choose a representation, persistence, dispatch, layout, or library.
