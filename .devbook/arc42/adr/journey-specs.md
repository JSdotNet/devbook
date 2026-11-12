# Journey Specs

```meta
date: 2026-10-20
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/building-blocks/devbook.md#scenario-tools", ".devbook/arc42/adr/chapter-schema.md", ".devbook/arc42/adr/install.md", ".devbook/arc42/adr/releases.md"]
c4: ["marketplace.devbook.scenario-tools"]
```

A journey's spec imports devbook's scenario runner, `setup.ts`. The runner wraps the journey
in one `test.describe.serial` group with one test per part. It applies the journey's setup
through the repository's hook and keeps one browser context per portal. devbook's reporter
turns the run into `run.json` and screenshots. Its coverage check holds the spec to the journey
through the spec's header.

## Why

```meta
```

A journey declares its setup once, in Markdown: the profile, tenant, data sets, flags, settings,
actors, and start page. One runner applies those fields the same way in every spec, so no spec
repeats them and none can apply them differently.

The parts of a journey are one walk. Each part continues on the page and session the previous
part left, so the parts run in order on one worker. Each part is its own test, because a
requirement's `Proved by:` line points at a part, and that part needs its own outcome. When a
part fails, Playwright skips the parts after it, and the reporter records them as `not-run`.

## Rejected

```meta
```

No alternative was recorded when the runner shipped.

## Proposed

```meta
```

devbook points at a journey's spec and no longer runs it. The connection becomes files only, as
the [Scenario Tools](../building-blocks/devbook.md#scenario-tools) block already describes it.
The repository decides how a spec groups its parts, serial or independent, and owns its
fixtures, setup, sign-in, and browser contexts.

| Piece | Today | Proposed |
| --- | --- | --- |
| Spec header, `// scenario:` and `// signature:` | devbook | devbook |
| One Playwright test per part, titled as its `###` heading | devbook, through `scenario()` and `part()` | devbook, as a naming rule |
| `shot(page, label)` and the failure screenshot | devbook | devbook |
| Reporter, `run.json` and the screenshots | devbook | devbook |
| Coverage check | devbook | devbook |
| `profiles.json` and `data/` under `.devbook/scenarios/` | devbook | devbook, as declared data the check reads |
| Grouping the parts, serial or not | devbook, always serial | the repository |
| Applying setup fields, signing in, browser contexts | devbook, through the setup hook | the repository |

### Why change it

```meta
```

- The runner sets the structure of the consumer's own suite. A fincent pull request used
  `test.describe.serial` only because `setup.ts` imposes it, and then had to defend that choice
  to a reviewer.
- Only the runner needs devbook to run code inside the suite. The coverage check reads the
  header and the `shot()` labels. The reporter finds a part by the spec's header and a test
  title equal to the part's heading. Neither needs `setup.ts`.
- The runner is the costly part to keep working. Three releases fixed how it finds Playwright
  or its own spec in a consumer's suite: 1.23.0, 1.27.1, and 1.30.1. Each fix was a devbook
  release, though the fault only showed in someone else's Playwright setup.

### What follows

```meta
```

- `setup.ts` and `setup.mjs` leave `tools/scenarios/`. `shot.ts`, `playwright.mjs`, and the
  folder's `package.json` stay, because `shot()` still runs inside the suite.
- A journey keeps its setup fields. They state the journey's preconditions and feed its
  signature. The repository's spec applies them, and may read `profiles.json` to do so.
- A part's outcome is what Playwright reports for its test. A suite that runs the parts
  independently records each part on its own, so a failed part no longer turns the parts
  after it into `not-run`.
- A failing step is still numbered when the spec wraps each journey step in a `test.step`
  titled as that step. Without them, `failure.step` is `null`.
- devbook's contract moves, so the change is a minor release of every plugin.
- A migration is owed. Reconcile never deletes, so an installed repository keeps a stale
  `setup.ts` that no release maintains. The migration moves the runner into the repository's
  e2e folder as its own code and rewrites each spec's import. A spec keeps running unchanged,
  and the repository may then change it.
- The [Scenario Tools](../building-blocks/devbook.md#scenario-tools) block, the
  `scenario-tools` element in `workspace.dsl`, `scenario-derive`, and the tools' README change
  in the same pull request as the code.

### Alternatives to the proposal

```meta
```

- **Keep the runner and make serial a per-journey option.** devbook still owns code that every
  spec imports, and each new option is another release.
- **Keep the runner as an optional import beside the file contract.** That leaves two supported
  ways to write a spec, and a fix to either is still a devbook release.
- **Drop the reporter too, and only point.** Personal Validation, `shot:` images in chapters,
  and demos lose their evidence, and the stale-run rule loses its input.

## History

```meta
```

| Date | Change | Why |
| --- | --- | --- |
| 2026-10-20 | A spec's header names its journey as `<scenarios file>#<journey>`, and the runner finds the journey through it. | A journey became a chapter of `scenarios.md` at contract 32. |
| 2026-10-12 | The runner takes `@playwright/test` from the suite that runs it, and its folder loads as an ES module. | Adopting the tools in spec-manager found the runner loading the wrong Playwright. |
| 2026-10-08 | devbook ships the scenario runner, the reporter, and the coverage check. A spec imports the runner, which groups the parts as one serial journey. | Journeys needed evidence a reviewer can open, from one place that applies their setup. |
