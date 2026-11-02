---
name: onboard
description: 'Walk a person through their first change in the change lane, one move at a time — pick a small real change, propose it with OpenSpec as devbook deltas, approve it, build its steps, verify, accept, and archive — saying at each stop what happened on disk and who acts next. Use when: new to the change lane, "how do I make a change with OpenSpec here", "walk me through a first change", "onboard me to OpenSpec". Triggers on: "devbook-openspec onboard", "first change", "show me the lane".'
---

# devbook-openspec onboard

Open the reply with `devbook-openspec@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

A guided first change, OpenSpec's word for this. It drives real skills on a real change and adds
no step of its own; the person makes every decision. Stop after each move, say what is now on
disk and who acts next, and continue only when the person says so.

**Before starting**, confirm `components.openspec` exists and `openspec --version` answers;
otherwise offer `devbook-openspec:init` and stop.

1. **Pick the change** with the person: small, real, touching one or two chapters. Not a
   rehearsal — a change nobody keeps teaches the lane nothing.
2. **Explore**, optionally: `/opsx:explore`, or the skill bound as `openspec.grill` when one is.
3. **Propose**: `/opsx:propose`. Show the four artifacts it wrote under
   `openspec/changes/<name>/`, and run `delta.mjs --check <name>` together.
4. **Approve**: the person approves the change in the host that keeps its state, through
   `devbook.decision@1`. Point out that the approval is one record in that host, at the
   change's fingerprint, and that any later edit lapses it.
5. **Build**: `/opsx:apply`, which builds the change whole — a step marked
   `owner: me` is the person's. Show `devbook-openspec:status` between steps.
6. **Verify and accept**: `devbook:verify-change`, then the person accepts the change in the
   same host.
7. **Archive**: `devbook-openspec:archive`, and show the merged chapters.

End with what the person now knows how to do alone, and where each rule lives:
`devbook-changes.md` for the shape, `devbook-openspec-change.md` for what OpenSpec does in it.
