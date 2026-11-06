---
name: show-me
description: 'Explain with a picture before prose: pick the diagram, tree, signature, diff, or table that shows the content, put it first, and keep the words to what it cannot say. Use when: explaining code, a change, a plan, or a design; writing a PR description or a stage report; handing work back or asking for a decision; a chapter section describing steps, states, parts, or files; "/show-me", "too much text".'
---

# Show Me

Open the reply with `devbook-skills@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

This file exceeds the 40-line body budget on purpose: the card's shape and its alignment rules
hold only when read together.

## Orientation card

Open a reply or a tracker comment that hands work back, asks for a decision, or reports a
finished change with this card, after any version line and above any picture. The person is arriving from another session.

```text
devbook / writing rule / Personal Validation
WHAT     Chapters must use fewer words; prose-check measures it
CHANGED  Rule cuts before moving; prose-check gains two classes
YOU      Approve or revise, about 2 minutes
RISK     Two-way door; nothing pushed
```

- Open with repository, change, and stage, in a `text` fence.
- Pad each label to nine characters so every value starts in one column. Keep each value to one
  line of about 70 characters.
- Use no progress bars, box characters, arrows, or columns inside a value: they shift the
  alignment between fonts.
- `YOU` names the one thing needed, or `nothing`. `RISK` names the door and what left the
  machine. `CHANGED` says `none` when nothing changed.
- Skip the card for one fact, one answer, a reply mid-task, or a run nobody is present for.

## Pick the picture

| The content describes | Show |
| --- | --- |
| Steps in order, or a request passing between parts | Mermaid `sequenceDiagram` or `flowchart` |
| Something that moves through states | Mermaid `stateDiagram-v2` |
| Parts and how they connect | Mermaid `flowchart` or `classDiagram` |
| Files or folders and what each is for | A shallow tree in a code block, one short label per entry |
| The shape of a type, an interface, or a function | Its signature as fenced code, body omitted |
| What changed in an existing structure | A fenced `diff` with only the lines that moved |
| How control passes through functions | An indented call stack, one call per line |
| An algorithm or a decision rule | Five to ten lines of pseudocode |
| Options or items compared on the same points | A table |

Content with no shape (one fact, one answer, one instruction) gets one plain sentence, or a
fragment in a live reply.

## Rules

- In a live reply to a person, be extremely concise: fragments are fine, lead with the answer.
  Keep full sentences in a confirmation, a question the person must answer, a chapter, a pull
  request description, and a tracker comment.
- Put the picture before the prose. The prose after it gives the reasons, the exceptions, and
  the limits. Never narrate the picture part by part.
- Keep a diagram to about nine nodes. Split a larger one by concern rather than shrinking the
  labels.
- Label with the names the code and the glossary use. Never coin a name for the picture.
- Use plain Markdown only: Mermaid, fenced code, and tables, which render on both hosts and on
  GitHub. Never use ASCII art for something Mermaid can draw.
- One picture per idea. A second picture of the same thing is noise.
- The caller's structure wins. A chapter keeps the sections its folder rule names, a pull
  request keeps the repository's template, and a stage report keeps the engine's fields. This
  skill decides how each part reads, never which parts exist.
