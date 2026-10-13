---
name: engine-contract
description: The contract between the delivery engine and everything a repository plugs into it — the closed phase list and the phases map that configures each phase, the gates mechanism, the policy keys, the .devbook/config.json stack config and the overlays a machine keeps over it, the bindings, the branch a change is built on, and the host slots.
---

# Engine Contract

Everything a repository plugs into the engine is named here: who runs each phase and how, the
gates it adds, the policy it sets, and the tracker, surface, and host slots it binds. The
surface a run reports through is `surface-contract.md` beside this file, and how one phase's
fields resolve into the way it runs is `phase-resolution.md`. Read this file once, when the run
resolves its stack config.

Three rules hold across all of it, and they are the reason the engine stays reusable:

1. **The engine names; the repository fills.** The phase list, the gate mechanism, the policy
   keys, and the surface capabilities are closed and declared by the engine. A repository
   picks who runs a phase and how; it never invents a phase, a policy key, or a stage.
2. **Configuration chooses among behaviour the engine already implements.** It never
   introduces new behaviour. A repository that needs a different stage sequence writes a
   repo-native `flow-*` skill, which takes precedence for the categories it covers.
3. **A lower layer never names a higher one, and the engine names no specialist.** It names
   phases and capabilities; a repository names the agent or skill that runs one. No
   specialist, content plugin, or surface is ever modified to know about the engine, and the
   `your-*` and `repo:*` ids below are placeholders — for whatever you installed, and for a
   skill the repository writes itself. Every other id in an example names a skill that ships.

## The Stack Config

`.devbook/config.json`, repo-scope and committed. The engine owns four top-level keys —
`bindings`, `phases`, `policy`, `gates` — and the optional `areas`, and never edits another
component's. `components` belongs to each component's own `init` and `update` skills.
The one write a component makes to an engine key is a migration renaming an id it retired, per
devbook's `assets/reconcile-protocol.md` under *The stamp*.
`id` sits beside them and is not a setting: it names the repository, once, so a machine can
keep an overlay for it — see below.

The path is a path, not a dependency: the engine reads that file whether or not the repository
adopted a single devbook folder, and `devbook` being absent costs nothing here.

```json
{
  "id": "your-repo",
  "bindings": {
    "delivery.tracker": { "provider": "github" }
  },
  "areas": {
    "frontend": [ "src/**/*.UI/**" ],
    "backend":  [ "src/**", "tests/**" ]
  },
  "phases": {
    "flow-code": {
      "phase-update-base":        { "before": [ "devbook:validate" ] },
      "phase-scope":              { "agent": "your-architecture-plugin:architect", "model": "opus", "mcp": [ "your-guidelines-server" ] },
      "phase-plan":               { "agent": "your-architecture-plugin:architect", "model": "opus" },
      "phase-implement":          { "agent": "your-coding-plugin:coding", "model": "opus", "effort": "high" },
      "phase-implement:frontend": { "model": "sonnet" },
      "phase-review":             { "model": "opus", "effort": "high" },
      "phase-build-test":         { "model": "sonnet", "effort": "low" },
      "phase-verify":             { "agent": "your-qa-plugin:qa",
                                    "before": [ { "run": "repo:seed-test-data", "on-failure": "required" } ] },
      "phase-spec-check":         { "skill": "devbook:verify-change", "model": "opus" },
      "phase-create-pr":          {},
      "phase-report-back":        { "model": "haiku", "targets": [ "origin", "linked" ] },
      "phase-summary":            { "after": [ "repo:capture-improvement" ] }
    },
    "flow-spec": {
      "phase-update-base":     {},
      "phase-scope":           {},
      "phase-drafting:arc42":  { "agent": "your-architecture-plugin:architect", "model": "opus" },
      "phase-drafting:tech":   { "agent": "your-architecture-plugin:architect", "model": "opus" },
      "phase-drafting:domain": { "agent": "your-domain-plugin:domain-architect", "model": "opus" },
      "phase-drafting:design": { "agent": "your-ux-plugin:ux-designer", "model": "sonnet" },
      "phase-drafting:ai":     { "agent": "your-docs-plugin:documentation", "model": "haiku" },
      "phase-check-review":    {},
      "phase-create-pr":       {},
      "phase-report-back":     { "model": "haiku" },
      "phase-summary":         {}
    }
  },
  "policy": {
    "qa.depth":               "targeted",
    "review.retryBudget":     1,
    "ready.retryBudget":      2,
    "gate.reviseBudget":      3,
    "commit.at":              "gate",
    "pr.required":            true,
    "pr.base":                "main"
  },
  "gates": [
    { "at": "scope", "when": "after", "purpose": "approval",
      "prompt": "Spec approved, or revise?", "show": "artifact", "unattended": "block" }
  ]
}
```

