---
name: engine-contract
description: The contract between the delivery engine and everything a repository plugs into it — the closed set of flow extension points (services and chores), the gates mechanism, the policy keys, the .devbook/config.json stack config and the overlays a machine keeps over it, the bindings, and the host slots.
---

# Engine Contract

Everything a repository plugs into the engine is named here: the points it fills with
providers, the gates it adds, the policy it sets, and the roles, tracker, and host slots it
binds. The surface a run reports through is `surface-contract.md` beside this file. Read this
file once, when the run resolves its stack config.

Three rules hold across all of it, and they are the reason the engine stays reusable:

1. **The engine names; the repository fills.** The point set, the gate mechanism, the policy
   keys, and the surface capabilities are closed and declared by the engine. A repository
   picks what runs at a point; it never invents a point, a policy key, or a stage.
2. **Configuration chooses among behaviour the engine already implements.** It never
   introduces new behaviour. A repository that needs a different stage sequence writes a
   repo-native `flow-*` skill, which takes precedence for the categories it covers.
3. **A lower layer never names a higher one, and the engine names no specialist.** It names
   points, roles, and capabilities; a repository names the plugin that fills one. No
   specialist, content plugin, or surface is ever modified to know about the engine, and the
   `your-*` and `repo:*` ids below are placeholders — for whatever you installed, and for a
   skill the repository writes itself. Every other id in an example names a skill that ships.

## The Stack Config

`.devbook/config.json`, repo-scope and committed. The engine owns four top-level keys
and never edits another component's. `components` belongs to each component's own `init` and `update` skills.
`id` sits beside the four and is not a setting: it names the repository, once, so a machine can
keep an overlay for it — see below.

The path is a path, not a dependency: the engine reads that file whether or not the repository
adopted a single devbook folder, and `devbook` being absent costs nothing here.

```json
{
  "id": "your-repo",
  "bindings": {
    "delivery.tracker": { "provider": "github" },
    "delivery.roles": {
      "architecture": "your-architecture-plugin",
      "qa":           "your-qa-plugin",
      "domain":       "your-domain-plugin",
      "ux":           "your-ux-plugin",
      "docs":         "your-docs-plugin",
      "product":      null,
      "security":     null
    },
    "delivery.mcp": {
      "spec":        [ "your-guidelines-server" ]
    }
  },
  "extensions": {
    "session.start": [ "devbook:validate" ],
    "spec":          "your-architecture-plugin:draft-spec",
    "implement":     "your-coding-plugin:coding",
    "validate":        "your-coding-plugin:coding",
    "data.prepare":  [ { "run": "repo:seed-test-data", "on-failure": "required" } ],
    "app.start":     { "provider": "your-qa-plugin:qa", "host": "aspire" },
    "qa.run":        { "provider": "your-qa-plugin:qa" },
    "verify":        "devbook:verify-change",
    "flow.end":      [ "repo:capture-improvement" ]
  },
  "policy": {
    "qa.depth":               "targeted",
    "validate.retryBudget":     2,
    "gate.reviseBudget":      3,
    "commit.at":              "gate",
    "pr.required":            true,
    "pr.base":                "main"
  },
  "gates": [
    { "at": "spec", "when": "after", "purpose": "approval",
      "prompt": "Spec approved, or revise?", "show": "artifact", "unattended": "block" }
  ]
}
```

- **The file is optional, and so is every engine key in it.** Absent, every point falls back
  to its default provider, no extra gate exists, and every policy key takes the default in the
  table below. Only the engine reads the four keys, so a repository that adopted devbook and
  not `delivery` carries `id` alone and validates. A malformed file is reported once and then
  ignored; it never blocks a run.
- **An unknown key is rejected, not ignored** — the same way a plugin manifest rejects an
  unknown field. Report it by name and stop, so a typo is never a silently absent setting.
- **`null` means deliberately unbound**, which is different from absent. Absent means nobody
  has decided; `null` means somebody decided no.
- **No model ever appears in this file.** Model choice is personal — see
  `flow-model-selection.md`.
- **No secrets.** The file is committed. A credential pointer belongs in the repository's
  `start` skill, and the value belongs in a secret store.
