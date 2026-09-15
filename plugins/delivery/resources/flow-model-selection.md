---
name: flow-model-selection
description: Defines the model-selection categories the flow-runner uses to pick a model for each flow step, the Claude alias to pick per category, and how personal and team configuration can override those defaults.
---

# Flow Model Selection (Flow-Owned)

## Purpose

- Make the `flow-runner` agent (`agents/flow-runner.agent.md`) the **single** place that
  chooses a model for every step of a `flow-*` run. Every specialist agent a flow delegates
  to — whichever plugin a repository bound to a role or a service — is expected to carry no
  `model` in its own frontmatter for this reason: pinning a model on the agent itself would
  create a second, conflicting source of truth. Only `flow-runner.agent.md` pins its own
  model, because it is the one agent that must run under a fixed, known model to reliably
  drive the rest of the process.
- Define the categories **once** so a maintainer edits this file instead of re-describing
  model choice in every `flow-*/SKILL.md`.
- Let an individual user override model choice outside the repository, and let a consuming
  repository stay out of model choice entirely.
- Pick the **best-matching model per category** — never default to the cheapest model just
  because it is cheap, and never pin an exact version number that goes stale the moment a
  newer release ships.

## Category Models Only Apply To Delegated Stages

**A stage run inline runs on the session's model, whatever this file says.** The `model`
parameter exists on the `Agent` tool and in agent frontmatter; there is no mechanism that
switches the model of the main loop mid-run. So a category that resolves to `sonnet` costs
`opus` money the moment its stage is executed inline instead of delegated.

This is not a detail of the mechanism — it is the mechanism. Every category below is a claim
about a stage that will be delegated, and the categories deliver nothing on a run that does
everything itself. The delegation rules in **Delegation Order**
(`flow-execution-model.md`) and the two phase skills are what make this file
real; treat a stage that resolves to a non-session model and then runs inline as a defect in
the run, not as a harmless simplification.

## Use Aliases, Never Version-Pinned IDs

- Claude Code accepts the aliases `opus`, `sonnet`, `haiku`, and `fable` wherever a model is
  named — the `Agent` tool's `model` parameter and an agent's frontmatter `model`. Each
  alias resolves to the current release of that family, so this file names the alias and
  never needs an edit when a new version ships.
- Do not write an exact model ID (for example `claude-opus-5`) into this file's category
  table. An override file may pin one deliberately, accepting the maintenance cost.
- `inherit` is also valid in agent frontmatter and means "run under the session's model".
  Use it only where a category genuinely has no preference; the table below always names a
  family instead, so the choice stays deliberate and explainable.
- If a named alias is unavailable to the running session (an entitlement or configuration
  limit), fall back to the session default for that category and say so in the stage output,
  rather than silently substituting a weaker model.

## Model Families

| Alias | Use it for |
| --- | --- |
| `opus` | The strongest reasoning: architecture and design trade-offs, code review judgment, anything where a wrong call is expensive. |
| `sonnet` | Strong general-purpose work at lower cost: prose-heavy drafting, planning, most tool-heavy execution. |
| `haiku` | Genuinely low-complexity, high-volume formatting and writing tasks. |
| `fable` | Available in this session's model list; not assigned to a category by default. |

## Categories

Each stage in a `flow-*` skill delegates to one or more roles or services (its `**Agents:**`
line). Every one used across the `flow-*` skills maps to a category below. Add a new entry to
this table when a new `flow-*` skill introduces one.

Category follows the **work**, not only the point. Most points appear once, so the point
names the category on its own. `implement` and `validate` are the exception, because a
repository usually binds both to the same provider, and that one agent both runs the suites
and repairs them: **the stage decides**. Build & Test resolves it
to `sonnet`; Implementation — including the fix for a build that Build & Test just returned
red — resolves it to `opus`. When a stage could read either way, resolve to the category
whose **Typical Stages** names it.

| Category | Typical Stages | Roles & services | Model | Rationale |
| --- | --- | --- | --- | --- |
| **Architecture & Design** | Architecture & Design intake, `.arc42/` and `.tech/` drafting in `flow-spec` | the `architecture` role, the `spec` service | `opus` | Trade-off analysis and long-term design decisions warrant the strongest reasoning available. |
| **Implementation & Coding** | Implementation, module/service scaffolding, fixing a red build | the `implement` service | `opus` | Precise, tool-heavy code generation and TDD, where a subtle mistake costs a whole validation cycle. |
| **Testing, QA & Monitoring** | Build & Test, Validation, runtime monitoring | the `qa` role, the `app.start` and `qa.run` services, the runtime monitor, the `validate` service *(running the suites, not fixing them)* | `sonnet` | Tool-heavy but procedural: running builds and suites, driving Playwright, and reading logs/traces reward throughput over deep reasoning. Diagnosing and fixing a failure is Implementation & Coding, and resolves to `opus` there. |
| **Verification** | Verification | the `verify` service | `opus` | A verdict on whether the change set is what was agreed is review judgment: `aligned` called on drift ships a wrong pull request, so it takes the strongest reasoning. |
| **Domain Design** | `.domain/` drafting in `flow-spec`; bounded-context and boundary review during service/module creation | the `domain` role | `opus` | Boundary and ubiquitous-language decisions are expensive to reverse once code exists. |
| **Design Authoring** | `.design/` drafting in `flow-spec` | the `ux` role | `sonnet` | Prescriptive tables, token names, and guideline prose: drafting work, not a trade-off. |
| **Documentation & Low-Complexity** | `.ai/` drafting in `flow-spec`, `flow-repo` documentation/README stages, Work Item Update | the `docs` role | `haiku` | Genuinely low-complexity formatting/writing — the one category where the lightweight model is the right match, not a cost shortcut. |
| **Human-in-the-Loop** | Personal Validation | *(none)* | *(none)* | No agent and no model: this phase always hands control back to the user. |
| **Fallback / Unclassified** | Any stage whose role or service is not yet listed above, and any `(default)` stage with no clear category match | *(any)* | *(session default)* | Let the session's own model run it until the entry is added to this table — safer than guessing a family for an uncategorized case. |