- **The file is optional, and so is every engine key in it.** Absent, every phase runs its
  built-in procedure on the session's settings, no extra gate exists, and every policy key
  takes the default in the table below. Only the engine reads its keys, so a repository that
  adopted devbook and not `delivery` carries `id` alone and validates. A malformed file — one
  that does not parse as JSON — is reported once and then ignored; it never blocks a run. A
  file that parses and is refused is not malformed: see the next rule. A present `phases`
  map is checked for completeness — see **Phases** below.
- **An unknown key is rejected, not ignored** — the same way a plugin manifest rejects an
  unknown field. Report it by name and stop, so a typo is never a silently absent setting and
  a refused file's gates are never dropped by running on defaults.
  `extensions`, `bindings["delivery.roles"]`, and `bindings["delivery.mcp"]` are rejected by
  name with "run delivery:update": the migration rewrites them into `phases`, and no alias
  keeps them alive.
- **`null` means deliberately unbound**, which is different from absent. Absent means nobody
  has decided; `null` means somebody decided no.
- **A model or an effort here is a team default.** Every overlay below wins field by field,
  so nobody's own cost choice is taken away — see `phase-resolution.md`.
- **No secrets.** The file is committed. A credential pointer belongs in the repository's
  `run` recipe, and the value belongs in a secret store.
- **Validate it before trusting it.** `node tools/stack-config/check.mjs [path]` checks `id` and the
  engine-owned keys against `resources/config.schema.json` and exits non-zero on
  the first problem. It ignores `components`, which each component validates itself, and
  rejects by name any *other* top-level key — the only two owners are the engine and a
  component, so a third name is a misspelling of one of them.
  `resources/config-template.json` is a filled-in starting point.
- **Read it through the checker, never by hand.** `node tools/stack-config/check.mjs --print`,
  run from the repository root — the default target is `.devbook/config.json` under the
  working directory, and a run from the plugin's own folder finds none and prints defaults —
  validates and then prints one JSON document — `{ target, layers, config }` — where
  `config` is the committed file with every present overlay below merged over it, and
  `layers` names each overlay path and whether it exists. That document is the effective
  configuration a flow resolves from, on either host: the overlay paths, the merge rules, and
  the refusals live in one script, and a session that reads the layers itself re-derives all
  three in prose. Nothing is printed when a layer is refused, so a consumer never acts on a
  merge the checker rejected.

### The overlays

The answer to the one thing the committed file cannot express: a setting true of your machine
and nobody else's. Without it the only way to run QA shallower than the team does is to edit
the committed file and remember not to commit it, which is how a personal preference becomes
everyone's next merge conflict. Two files, each optional and absent by default, merged over
the committed config in this order so the later wins:

| Layer | Path | True of |
| --- | --- | --- |
| user | `<config dir>/config.local.json` | You, in every repository |
| repository | `<config dir>/repos/<id>/config.local.json` | You, in the repository whose committed `id` this is |

`<config dir>` is `$XDG_CONFIG_HOME/devbook` when that variable is set, else `%APPDATA%\devbook`
on Windows and `~/.config/devbook` elsewhere. Both live outside every clone, and deliberately
no layer lives inside one: a gitignored file is absent in a fresh worktree, so a session there
would run at the team's defaults without saying so, and a repository has nothing to ignore
when nothing personal is ever written into it. The repository layer is keyed on `id` rather
than on a path or a remote because an id survives a move, a re-clone, and a worktree, and is
absent only when the repository never chose one — then that layer is skipped.

Every layer carries the same engine keys, validated against the same schema, and merges the
same way:

| Shape | Merges by |
| --- | --- |
| Object | Key by key, the overlay winning. A sibling the overlay does not name is left standing. A phase entry is an object, so an overlay's `{ "effort": "xhigh" }` changes that one field and keeps the committed agent and model. |
| Array | Replaced whole. A chore list is an ordered whole, and half of one from each file is a run nobody wrote down. |
| `gates` | **Appended.** An overlay can add a checkpoint and has no way of spelling the removal of one — at any layer, of any layer beneath it. |
| `null` | A value — deliberately unbound — never a delete. |

