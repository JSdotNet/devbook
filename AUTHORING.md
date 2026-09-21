# Authoring

Pruning rules and size budgets that keep authored assets short enough to stay predictable.
[AGENTS.md](AGENTS.md) states the short form of these; this file is the full rule it points at.

It arrived from the `spec-builder` plugin's `instructions/authoring/spec-conciseness.instructions.md`
and stayed behind when that plugin
[left the marketplace](.devbook/arc42/adr/plugin-boundaries.md),
because it governs authoring *here*.

## Purpose

- Keep every authored asset short enough that the model attends to all of it.
- Give authoring a deletion discipline, so assets stop accumulating lines.

## Single Source Of Truth

- State each rule in exactly one file. Everywhere else, link to that file by relative path.
- Canonical sources: [AGENTS.md](AGENTS.md) for the dual-host contract and the repository's own
  standards, [`.agents/rules/`](.agents/rules/README.md) for the per-file-kind rules, and this
  file for conciseness.
- Prefer a one-line pointer over a summary. A summary is a second copy that drifts.
- The environment is a source of truth too: record what an author cannot find by looking —
  the unwritten convention, the reason behind a choice, the gotcha no config confesses.

## The No-Op Test

- Apply to every sentence: does it change behavior versus what the model does by default?
- When it does not, delete the whole sentence rather than shortening it.
- The test is model-relative. Settle a disagreement by running the asset, not by debate.
- Known no-ops: "keep content in English" (set repository-wide, if at all), "remove
  ambiguity", "validate consistency", "be thorough".

## Size Budgets

The budget is the trigger for a disclosure decision, not a hard limit. Count authored body
lines; frontmatter such as an agent `tools` list does not count.

| Asset | Budget |
|---|---|
| `SKILL.md` | 40 lines |
| `rules/<name>.md`, and a `resources/` contract carrying name and description | 60 lines |
| `*.agent.md` | 80 lines |

- Past the budget, move on-demand reference into a `resources/` file and point at it, or split
  the asset by branch so each path carries only what it needs.
- Inline what every run needs; disclose behind a pointer what only some runs reach.
- State the reason in the file when an asset genuinely must exceed its budget.
- `node tools/check-assets.mjs --budgets` lists what is over. It reports, and never fails.

Five kinds are long by nature, and the reason is stated here once rather than in each file:

| Kind | Why it exceeds by nature |
| --- | --- |
| `flow-*`, `phase-*`, `fleet-*`, `schedule-*` skills | A staged procedure is read once per run and every stage is safety-critical prose — gate wording, what a stage returns, what happens when a step fails — which the terseness rule exempts. |
| `assets/spec-kinds/<kind>.md` | Each carries the full mapping between one chapter kind and code, and a mapping stated by half is wrong. |
| The converters `sync-specs`, `apply-change`, `verify-change` | Each is a staged procedure over every chapter kind, and a stage that stops — a status gate, a verdict that hands off — is safety-critical prose. |
| A plugin rule (`devbook-*.md`) and a `resources/` contract | A schema or a contract is the single source everything else points at; it cannot itself be a pointer. |
| The `flow-runner` agent | It is a session's main loop and carries its own invocation contract. |

Everything else over budget owes a trim or a reason line in the file.

## Positive Phrasing

- Write the target behavior: "pin every action to a commit SHA", not "avoid version tags".
- A prohibition drags the banned behavior into context and makes it more available.
- Keep a prohibition only as a guardrail with no positive phrasing, and pair it with the
  positive target.
