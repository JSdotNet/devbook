# devbook-config-view

Every repository on this machine that has adopted the devbook stack, drawn inside Claude Code
itself — which version of each component it is stamped at, how far that is from the newest, and
how one of them is wired — from the `.devbook/config.json` files already on disk.

A viewer, not a writer. `devbook-config` owns `.devbook/config.json` and its skills are what
change it; this plugin reads the file in every repository it finds and draws it. It writes no
file, runs no skill, and declares no dependency: uninstalling it costs a view, never a
capability. It sits beside `devbook-config` rather than inside it for the reason
`delivery-run-view` sits beside `delivery` — it is function-hook modules, which only Claude
Code loads, and a plugin whose every skill both hosts load should not carry a Claude-only pane.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `devbook-config-view` with `/plugin`, and type `/rollout`.

## Claude Code only

The plugin is function-hook modules — `hooks/hooks.json` names `./register.tsx` under
`modules` — and Copilot has no equivalent. So it carries the Claude manifest alone, per
`.devbook/arc42/05-building-block-view.md` under *Plugin Folder*, as `delivery-run-view` does.

## What it draws

`/rollout` reads every repository and opens the pane. It reads again only on `↻ refresh`:
nothing polls.

| View | Shows |
|---|---|
| Matrix | One row per repository, one column per `components.<name>` stamp — `devbook`, `derived`, `openspec`, `delivery`, `schedule`, then any other stamp carrying a `pluginVersion`. Each column is as wide as its name. Each cell is the stamped `pluginVersion`, green when it is the newest the installed marketplace lists, yellow when a minor or patch release behind, red when a major behind, `–` when not stamped. Dots for the adopted devbook folders (`arc42 domain tech design ai`) and procedures (`run capture diagnose estimate prototype`). Every retired key the config still carries, in red under the row. Buttons: `doctor` and `update` put `/devbook-config:doctor` or `/devbook-config:update` for that repository in the prompt box — never sent, so you read it and press Enter yourself — and `map` opens the row in the config map |
| Config map | One repository, `‹ ›` to step: each flow's phase map as a chain — `flow-code` and `flow-spec` side by side once the pane is 110 columns wide, stacked below that — one row per phase — its mode (`inline`, `delegate`, `fork`; dimmed when it is the phase's default rather than the entry's choice), agent, model and effort, skill, MCP servers, `phase-verify`'s `app` provider, and `before` and `after` chores — with Ready and Personal Validation where the engine runs them and each configured gate before or after its phase. Then `policy` and `bindings` |

The mode is the one the flow-runner would resolve from the committed entry, per
`plugins/delivery/resources/phase-resolution.md`: `agent: null` is inline, any of `agent`,
`model`, or `effort` delegates — `inherit` does not — and an entry that sets none takes the
phase's default from **Phases** in `plugins/delivery/resources/engine-contract.md`. A personal
overlay is not read: the map is the team's default, not what one machine runs.

## Where it reads

| What | From |
|---|---|
| Repositories | Each root, and each of its direct children, that holds `.devbook/config.json`. Roots are the `roots` option, semicolon-separated; empty means the folder holding this repository's main checkout — `D:\Repos` for `D:\Repos\devbook`, a worktree resolved to its main checkout first. A folder under `.claude/worktrees/` is never a row |
| Newest versions | The `marketplace` option's entry in `<profile>/plugins/known_marketplaces.json`, else `<profile>/plugins/marketplaces/<name>`, then its `.claude-plugin/marketplace.json`; `<profile>` is `CLAUDE_CONFIG_DIR` or `~/.claude`. Not found, cells are grey and nothing is graded |

Set either option with `/config`, or under `pluginConfigs["devbook-config-view"].options` in
settings.

## What it repeats

A hooks module reads no other plugin's code, so three tables in `hooks/register.tsx` mirror
their owners and change with them: the stamp keys and their plugins, the folded stamps, and the
retired keys are `plugins/devbook-config/scripts/report.mjs`'s; the default mode of each phase
is the **Phases** table in `plugins/delivery/resources/engine-contract.md`.

## The state contract

`types/index.d.ts` declares the plugin's `$.state` — `rollout`, `view`, `selected` under
`devbook-config-view` — and the manifest's `types` key points at it. The
`.claude-plugin/types/` folder `tsconfig.json` extends is written by the host and is ignored. From a worktree, where it is absent,
`node tools/typecheck-mod.mjs plugins/<name>` type-checks the mod in one command.