An overlay's `phases` is partial: it names only the flows and phases it changes. Completeness
is checked on the committed file alone.

Six things an overlay may not say, and the checker refuses each by name:

| Refused | Because |
| --- | --- |
| `id` | It is what found the overlay. Renaming it from inside is a loop. |
| `components` | A stamp is repo-scope and committed; an overlay is neither. |
| `policy.pr.required` | What the repository produces, not how one machine runs it. |
| `policy.qa.ceiling` | The ceiling is the repository's limit. `qa.depth` is your choice inside it. |
| `policy.gate.personalValidation` | The mandatory gate. Already `const` in the schema, and named here so the refusal states the invariant rather than a type error. |
| `policy.openspec.scenarios` | What acceptance of a change requires is the repository's; `advisory` in an overlay would unlock a gate the committed file keeps shut. |

That list is the whole safety story, and it is worth stating plainly: **a file no reviewer
sees must never be able to weaken what a reviewer sees.** Everything a reader of the committed
config would conclude about the gates a run passes, the pull request it opens, and the deepest
QA it may reach stays true no matter what any overlay says. What an overlay changes is the cost
and the wiring of your own run — shallower QA, a phase's agent, model, or effort, a different
MCP server, a zeroed retry budget, an extra checkpoint of your own. A model or an effort is a
cost choice, not a guard, which is why an overlay may override one.

One thing an overlay may say that the committed file may not: **`ext`**, the machine-scope
counterpart of `components`. `ext.<plugin>.<key>` holds what a plugin needs to remember about
your machine and nothing else — a path or a preference that holds on this machine alone, say
— and is the *Extension Namespace* the devbook already reserves in a chapter's `meta` block,
applied to the config. The engine checks only that it is an object of objects, merges it like
any other object, and reads no key in it; the plugin that owns the namespace does, and asks
only for what is absent there. Refused in the committed file: a reviewer has no use for one
machine's settings, and a personal value in a committed file is everybody's.

`check.mjs` finds both layers on its own — from the environment and the committed `id` — and
validates each three times over: what it may not say, whether it is well-typed alone, and
whether the merge so far still validates, the third catching the pair that is only wrong
together and naming the layer that broke it; `--print` then hands the merge to whoever asked.
`resources/config.local-template.json` is a starting point for either, and
`devbook-config:local` writes one from your answers.

**Gitignored is not private, and neither is your home directory.** No secret, the same as
the committed file: an overlay is read by every agent in your session and pasted into a bug
report as readily as anything else.

## Phases

The phase list is closed. A phase has a stable id, is one skill named `phase-<id>`, and has one
entry per flow in `phases`. Configuration chooses who runs a phase and how; it never adds,
removes, or reorders one. The order each flow runs them in, and what each phase does, are in
`flow-phases.md`.

| Phase skill | `flow-code` | `flow-spec` | Runs by default |
| --- | --- | --- | --- |
| `phase-update-base` | yes | yes | inline |
| `phase-scope` | yes | yes | fork |
| `phase-plan` | `create` kind only | — | delegated |
| `phase-implement[:<area>]` | yes | — | fork |
| `phase-review` | yes | — | fork |
| `phase-build-test` | yes | — | delegated |
| `phase-verify` | yes | — | delegated |
| `phase-spec-check` | yes | — | delegated |
| `phase-drafting[:<folder>]` | — | yes | delegated, per folder |
| `phase-check-review` | — | yes | inline |
| `phase-ready` | yes, never configured | yes, never configured | inline |
| `phase-personal-validation` | yes, never configured | yes, never configured | inline |
| `phase-create-pr` | yes | yes | inline |
| `phase-report-back` | yes | yes | delegated |
| `phase-summary` | yes | yes | inline |

**The map.** `phases.<flow>.<phase>[:<qualifier>]`. The first level is the flow's skill name —
`flow-code`, `flow-spec`, or a repo-native `flow-*` — and the second the phase's skill name.
The qualifier is the flow's own variant: the devbook folder on `phase-drafting`, an area on
`phase-implement`. There is no kind qualifier: what a kind needs is `phase-implement`'s call.

