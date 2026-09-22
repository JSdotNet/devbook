---
name: apply-change
description: 'Implement an agreed devbook chapter the code does not yet satisfy: derive a change brief from it — outcomes, invariants, ubiquitous language, out of scope, acceptance checks, plus one change category (new functionality, change to existing behaviour, defect) — and hand that brief to the code-side flow that covers the category, the way capture-specs hands a chapter to the folder flow. Covers six kinds: an aggregate whole or a domain service in .devbook/domain/<context>/domain.md, a feature in features.md, a feature flag or setting in context.md, the building block view in arc42/, a component guideline in design/. Reads code first so the brief asks only for the delta; edits no source or test tree itself, and stops with the brief when no flow engine is installed. Use when: build the aggregate we agreed, implement this chapter, the chapter says X and the code does not, apply the spec. DO NOT USE FOR: writing a chapter from code (capture-specs), or checking drift without changing anything (verify-change).'
disable-model-invocation: true
---

# apply-change

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Read `assets/code-sync-protocol.md` first, then the kind's file under
`assets/spec-kinds/`, then the folder rule that file names. Nothing in them is
repeated here.

**Kind.** One kind and one chapter per run, decided as `capture-specs` decides it:
the chapter's `type`, or the file where the folder has none. An aggregate is
briefed whole, with everything it owns and the events it raises. A chapter that
does not exist is a modelling task for the folder's flow, or a `capture-specs`
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
   `capture-specs` — stale, not unbuilt. `conflict`: stop and ask; a conflict never
   becomes a `defect` brief on this skill's own authority.
6. Assemble the brief per the protocol, with the kind's file supplying the
   language, the out-of-scope list, and the shape of the acceptance checks.
   Quote every invariant row with its `Enforced at`; name an `open` row as a
   decision, never as work. An update brief lists where the current behaviour
   lives.
7. Hand the brief to the code-side flow, per **Where the code-side write
   goes** in the protocol: a repo-native flow first, then the engine's flow for
   the category, and no flow at all when no engine is installed — then stop
   with the brief, which is the whole result. Name the rung that answered,
   once. This skill opens no source file for editing and creates no test.
8. Close with the protocol's report table, one row per chapter in scope, with
   the brief attached and the flow it went to.

## Do not

- Do not edit the chapter: a wrong chapter is a verdict, not an edit.
- Do not carry an `annotation` fence into the brief: an open question is a
  reason to stop at the gate, not a line item to implement.
- Do not summarize invariants by reference, or drop a row's `Enforced at`.
- Do not choose a representation, persistence, dispatch, layout, or library —
  the brief states what must be true, and the flow decides how.
