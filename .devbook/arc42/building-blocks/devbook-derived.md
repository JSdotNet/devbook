# devbook-derived

```meta
related: [".devbook/arc42/building-blocks/README.md", ".devbook/arc42/building-blocks/devbook.md#dependencies", ".devbook/arc42/adr/checks-and-indexes.md", ".devbook/arc42/adr/c4-model.md", ".devbook/arc42/12-glossary.md#derived-index"]
c4: ["marketplace.devbook-derived"]
code: ["plugins/devbook-derived"]
```

This block holds the committed index, the rendered C4 views, and the canvas that draws the
graph. It is responsible for one thing: a repository that keeps the derived `_meta/` files in
its tree has them current on the default branch and never regenerated in a session.

**Owns:**

- The refresh paths: the `refresh` skill, the on-demand script, the nightly workflow, the drift warning
- The view renderer, which turns each C4 view into a committed SVG
- The canvas, which draws the graph live
- The rule on where a derived artifact lives and what its envelope is
- The `init` that puts them in a repository

| Outside it | Owner |
| --- | --- |
| The checker that computes what these files hold, and the fence writer | [devbook](devbook.md) |

This block computes nothing. It asks devbook's `build.mjs` to write, with the one flag nothing
in devbook passes, and its canvas loads devbook's modules at their materialized path. A
repository that does not enable it has the full check and no derived file.

## Interfaces

```meta
related: [".devbook/arc42/building-blocks/devbook.md#interfaces", ".devbook/arc42/08-crosscutting-concepts.md#plugin-rule"]
```

Three skills, one rule, two workflows, and one extension. Everything else this block does at run
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

- **Does:** Materializes the on-demand refresh script, the nightly refresh and drift-warning workflows where GitHub Actions is present, the `devbook-derived-artifacts.md` rule as a trio per host, and this plugin's own marker-fenced section of `AGENTS.md`, then stamps `components.derived`.
- **Refuses:** Where that stamp already exists, and until devbook's stamp names an adopted folder and devbook's checker is materialized.
- **Ends by:** Running that check. A run that ends on a failing check is reported as failing, never as initialized.

### update

```meta
```

- **Does:** Replaces every file `init` materialized that still hashes to a release this plugin shipped, reports the customized ones, and re-stamps `components.derived`.
- **Migrates:** Payload-only: hash-matching is its whole mechanism, per devbook's reconcile protocol.
- **Refuses:** Where no stamp exists.
- **Leaves alone:** Both workflows, which are edited on the way in. A step a release adds to them reaches a repository as the shipped diff `update` reports, with no migration, per [install](../adr/install.md).

### refresh

```meta
```

- **Does:** Rewrites the committed indexes from the chapters on this branch and says which files moved.
- **Only writer of:** A derived file at session time, the deliberate exception to the rule that a session never regenerates.
- **When:** Only when a person asks for this branch to be current, committed on its own.
- **Never:** Inside a flow or beside a chapter edit.

## Structure

```meta
related: [".devbook/arc42/building-blocks/devbook.md#structure", ".devbook/arc42/adr/checks-and-indexes.md", ".devbook/arc42/adr/surfaces.md"]
```

None of the three parts parses a chapter.

