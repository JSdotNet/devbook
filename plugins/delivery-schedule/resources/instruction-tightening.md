---
name: instruction-tightening
description: What schedule-instruction-review reads, what it looks for, what it may cut or rewrite, and what stays in full — the default standard applied where a repository states no authoring rule of its own.
---

# Instruction Tightening

An instruction asset is a Markdown file a model loads as instructions. Every sentence costs
context on every load, and a hedged or duplicated rule is one that does not fire. This is the
standard `schedule-instruction-review` applies; a repository's own authoring rule — an
`AUTHORING.md` at the root, or a rule whose description says it governs authoring — replaces
the *Standard* section below and nothing else.

## Scope

| In | Where |
| --- | --- |
| Repository instructions | `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, at the root and in any folder |
| Rules | `.agents/rules/*.md`, `.claude/rules/*.md`, `.github/instructions/*.md`, `plugins/*/rules/*.md` |
| Skills | every `SKILL.md` |
| Agents | `*.agent.md`, `.claude/agents/*.md` |
| Prompts and commands | `.github/prompts/*.md`, `.claude/commands/*.md` |
| Contracts | `plugins/*/resources/*.md` carrying `name` and `description` |

Out: `.devbook/**` (chapters are content; `devbook:prose-check`
reads those), `README.md` and anything else read by people rather than loaded by a model, build
output, and a file that only points at another.

## Standard

1. **The no-op test.** Does the sentence change behaviour versus what the model does by
   default? When it does not, cut the whole sentence. Known no-ops: "be thorough", "remove
   ambiguity", "validate consistency", "keep content in English".
2. **One statement per rule.** A rule stated in two files is a copy that drifts: keep the one
   in the file that owns it, replace the other with a pointer by relative path.
3. **Positive phrasing.** "Pin every action to a commit SHA", not "avoid version tags". A
   prohibition stays only as a guardrail with no positive form, paired with the target.
4. **Slop.** Cut hedges ("you may want to consider", "it is worth noting", "as appropriate",
   "generally"), throat-clearing ("in this section we will"), "please", "make sure to", a
   sentence that restates its heading, a closing summary that repeats the body, and a third
   list item that adds no case the first two did not.
5. **Dead pointers.** A path, skill, or command that no longer resolves is fixed when the
   target is findable and reported when it is not.
6. **Budgets.** `SKILL.md` 40 body lines, a rule or a contract 60, an agent 80. Over is a
   report, never a cut-to-fit: the budget triggers a disclosure decision only a person makes.

## Cut and Rewrite

A *cut* deletes text and changes no remaining sentence. A *rewrite* replaces words. Cut
freely; rewrite one sentence at a time, and only where the meaning survives a re-read without
the original beside it. The run adds nothing but a pointer that replaces a duplicate.

## Stays in Full

- Frontmatter, whole: `name`, `description`, `tools`, and `paths` decide when a file loads.
- Confirmations before irreversible actions, and every rule about what a run never does.
- A sentence the file justifies — "stated here because", "over budget because" — and what it
  covers. A stated reason is a decision already taken.
- Code fences, tables, commands, URLs, and identifiers.
- Text between `<!-- <tool>:begin -->` and `<!-- <tool>:end -->`: another tool owns it, and an
  edit there makes its next reconcile report the section customized.
- A repetition the file marks as deliberate: a rule that says it survives a long session is
  meant to appear twice.
