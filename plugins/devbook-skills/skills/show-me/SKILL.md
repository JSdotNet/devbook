---
name: show-me
description: 'Explain with a picture before prose: pick the diagram, tree, signature, diff, or table that shows the content, put it first, and keep the words to what it cannot say. Use when: explaining code, a change, a plan, or a design; writing a PR description or a stage report; a chapter section describing steps, states, parts, or files; "/show-me", "too much text".'
---

# Show Me

Open the reply with `devbook-skills@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

Show the shape first, then say only what the shape cannot. A person takes in a picture faster
than the paragraph describing it.

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

Content with no shape (one fact, one answer, one instruction) gets one plain sentence.

## Rules

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