- **Validate it before trusting it.** `node tools/stack-config/check.mjs [path]` checks `id` and the
  four engine-owned keys against `resources/config.schema.json` and exits non-zero on
  the first problem. It ignores `components`, which each component validates itself, and
  rejects by name any *other* top-level key — the only two owners are the engine and a
  component, so a third name is a misspelling of one of them.
  `resources/config-template.json` is a filled-in starting point.
- **Read it through the checker, never by hand.** `node tools/stack-config/check.mjs --print`
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

Every layer carries the same four keys, validated against the same schema, and merges the
same way:

| Shape | Merges by |
| --- | --- |
| Object | Key by key, the overlay winning. A sibling the overlay does not name is left standing. |
| Array | Replaced whole. A chore list is an ordered whole, and half of one from each file is a run nobody wrote down. |
| `gates` | **Appended.** An overlay can add a checkpoint and has no way of spelling the removal of one — at any layer, of any layer beneath it. |
| `null` | A value — deliberately unbound — never a delete. |

Five things an overlay may not say, and the checker refuses each by name:

| Refused | Because |
| --- | --- |
| `id` | It is what found the overlay. Renaming it from inside is a loop. |
| `components` | A stamp is repo-scope and committed; an overlay is neither. |
| `policy.pr.required` | What the repository produces, not how one machine runs it. |
| `policy.qa.ceiling` | The ceiling is the repository's limit. `qa.depth` is your choice inside it. |
| `policy.gate.personalValidation` | The mandatory gate. Already `const` in the schema, and named here so the refusal states the invariant rather than a type error. |

That list is the whole safety story, and it is worth stating plainly: **a file no reviewer
sees must never be able to weaken what a reviewer sees.** Everything a reader of the committed
config would conclude about the gates a run passes, the pull request it opens, and the deepest
QA it may reach stays true no matter what any overlay says. What an overlay changes is the cost
and the wiring of your own run — shallower QA, a local role binding, a different MCP server, a
zeroed retry budget, an extra checkpoint of your own.

One thing an overlay may say that the committed file may not: **`ext`**, the machine-scope
counterpart of `components`. `ext.<plugin>.<key>` holds what a plugin needs to remember about
your machine and nothing else — the environment and model a scheduled routine runs with, say
— and is the *Extension Namespace* the devbook already reserves in a chapter's `meta` block,
applied to the config. The engine checks only that it is an object of objects, merges it like
any other object, and reads no key in it; the plugin that owns the namespace does, and asks
only for what is absent there. Refused in the committed file: a reviewer has no use for one
machine's routine settings, and a personal value in a committed file is everybody's.

`check.mjs` finds both layers on its own — from the environment and the committed `id` — and
validates each three times over: what it may not say, whether it is well-typed alone, and
whether the merge so far still validates, the third catching the pair that is only wrong
together and naming the layer that broke it; `--print` then hands the merge to whoever asked.
`resources/config.local-template.json` is a starting point for either, and
`devbook-config:local` writes one from your answers.

**Gitignored is not private, and neither is your home directory.** No secret, the same as
the committed file, and no model the engine reads — flow model choice stays in the file the
`model-override` slot names: an overlay is read by every agent in your session and pasted
into a bug report as readily as anything else.

## Extension Points

The point set is closed. Every point is either a **service** — exactly one provider,
returning a result the flow acts on — or a **chore** — zero or more, in declared order,
producing side effects and a report.