| Field | Values | Absent means |
| --- | --- | --- |
| `agent` | `plugin:agent`, `repo:<agent>`, or `null` to force inline | The phase's **Runs by default** in the table above — see `phase-resolution.md` |
| `skill` | `plugin:skill` or `repo:<skill>`: the procedure the phase follows | The phase's built-in procedure, `delivery:phase-<id>` |
| `model` | `opus`, `sonnet`, `haiku`, `fable`, a full model id, or `inherit` | The session's model |
| `effort` | `low`, `medium`, `high`, `xhigh`, `max`, or `inherit` | The session's effort |
| `mcp` | Server ids from the repository's own MCP configuration, or `null` for none | The phase's default servers — **MCP Server Strategy** in `flow-execution-model.md` |
| `before`, `after` | Chore lists, below | No chores |
| `app` | `phase-verify` only: the provider that starts the application and returns base URLs and a health verdict, or `null` for nothing to start | The repository's `run` recipe |
| `targets` | `phase-report-back` only: an array of `origin`, `linked`, and `plugin:skill` or `repo:<skill>` destinations | `[ "origin" ]` |

**Rules the checker enforces:**

- **Each committed map is complete.** It lists every phase its flow has, and nothing else: a
  missing phase, a phase the flow lacks — a drafting entry under `flow-code` — or a map under
  an unknown flow is rejected by name. `{}` is a complete entry, meaning the session's
  settings and the built-in procedure. A repo-native `flow-*` declares its phase ids in its
  body, and the checker accepts a map under its name.
- **A qualified phase is complete with its bare entry or one entry per qualifier.** A qualifier
  entry beside a bare one overrides it field by field.
- **Nothing crosses flows.** `flow-spec` never reads `flow-code`'s entries; the shared closing
  phases are written once per map.
- **Personal Validation and the ready check take no entry.** A `phase-personal-validation` or
  `phase-ready` key is refused in any map, at any layer, the way an override of
  `policy.gate.personalValidation` is.

**Chores.** `before` and `after` hold zero or more chores, in declared order, each producing
side effects and a report. An entry is a string or `{ "run": …, "on-failure": "required"|"advisory" }`;
`advisory` is the default and puts a failure in the summary instead of stopping the run. A
chore's id may carry `--flag` arguments after it — `your-plugin:your-skill --replan` — which
the skill receives as its arguments; they are no part of the id it resolves by. A phase's
`skill` takes none. Where the 1.13.0 chore points went:

| Was | Is |
| --- | --- |
| `session.start` | `phase-update-base.before` |
| `flow.start` | `phase-scope.after` |
| `data.prepare` | `phase-verify.before` |
| `flow.end` | `phase-summary.after` |

**Phases decide; chores contribute.** A chore may fail, and its failure is fatal when it
declared `on-failure: "required"` — but a chore can never alter a phase's decision, rewrite
a stage's result, or stand in for a gate. Without that line an injected chore becomes an
invisible second implementation of the flow, which is the thing the engine exists to prevent.

**Ids.** An `agent` is `plugin:agent` or `repo:<agent>`; a `skill` or a chore is
`plugin:skill` or `repo:<skill>`, a repo-native skill the host loads with no marketplace
involved. An id that does not resolve degrades to the phase's built-in behaviour, named once
in the run summary — never a silent skip, and never a reason to fail the run.
`devbook-config:doctor` resolves them ahead of time.

**A `phase-scope` skill may return a specification approved elsewhere.** Bound as
`"skill": "your-spec-plugin:your-approved-spec-skill"`, it reads the specification the work
item points at, already approved where it was written, and returns it unchanged. The
flow-runner uses what it returns as the run's specification: it derives nothing inline and
neither rewrites nor supplements it. A gate after `phase-scope` with `show: artifact` renders
that returned specification — what the skill returned, not a summary of it — and `revise`
re-runs it with the notes, as at any phase.

**A `phase-scope.after` chore may replan.** A run that builds one step of a larger agreed change
starts from a plan agreed before the base moved under it. Update Base fixes the branch and says
nothing about whether the plan still holds, so a replan chore — bound as
`{ "run": "your-change-plugin:your-status-skill --replan", "on-failure": "required" }` — checks
three things, in order, against the base Update Base just fetched:

1. **Every proposed chapter change against its target as it now stands on the base.** A target
   that changed since the change was approved is a conflict, never something to merge quietly.
