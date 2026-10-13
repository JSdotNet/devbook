---
name: prototype
description: "Settle one design question that talk will not settle with a throwaway, clickable, standalone HTML prototype, and return a one-line answer beside it — a state model someone can drive through its edge cases, or structurally different screen variants on this repository's demo template and in its design system — or revise an existing demo with its screen ids kept. Use when: 'prototype this', 'mock it up', 'show me what it could look like', 'does this state model hold', 'change this demo', a lifecycle with edge cases nobody can hold in their head, or a screen someone needs to see more than one way. DO NOT USE FOR: finding why existing code misbehaves (diagnose), or building a design already settled (flow-code)."
goal: "Start only from a design question stated in one sentence, write that sentence into the file's demo-meta as its question, and end with a one-line answer for whoever asked, never recorded in the file — which carries no stage, status, verdict, or page. Deliver one standalone HTML file, every style, script, and image inline and nothing fetched. A logic question gets a model anyone can drive: a state panel labelled in the ubiquitous language, free play, and walkthroughs. A UI question gets two or more structurally different variants on the repository's demo template, its managed region kept byte for byte and no script outside it but demo-model and demo-meta, in its design system, naming the guideline, token, or story each convention came from. Given an existing demo, keep every screen id and anchor that still exists and list the ones removed or renamed. The prototype is never merged: write into no .devbook/ folder and change no source file."
---

# Prototype a Design Question

Write throwaway code that answers one question, then hand back the answer. **Edit this file** —
where the conventions live, where prototypes are kept, and what a prototype shows are yours; the
goal in the wrapper is not.

## Name the question

State the question in one sentence before writing anything: *does the refund lifecycle survive a
partial cancel?*, *list or board for the dispatch screen?* No question, no prototype — ask for
one. The sentence goes into the file, verbatim, and nothing else about the file does:

```html
<script type="application/json" id="demo-meta">{"question": "List or board for the dispatch screen?"}</script>
```

No stage, status, verdict, or page name in it, in a comment, or in the markup: the same bytes are
a prototype, a proposed demo, or the demo, and only where the file sits says which.

Then pick the mode the question is:

- **UI** — what a person sees and how they move between screens.
- **Logic** — how the model behaves: an aggregate's lifecycle, a rule set with edge cases nobody
  can hold in their head.

A question that is both is two prototypes.

### When not to prototype

- **The design is settled** — nobody is asking which, only for it to be built: that is
  `flow-code`. A prototype of an agreed design is a second implementation.
- **Existing code misbehaves** — that is `diagnose`.

## Read the conventions

<!-- Where this repository's language and look are written down. Replace the example rows;
     delete a row the repository does not have. -->

| Source | Where | Take from it |
| --- | --- | --- |
| Domain model | `.devbook/domain/<context>/` — `domain.md`, its `domain.invariants.md`, `flow.md`, the ubiquitous language | states, events, and invariants, named as the chapter names them (logic); the actors, flags, and settings `demo-model` keys by (UI) |
| Requirements | `.devbook/domain/<context>/requirements.md` | the `#### Scenario:` a free walkthrough plays, and its slug |
| Scenario pages | `.devbook/domain/<context>/*.md` with `type: scenario`; `node .devbook/_tools/scenarios/signature.mjs <page>` | the part a linked walkthrough shows, its steps' English text, and the page signature |
| Demo template | `.devbook/design/demo-template.html` | the managed region, copied byte for byte; the comment opening it is the authoring reference (UI) |
| Existing demo | `.devbook/domain/<context>/demo.html`, `<page>.demo.html` | the file a revision starts from, read and never written (UI) |
| Design system | `.devbook/design/` — principles, tokens, component guidelines; `src/Orders.Web/theme/tokens.css` | colour, type, spacing, and radius tokens; component anatomy and states; the do/don't rules |
| Storybook | `src/Orders.Web/**/*.stories.tsx`, run with `npm run storybook` | each component's rendered markup, its variants, and the copy and states the stories show |
| Existing screens | `src/Orders.Web/Pages/` | layout, navigation, and how screens are composed |
| Prototypes | `prototypes/<slug>.html`, ignored by git | where this procedure writes — never under `.devbook/` or `openspec/` |

- A token or component the design system names wins over one a story or a screen improvises.
  With Storybook running, take a component's markup from its rendered story.
- Compose from components that exist; invent one only when none fits, and say which and why.
- No source for what is needed gets a plain, accessible default — say which convention was guessed.

## Write it throwaway

Throwaway is how the code is written: no tests, no persistence, no real API, no abstraction
beyond what the question needs, error handling only where the question is about errors. It fits
one sitting. Reaching for a test or a database means the prototyping has stopped; sprawl means
the question was too big — stop, split it, and say so.

