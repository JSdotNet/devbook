# devbook-derived

```meta
related: [".devbook/arc42/building-blocks/README.md", ".devbook/arc42/building-blocks/devbook.md#dependencies", ".devbook/arc42/adr/checks-and-indexes.md", ".devbook/arc42/12-glossary.md#derived-index"]
```

The committed index and the canvas that draws it. Responsible for one thing: that a
repository which keeps the derived `_meta/` indexes in its tree has them current on the
default branch and never regenerated in a session.

Inside the block: the refresh paths — the `refresh` skill, the on-demand script, the nightly
workflow, the drift warning — the canvas that draws the graph live, the rule that says where a
derived artifact lives and what its envelope is, and the `init` that puts them in a
repository.

Outside it: the checker that computes what these files hold, and the fence writer — both
[devbook](devbook.md)'s. This block computes nothing: it asks devbook's `build.mjs` to write,
with the one flag nothing in devbook passes, and its canvas loads devbook's modules at their
materialized path. A repository that does not enable it has the full check and no derived
file.

## Interfaces

```meta
related: [".devbook/arc42/building-blocks/devbook.md#interfaces", ".devbook/arc42/08-crosscutting-concepts.md#plugin-rule"]
```

Two skills, one rule, two workflows, and one extension. Everything else this block does at run
time is a workflow or a script passing `--write` to devbook's checker.

| Interface | Kind | Reached by |
| --- | --- | --- |
| `init` | skill | A person, or `devbook-config:init` during a fan-out |
| `update` | skill | A person, or `devbook-config:update` during a fan-out |
| `refresh` | skill | A person who wants this branch current |
| `devbook-derived-artifacts.md` | rule | Either host, on opening a file under `_meta/`, through the wrapper `init` writes |
| `devbook-meta-nightly.yml`, `devbook-meta-drift.yml` | workflows | GitHub Actions, on the schedule and on a pull request |
| `devbook-graph` | Copilot extension, two canvases | Copilot CLI, from the live tool list |

### init

```meta
```

Materialize the on-demand refresh script, the nightly refresh and drift-warning workflows where
GitHub Actions is present, the `devbook-derived-artifacts.md` rule as a trio per host, and this
plugin's own marker-fenced section of `AGENTS.md`; then stamp `components.derived`. Refuses
where that stamp already exists.

Refuses to run until devbook's stamp names an adopted folder and devbook's checker is
materialized, and ends by running that check — a run that ends on a failing check is reported
as failing, never as initialized.

### update

```meta
```

Replace every file `init` materialized that still hashes to a release this plugin shipped,
report the customized ones, and re-stamp `components.derived`. Payload-only: hash-matching is
its whole migration mechanism, per devbook's reconcile protocol. Refuses where no stamp exists.

### refresh

```meta
```

Rewrite the committed indexes from the chapters on this branch and say which files moved. The
one session-time way to write a derived file, and the deliberate exception to the rule that a
session never regenerates: only when a person asks for this branch to be current, never inside
a flow, never beside a chapter edit, and committed on its own.

## Structure

```meta
related: [".devbook/arc42/building-blocks/devbook.md#structure", ".devbook/arc42/adr/checks-and-indexes.md", ".devbook/arc42/adr/surfaces.md"]
```

Two parts, neither of which parses a chapter.

### Refresh Paths

```meta
```

Also called: `Update-DevbookIndex`, the nightly refresh, the drift warning.

The ways a committed index gets rewritten, and the only ways: the `refresh` skill, when a
person asks for this branch to be current; `build/Update-DevbookIndex.ps1` on demand,
reporting which files moved; the nightly workflow on the default branch, opening one pull
request when anything did; and the pull-request drift workflow, which warns and never fails.
Each passes `--write` to devbook's checker at `.devbook/_tools/devbook-meta/build.mjs`. A
flow, or a chapter edit, is never one of them.

| Invariant | Enforced at | Evidence |
| --- | --- | --- |
| Nothing writes a derived artifact but `build.mjs --write`, and nothing in devbook passes the flag | `build.mjs` | `unit:node:plugins/devbook/tools/devbook-meta/layout.test.mjs` |
| A drifted index warns a pull request and never fails it | `devbook-meta-drift.yml` | untested |
| The nightly refresh opens one pull request when the output moved and nothing when it did not | `devbook-meta-nightly.yml` | untested |

### Canvas

```meta
```

Also called: `devbook-graph`, the reference graph canvas.

Two Copilot canvases over devbook's own modules: the reference graph, rebuilt from disk on
open so it can never show a stale index, with a node inspector that lists a chapter's test
links and the command that runs each; and one chapter beside its parsed block and a metadata
lint. It reads the Markdown, never `_meta/`, and writes nothing.