| Point | Kind | When | Contract |
| --- | --- | --- | --- |
| `session.start` | chore | Once, before the first flow | Load context, check environment and tooling, warn early. Distinct from the host's own session-start hook, which is settings-level and knows nothing about flows. |
| `flow.start` | chore | After Stage 0 resolves scope | Augment the scope record with repository-specific constraints. May not redefine it. |
| `spec` | service | Specification and architecture intake | Scope and acceptance criteria → the specification the rest of the flow builds on. Unbound: the flow-runner writes it inline. The highest-value gate attaches here. |
| `implement` | service | The implementation stage | An area plus a change brief, or a `validate` failure to repair → a change set and what was tested. Unbound: the flow implements inline with generic practice and says so in the summary. |
| `validate` | service | After each `implement` pass | An area and its change set → build result, suite results, failing targets with the error lines that matter. Default provider: `phase-build-test`. |
| `data.prepare` | chore | Before `app.start` and `qa.run` | Seed data, fixtures, credentials. The most repository-specific point in the set — usually a `repo:` skill. |
| `app.start` | service | Runtime is needed | Start the application → base URLs, a health verdict, a log and trace stream. Default provider: `phase-validation`. |
| `qa.run` | service | QA depth is not `skipped` | Scenarios → evidence. Default provider: `phase-validation`. |
| `deliver` | service | After approval | Open the change for review and, once `verify` has reported, update the work item. Default provider: the `pr-lane` slot plus the bound tracker. |
| `verify` | service | After the pull request, before Work Item Update | The specification the run built on, the governed chapters the change set touches, and the change set → one verdict per item — `aligned`, `spec-ahead`, `code-ahead`, `conflict`, `unresolved` — with the evidence that settles it and what each calls for. Report-only: it edits nothing and commits nothing. Unbound: the flow-runner reaches the verdicts itself. |
| `flow.end` | chore | Always, last | Contribute to the run summary and capture what this run learned. |

**Services decide; chores contribute.** A chore may fail, and its failure is fatal when it
declared `on-failure: "required"` — but a chore can never alter the flow's decision, rewrite
a stage's result, or stand in for a gate. Without that line an injected chore becomes an
invisible second implementation of the flow, which is the thing the engine exists to prevent.

**Declaring a provider.** A service takes one provider — a string, or an object whose
`provider` key names it and whose other keys are options that provider understands. A chore
takes an array, each entry a string or `{ "run": …, "on-failure": "required"|"advisory" }`;
`advisory` is the default and puts a failure in the summary instead of stopping the run.

A provider id is `plugin:skill`, a bare `plugin` (resolved through its role), or
`repo:<skill>` for a repo-native skill the host loads with no marketplace involved. A
provider that does not resolve degrades to the point's unbound behaviour, named once in the
run summary — never a silent skip, and never a reason to fail the run.

**A `spec` provider may return a specification approved elsewhere.** Bound as
`"spec": "your-spec-plugin:your-approved-spec-skill"`, it reads the specification the work item
points at, already approved where it was written, and returns it unchanged. The flow-runner
uses what it returns as the run's specification: it derives nothing inline and neither
rewrites nor supplements it. A `spec` approval gate with `show: artifact` renders that
returned specification — what the provider returned, not a summary of it — and `revise`
re-runs the provider with the notes, as at any point.

## Gates

A gate is the human-in-the-loop mechanism. It presents the output of the point it is attached
to and asks a question about it.

**The asymmetry is what makes gates safe: configuration may add a gate anywhere; it may never
remove one or hand one to a plugin.** Adding a human checkpoint can only make a flow more
conservative. Removing one is the only direction that can weaken it, so that direction stays
closed. Personal Validation is the mandatory instance of this pattern — one row in the table
below, not a second mechanism.

| Field | Values | Means |
| --- | --- | --- |
| `at` | any point name | The point the gate attaches to. |
| `when` | `before`, `after` | Which side of that point. |
| `purpose` | `approval`, `resource`, `cost`, `risk`, `handoff` | What kind of question this is, which decides what it must show. |
| `prompt` | free text | The question, in the user's terms. Optional; the purpose supplies a default. |
| `show` | `artifact`, `summary`, `none` | `artifact` renders the point's output through the surface — the specification itself, not a description of it. Default `summary`. |
| `unattended` | `block`, `proceed`, `skip-point` | What an unattended run does here. Default `block`. |

| Purpose | Typical placement | What it must show |
| --- | --- | --- |
| `approval` | after `spec` | The specification itself, rendered. The one most repositories should turn on. |
| `resource` | before `app.start` | Just the question — "only one runtime instance runs here, OK to start?" |
| `cost` | before `qa.run` | An estimate. A gate that cannot say what it is about to spend is not helping anyone decide. |
| `risk` | after `validate` | What the change set actually touched — migrations, auth, a public contract. |
| `handoff` | Personal Validation | The code review, the QA evidence, the running application, and what to check by hand — assembled by `skills/phase-personal-validation/SKILL.md`. |