A designer, product owner, or domain expert must be able to operate it from its labels alone.

One `.html` file. Styles inline, images as inline SVG or `data:` URIs. No `<link>`, no CDN, no
web font, no fetch — it opens from disk with the network off.

**Data at real density.** Hard-code as many rows, as long a name, as deep a history as the product
shows, and the empty, loading, and error states as the design system defines them. A screen
agreed over three tidy rows is not the screen people will use.

**Aim at 500 KB.** Inline SVG over a bitmap, one block of markup shared by the screens that
repeat it, and a split into page demos — `features.demo.html`, `features.checkout.demo.html` —
when one context's screens outgrow one file. Past 500 KB is allowed; say the size and why.

## UI mode: variants that disagree

- **Start from the template** at `.devbook/design/demo-template.html`, or from the existing demo
  when one is given. Keep the managed region between `template:begin` and `template:end` byte for
  byte. No template: build the app part alone and say the template is missing.
- **Two or more variants that differ in structure** — layout, navigation, what is on one screen
  versus several — never three tints of one card grid. Name each by its idea, as a `variants` key.
- Use the host's design skill for the visual work when the session has one: `/design` on Claude
  Code, or Impeccable's `critique` and `polish` on Copilot. The design system wins where they
  disagree, and a canvas is not the deliverable. When the host will not let this skill invoke
  it, ask the person to type it, and wait.
- **Screens as markup.** Each screen or state is a `<section id="…" data-screen>`, a state
  carries `data-state`, a design variant `data-variant`, and an element someone may comment on
  `data-anchor`. Move between screens with `href="#id"`; use `<dialog>`, `popover`, and native
  form validation. No `<script>` outside the region except `demo-model` and `demo-meta`.
- **`demo-model`** lists every screen id and anchor, the variants, and the roles, flags,
  settings, and viewports the panel switches, each by the same `key` as the repository's actors,
  flags, and settings.
- **Walkthroughs** are listed in `demo-model` by `id`, the happy path first, then each edge case.
  Where a scenario page part tells the journey, the walkthrough is **linked**: its own `id`,
  `part: "<page>.md#<part>"`, `signature` as the first field `signature.mjs` prints, and per step
  `step`, the part step's 1-based index, with that step's English text copied into `text`.
  Otherwise it is **free**: its id the slug of the `#### Scenario:` it plays —
  `a-declined-card-keeps-the-basket` — each step's `text` the scenario line it shows.
- **Trim to the chosen variant only when the file is carried into `domain/`**: drop every other
  variant's markup and `demo-model` entries, keep the chosen one's ids and anchors, and list what
  went. Until then every variant stays.
- **Revising a demo:** keep every id and anchor that still exists; rename none without cause.
  Re-copy every linked walkthrough's `text` and `signature` from its page as it is now, and link
  a free walkthrough to the part of a scenario page that now tells its journey, keeping its id.
- Semantic HTML, labelled controls, visible focus, the contrast the design system requires.

## Logic mode: a model to drive

- **The model apart from the page.** One `<script id="model">` holds state, the events, and a
  pure `next(state, event)` — no DOM in it — so a model the answer validates reads straight into
  the real code. Rendering lives in its own script.
- **State panel.** Every field of the current state, labelled in the ubiquitous language as
  `domain.md` spells it, and each invariant with a live held/broken mark.
- **Free play.** One button per event, disabled with the reason when the state refuses it.
- **Walkthroughs.** One tab per scenario the question turns on, stepping through named events —
  the happy path first, then each edge case, the one that settles the question last.
- Styled plainly; the template and design system are optional here.
- **The file is never carried into a proposal.** It is code. Its answer lands as a delta to
  `domain.md`, `flow.md`, or an invariants subpage, through `flow-spec`.

## Deliver

- Open it in the host's inline browser when it has one; otherwise give the path.
- **The answer, one line, first**, for whoever asked — never written into the file. Then where it
  lands: a UI answer as the file itself, carried into `domain/` as a demo with one variant — in a
  `flow-spec` pull request or by a proposal, its author's choice; a
  logic answer as a delta to `domain.md`, `flow.md`, or an invariants subpage; or nowhere, the
  file kept as evidence of what was tried. A person decides; the answer is a proposal until they do.
- Then the path, the size, the screens or walkthroughs shown, per convention the guideline,
  token, or story it came from, every convention guessed, and — for a revision or a trim — the
  ids and anchors removed or renamed.

## Never

- Write into `.devbook/` or `openspec/`. A person carries the answer there, never this procedure.
- Write a stage, status, verdict, or page name into the file.
- Change a source file, a story, or a guideline to make the prototype fit. A gap is a finding.
- Merge the prototype, harden it, or present it as the implementation.
- Load anything from the network, or make one file need another to open.