2. **Every open step against the code as it now stands.** A step whose outcome already holds,
   or whose assumption a merged step invalidated, is flagged.
3. **Every chapter the change depends on or relates to.** One deprecated or rewritten since
   the change was agreed is a flag on the change itself.

Any flag fails the chore, and `required` stops the run before the scope is acted on. The
output is the list of what to decide; revising the plan is the change's owner's, through
the change's own revision, and a revised chapter change goes back through its approval. A
replan rewrites no chapter change and no step, and never runs on a schedule: a plan is
re-checked when someone is about to act on it.

**A `phase-spec-check` skill decides whether the phase updates.** A skill that declares
`updates: true` in its `SKILL.md` frontmatter may bring `code-ahead` chapters level inside the change
set; any other skill only reports. The limits on an updating skill are in
`skills/phase-spec-check/SKILL.md`.

## Gates

A gate is the human-in-the-loop mechanism. It presents the output of the phase it is attached
to and asks a question about it.

**The asymmetry is what makes gates safe: configuration may add a gate anywhere; it may never
remove one or hand one to a plugin.** Adding a human checkpoint can only make a flow more
conservative. Removing one is the only direction that can weaken it, so that direction stays
closed. Personal Validation is the mandatory instance of this pattern — one row in the table
below, not a second mechanism.

| Field | Values | Means |
| --- | --- | --- |
| `at` | a phase id: the phase skill name without `phase-` and without qualifier | The phase the gate attaches to — `scope`, `create-pr`. Never `personal-validation` or `ready`. |
| `when` | `before`, `after` | Which side of that phase. |
| `purpose` | `approval`, `resource`, `cost`, `risk`, `handoff` | What kind of question this is, which decides what it must show. |
| `prompt` | free text | The question, in the user's terms. Optional; the purpose supplies a default. |
| `show` | `artifact`, `summary`, `none` | `artifact` renders the phase's output through the surface — the specification itself, not a description of it. Default `summary`. |
| `unattended` | `block`, `proceed`, `skip-phase` | What an unattended run does here. `skip-phase` skips the phase. Default `block`. |

A gate applies in every flow that has its phase. A gate at a phase the flow lacks is inert in
that flow, so `{ "at": "verify" }` never stops a `flow-spec` run.

| Purpose | Typical placement | What it must show |
| --- | --- | --- |
| `approval` | after `phase-scope` | The specification itself, rendered. The one most repositories should turn on. |
| `resource` | before `phase-verify` | Just the question — "only one runtime instance runs here, OK to start?" |
| `cost` | before `phase-verify` | An estimate. A gate that cannot say what it is about to spend is not helping anyone decide. |
| `risk` | after `phase-build-test` | What the change set actually touched — migrations, auth, a public contract. |
| `handoff` | Personal Validation | The review, the QA evidence, the spec-check table, the running application, and what to check by hand — assembled by `skills/phase-personal-validation/SKILL.md`. |

### Three outcomes, not two

| Outcome | Effect |
| --- | --- |
| `approve` | Continue. |
| `revise` | Re-run the phase the gate is attached to, carrying the human's notes as input. The flow moves backwards, deliberately. Bounded by `policy.gate.reviseBudget`; when the budget is spent the flow stops and says so rather than cycling on something nobody can settle. |
| `decline` | Stop. Mark the stage `blocked`. **Never a silent skip** — "don't start the app" must not degrade into "continue without QA". |

Attach a gate to the phase you would want re-run. `{ "at": "scope", "when": "after" }` and
`{ "at": "implement", "when": "before" }` sit in the same place in the sequence, but only
the first makes `revise` mean "write the specification again".

### Unattended runs

Many runs are unattended: a higher layer's `schedule-*` entry points fire on a cadence,
and a spawned worker session has no user turn. A gate that waits for a human would deadlock all of
them, so `unattended` defaults to `block`, and `block` means **park with a handoff brief** —
what is done, what is not, the exact resume invocation — not "wait forever". An unattended run
that parks after `phase-scope` with the specification in its brief is strictly better than one
that implements something speculative for an hour first.

`proceed` is for a gate that only exists to inform an attended run. Reach for `skip-phase`
rarely: a gate before `phase-verify` that skips the phase silently drops QA, which is the
degradation the `decline` row exists to prevent.

## Policy

