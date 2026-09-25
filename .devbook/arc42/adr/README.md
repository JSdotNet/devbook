# Decision Records

```meta
index: root
related: [".devbook/arc42/09-architecture-decisions.md"]
```

A choice this repository made and can defend — one whose reversal would cost a migration of
code, data, or an installed machine. One record per concern, named for the concern,
always describing the standing choice, with a `## History` table carrying every decision that
shaped it. A naming, layout, or process choice is not a record: the rule or chapter that states
it carries the reason.

A record belongs here rather than in [chapter 11](../11-risks-and-technical-debt.md) when
**something was decided**. A debt record names a gap somebody found and left open. The test is
whether the document can end in an answer; if it ends in two options and no pick, it is
[debt](../tdr/README.md).

## The set

```meta
```

| Concern | Standing choice | Last decided |
| --- | --- | --- |
| [Hosts](hosts.md) | One authored copy per asset, a wrapper per host where filenames differ, nothing names a host's own file or capability save four recorded divergences, a checker over hand-authored files. | 2026-09-25 |
| [Configuration](configuration.md) | One committed `.devbook/config.json` with the engine's four keys and every component's entry; a three-layer overlay that can only tighten; runtime facts in the `start` skill. | 2026-09-17 |
| [Install](install.md) | A plugin reaches a repository only through its `init` and is kept current by its `update`, one way, hash-tracked; `validate` checks the corpus and `devbook-config:doctor` the installation; only `devbook` carries a ledger; this repository stamps itself and materializes nothing. | 2026-09-23 |
| [Checks and Indexes](checks-and-indexes.md) | Three checks on every pull request and the validator on the `--check` path, all `devbook`'s; the committed `_meta/` index, its refresh, and the canvas are `devbook-derived`'s, enabled only where the index is wanted. | 2026-09-23 |
| [Chapter Schema](chapter-schema.md) | One layout under `.devbook/`; `approved` and `accepted` are rungs on `domain/`'s ladder alone, each with a signature and an optional content fingerprint; three folders rest at `active`; a context opens with `context.md` — boundary, flags and settings, small actors and dependencies — describes its skills, and a term is a chapter or an alias in `domain.md`. | 2026-09-22 |
| [Annotations](annotations.md) | The fence, its lifecycle, and the review triad are `devbook`'s schema and reach the five folders only; the chapter gate is the review plugin's and reads the chapter; only an open question blocks. | 2026-09-17 |
| [Surfaces](surfaces.md) | A viewer is a `delivery-surface-*` server or canvas, bound per capability group in the order `delivery.surface` gives, skipped when it answers `unavailable` at open; the engine ships and names none, four plugins implement the contract — Backlog through a proxy — each exposing only its names; the graph canvas is not one and lives with the committed index. | 2026-09-24 |
| [Hooks](hooks.md) | A session-start hook speaks only where the repository adopted the plugin; a tool matcher names its tools. | 2026-09-07 |
| [Flow Engine](flow-engine.md) | Four flows named for what changes over a closed set of eleven points; every outside party is a binding; the runner holds every gate and prepends Update Base; `verify` is the spec check. | 2026-09-23 |
| [Plugin Boundaries](plugin-boundaries.md) | One folder per plugin, three ways to couple, a lower layer never names a higher one; review, the committed index, fan-out, the unattended lane, and the guide are their own plugins; the specialists live elsewhere. | 2026-09-17 |
| [Releases](releases.md) | Every plugin `1.8.0`, moved together; a contract bump is a minor release and ships a migration when one is owed, which lives for one major; the marketplace name is a frozen per-machine key. | 2026-09-25 |

## Where a numbered record went

```meta
```

Until 2026-09-17 this folder held numbered files, one per decision — eighty-four by the time
the last one landed — and text elsewhere still says "record 47" where it was written against
that set. Git history holds the
files; this table says which concern each one folded into, so an old number still resolves.

| Concern | Records |
| --- | --- |
| Hosts | 3, 4, 17, 27, 58 |
| Configuration | 10, 11, 40, 70, 71, 72, 75 |
| Install | 28, 37, 38, 39, 56, 61, 67, 68 |
| Checks and Indexes | 29, 53, 57, 78, 79, 81 |
| Chapter Schema | 6, 7, 45, 48, 55, 80, 82, 83 |
| Annotations | 8, 52, 60, 62, 63, 77 |
| Surfaces | 5, 14, 15, 16, 18, 47 |
| Hooks | 41, 42 |
| Flow Engine | 9, 12, 13, 30, 31, 32, 46, 49, 50, 51, 54, 73, 74 |
| Plugin Boundaries | 2, 19, 22, 23, 24, 26, 34 |
| Releases | 1, 64, 65, 66, 84 |

Eleven were not technical choices and their reasons moved to the file that states the
choice: 20 to `AUTHORING.md`, 21 to [chapter 1](../01-introduction-and-goals.md), 25, 33, 35,
and 36 to the kernel concepts in [chapter 8](../08-crosscutting-concepts.md), 43 to
`.agents/rules/plugin-rules.md`, 44 to chapter 8's
[strategic rules](../08-crosscutting-concepts.md#strategic-rules), 59 to `AGENTS.md`, 69 to
the [devbook block](../building-blocks/devbook.md#interfaces), and 76 to
`.agents/rules/skills.md`.