It bundles no parser. It loads `graph.mjs`, `outline.mjs`, and `metadata.mjs` from
`.devbook/_tools/devbook-meta/` — the path devbook's `init` materializes — at runtime, and
from `plugins/devbook/tools/devbook-meta/` in the repository that vendors them; absent both,
it names `devbook:init` and draws nothing. That runtime load is the "published shape to
import" [the surfaces record](../adr/surfaces.md) waited for, and what closes it.

| Invariant | Enforced at | Evidence |
| --- | --- | --- |
| The reference graph is rebuilt from disk on open, so it can never show a stale index | `extension.mjs` | untested |
| The canvas reads the Markdown, never `_meta/`, and writes nothing | `extension.mjs` | untested |
| It bundles no parser: `graph.mjs`, `outline.mjs`, and `metadata.mjs` load at runtime from the installed path, or the vendored one | `extension.mjs` | untested |
| With neither path present it names `devbook:init` and draws nothing | `extension.mjs` | untested |

## Dependencies

```meta
related: [".devbook/arc42/building-blocks/devbook.md#dependencies", ".devbook/arc42/08-crosscutting-concepts.md#layer"]
```

An L1 extension: exactly one declared dependency, on the convention whose checker it asks to
write.

### Outbound

```meta
```

| Depends on | Pattern | Mechanism | Contract | Why |
| --- | --- | --- | --- | --- |
| [devbook](devbook.md#dependencies) | Customer-Supplier, declared `devbook >=1.1.0 <2.0.0` | Passes `--write` to `.devbook/_tools/devbook-meta/build.mjs` from `refresh`, its script, and both workflows; the canvas loads `graph.mjs`, `outline.mjs`, and `metadata.mjs` from the same folder at runtime; reads `adopted` from devbook's stamp | The checker's CLI, its three module exports, and the derived-artifacts envelope | It computes nothing itself. Every byte under `_meta/` and every node the canvas draws is devbook's checker's output. |
| Copilot Extension SDK | Conformist | `extensions/devbook-graph/`, registering two canvases | `copilot-extension.json` | The graph canvas is a host capability this block uses and does not define. |
| [The plugin kernel](../08-crosscutting-concepts.md) | Shared Kernel | Plugin folder, two manifests, the `rules/` folder its `init` delivers, the `components.derived` stamp | [Chapter 8](../08-crosscutting-concepts.md) | It is packaged, installed, and stamped like every other plugin here. |
| Claude Code and Copilot Plugin APIs | Conformist | Manifests, the `init` and `update` skills, the hook pair, and the rule wrappers `init` writes | Each host's own schemas | The `_meta/` rule has to fire when either host opens a derived file, which only a materialized wrapper achieves. |
| GitHub Actions | Conformist | The nightly refresh and the drift warning are workflows | The host's workflow schema | Refresh on a schedule needs a scheduler, and a pull-request warning needs a runner; without Actions the on-demand script is the only path. |
| A consuming repository | Customer-Supplier, this block supplying | `devbook-derived:init` materializes the script, both workflows, the rule trio, and its own marker-fenced section of `AGENTS.md`; the stamp under `components.derived` records it | The materialized paths | The committed index exists only where it was asked for. |

### Inbound

```meta
```

| Consumer | Pattern | Mechanism | Contract | What it relies on |
| --- | --- | --- | --- | --- |
| [delivery-schedule](delivery-schedule.md#dependencies) | Separate Ways | `schedule-devbook-check` refreshes the committed indexes where this plugin materialized the refresh path, and skips the step where it did not | The refresh script's path | Nothing but the path: absent, the run fixes Markdown only. |
| [devbook-collaboration](devbook-collaboration.md#dependencies) | Separate Ways | `chapter-review-queue` prefers the committed indexes and scans when there are none | The derived-artifacts envelope | Nothing: the scan fallback is the contract. |
| [devbook-config](devbook-config.md#dependencies) | Conformist, read-only | Reads `components.derived` and invokes `devbook-derived:init` or `devbook-derived:update` during a fan-out, after devbook's | The stamp shape and the two skill names | That the stamp exists and keeps its shape; it writes none of it. |
| The Backlog desktop app, outside this repository | Conformist | Reads `.devbook/_meta/index.json` and `graph.json` off disk | The derived-artifacts envelope and `schemaVersion` | That the files are committed and current on the default branch — which is what the nightly refresh is for. |

Nothing below names this block: devbook's checker takes a `--write` flag and devbook never
passes it; that flag is the entire seam, and it runs upward only. A missing refresh degrades
and never fails a load — a repository without this plugin has the full check and no derived
file, and the schedule's daily run fixes Markdown and refreshes nothing.
