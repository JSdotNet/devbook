---
name: apply-change
description: 'Implement an agreed devbook chapter the code does not yet satisfy: derive a change brief and hand it to the code-side flow, touching no source or test file. Any chapter kind, a page''s click demo included. Use when: build what we agreed, implement this chapter, the chapter says X and the code does not, apply the spec. DO NOT USE FOR: writing a chapter from code (capture-specs) or checking drift (verify-change).'
---

# apply-change

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Read `assets/code-sync-protocol.md` first, then the kind's file under
`assets/spec-kinds/`, then the folder rule that file names. Nothing in them is
repeated here.

**Kind.** One chapter, sync unit, or sync group per run, its kind decided as
`capture-specs` decides it: the chapter's `type`, or the file where the folder
has none. An aggregate is briefed whole, with everything it owns and the events
it raises. A chapter that does not exist is a modelling task for the folder's
flow, or a `capture-specs` pass if the thing is already in code.
A journey is no kind: it is evidence for the requirements whose cases point at its parts, per **A journey is evidence, not a kind** in the protocol.

**Inputs.** The chapter as `<path>#<heading-slug>` or by heading, or a sync unit
or group per **The sync unit** in the protocol; the bounded context; the root.

## Steps

1. Load the protocol, the kind's file, and its folder rule. Read the chapter,
   everything the kind's file says comes with it, and nothing more.
2. Apply the agreement gate, per chapter where the kind has sub-chapters, per
   the protocol's **What is agreed**: a merged chapter and an agreed open change
   proceed; an open change its host does not report agreed stops to confirm —
   say what it claims and that it is not agreed, then ask whether to build it as
   written or settle it first.
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
7. Hand the brief on per **Where the code-side write goes** in the protocol, and name the
   rung that answered, once.
8. Close with the protocol's report table, one row per chapter in scope, with
   the brief attached and the flow it went to.

A wrong chapter is a verdict, never an edit. An open review note is a reason to stop at the
gate, never a line in the brief.
