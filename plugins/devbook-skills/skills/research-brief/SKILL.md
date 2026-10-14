---
name: research-brief
description: 'Answer one question about something outside the repository — an API, a library''s limits, a standard, pricing or quota — from primary sources only, every claim cited with a confidence, plus what the sources leave open. Writes nothing. Use when: an outside fact decides a scope, a decision record''s options, or a technology''s rating; "/research-brief", "check the official docs".'
---

# Research Brief

Open the reply with `devbook-skills@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Answer the question the caller asked, from the source that owns each fact, and say plainly
what stays unknown. Run the reading in a background agent when the host has one, so the
caller keeps working.

## Sources

- Primary only: the official documentation, the source code, the specification or RFC, the
  first-party API or changelog. Follow a secondary write-up back to the source it quotes;
  one that leads nowhere is not evidence.
- The version matters. Name the version, release, or date each source describes, and prefer
  the one the repository pins.
- Two primary sources that disagree are a finding: report both, never pick one silently.

## The brief

1. **Question**, restated in one sentence, with the version or context it is asked for.
2. **Answer**, in two or three sentences.
3. **Findings**: one claim per row — the claim, its source link with the section or line, and
   a confidence: `confirmed` (stated by the owning source), `inferred` (follows from what it
   states), or `unverified` (no primary source found).
4. **Not answered**: what the sources leave open, and what would settle it.

A claim without a source is not written. Keep the brief to the question; a neighbouring
finding goes under *Not answered* as a lead.

## Writes nothing

Return the brief to the caller and stop. Where it lands is theirs: a decision record's
options through `flow-spec`, `openspec/changes/<id>/research.md`, a ticket, or the chat.
