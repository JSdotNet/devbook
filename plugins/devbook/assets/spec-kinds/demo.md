# Kind: demo

What `capture-specs`, `apply-change`, and `verify-change` need to know about a
click demo that `assets/code-sync-protocol.md` does not already say. The
protocol carries the resolution ladder, the evidence rules, the five verdicts,
the status rules, the brief contract, and the report table; this file carries
the kind.

| | |
|---|---|
| Chapters | None of its own: a `*.demo.html` file, addressed by screen and walkthrough per `resources/demo-address.md` |
| File | `.devbook/domain/<context>/demo.html`, `<page>.demo.html`, or any other `*.demo.html` a chapter's `demo` field names |
| Folder rule | `devbook-domain.md`, with `devbook-chapter-metadata.md` for the `demo` field |
| Context to load | The demo's `demo-model`; the page it pairs with and every chapter whose `demo` field names it; the requirements those chapters own, with their `#### Scenario:` cases and `tests`; the scenario page part every linked walkthrough's `part` names; `domain.md`'s ubiquitous language for the copy |
| Plan target | None. Only `/prototype` writes a demo; it reaches `domain/` directly in a `flow-spec` pull request or as a demo delta of a change, per `devbook-domain.md` |
| Index scope | `--scope domain` |
| Extra input | The front end that renders the screens, the e2e tests the requirements' `tests` name beside their free walkthroughs, and the page signature `.devbook/_tools/scenarios/signature.mjs` prints for each linked walkthrough's page, with `--scenario-folder` per `assets/code-sync-protocol.md` |

## It rides with its page

A demo is no sync unit and carries no `meta` block, `status`, or `sync` of its
own. It belongs to the unit of the page it pairs with — `demo.html` to
`context.md`, `<page>.demo.html` to `<page>.md` — and to the unit of every
chapter whose `demo` field names it. A run whose scope holds such a chapter
reads the demo through this file beside that chapter's own kind, and a run
given a demo by path takes this kind. Its effective `sync` and its status are
the page's, or the naming chapter's: a demo placed by a `draft` page is a
sketch, and its verdicts carry `unagreed`.

What the demo is the source of truth for, and what it is not:

| Question | Answered by | When the demo disagrees |
|---|---|---|
| What a rule guarantees | `requirements.md`, the invariants subpages | The rule wins: a `conflict` inside the spec, resolved by a new prototype of the demo |
| What a thing is called | `domain.md`'s ubiquitous language | The language wins, as above |
| Colour, type, spacing, component anatomy | `design/` | The guideline wins, as above |
| Which screens exist, how a person moves between them, their copy, and their empty, loading, and error states | **The demo** | The demo wins; the code conforms to it |

The managed region is the template's and is never evidence: compare the app
part, `main[data-demo-app]`, and `demo-model` only.

## Counterpart ladder

Before the protocol's rungs, pair each screen through the chapters that place
the demo: the feature or requirement naming an address resolves to its code by
its own kind, and the screen's counterpart is the route, page, or component in
that code that renders it. Then try the screen's `id` and its `title` in
`demo-model` against route names and component names. A screen with no single
match is `unresolved`. A free walkthrough pairs with the e2e test its
requirement's `tests` names; one with none pairs only through its screens. A
linked walkthrough pairs with the scenario page part its `part` names, never
with a test file: the page is the test, and its run proves it.

## Mapping

| Demo element | Evidence when verifying | What building it requires |
|---|---|---|
| A screen, `section[data-screen]` | The route, page, or component that renders it, reachable the way the demo reaches it | The screen reachable from where the demo reaches it — check navigation and guards |
| A state, `data-state` on a screen filed `of` another | The branch that renders it: empty list, loading, error, refused | The state rendered under the condition the demo shows — the most easily dropped part |
| Copy | The interface strings, in the language `domain.md` declares | The demo's words, verbatim where it names a domain term |
| A `data-anchor` | The element a test or a person targets | The element present, with the role and label the demo gives it |
| Role, flag, setting, viewport in `demo-model` | The checks that gate the screen in code, by the switch chapters' `key` and the actors' `role` | Each switch gating what the demo shows under it |
| A free walkthrough | The e2e test its requirement's `tests` names, read step against step | The path played end to end, each step's `text` an assertion the test makes |
| A linked walkthrough | The part's steps, each `step` index against the step it names and its `text` against that step's text; its `signature` against the page's | The part's journey played end to end; the page's run proves it |

## Capturing — `capture-specs`

Capture never writes a demo, in either mode. A screen, state, or step the code
has and the demo lacks is `code-ahead`: the plan names it by address and hands
it to `/prototype`, with the current demo as input and its ids kept, so a change
can carry the revision. In write mode the entry is reported and left; nothing
is carried into the HTML. A demo is never drafted from code: a demo made by
reading the app is a screenshot of it, and code never leads.

## Applying — `apply-change`

A demo is agreed when the page or chapter that places it is, and its fingerprint
is part of that approval. The brief quotes each address in scope and turns it
into acceptance checks: the screen reachable, each state rendered under its
condition, the copy as written, every free walkthrough's steps as an e2e path,
and a linked one as its part, proved by the spec derived from the page. The
demo stays the reference the built work is compared with at Personal Validation.
Out of scope: the managed region, the panel, variants, and anything the demo
shows that a requirement or `design/` contradicts — that is a `conflict` to
settle first.

## Verifying — `verify-change`

One row per screen and per walkthrough in scope, the **Chapter** column carrying
the demo address. Read the front-end code and the e2e tests as files; start
nothing. `aligned` when the code renders the screen and its states with the
demo's copy; a free walkthrough when its test drives the same steps, and a
linked one when its `signature` is the page's and every step's `text` is the
part step its `step` names. A linked walkthrough whose `signature` is not the
page's is **`stale`** until `/prototype` re-copies its text, a qualifier like a
stale run's and not a sixth verdict. List each after the protocol's scenario
page table, or the line "No stale walkthroughs.":

| Walkthrough | Part | Walkthrough signature | Page signature | Action |
|---|---|---|---|---|
| `.devbook/domain/ordering/features.demo.html#walkthrough/declined-card` | `pay-at-checkout.md#a-declined-card-keeps-the-basket` | `51d0b7e3` | `9c41e2a0` | `/prototype` re-copies the text |

`spec-ahead` when the demo shows what the code does not build. `code-ahead`
when the code shows a screen, state, or step no demo has — a UI change that
started in code, with no demo revision. A demo contradicting a requirement or
the language is `conflict`, whatever the code does.

## Do not

- Do not write, edit, or trim a demo, in any mode or direction.
- Do not read the managed region or the control panel as product.
- Do not let a demo override a requirement, an invariant, a term, or a
  `design/` guideline.
- Do not give a demo its own status, `sync`, or unit.
