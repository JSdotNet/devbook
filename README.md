# devbook

The `jsdotnet-devbook` plugin marketplace for Claude Code and GitHub Copilot: the devbook
convention and the delivery flow, as agents, skills, instruction files, hooks, and MCP servers
authored once and loaded by both hosts.

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then `/plugin` and enable what you need. Every plugin installs on its own; the ones that need
a sibling declare it and the host enforces it.

## What is here

| Layer | Plugins | What they give you |
| --- | --- | --- |
| Devbook | `devbook`, `devbook-derived`, `devbook-collaboration` | Addressed Markdown chapters under `.devbook/` (or five root dot-folders) with parseable `meta` blocks, generated `_meta/` indexes, a reference-graph canvas, converters between chapters and code, and review and approval workflows over them. |
| Delivery | `delivery` | Four `flow-*` procedures that carry a change from request to a validated commit — the code, the devbook folders, the dependencies, the project — plus the pull-request lane and the single-item pickup. |
| Surfaces | `delivery-surface-dashboard`, `delivery-surface-collector` (and `delivery-surface-canvas` on Copilot) | Where a run is watched or recorded: a live dashboard, a headless collector, and a diagram and document viewer that is a Copilot canvas rather than an entry in this marketplace. Resolved at run time; none is a dependency. |
| Unattended | `delivery-schedule` | Work that runs with nobody watching: fourteen `schedule-*` entry points that pick their own input and run a flow, a review, a sweep, or a report, and eleven triggers a repository selects from and syncs into the host's scheduler — its Routines page in Claude Code, its Automations page in the GitHub Copilot app. |
| Config | `devbook-config` | The repository's `.devbook/config.json` — written by `setup` before anything installs, moved forward by `update` — plus `ask`, which answers what this marketplace is, what you have installed against what is published, and how a repository has wired its roles, extension points, gates, and policy, and `adoption`, which reports where the `ai/` adoption record no longer matches what is installed. |

**No specialist ships here.** The `architecture`, `qa`, `domain`, `ux`, `product`, `security`,
and `docs` roles and the `spec`, `implement`, `verify`, `app.start`, `qa.run`, and `deliver`
services are points the engine declares and a repository fills, naming whichever specialist plugin it installed in
`.devbook/config.json`. Unbound, a flow loses that stage's expertise and runs on — a
provider that does not resolve costs capability, never a load. The seven specialists that used
to live here are [published from their own marketplace](.devbook/arc42/adr/plugin-boundaries.md).

The design lives in `.devbook/`: the vocabulary in `domain/`, the structure and every
recorded decision in `arc42/`, the technology graph in `tech/`, how the repository itself is
built with AI in `ai/`. Start with
[`.devbook/arc42/05-building-block-view.md`](.devbook/arc42/05-building-block-view.md).

## Working on it

Read [AGENTS.md](AGENTS.md) first. In short: one authored copy per asset, one logical change
per commit, nothing pushed until asked, and before committing:

```bash
node tools/check-assets.mjs && node plugins/devbook/tools/devbook-meta/build.mjs --check
```

To try a change, add this working copy as a marketplace by path instead of by repository.

The design behind all of it, with the reasons the repository's own records do not carry, is
one page: [Devbook](https://claude.ai/code/artifact/f0e03cc1-73fa-4592-9431-9c9dfcaa215f).
It is written from the repository, not the other way round: when the two disagree the
repository and its decisions win, and the page is republished.
