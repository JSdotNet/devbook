---
name: devbook-ai
description: Structure and authoring rules for the AI devbook folder, recording how this project develops with AI — which practice, agent, skill, or model is applied at which stage of the development flow, the concepts underneath them, and how far adoption has actually got.
---

# AI adoption (`.ai`)

`.ai` is the durable record of **how this project develops with AI** — which AI
capability is applied at which position in the development flow, what concepts
it rests on, and how far adoption has actually got.

It is organized by the **flow**, not by the tool. The question `.ai` answers is
"at this point in how we work, what do we use AI for, and is that real yet?".
The question it does not answer is "what is Claude Code and which version are we
on" — that is `.tech`.

> `.ai` describes how **we build the product**. AI shipped **inside** the
> product — a model call in a feature, a retrieval pipeline the user hits — is
> ordinary architecture and belongs in `.arc42`, `.domain`, and `.tech`.
> Cross-link with `related` where the two touch, and keep the boundary sharp:
> an agent that reviews our pull requests is `.ai`; an agent the customer talks
> to is product.

## The boundary with `.tech`

**`.tech` stays the registry.** An AI tool with a vendor and a version — Claude
Code, an MCP server, a model provider, a CI agent — is registered as a `.tech`
chapter like any other technology, with `.tech`'s `status` recording its maturity
as a technology in this project.

`.ai` never re-registers it. A `.ai` chapter names the **usage**: the practice,
the agent persona, the skill, the guardrail — the thing that exists only because
of how we chose to work — and points at the registered technology with
`depends-on`.

| Fact | Folder |
|---|---|
| "We use Claude Code, version X, `adopted`" | `.tech` |
| "At Specify we draft devbook chapters with the devbook skills, `trial`" | `.ai` |
| "The coding agent persona, and when we hand work to it" | `.ai` |
| "Anthropic's API is a service dependency of the build pipeline" | `.tech` |
| "Every agent-authored change is reviewed by a human before merge" | `.ai` |

The test: **if it has a vendor and a version, it is a `.tech` chapter.** If it is
a decision about how we work, it is a `.ai` chapter. A `.ai` chapter whose
`depends-on` points at nothing in `.tech` is usually fine — most practices,
concepts, and guardrails have no product behind them.

## Context-loading policy

- `.ai` is **not** baseline repository context. Load it when the task is about
  how the team works with AI — adopting a tool into the flow, changing a
  practice, reviewing adoption, onboarding someone into the way of working.
- When `.ai` is needed as task context, load `adoption-map.md` plus only the
  stage files in scope, not the whole folder.
- An agent does **not** read `.ai` to decide how to do its own current task.
  These chapters are the record of a way of working, not instructions to follow;
  instructions live in instruction files and skills.

## Structure

```
.ai/
  adoption-map.md       # root: the flow, the stage table, the adoption diagram
  01-<stage>.md         # one file per stage of the development flow
  02-<stage>.md
  …
  concepts.md           # cross-stage concepts and practices
  _meta/graph.json      # derived: generated reference graph, never hand-edited
  _meta/index.json      # derived: generated reading outline, never hand-edited
```

**Stage files are numbered, and the number is the flow.** `01-discover.md`,
`02-specify.md`, `03-build.md`, `04-verify.md` — the number is what makes the
folder read in the order the work actually happens instead of alphabetically.
Reading order needs no declaration: `adoption-map.md` is the root document and
sorts first, the numbered stage files follow in flow order, and `concepts.md`
sorts after them. See `devbook-chapter-metadata.md`.

**The stage set is the repository's own.** This convention does not prescribe
one — a team shipping a library and a team shipping a product do not share a
flow. Choose the stages the work really has, keep the set small enough that
every stage has content, and register them in `adoption-map.md`'s stage table in
the same change that adds a file.

## File responsibilities

- **adoption-map.md** — Root strategic view of AI across the flow.
  - Lists the stages and what each stage file covers.
  - Renders the adoption picture as a Mermaid diagram: stages in flow order,
    with the chapters that sit at each one.
  - Explains the status ladder and how to read and extend the folder.
  - Its `##` sections do **not** carry per-chapter metadata blocks; the file
    carries a file-level block only — the same rule as `.domain/context-map.md`
    and `.tech/technology-graph.md`.
- **`<nn>-<stage>.md`** — One `## <Chapter Name>` chapter per thing used at that
  stage. Each chapter is an addressable node in the graph and carries a chapter
  metadata block. A chapter here needs no `stage` field: the file is the stage.
- **concepts.md** — The ideas the practices rest on, and anything that genuinely
  spans the flow. Chapters here carry a `stage` field naming where they apply.
- **`_meta/*.json`** — Derived, generated indexes for this folder. Never
  hand-edited; see `devbook-derived-artifacts.md`.

## Chapter template

````markdown
## <Chapter Name>

```meta
status: trial
type: practice
depends-on: [".tech/tooling.md#claude-code"]
related: [".ai/concepts.md#context-engineering"]
```

One or two sentences: what this is, in this project.

- **Used for** — the concrete work it carries at this stage.
- **Adopted by** — who actually works this way today, and where. This is the
  field that keeps `status` honest.
- **Evidence** — what shows it works, or what would have to be true to promote
  it: a merged pull request, a measured cycle, a retro. `none yet` is a
  legitimate value and a useful one.
- **Limits** — where it is deliberately not used, and why.
````