Stages the flow-runner performs itself — Create Pull Request, Summary, and Scope Discovery's
decision half — have no category, because they run inline and inline stages always run on the
session's model. Do not add a category for them: it would resolve to a value nothing can
apply.

**What actually varies.** The flow-runner is pinned to `opus`, so the two `opus` categories
resolve to the model the owner session is already running and change nothing on their own —
they are here to state intent, and to stay correct if that pin ever changes. The categories
that genuinely move cost today are **Testing, QA & Monitoring** (`sonnet`) and **Documentation
& Low-Complexity** (`haiku`). Expect a run's `tokenUsage.models` to show `opus` plus `sonnet`
whenever Build & Test or Validation ran.

A stage may list entries from more than one category (for example `flow-bug`'s "Bug Intake &
Reproduction", naming the `implement` service and the `app.start` service). Resolve the model
per named entry, not once per stage, so each still gets its own category's model — and where
one provider fills both `implement` and `validate`, resolve per named entry **in that stage**,
so the same agent can be `sonnet` in Build & Test and `opus` in Implementation within a
single run.

## When to Leave the Model Unset

- Leave it unset for the **Fallback / Unclassified** category above (an agent not yet mapped
  to a category), so an uncategorized stage inherits the session model instead of getting a
  blind guess.
- A user or repo may also opt a specific category into `inherit` via the override files
  below, if it prefers every stage to follow whatever model the session is running.
- Do not leave it unset everywhere "because the session model is fine" — the point of this
  file is that the flow-runner makes a deliberate, explainable choice per category.

## Resolution Order

For every stage transition, the flow-runner resolves the model to use in this order,
stopping at the first match:

1. **Current run instruction** — if the user explicitly gives a model-selection instruction
   for this run, use it for the categories it covers.
2. **Personal global override** — if `CLAUDE_FLOW_MODEL_SELECTION_PATH` points to a readable
   file, read that file; otherwise check the default user-global file path (see below). If
   the file lists an entry for the stage's category, use that value.
3. **Category model** — otherwise use the alias named in the table above.
4. **Session default** — if the stage's agent is not yet categorized, leave the model unset
   and flag it for follow-up (add the agent to the table above).

There is deliberately **no repository-level model override**. Model choice is a personal cost
and speed preference, not a property of the repository being worked on, and a committed
override would silently change what every collaborator's runs cost. A repository that needs
to influence a run does so through `.devbook/config.json` and its own `start` skill, which
set QA depth and runtime facts and never a model.

None of the agents invoked by a flow pin their own `model`, so there is no
"agent's pinned model" tier to consider — the flow-runner's resolution above is the only
source of truth. Apply the resolved model explicitly wherever the flow-runner controls it:
the `model` parameter on every `Agent` call it makes for that stage, including background
sub-agents such as the parallel runtime monitor.

## Personal Global Override File

This is the **only** override tier. A user may define personal model preferences outside
every repository, which keeps personal cost and speed preferences out of shared instructions
and avoids accidental commits.

Where that file lives is the `model-override` host slot — the engine names the slot and never
hardcodes a path. See **Host Slots** in `surface-contract.md`.

- The file holds a two-column `Category` / `Model` table, using the exact category names
  from the table above. The `Model` value is normally an alias (`opus`, `sonnet`, `haiku`,
  `fable`) or `inherit`; an exact model ID is allowed when the user deliberately pins a
  version and accepts the maintenance cost. List only the categories being overridden.
- Nothing binds this slot. No plugin ships bindings, and a repository may not set it either:
  `bindings["delivery.slots"]` has no `model-override` key, deliberately, because model choice
  is personal. Unbound, it resolves to nothing, every category falls through to its default,
  and the run says so once.

- The flow-runner reads at most one personal file: whatever the `model-override` slot
  resolves to. It is read **once per run** before `start_run`, and the
  resolved mapping is reused for every stage in that run. If the selected file is missing,
  unreadable, malformed, or a category is not listed, fall back to the next step in the
  Resolution Order.
- Do **not** read any model-selection file inside the repository, and never accept a model
  from `.devbook/config.json`. Model choice is personal and never comes from the repo.

```markdown
# Flow Model Selection Overrides

| Category | Model |
| --- | --- |
| Implementation & Coding | sonnet |
| Testing, QA & Monitoring | inherit |
```