### Three outcomes, not two

| Outcome | Effect |
| --- | --- |
| `approve` | Continue. |
| `revise` | Re-run the point the gate is attached to, carrying the human's notes as input. The flow moves backwards, deliberately. Bounded by `policy.gate.reviseBudget`; when the budget is spent the flow stops and says so rather than cycling on something nobody can settle. |
| `decline` | Stop. Mark the stage `blocked`. **Never a silent skip** — "don't start the app" must not degrade into "continue without QA". |

Attach a gate to the point you would want re-run. `{ "at": "spec", "when": "after" }` and
`{ "at": "implement", "when": "before" }` sit in the same place in the sequence, but only the
first makes `revise` mean "write the specification again".

### Unattended runs

Many runs are unattended: `delivery-schedule`'s `schedule-*` entry points fire on a cadence,
and a spawned worker session has no user turn. A gate that waits for a human would deadlock all of
them, so `unattended` defaults to `block`, and `block` means **park with a handoff brief** —
what is done, what is not, the exact resume invocation — not "wait forever". An unattended run
that parks after `spec` with the specification in its brief is strictly better than one that
implements something speculative for an hour first.

`proceed` is for a gate that only exists to inform an attended run. Reach for `skip-point`
rarely: a gate on `app.start` that skips the point silently drops QA, which is the
degradation the `decline` row exists to prevent.

## Policy

Every key is a closed enum or a number, and every key has a documented default, so an absent
key means the engine's own choice rather than undefined.

| Key | Values | Default |
| --- | --- | --- |
| `qa.depth` | `full`, `targeted`, `startup-only`, `skipped` | change-kind selection in `phase-validation` |
| `qa.ceiling` | same set | `full` |
| `validate.retryBudget` | integer ≥ 0 | `2` |
| `gate.reviseBudget` | integer ≥ 0 | `3` |
| `gate.personalValidation` | `required` | `required` — the key states the fact, it cannot soften it |
| `commit.at` | `gate`, `manual` | `manual` |
| `pr.required` | boolean | `true` |
| `pr.base` | a branch name | the repository's default branch |
| `phases.updateBase` | boolean | `true` |
| `phases.verification` | boolean | `true` |
| `phases.workItemUpdate` | boolean | `true` |

`commit.at` is the one policy key that binds a stage running long before the phase that
defines it: `gate` makes Personal Validation the flow's single commit point, so **no earlier
stage commits** and every `implement` provider is briefed to leave committing to that phase.
The mechanics — one commit per handback, a new commit per revise round — are in **Personal
Validation** (`flow-phases.md`). `manual` leaves committing to the user.

`pr.base` is the one value that is neither enum nor number. The check validates its *shape* —
a well-formed git ref name, so free prose is rejected by pattern — and nothing more. Whether
that ref exists is resolved against the remote at flow time — Update Base fetches it, the
pull-request lane opens against it — because a config check that reached for the network would
fail offline, in a fresh repository with no remote, and on a base branch not yet pushed.

**QA depth resolves in one order, highest first:** `policy.qa.depth` here, then
`phase-validation`'s change-kind selection. The first one present wins, and
`policy.qa.ceiling` caps the result however it was reached. The repository's `start` skill
describes the application and never sets a depth. `qa.depth` may be overlaid per machine,
`qa.ceiling` may not.

## Bindings

A role, a tracker, and a host slot are bound per repository and are **never** plugin
dependencies: one missing specialist must not demote every skill that names it.

- **Roles.** `architecture`, `qa`, `domain`, `ux`, `product`, `security`, `docs`. A skill names the
  role; `bindings["delivery.roles"]` says which plugin fills it. Every role reference states
  its fallback, so no flow is ever dead because a role is unbound — a stage reads
  *preferred: role `architecture`; fallback: inline, using the ADR template in
  `instructions/`*. A role bound to a plugin nobody has enabled is a warning naming both
  files, not a failure.
