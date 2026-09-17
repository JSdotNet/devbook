---
name: prose-check
description: 'Read every adopted devbook folder and report the prose that does not earn its lines — a hedge in a sentence stating a fact, a paragraph restating its heading, a closing summary repeating the body, a term defined a second time outside the ubiquitous language, a name in prose that no longer exists in the tree — beside what devbook:check reports about structure. Writes nothing: the report is the output, and an edit is a person''s, through the folder''s flow. Use when: tightening chapters before a review, finding what a fold or rename left behind in prose, or on a cadence. Triggers on: "check the chapters'' prose", "what is stale in the devbook", "tighten the chapters", "prose check", "devbook prose".'
---

# prose check

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

`devbook:check` asks whether the Markdown satisfies the schema. This asks whether the prose
earns its lines, and answers with a report and nothing else. A chapter is content, not
instruction, so the standard here is narrower than an instruction tightening: a definition,
an invariant table, a record of a decision as it was taken all stay — only prose that says
nothing a reader needs, or names something the tree no longer has, is a finding.

This file exceeds the 40-line body budget on purpose: the class table in step 4 is the whole
standard, and a class stated by half reports the wrong sentence.

## Inputs

- Scope: every adopted folder (default), one folder, or one file.
- Limit: findings reported in full (default `50`); the rest are counted per class.

## Hard Constraints

- Writes nothing. Not a chapter, not an annotation, not `_meta/`. A finding becomes an edit
  only when a person makes it through the folder's flow, or a note through whatever review
  skill the repository has.
- Skips every `meta` and `annotation` fence, every code and Mermaid fence, and every table.
  A reader loading a chapter skips annotations; so does this one.
- Reports nothing a folder rule requires. The rule for the folder — `devbook-arc42.md`,
  `devbook-domain.md`, `devbook-tech.md`, `devbook-design.md`, `devbook-ai.md` — is read
  before the folder is, and a section the rule's template asks for is never a finding.
- Leaves `adr/` and `tdr/` out of the prose classes. A record names what existed on its
  date; a stale name there is history, and superseding is a `status`, not a rewrite.

## Steps

1. **Structure first.** Run `devbook:check` up to its report and take none of its repairs:
   this skill writes nothing, so every problem it reports is a `structure` finding here and
   the repair stays with that skill's own run. Exit `2` means the repository has not
   adopted devbook: say so and stop.

2. **Inventory.** List the chapters in scope from the adopted folders, `adr/` and `tdr/`
   set aside for step 4, and the names a chapter can point at: every skill folder, plugin,
   rule, and path the repository ships, so step 4 can test a name against the tree.

3. **Read each chapter with its folder's rule beside it.** Load the chapter and nothing
   else; a `related` edge is followed only to test a `second-definition`.

4. **Record a finding per hit**: chapter address (`<path>#<slug>`), line, class, the
   sentence, and a one-line suggestion.

   | Class | Hit when | Suggestion |
   |---|---|---|
   | `stale-name` | Prose names a skill, plugin, path, command, or flow the tree does not have | The current name, or "gone — cut the sentence" |
   | `second-definition` | A term the folder's ubiquitous language section defines is defined again elsewhere in different words | Point at the definition, cut the second |
   | `hedge` | "it is worth noting", "arguably", "generally", "in most cases", "somewhat" in a sentence that states a fact, a rule, or an invariant | The sentence without the hedge |
   | `restated-heading` | A section's first sentence paraphrases its heading | Cut it; start at the second sentence |
   | `repeated-body` | A closing paragraph repeats what the section already said | Cut it |
   | `structure` | Whatever step 1 reported | `devbook:check`'s own fix column |

   A hit inside protected text — a fence, a table, a section the rule requires, `adr/`,
   `tdr/` — is not a finding. A `stale-name` is tested against the tree, never guessed.

5. **Report.** One table per folder, findings ordered `stale-name`, `second-definition`,
   `structure`, then the prose classes, cut at Limit with the remainder counted per class.
   Close with the totals: chapters read, findings per class, and the standard applied — the
   folder rules by name. No findings is a one-line report, and the ordinary case for a
   chapter that settled.

## Notes

- Drift between a chapter and the code it describes is `verify-change`'s question, over the
  five chapter kinds it covers; this skill reads chapters only.
- A `stale-name` after a fold or a rename is the finding this skill exists for: the meta
  references moved with the chapter, the prose did not.
