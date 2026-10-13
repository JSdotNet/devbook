# devbook-openspec

The change lane. [devbook](../devbook) is the source of truth and defines what a change looks
like on disk — `proposal.md`, deltas under `devbook-delta/`, `solution.md`, `tasks.md`, and the
merge in `delta.mjs`. [OpenSpec](https://github.com/Fission-AI/OpenSpec) runs the workflow
around it — `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, and the rest. This plugin installs
and configures OpenSpec so its skills write devbook changes, and never copies one of them.

An L1 extension: it depends on `devbook` and nothing else. The engine appears only as provider
strings a repository binds in `.devbook/config.json` — `devbook-openspec:spec` as the `skill` of
`flow-code`'s `phase-scope`, the replan chore `devbook-openspec:status --replan` after it, and
`bindings["delivery.tracker"]` as `{ "provider": "devbook-openspec:tracker" }`; without them,
OpenSpec's `/opsx:apply` builds each step itself.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
npm install -g @fission-ai/openspec@latest
```

Then enable `devbook-openspec` with `/plugin` and run `devbook-openspec:init` in the repository,
after `devbook` has adopted the change folder. The plugin never installs the CLI.

## What it ships

| Part | What it is |
|---|---|
| `assets/schemas/devbook/` | The `devbook` schema and its four templates: `proposal` → `devbook-delta` → `solution` → `tasks`, with `apply` tracking `tasks.md`. `solution` is OpenSpec's `design` renamed, because `design` is a devbook folder here. Managed: `update` replaces it while it still hashes to what landed |
| `assets/config.yaml` | OpenSpec's project config: `schema: devbook`, the context every OpenSpec skill is given, per-artifact rules, and apply and archive guidance. Seeded once; the repository's after |
| `rules/devbook-openspec-change.md` | What an OpenSpec skill does inside `openspec/changes/`, installed as a trio so both hosts apply it |
| `migrations/001-no-step-0-prototype/` | Removes the `prototype` stamp field and the Step 0 rule line `init` once seeded into `openspec/config.yaml`; `update` runs it first |
| `migrations/002-no-git-workflow/` | Removes the `workflow` stamp field, a proposal's `Workflow:` line, a step's `branch:` and `PR:` lines, and the per-step pull request line `init` once seeded into `openspec/config.yaml` |

## Skills

| Skill | What it does |
|---|---|
| `init` | Checks the CLI, runs `openspec init` at the repository root, writes the schema, the config, and the rule, removes the scaffolded `specs/`, and stamps `components.openspec`. Refused where that stamp exists |
| `update` | Checks the CLI against the stamped range, runs `openspec update`, replaces every managed file that still hashes to what landed, and re-stamps, after running any outstanding migration. Refused where no stamp exists |
| `spec` | The skill an engine's Scope phase follows for a step of a change: returns an approved change's proposal, the deltas a step delivers, its solution, and the step, unchanged. Refuses a change below `approved` or whose approval has lapsed |
| `tracker` | The provider for an engine's tracker: `tasks.md` as the work items, with `read_item`, `update_item`, and `comment`, and a step's state — `open`, `in progress`, `done` — read off its ticks, the close's off the archive |
| `status` | Artifacts, steps, the `verify-change` verdict per delta, and both gates with whether each fingerprint holds, in one report, and the one next move. With `--replan`, a chore after the engine's Scope phase: re-checks the deltas, the open steps, and the related chapters against `main` and fails on any flag. Writes nothing |
| `archive` | Checks both gates, merges every delta with `delta.mjs --apply --no-move`, then lets `openspec archive` move the folder |
| `onboard` | Walks a person through a first real change, one move at a time |

## What the engine binds

`devbook-config:init` writes these into `.devbook/config.json`; this plugin never does. The
entry is one phase of the complete `flow-code` map the engine's contract requires, shown alone
here. The two gates are optional and show a change's own gates inside a run: approval once Scope
has the step, and the verdicts once Spec Check has them.

```json
"phases": {
  "flow-code": {
    "phase-scope": {
      "skill": "devbook-openspec:spec",
      "after": [{ "run": "devbook-openspec:status --replan", "on-failure": "required" }]
    }
  }
},
"bindings": {
  "delivery.tracker": { "provider": "devbook-openspec:tracker" },
  "openspec.grill": "<plugin>:<grill-skill>"
},
"gates": [
  { "at": "scope", "when": "after", "purpose": "approval", "show": "artifact",
    "prompt": "This run builds one step of an approved change. Proceed?" },
  { "at": "spec-check", "when": "after", "purpose": "risk", "show": "summary",
    "prompt": "Verdicts above. Any row not aligned stays open on the change." }
]
```

`openspec.grill` names a skill from another marketplace that interrogates an idea before
`/opsx:propose`; `onboard` offers it at the explore move. `null` or absent, explore runs alone.
A machine may bind its own in the stack-config overlay through `devbook-config:local`.

## Where things live

OpenSpec resolves its root only as a folder named `openspec/`, with `changes/`, `schemas/`, and
`specs/` by those names. The root is the repository's, not `.devbook/`: from there every command
resolves anywhere in the tree, and OpenSpec's apply context can edit the code. The spike that
settled this, and what OpenSpec's model does not cover, are in this repository's own devbook —
the `devbook-openspec` building block and debt record 9.

```
openspec/
  config.yaml                 seeded by init, the repository's after
  schemas/devbook/            managed by this plugin
  changes/<name>/             one open change — devbook's shape
  changes/archive/            history, never read as context
.devbook/                     the chapters a change's deltas land in
```

## The stamp

`components.openspec` in `.devbook/config.json`: `pluginVersion`, `cli` (the range the CLI is
checked against), `tools` (the hosts `openspec init` set up), and `materialized`, per devbook's `assets/reconcile-protocol.md`.
Payload-only: no contract version and no migration ledger. Whether OpenSpec may send usage
statistics is one machine's answer and lives in the stack-config overlay as
`ext["devbook-openspec"].telemetry`, never in the stamp.

## License

MIT