- **Tracker.** `bindings["delivery.tracker"]` names the work-item system: `github` resolves
  items to issues, `jira` to tickets in a named project, `markdown` to chapters in a folder
  the repository names, for one that plans work as Markdown, and `backlog` to entries in the
  Backlog desktop application. Operations: `find_item`, `read_item`, `create_item`, `comment`,
  `transition`, `link_change`. Unbound, a flow runs to its file artifacts and opens, comments
  on, and transitions nothing.
  Every operation resolves the same way, reported once when it first does: the bound tracker's
  own tooling first — an installed tracker plugin skill or MCP integration — then the host's
  CLI for that tracker. A skill names the operation and never the provider's command. A bound
  tracker whose tooling does not answer is reported once and the run continues as if unbound —
  the rule the `delivery.mcp` bullet below states for a server, applied to the tracker.
  `backlog` resolves through its MCP integration and has no CLI behind it: the six operations
  are the `backlog` server's tools of the same name, `transition` rewrites the entry's status
  token so the entry's own lifecycle refuses an illegal move rather than the engine deciding
  one, and every scoped call carries `repository` in `owner/name` form, read off the git
  remote. Nothing listening means the application is closed, which is the unbound path above.
  A `plugin:skill` provider — `{ "provider": "your-tracker-plugin:your-tracker-skill" }` —
  hands every operation to that skill, which implements three: `read_item`, `update_item`,
  and `comment`. `update_item` is `transition` and more: it sets the item's step state and
  ticks the tasks the run completed. The state is one of four, read off the step's own branch
  and pull request rather than decided by the engine — `open`, `in progress` (a branch
  exists), `in review` (a pull request is open), `done` (merged). An operation outside the
  three — `find_item`, `create_item`, `link_change` — takes the unbound path, reported once.
  A skill that does not resolve is the unbound path for all of them.
- **Surface.** `bindings["delivery.surface"]` orders the installed surfaces, first wins;
  **The Surface Capability** in `surface-contract.md` states the rule.
- **MCP servers.** `bindings["delivery.mcp"]` says which servers each point uses, by the id
  the repository's own MCP configuration declares — `{ "spec": ["your-guidelines-server"] }`.
  A stage resolves the servers of the point it serves from the live tool list, by pattern,
  since a host may namespace them. A server that does not answer is reported once, and the
  stage continues on the repository's own instruction files and chapters — it costs that
  stage its grounding, never the run. An absent point takes the engine default in **MCP
  Server Strategy** (`flow-execution-model.md`); `null` binds none. The engine
  names no server of its own beyond those defaults, and no server is ever a dependency;
  `resources/mcp-template.json` and `resources/mcp-vscode-template.json` declare the
  defaults in each host's shape for a repository to copy.
- **Implementation is not a role.** It owns a phase, carries a toolchain, and loops with
  validation, so it binds as the `implement` and `validate` services above rather than as an
  advisor a stage delegates a question to.

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
| `model-override` | Where a user's personal model preferences live: `CLAUDE_FLOW_MODEL_SELECTION_PATH` when set, else `<config dir>/model-selection.md` beside the overlays | Category defaults |
| `stage-delegation` | Whether sub-agents are available | Run stages inline |
| `surface` | Which installed `delivery-surface-*` server provides each capability in `surface-contract.md`, in `bindings["delivery.surface"]` order | No surface; file artifacts only |
| `pr-lane` | The pull-request CLI or API | No pull request — `deliver` produces file artifacts only |
| `session-id` | The host's own id for the current agent session. Claude Code substitutes `${CLAUDE_SESSION_ID}` in skill content, so a skill that calls `start_run` carries that token verbatim; Copilot CLI substitutes nothing in skill content and hands its session id only to hooks, in their payload | Omit `sessionId` — a token still reading `${…}` is the unbound case |

**Behavioural divergence is a capability, not a host.** `stage-delegation` asks whether
sub-agents exist, not which host is running, so a stage declares an optional delegation hint
and the slot decides. `pr-lane` gates on the CLI being present, not on the host. That is what
keeps two hosts from re-diverging the moment one gains a feature.
