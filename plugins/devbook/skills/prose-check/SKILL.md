---
name: prose-check
description: 'Report the prose in every adopted devbook folder that does not earn its lines or does not read — hedges, restated headings, repeated definitions, stale names, overlong sentences, a sequence told without a diagram. Writes nothing; edits go through the folder''s flow. Use when: tightening chapters before a review, a chapter is hard to read, finding what a rename left behind ("prose check").'
---

# prose check

Open the reply with `devbook@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Ask whether the prose earns its lines and reads as `devbook-writing.md` asks; the schema is
`devbook:validate`'s question and drift against code `verify-change`'s. A chapter is content,
not instruction: a definition, an invariant table, a decision as it was taken all stay, and
only prose that says nothing a reader needs, or names what the tree no longer has, is a finding.

This file exceeds the 40-line body budget on purpose: the class table in step 4 is the whole
standard, and a class stated by half reports the wrong sentence.

## Inputs

- Scope: every adopted folder (default), one folder, or one file.
- Limit: findings reported in full (default `50`); the rest are counted per class.

## Hard Constraints

- Writes nothing. Not a chapter, not an annotation, not `_meta/`. A finding becomes an edit
  only when a person makes it through the folder's flow, or a note through whatever review
  skill the repository has.
- Skips every `meta` and `annotation` fence, every code and Mermaid fence, every table, and
  every step list on a scenario page: a step is one clause by design, not a fragment.
- Reports nothing a folder rule requires. The rule for the folder — `devbook-arc42.md`,
  `devbook-domain.md`, `devbook-tech.md`, `devbook-design.md`, `devbook-ai.md` — is read
  before the folder is, and a section the rule's template asks for is never a finding.
- Leaves `adr/` and `tdr/` out of the prose classes. A record names what existed on its
  date; a stale name there is history, and superseding is a `status`, not a rewrite.

## Steps

1. **Structure first.** Run `devbook:validate` up to its report and take none of its repairs:
   every problem it reports is a `structure` finding here. Exit `2` means the repository has not
   adopted devbook: say so and stop.

2. **Inventory.** List the chapters in scope from the adopted folders, and the names a chapter can point at: every skill folder, plugin,
   rule, and path the repository ships, so step 4 can test a name against the tree.

3. **Read each chapter with its folder's rule and `devbook-writing.md` beside it.** Load the chapter and nothing
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
   | `telegraphic` | Clauses or list items chained with dashes, more than one dash in a paragraph, or a run of fragments such as "no X, no Y, no Z" | The same content as full sentences or a bulleted list |
   | `long-sentence` | A sentence past about 35 words, or carrying more than one idea | The sentence split |
   | `coinage` | A hyphenated or invented name, such as a "fill-run", that neither the glossary nor the ubiquitous language defines | The defined term, or "define it in the glossary" |
   | `missing-diagram` | A section narrates three or more steps, states, or connected parts in prose, with no diagram or table | The diagram kind `devbook-writing.md` names for it |
   | `structure` | Whatever step 1 reported | The fix in `devbook:validate`'s `repairs.md` |

   A hit inside text the constraints above protect is not a finding. A `stale-name` is tested
   against the tree, never guessed.

5. **Report.** One table per folder, findings ordered `stale-name`, `second-definition`,
   `structure`, then the prose classes, cut at Limit with the remainder counted per class.
   Close with the totals: chapters read, findings per class, and the standard applied — the
   folder rules and `devbook-writing.md` by name. No findings is a one-line report, and the ordinary case for a
   chapter that settled.