Keep chapters short. A chapter is a graph node with enough context to be
understood and judged, not an essay about AI.

## Metadata fields

`.ai` uses the common fields from
`devbook-chapter-metadata.md` (`status` and `type` required;
`related`, `issue`, `effort`, `roadmap`, `date`, and `tests` optional) plus the
folder-specific fields below.

### status

How far adoption has got **for this usage, in this project**, on the same
tech-radar ladder `.tech` uses — deliberately the same five words, so a reader
learns one adoption vocabulary and applies it in both folders:

| Value | Meaning |
|---|---|
| `candidate` | Identified as worth trying here. Nobody has actually used it. |
| `trial` | In use in a limited, reversible way — one person, one branch, one project. |
| `adopted` | The default way this part of the flow is done here. |
| `hold` | Kept, but no longer expanded; avoid new usage. |
| `retired` | No longer used. Kept because knowing what we stopped doing, and why, is the most useful record in this folder. |

On top of this ladder sits the shared `approved` rung, defined once in
`devbook-chapter-metadata.md`: a person approved this chapter,
recorded with `approved-by` and `approved-at`. It is written explicitly and
comes off the moment the content changes.

**`status` is required on every `.ai` block, with no resting value to omit** —
for the same reason as `.tech`, whose ladder this is: the value is a rating, and
a usage nobody has rated is not thereby `candidate`. It is *not* the editorial
status that `.domain`, `.arc42`, and `.design` make optional.

What is on the ladder differs between the two folders: `.tech` rates a
**technology**, `.ai` rates a **way of working with one**. A tool can be
`adopted` in `.tech` and its use at a given stage still be `trial` — that pairing
is normal and is exactly what this folder exists to make visible.

Early in adoption most entries are legitimately `candidate` or `trial`. Resist
promoting a chapter to `adopted` because the tool is good; promote it when the
**Adopted by** line says the team actually works this way.

A `retired` chapter is never deleted. What was tried and abandoned is the part of
this record nobody can reconstruct later.

### type

What kind of thing the chapter describes. Required on every chapter.

| Value | For |
|---|---|
| `practice` | A way of working at this stage — how work is handed over, what the human does, what the agent does. |
| `agent` | An agent persona used here, and what it is trusted with. |
| `skill` | A skill or slash command that carries part of this stage. |
| `plugin` | A plugin whose contribution to this stage is worth naming as a unit. |
| `mcp-server` | An MCP surface the flow depends on at this stage. |
| `hook` | An automation that fires without anyone asking — the strongest form of adoption, and the one most worth recording. |
| `workflow` | A multi-agent or multi-step procedure. |
| `model` | A model choice that is a real decision at this stage, not the default. |
| `concept` | An idea the practices rest on — context engineering, evaluation, prompt patterns. Belongs in `concepts.md`. |
| `guardrail` | A limit or control: a review gate, a permission policy, what agents may not touch. |

File-level `type` is one of `adoption-map`, `stage`, or `concepts`, matching the
file's role.

Prefer `practice` when in doubt. A chapter that names a tool but says nothing
about how it is used is a `.tech` chapter that wandered into the wrong folder.

### depends-on

References to what this usage requires to work: the registered `.tech` chapter
for the tool underneath it, or another `.ai` chapter it builds on. Uses the
`<path>#<heading-slug>` reference format, and produces a graph edge.

This is the one field that crosses into `.tech`, and it crosses in one
direction only — `.tech` chapters never point back at `.ai`. A dependency that
does not resolve is a broken reference and fails the check, so register the
technology in `.tech` first.

### stage

The stages a chapter applies at, as a list of lowercase kebab-case slugs naming
this repository's own stage files: `stage: [specify, build]`.

Entries are **plain slugs, not `<path>#<heading-slug>` references** — like
`.domain`'s `aliases` and `roadmap` tags, they stay node attributes and produce
no graph edges.

**Omit it in a stage file**, where the file already says the stage and the field
would only restate it. Use it in `concepts.md`, and on anything else that
genuinely spans the flow. A concept that applies everywhere carries no `stage`
rather than listing every one.

## Authoring guidance

- **One chapter per thing that could be adopted or dropped on its own.** If two
  chapters would always be promoted together, they are one chapter.
- **Put a usage at the stage where it is used**, not where the tool is
  configured. A hook that fires on commit belongs at the stage whose work it
  guards.
- **Something used at three stages is three chapters or one concept**, not one
  chapter with a hedge. If the usage differs per stage, write it per stage; if
  it is one idea applied throughout, it is a `concept` with a `stage` list.
- **Keep `status` honest, and let it go down.** A demotion — `adopted` back to
  `trial`, or straight to `retired` — is the most informative edit this folder
  ever takes. A folder where nothing was ever demoted is a wish list.
- **Record what was dropped.** Set `retired` and say why in the chapter's prose
  rather than deleting it.
- **Register the tool in `.tech` first**, then link it with `depends-on`. Do not
  restate its version, vendor, or licence here — that duplicates a fact with a
  version number attached, which is exactly the kind that goes stale.
- **Update `adoption-map.md`'s stage table and diagram in the same change** that
  adds, renames, or removes a stage file.
- Date a chapter with `date` when the adoption decision is itself the record —
  when a trial started, when something was retired.

## Reference

- `devbook-chapter-metadata.md` — required `meta` block fields.
- `devbook-tech.md` — the technology registry `.ai` links into.
- `devbook-derived-artifacts.md` — rules for `_meta/`.
