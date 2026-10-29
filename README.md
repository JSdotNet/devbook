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
| Devbook | `devbook`, `devbook-derived` | Addressed Markdown chapters under `.devbook/` with parseable `meta` blocks, generated `_meta/` indexes, a reference-graph canvas, converters between chapters and code, the five repository-owned procedure skills, a chapter review that posts its notes to the host keeping the chapter's workflow state, and the `devbook.decision@1` contract that host answers. |
| Change lane | `devbook-openspec` | The OpenSpec CLI installed and configured so a change is proposed, agreed, built step by step, and archived as deltas against its devbook chapters, with `spec`, `tracker`, `status`, and `archive` as providers a flow binds by name and `onboard` to walk a first change through. |
| Skills | `devbook-skills` | Reusable guidance any plugin names and none depends on: `show-me`, which puts a diagram, tree, signature, diff, or table before the prose. |
| Delivery | `delivery` | Two `flow-*` procedures that carry a change from request to a validated commit — the code, a dependency move and a new project among its kinds, and the devbook folders — each a sequence of phase skills, plus the pull-request lane and the single-item pickup. |
| Surfaces | `delivery-surface-dashboard`, `delivery-surface-collector`, `delivery-surface-backlog` (and `delivery-surface-canvas` on Copilot) | Where a run is watched or recorded: a live dashboard, a headless collector, the Backlog desktop app while it is open, and a diagram and document viewer that is a Copilot canvas rather than an entry in this marketplace. A surface is any installed `delivery-surface-*` plugin, resolved at run time; none is a dependency. |
| Viewer | `delivery-run-view` (Claude Code only) | A run drawn inside Claude Code from the files the surfaces write: a `/flows` pane with one row per phase and how it ran, a band above the prompt and the status line while this session's run is open, and surface calls in the transcript drawn as one-line phase transitions. Not a surface: it records nothing and answers no operation. |
| Unattended | `delivery-schedule` | Work that runs with nobody watching: eighteen `schedule-*` entry points that pick their own input and run a flow, a review, a sweep, or a report, and sixteen triggers a repository selects from and syncs into the host's scheduler — its Routines page in Claude Code, its Automations page in the GitHub Copilot app. |
| Config | `devbook-config` | The repository's `.devbook/config.json` — written by `init` before anything installs, moved forward by `update`, and checked by `doctor` against every component's stamp — plus `ask`, which answers what this marketplace is, what you have installed against what is published, and how a repository has wired its phases, gates, and policy, `adoption`, which reports where the `ai/` adoption record no longer matches what is installed, and `local`, which writes what is true of one machine outside the repository. |
| Config view | `devbook-config-view` (Claude Code only) | A read-only `/rollout` pane over this machine's repositories: one row per repository with its component stamps coloured against the newest published, its adopted folders and procedures, and any retired key it still carries, plus a config map that draws one repository's phase maps as a chain per flow. |

**No specialist ships here.** Each phase of a flow takes the agent, skill, and MCP servers a
repository names for it in its `phases` map in `.devbook/config.json`, from whichever specialist
plugin it installed. Unbound, a phase runs its own procedure and loses that expertise — a
provider that does not resolve costs capability, never a load. The seven specialists that used
to live here are [published from their own marketplace](.devbook/arc42/adr/plugin-boundaries.md).

The design lives in `.devbook/`: the structure, one building block per plugin, and every
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
