# 68. Configuration May Steer a Stage in One Line

```meta
status: proposed
date: 2026-09-15
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#stack-config", ".devbook/arc42/adr/10-one-config-file-two-kinds-of-key.md", ".devbook/arc42/adr/40-the-overlay-may-add-a-gate-and-never-remove-one.md", ".devbook/domain/delivery/dependencies.md"]
```

A proposal, not yet taken. It adds a fifth engine-owned key to `.devbook/config.json`,
`guidance`, keyed by extension point, each value a short list of one-line instructions the
flow-runner hands the stage's provider ahead of the engine's own stage instruction.

```json
"guidance": {
  "spec":        ["Every UI change plans a Playwright scenario."],
  "implement":   ["Run the linter before marking a task done."],
  "docs.update": ["Refresh the OpenAPI document when a controller changed."]
}
```

## The gap it closes

A repository today has three ways to shape a flow, and the middle is missing. The config
flips switches — depth, budgets, which provider fills a point — and by
[record 10](10-one-config-file-two-kinds-of-key.md) says nothing in prose. `AGENTS.md` and
`.agents/rules/` say things in prose, but to every session and by file glob, never *to one
stage of a flow*. A repo-native `flow-*` skill can say anything, at the price of rewriting the
whole flow and losing every later improvement to the plugin's copy. So "the spec stage always
plans a browser test" is either a rule that fires when someone opens a test file, or a fork of
`flow-feature`. OpenSpec's `config.yaml` has the shape that fits: `rules` keyed by artifact,
`operations` keyed by step, and an exact table of which key reaches which step — and the
observation that `verify` receives none, because verification checks the implementation
against the artifacts as written.

## What it is, precisely

- **Keys are extension points, and `verify` is refused.** `spec`, `implement`,
  `data.prepare`, `app.start`, `qa.run`, `deliver`, `docs.update`. The three lifecycle points
  produce nothing to steer, and `verify` stays independent of whatever steered `implement` —
  the same reason a checker never reads the instructions the author had.
- **A value is a list of lines, and a line is a line.** Plain strings, at most eight per key
  and at most 200 characters each, enforced by `resources/config.schema.json`. This is the
  answer to `README.md`'s objection that a stage is a prompt and JSON buries paragraphs in
  strings: a paragraph is refused. What needs one is a rule or a repo-native flow skill, and the
  cap is what keeps `guidance` from becoming a third place to write those.
- **Guidance arrives first and adds; it never replaces.** The flow-runner prepends the lines to
  the stage instruction it hands the provider, under a `Repository guidance` heading, and the
  engine's own instruction follows unchanged. The stage's `update_stage` names that guidance
  applied, so a run record shows why a stage did what the plugin's copy would not have.
- **No everything-level key.** What should reach every stage already has a home in
  `AGENTS.md`, read through the `repo-instructions` slot. Adding a `flow` key would give a
  repository two places to say the same thing.
- **The overlay refuses it.** [Record 40](40-the-overlay-may-add-a-gate-and-never-remove-one.md)
  lets a gitignored file add a gate because a gate can only ever add a stop. A line of prose
  can say "skip the linter", and no checker can tell that from "run it", so `guidance` joins
  `components` and the three locked policy keys on the refused list. A personal instruction
  goes in `AGENTS.local.md`, which exists for exactly that.
- **Still configuration by record 10's test.** It chooses how a stage the engine already runs
  is carried out; it cannot add a stage, reorder one, or hand one to a plugin. An unknown key
  or an over-long line is rejected by name, as every other key is.

## What it replaces

Nothing in the engine. `flow-phases.md` and the two `phase-*` skills are the engine's own
stage instruction — the part that follows the guidance, unchanged; `.agents/rules/` still
fires by file glob on read, which is a different trigger from a stage; a repo-native `flow-*`
skill is still how a repository changes a flow's shape, and this only shrinks the cases that
need one. The one thing it absorbs is repository prose that already is stage guidance
without the name: the caveat bullets under `## QA Depth` in `.devbook/flow-context.md`
("payment scenarios always need capture, even in `targeted`") are `guidance.qa.run` lines,
and that section then carries only its value — which already yields to `policy.qa.depth`.

## What it costs

`check.mjs` gains one refusal and the schema one property; the flow-runner gains one read
before each stage it delegates and one line in its stage report; `devbook-config`'s report
gains a section listing which points carry guidance, so a reviewer sees in one place what the
config says to a run. `surface-contract.md` gains the key beside `gates`. A `config-template.json`
entry shows the shape. No migration: an absent key means no guidance, as today.

## To settle before it is taken

- Whether `qa.run` guidance may name a depth. It should not — depth is policy and has a
  ceiling — and the schema cannot see inside a string, so this is a rule in the contract or a
  reason to leave `qa.run` off the list.
- The name. `guidance` matches `operations.<step>.guidance` in the source it borrows from and
  reads as steering rather than law; `rules` would collide with `.agents/rules/`.
- Whether the report prints the lines or only the points. Printing them makes the report the
  one place a reviewer reads the config's prose; it also makes it longer.
