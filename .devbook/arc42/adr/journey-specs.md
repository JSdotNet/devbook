# Journey Specs

```meta
date: 2026-11-12
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/building-blocks/devbook.md#scenario-tools", ".devbook/arc42/adr/chapter-schema.md", ".devbook/arc42/adr/install.md", ".devbook/arc42/adr/releases.md"]
c4: ["marketplace.devbook.scenario-tools"]
```

devbook points at a journey's spec and leaves running it to the repository. The connection is
files only. The repository decides how a spec groups its parts, serial or independent, and owns
its fixtures, setup, sign-in, and browser contexts.

| Piece | Owner |
| --- | --- |
| Spec header, `// scenario:` and `// signature:` | devbook |
| One Playwright test per part, titled as its `###` heading | devbook, as a naming rule |
| `shot(page, label)` and the failure screenshot | devbook |
| Reporter, `run.json` and the screenshots | devbook |
| Coverage check | devbook |
| `profiles.json` and `data/` under `.devbook/scenarios/` | devbook, as declared data the check reads |
| Grouping the parts, serial or not | the repository |
| Applying setup fields, signing in, browser contexts | the repository |

## Why

```meta
```

- A shared runner sets the structure of the consumer's own suite. A fincent pull request used
  `test.describe.serial` only because devbook's runner imposed it, and then had to defend that
  choice to a reviewer.
- devbook only reads files. The coverage check reads the spec's header and its `shot()` labels.
  The reporter finds a part by the spec's header and a test title equal to the part's heading.
- The runner was the costly part to keep working. Three releases fixed how it found Playwright or
  its own spec in a consumer's suite: 1.23.0, 1.27.1, and 1.30.1. Each fix was a devbook release,
  though the fault only showed in someone else's Playwright setup.

A journey keeps its setup fields. They state its preconditions and feed its signature, and the
repository's spec applies them. A part's outcome is what Playwright reports for its test, so a
suite that runs its parts independently records each part on its own. A failing step is numbered
when the spec wraps each journey step in a `test.step` titled as that step.

Migration `038-journey-specs-own-runner` moves the runner a repository already imports into the
repository as its own code, and points each import at it. A spec keeps running unchanged, and
the repository may then change the runner or drop it.

## Rejected

```meta
```

- **The runner as devbook shipped it**, one `test.describe.serial` group per journey, with the
  setup applied through the repository's hook. The reasons above retired it.
- **Keep the runner and make serial a per-journey option.** devbook still owns code that every
  spec imports, and each new option is another release.
- **Keep the runner as an optional import beside the file contract.** That leaves two supported
  ways to write a spec, and a fix to either is still a devbook release.
- **Drop the reporter too, and only point.** Personal Validation, `shot:` images in chapters,
  and demos lose their evidence, and the stale-run rule loses its input.
- **Move `profiles.json` out with the setup hook.** A journey's `profile` would name nothing the
  check can read, so an unknown profile would go unreported.

## History

```meta
```

| Date | Change | Why |
| --- | --- | --- |
| 2026-11-12 | devbook stops shipping the scenario runner: it points at a journey's spec, and the repository runs it. `038-journey-specs-own-runner` moves the runner into each repository that imports it. | The runner set the structure of the consumer's suite, and devbook's checks need only files. |
| 2026-10-20 | A spec's header names its journey as `<scenarios file>#<journey>`, and the runner finds the journey through it. | A journey became a chapter of `scenarios.md` at contract 32. |
| 2026-10-12 | The runner takes `@playwright/test` from the suite that runs it, and its folder loads as an ES module. | Adopting the tools in spec-manager found the runner loading the wrong Playwright. |
| 2026-10-08 | devbook ships the scenario runner, the reporter, and the coverage check. A spec imports the runner, which groups the parts as one serial journey. | Journeys needed evidence a reviewer can open, from one place that applies their setup. |