Every key is a closed enum or a number, and every key has a documented default, so an absent
key means the engine's own choice rather than undefined.

| Key | Values | Default |
| --- | --- | --- |
| `qa.depth` | `full`, `targeted`, `startup-only`, `skipped` | change-kind selection in `phase-verify` |
| `qa.ceiling` | same set | `full` |
| `review.retryBudget` | integer ≥ 0 | `1` — rounds of review blockers back to `phase-implement`, per slice |
| `ready.retryBudget` | integer ≥ 0 | `2` — rounds the ready check sends back to `phase-implement`, or `phase-drafting` |
| `gate.reviseBudget` | integer ≥ 0 | `3` |
| `gate.personalValidation` | `required` | `required` — the key states the fact, it cannot soften it |
| `commit.at` | `gate`, `manual` | `manual` |
| `pr.required` | boolean | `true` |
| `pr.base` | a branch name | the repository's default branch |
| `phases.updateBase` | boolean | `true` |
| `phases.review` | boolean | `true` |
| `phases.specCheck` | boolean | `true` — turns `phase-spec-check` on or off |
| `phases.reportBack` | boolean | `true` — turns `phase-report-back` on or off |
| `openspec.scenarios` | `advisory`, `linked` | `advisory` |

`commit.at` is the one policy key that binds a stage running long before the phase that
defines it: `gate` makes Personal Validation the flow's single commit point, so **no earlier
stage commits** and `phase-implement` is briefed to leave committing to that phase.
The mechanics — one commit per handback, a new commit per revise round — are in **Personal
Validation** (`flow-phases.md`). `manual` leaves committing to the user.

`pr.base` is the one value that is neither enum nor number. The check validates its *shape* —
a well-formed git ref name, so free prose is rejected by pattern — and nothing more. Whether
that ref exists is resolved against the remote at flow time — Update Base fetches it, the
pull-request lane opens against it — because a config check that reached for the network would
fail offline, in a fresh repository with no remote, and on a base branch not yet pushed.

`openspec.scenarios` governs a change whose behaviour is written as scenarios, at its
acceptance. A scenario is proven by the test its chapter's `tests` link names; one that names
none is **unverified**. `advisory` shows every unverified scenario at acceptance and never
blocks on it, the way an open review note is shown at a gate; `linked` refuses acceptance
while any scenario is unverified. The engine's part is the evidence: Verify reports each
scenario with its link (**Reporting Contract**, `surface-contract.md`) and Spec Check lists
the unverified ones. The refusal belongs to whatever runs the acceptance decision, which reads
the key from the effective configuration. It is the repository's, so no overlay may set it.

**QA depth resolves in one order, highest first:** `policy.qa.depth` here, then
`phase-verify`'s change-kind selection. The first one present wins, and
`policy.qa.ceiling` caps the result however it was reached. The repository's `run` recipe
describes the application and never sets a depth. `qa.depth` may be overlaid per machine,
`qa.ceiling` may not.

## Bindings

A tracker, a surface, and a host slot are bound per repository and are **never** plugin
dependencies: one missing integration must not demote every skill that names it. Who runs a
phase and which MCP servers it uses are not bindings: they are fields of the phase's entry,
above.

- **Tracker.** `bindings["delivery.tracker"]` names the work-item system: `github` resolves
  items to issues, `jira` to tickets in a named project, `markdown` to chapters in the folder
  its `folder` key names, for a repository that plans work as Markdown, and `backlog` to entries in the
  Backlog desktop application. Operations: `find_item`, `read_item`, `create_item`, `comment`,
  `transition`, `link_change`. Unbound, a flow runs to its file artifacts and opens, comments
  on, and transitions nothing. The tracker says which tooling reaches an item; where a run's
  result goes is `phase-report-back.targets`.
  Every operation resolves the same way, reported once when it first does: the bound tracker's
  own tooling first — an installed tracker plugin skill or MCP integration — then the host's
  CLI for that tracker. A skill names the operation and never the provider's command. A bound
  tracker whose tooling does not answer is reported once and the run continues as if unbound —
  the rule **MCP Server Strategy** (`flow-execution-model.md`) states for a server, applied to
  the tracker.
  `backlog` resolves through its MCP integration and has no CLI behind it: the six operations
  are the `backlog` server's tools of the same name, `transition` rewrites the entry's status
  token so the entry's own lifecycle refuses an illegal move rather than the engine deciding
  one, and every scoped call carries `repository` in `owner/name` form, read off the git
  remote. Nothing listening means the application is closed, which is the unbound path above.
  A `plugin:skill` provider — `{ "provider": "your-tracker-plugin:your-tracker-skill" }` —
  hands every operation to that skill, which implements three: `read_item`, `update_item`,
  and `comment`. `update_item` is `transition` and more: it sets the item's step state and
  ticks the tasks the run completed. The state is one of four, read off the item's own record
  rather than decided by the engine — `open`, `in progress`, `in review`, `done`. An operation
  outside the three — `find_item`, `create_item`, `link_change` — takes the unbound path,
  reported once. A skill that does not resolve is the unbound path for all of them. Its
  `read_item` may also report the larger change an item belongs to: the `change` name and the
  item's `part` — `proposal`, `step` with its number, or `close` — which **The Change Branch**
  below turns into the run's branch.
