# devbook-derived

```meta
related: [".devbook/arc42/building-blocks/README.md", ".devbook/arc42/building-blocks/devbook.md#dependencies", ".devbook/arc42/adr/checks-and-indexes.md", ".devbook/arc42/adr/c4-model.md", ".devbook/arc42/12-glossary.md#derived-index"]
c4: ["marketplace.devbook-derived"]
code: ["plugins/devbook-derived"]
```

The committed index, the rendered C4 views, and the canvas that draws the graph. Responsible
for one thing: that a repository which keeps the derived `_meta/` files in its tree has them
current on the default branch and never regenerated in a session.

Inside the block: the refresh paths — the `refresh` skill, the on-demand script, the nightly
workflow, the drift warning — the view renderer that turns each C4 view into a committed SVG,
the canvas that draws the graph live, the rule that says where a
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

Three parts, none of which parses a chapter.

![devbook-derived's components](c4:devbook-derived)

### Refresh Paths

```meta
```

Also called: `Update-DevbookIndex`, the nightly refresh, the drift warning.

The ways a committed index gets rewritten, and the only ways: the `refresh` skill, when a
person asks for this branch to be current; `build/Update-DevbookIndex.ps1` on demand,
reporting which files moved; the nightly workflow on the default branch, opening one pull
request when anything did; and the pull-request drift workflow, which warns and never fails.
Each passes `--write` to devbook's checker at `.devbook/_tools/devbook-meta/build.mjs`, and
then, where the [view renderer](#view-renderer) is materialized, renders the C4 views into
`.devbook/arc42/_meta/c4/`, so the renders land in the same pull request as the indexes. A
flow, or a chapter edit, is never one of them.

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

Draws every view of the [C4 model](devbook.md#c4-model) as an SVG, for a committed
`.devbook/arc42/_meta/c4/<view key>.svg` that the same scheduled refresh as the index is to
write, so a reader on GitHub or any viewer that knows no C4 sees a picture beside each
`c4:<key>` embed. The embed never points at the SVG: the key is the chapter's, the file is a
derived copy. The renderer needs no Java runtime and no package — only Node and devbook's
reader — and reads the workspace through devbook's model, never its own parser. The
[C4 model record](../adr/c4-model.md) holds the reasons.

The drawing is built: `tools/c4-render/render.mjs` takes the model devbook's `c4.mjs` reads
and draws each `systemLandscape`, `systemContext`, `container`, and `component` view as one
SVG. A view shows the elements Structurizr's `include *`, `include <id>`, and `exclude` rules
give it, and one line per pair of shown elements: the relationships between them as written,
or the first implied one, dashed, when only elements inside them are related. Elements sit in
ranks along the relationships, people outside the scope to one side and other outsiders to
the other; the scope of a container or component view is a labelled boundary, and each group
a labelled band. No line crosses a box: between neighbouring ranks it stays in the gap
between them, within a rank it goes around any box between its ends, and a line that skips a
rank runs in a lane no box occupies. Shapes come from the
kind and the `Database` and `External` tags; a legend lists only what the view uses. Colours
and fonts are presentation attributes, and a `<style>` inside the SVG overrides them under
`prefers-color-scheme: dark`. Labels are drawn after every line, so no line runs across a
label's text, and a label that would land on one already placed moves along its curve to the
first place clear of every label and box, where the curve has one.

A dynamic view is laid out the same way along its steps: the elements its steps name, the
scope as a boundary when it is a system or a container, and one arrow per step, labelled with
its number and description and drawn in step order. A response step is its own arrow, never
folded into the request it answers.

A deployment view draws one environment, so each environment's view is its own SVG. Its
leaves are the infrastructure nodes and the instances of that environment that `include *`,
`include <id>`, and `exclude` give it — under a system scope, `include *` and an included
node keep only that system's container instances and the infrastructure, while a leaf named
outright is always shown — each instance drawn as the element it instantiates, with that
element's tags. Every deployment node holding a shown leaf is a labelled box around what it
holds, nested as the model nests them, with its instance count; a node holding nothing shown
is not drawn. Lines are the relationships declared between the leaves and the ones each
instance inherits from what it instantiates, in model order, direct as written or the first
implied one, dashed. A relationship to or from a deployment node itself is not drawn, and
deployment groups are not drawn as bands.

`init` materializes `render.mjs` and its README into `.devbook/_tools/c4-render/` where
`arc42/` is adopted, never its tests or fixtures, and every refresh path runs it as
`node .devbook/_tools/c4-render/render.mjs .devbook/arc42/workspace.dsl .devbook/arc42/_meta/c4`.
A run brings the folder level with the workspace: it writes each view whose SVG is missing or
differs, leaves a current file untouched, and deletes every `.svg` no view names — a view
removed from the workspace takes its render with it, and a workspace that is gone leaves
none. `--check` writes nothing and lists each render that is missing, stale, or an orphan,
exiting `1` when there is one. A workspace with a problem deletes no render, so a view the
problem hid keeps its picture until the workspace reads clean. Placed there, it finds devbook's reader beside it in
`.devbook/_tools/devbook-meta/`.

| Invariant | Enforced at | Evidence |
| --- | --- | --- |
| The same model gives the same bytes, and a change outside a view leaves its file alone | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| Each view kind draws byte for byte as its golden file | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| No two boxes overlap and no line crosses a box in any autolayout direction, and the boundary holds the scope's elements and no other | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| A dynamic view draws one arrow per step, numbered, in step order, and two steps between one pair get separate label places | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| A deployment node holds every leaf and node inside it, sibling nodes never overlap, and no leaf sits in a node that does not hold it, in any autolayout direction | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| It reads devbook's model and bundles no parser | `render.mjs` | untested |
| A refresh writes one SVG per view key, rewrites only what changed, and deletes the render of a view that no longer exists | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| `--check` reports a missing, stale, or orphaned render, exits `1`, and writes nothing | `render.mjs` | `unit:node:plugins/devbook-derived/tools/c4-render/render.test.mjs` |
| The vendored `.devbook/_tools/c4-render/` holds `render.mjs` and `README.md` as the plugin ships them, and nothing else | `tools/check-assets.mjs` | untested |

`_meta/c4/` holds one SVG per view key and nothing else, written only by a refresh path.

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
from `plugins/devbook/tools/devbook-meta/` in the repository that authors them; absent both,
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
| [devbook](devbook.md#dependencies) | Customer-Supplier, declared `devbook >=1.27.0 <2.0.0` | Passes `--write` to `.devbook/_tools/devbook-meta/build.mjs` from `refresh`, its script, and both workflows; the canvas loads `graph.mjs`, `outline.mjs`, and `metadata.mjs` from the same folder at runtime, and the view renderer `c4.mjs`; reads `adopted` from devbook's stamp | The checker's CLI, its module exports, the C4 model's shape, and the derived-artifacts envelope | It computes nothing itself. Every byte under `_meta/` and every node the canvas draws is devbook's checker's output. |
| Copilot Extension SDK | Conformist | `extensions/devbook-graph/`, registering two canvases | `copilot-extension.json` | The graph canvas is a host capability this block uses and does not define. |
| [The plugin kernel](../08-crosscutting-concepts.md) | Shared Kernel | Plugin folder, two manifests, the `rules/` folder its `init` delivers, the `components.derived` stamp | [Chapter 8](../08-crosscutting-concepts.md) | It is packaged, installed, and stamped like every other plugin here. |
| Claude Code and Copilot Plugin APIs | Conformist | Manifests, the `init` and `update` skills, the hook pair, and the rule wrappers `init` writes | Each host's own schemas | The `_meta/` rule has to fire when either host opens a derived file, which only a materialized wrapper achieves. |
| GitHub Actions | Conformist | The nightly refresh and the drift warning are workflows | The host's workflow schema | Refresh on a schedule needs a scheduler, and a pull-request warning needs a runner; without Actions the on-demand script is the only path. |
| A consuming repository | Customer-Supplier, this block supplying | `devbook-derived:init` materializes the script, both workflows, the view renderer where `arc42/` is adopted, the rule trio, and its own marker-fenced section of `AGENTS.md`; the stamp under `components.derived` records it | The materialized paths | The committed index exists only where it was asked for. |

### Inbound

```meta
```

| Consumer | Pattern | Mechanism | Contract | What it relies on |
| --- | --- | --- | --- | --- |
| [delivery-schedule](delivery-schedule.md#dependencies) | Separate Ways | `schedule-devbook-validate` refreshes the committed indexes and view renders where this plugin materialized the refresh path, and skips the step where it did not | The refresh script's path and the renderer's | Nothing but the path: absent, the run fixes Markdown only. |
| [devbook-config](devbook-config.md#dependencies) | Conformist, read-only | Reads `components.derived` and invokes `devbook-derived:init` or `devbook-derived:update` during a fan-out, after devbook's | The stamp shape and the two skill names | That the stamp exists and keeps its shape; it writes none of it. |
| The Backlog desktop app, outside this repository | Conformist | Reads `.devbook/_meta/index.json` and `graph.json` off disk, and `scenarios.json` for the scenario parts an item references | The derived-artifacts envelope, `schemaVersion`, and the scenario register's own | That the files are committed and current on the default branch — which is what the nightly refresh is for. |
| spec-manager, outside this repository | Conformist | Reads `_meta/naming.json` beside `index.json` in each folder it shows, and `_meta/scenarios.json` for its scenario tree and the "Used on" of a part | Each register's shape and its own `schemaVersion: 1` | That the files are committed; one missing is read as no register, and one at another version is read as nothing. |

Nothing below names this block: devbook's checker takes a `--write` flag and devbook never
passes it; that flag is the entire seam, and it runs upward only. A missing refresh degrades
and never fails a load — a repository without this plugin has the full check and no derived
file, and the schedule's daily run fixes Markdown and refreshes nothing.