![devbook-derived's components](c4:devbook-derived)

### Refresh Paths

```meta
```

Also called: `Update-DevbookIndex`, the nightly refresh, the drift warning.

These are the only ways a committed index gets rewritten:

- The `refresh` skill, when a person asks for this branch to be current
- `build/Update-DevbookIndex.ps1`, on demand, reporting which files moved
- The nightly workflow on the default branch, opening one pull request when anything moved
- The pull-request drift workflow, which warns and never fails

Each passes `--write` to devbook's checker at `.devbook/_tools/devbook-meta/build.mjs`. Where
the [view renderer](#view-renderer) is materialized, each then renders the C4 views into
`.devbook/arc42/_meta/c4/`, so the renders land in the same pull request as the indexes. A
flow or a chapter edit is never one of them.

| Invariant | Enforced at | Evidence |
| --- | --- | --- |
| Nothing writes a derived artifact but `build.mjs --write` and the view renderer, and nothing in devbook passes the flag | `build.mjs` | `unit:node:plugins/devbook/tools/devbook-meta/layout.test.mjs` |
| A drifted index warns a pull request and never fails it | `devbook-meta-drift.yml` | untested |
| The nightly refresh opens one pull request when the output moved and nothing when it did not | `devbook-meta-nightly.yml` | untested |
| A stale view render warns `Update-DevbookIndex.ps1 -Check` and never fails it | `Update-DevbookIndex.ps1` | untested |

### View Renderer

```meta
related: [".devbook/arc42/adr/c4-model.md", ".devbook/arc42/building-blocks/devbook.md#c4-model"]
```

Also called: the C4 renderer.

The renderer draws every view of the [C4 model](devbook.md#c4-model) as an SVG. The scheduled
refresh that writes the index also writes each one as a committed
`.devbook/arc42/_meta/c4/<view key>.svg`, so a reader on GitHub or any viewer that knows no C4
sees a picture beside each `c4:<key>` embed. The embed never points at the SVG: the key is the
chapter's, and the file is a derived copy. The renderer needs only Node and devbook's reader,
with no Java runtime and no package. The [C4 model record](../adr/c4-model.md) holds the reasons.

`tools/c4-render/render.mjs` takes the model devbook's `c4.mjs` reads and draws each
`systemLandscape`, `systemContext`, `container`, and `component` view as one SVG.

- **Contents:** The elements Structurizr's `include *`, `include <id>`, and `exclude` rules give the view, and one line per pair of shown elements. A line is the relationships between them as written, or the first implied one, dashed, when only elements inside them are related.
- **Layout:** Elements sit in ranks along the relationships, people outside the scope to one side and other outsiders to the other. The scope of a container or component view is a labelled boundary, and each group a labelled band.
- **Lines:** No line crosses a box. Between neighbouring ranks a line stays in the gap between them, within a rank it goes around any box between its ends, and a line that skips a rank runs in a lane no box occupies.
- **Shapes:** From the kind and the `Database` and `External` tags. A legend lists only what the view uses.
- **Theme:** Colours and fonts are presentation attributes, and a `<style>` inside the SVG overrides them under `prefers-color-scheme: dark`.
- **Labels:** Drawn after every line, so no line runs across a label's text. A label that would land on one already placed moves along its curve to the first place clear of every label and box, where the curve has one.

A dynamic view is laid out the same way along its steps. It draws the elements its steps name,
the scope as a boundary when it is a system or a container, and one arrow per step, labelled
with its number and description and drawn in step order. A response step is its own arrow,
never folded into the request it answers.

A deployment view draws one environment, so each environment's view is its own SVG.

- **Leaves:** The infrastructure nodes and the instances of that environment that `include *`, `include <id>`, and `exclude` give it. Under a system scope, `include *` and an included node keep only that system's container instances and the infrastructure, while a leaf named outright is always shown. Each instance is drawn as the element it instantiates, with that element's tags.
- **Nodes:** Every deployment node holding a shown leaf is a labelled box around what it holds, nested as the model nests them, with its instance count. A node holding nothing shown is not drawn.
- **Lines:** The relationships declared between the leaves and the ones each instance inherits from what it instantiates, in model order, direct as written or the first implied one, dashed.
- **Node lines:** A relationship declared to or from a deployment node runs between the node's box and its other end, labelled like any other, whenever that end is shown and neither holds the other. It runs along a gap between ranks, which no leaf occupies, and meets the node's side where the gap crosses the node. Otherwise it turns from the gap into the node's top or bottom through room no box outside the node occupies, so it crosses no leaf.
- **Spacing:** Lines that would share a gap or a turn are spread apart, and so are their labels.
- **Not drawn:** Deployment groups, which are outside the reader's DSL subset.

`init` materializes `render.mjs` and its README into `.devbook/_tools/c4-render/` where `arc42/`
is adopted, never its tests or fixtures. Placed there, it finds devbook's reader beside it in
`.devbook/_tools/devbook-meta/`. Every refresh path runs it as
`node .devbook/_tools/c4-render/render.mjs .devbook/arc42/workspace.dsl .devbook/arc42/_meta/c4`.

A run brings the folder level with the workspace:

- It writes each view whose SVG is missing or differs, and leaves a current file untouched.
- It deletes every `.svg` no view names, so a view removed from the workspace takes its render with it, and a workspace that is gone leaves none.

`--check` writes nothing and lists each render that is missing, stale, or an orphan, exiting `1`
when there is one. A workspace with a problem deletes no render, so a view the problem hid keeps
its picture until the workspace reads clean.

| Invariant | Enforced at | Evidence |
| --- | --- | --- |
| The same model gives the same bytes, and a change outside a view leaves its file alone | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| Each view kind draws byte for byte as its golden file | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| No two boxes overlap and no line crosses a box in any autolayout direction, and the boundary holds the scope's elements and no other | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| A dynamic view draws one arrow per step, numbered, in step order, and two steps between one pair get separate label places | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| A deployment node holds every leaf and node inside it, sibling nodes never overlap, and no leaf sits in a node that does not hold it, in any autolayout direction | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| A relationship to or from a deployment node ends on the node's border and its other end's, crosses no leaf, and is not drawn to what the node holds, in any autolayout direction | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| It reads devbook's model and bundles no parser | `render.mjs` | untested |
| A refresh writes one SVG per view key, rewrites only what changed, and deletes the render of a view that no longer exists | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| `--check` reports a missing, stale, or orphaned render, exits `1`, and writes nothing | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| The vendored `.devbook/_tools/c4-render/` holds `render.mjs` and `README.md` as the plugin ships them, and nothing else | `tools/check-assets.mjs` | untested |

`_meta/c4/` holds one SVG per view key and nothing else, written only by a refresh path.

### Canvas

```meta
```

Also called: `devbook-graph`, the reference graph canvas.

The block ships two Copilot canvases over devbook's own modules:

- The reference graph, with a node inspector that lists a chapter's test links and the command that runs each
- One chapter beside its parsed block and a metadata lint

It loads `graph.mjs`, `outline.mjs`, and `metadata.mjs` at runtime from `.devbook/_tools/devbook-meta/`,
the path devbook's `init` materializes, and from `plugins/devbook/tools/devbook-meta/` in the
repository that authors them. That runtime load is the "published shape to import"
[the surfaces record](../adr/surfaces.md) waited for, and what closes it.

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

This L1 extension declares exactly one dependency, on the convention whose checker it asks to
write.

### Outbound

```meta
```

| Depends on | Pattern | Mechanism | Contract | Why |
| --- | --- | --- | --- | --- |
| [devbook](devbook.md#dependencies) | Customer-Supplier, declared `devbook >=1.28.0 <2.0.0` | Passes `--write` to `.devbook/_tools/devbook-meta/build.mjs`, and loads the [canvas](#canvas)'s and [renderer](#view-renderer)'s modules from that folder; reads `adopted` from devbook's stamp | The checker's CLI, its module exports, the C4 model's shape, and the derived-artifacts envelope | It computes nothing itself. Every byte under `_meta/` and every node the canvas draws is devbook's checker's output. |
| Copilot Extension SDK | Conformist | `extensions/devbook-graph/`, registering two canvases | `copilot-extension.json` | The graph canvas is a host capability this block uses and does not define. |
| [The plugin kernel](../08-crosscutting-concepts.md) | Shared Kernel | Plugin folder, two manifests, the `rules/` folder its `init` delivers, the `components.derived` stamp | [Chapter 8](../08-crosscutting-concepts.md) | It is packaged, installed, and stamped like every other plugin here. |
| Claude Code and Copilot Plugin APIs | Conformist | Manifests, the `init` and `update` skills, the hook pair, and the rule wrappers `init` writes | Each host's own schemas | Only a materialized wrapper makes the `_meta/` rule fire when either host opens a derived file. |
| GitHub Actions | Conformist | The nightly refresh and the drift warning are workflows | The host's workflow schema | A scheduled refresh needs a scheduler, and a pull-request warning a runner. Without Actions, the on-demand script is the only path. |
| A consuming repository | Customer-Supplier, this block supplying | `devbook-derived:init` materializes what [init](#init) lists and the view renderer where `arc42/` is adopted; `components.derived` records it | The materialized paths | The committed index exists only where it was asked for. |

### Inbound

```meta
```

| Consumer | Pattern | Mechanism | Contract | What it relies on |
| --- | --- | --- | --- | --- |
| [delivery-schedule](delivery-schedule.md#dependencies) | Separate Ways | `schedule-devbook-validate` refreshes the committed indexes and view renders where this plugin materialized the refresh path, and otherwise skips the step | The refresh script's path and the renderer's | Nothing but the path: absent, the run fixes Markdown only. |
| [devbook-config](devbook-config.md#dependencies) | Conformist, read-only | Reads `components.derived` and invokes `devbook-derived:init` or `devbook-derived:update` during a fan-out, after devbook's | The stamp shape and the two skill names | That the stamp exists and keeps its shape; it writes none of it. |
| The Backlog desktop app, outside this repository | Conformist | Reads `.devbook/_meta/index.json` and `graph.json` off disk, and `scenarios.json` for the scenario parts an item references | The derived-artifacts envelope, `schemaVersion`, and the scenario register's own | That the files are committed and current on the default branch, the nightly refresh's job. |
| spec-manager, outside this repository | Conformist | Reads `_meta/naming.json` beside `index.json` in each folder it shows, and `_meta/scenarios.json` for its scenario tree and the "Used on" of a part | Each register's shape and its own `schemaVersion: 1` | That the files are committed. A missing one reads as no register, and one at another version as nothing. |

Nothing below names this block. The entire seam is the `--write` flag on devbook's checker, which
devbook never passes, and it runs upward only. A missing refresh degrades and never fails a load.
In a repository without this plugin, the schedule's daily run fixes Markdown and refreshes nothing.