- **Surface.** `bindings["delivery.surface"]` orders the installed surfaces: the lifecycle
  group fans out to every one that opens, and render and export take the first that answers;
  **The Surface Capability** in `surface-contract.md` states the rule.
- **Grill.** `bindings["openspec.grill"]` names the skill that interrogates an idea before a
  change is proposed, as `plugin:skill`, or `null` for none. The engine never reads it; it is
  carried here so the change lane's skills find it in the same effective configuration, and
  so a machine may bind its own in an overlay.

## The Change Branch

A change is built whole: a work item the tracker reports as part of a change runs on
`change/<name>`, and the change makes one pull request — the proposal, every step, and the
close together. The engine never splits a change into more branches or pull requests; a split
is decided per case by whoever starts the work, and an item started that way reports no change.

- **Update Base takes the branch.** The run checks `change/<name>` out when it exists and cuts
  it from the fetched base when it does not.
- **A step is a commit, not a pull request.** Each run on the change commits on
  `change/<name>`, the tracker ticks the step's tasks, and Create Pull Request opens the one
  pull request only on the run that closes the change; an earlier run pushes and stops there.
  The tracker reports a step `done` once its tasks are ticked in a commit, so the closing run
  can take the acceptance and the archive before it opens the one pull request, which then
  carries them.
- **Both decisions are taken in the session.** Approval before the first step; acceptance on
  the closing run, before the archive. The pull request's review is the last look, not the
  decision.
- **No change reported, no change branch.** Every other item runs on the branch it was started
  on.

## Host Slots

A shared skill never names a host's own file. It names a slot. A slot is **bound, never
branched**: the skill reads `repo-instructions`; it does not contain an if-this-host clause.
No plugin ships bindings, so a slot resolves from what the running session offers, from
`bindings["delivery.slots"]` where a repository sets one — `repo-instructions` and
`pr-lane` only — or to the unbound default below, which
is the normal case and never a gap.

| Slot | What it resolves to | Unbound |
| --- | --- | --- |
| `repo-instructions` | The repository's root agent instruction file | Read `AGENTS.md` if present, else nothing |
| `model-override` | Where a 1.13.0 personal `model-selection.md` lives: `CLAUDE_FLOW_MODEL_SELECTION_PATH` when set, else `<config dir>/model-selection.md`. Phase resolution never reads it; `devbook-config:local` converts it into overlay `phases` entries | No file to convert |
| `stage-delegation` | Whether sub-agents are available | Run stages inline |
| `surface` | Which installed `delivery-surface-*` server provides each capability in `surface-contract.md`, in `bindings["delivery.surface"]` order | No surface; file artifacts only |
| `pr-lane` | The pull-request CLI or API | No pull request — `phase-create-pr` produces file artifacts only |
| `session-id` | The host's own id for the current agent session. Claude Code substitutes `${CLAUDE_SESSION_ID}` in skill content, so a skill that calls `start_run` carries that token verbatim; Copilot CLI substitutes nothing in skill content and hands its session id only to hooks, in their payload | Omit `sessionId` — a token still reading `${…}` is the unbound case |

**Behavioural divergence is a capability, not a host.** `stage-delegation` asks whether
sub-agents exist, not which host is running, so a stage declares an optional delegation hint
and the slot decides. `pr-lane` gates on the CLI being present, not on the host. That is what
keeps two hosts from re-diverging the moment one gains a feature.
