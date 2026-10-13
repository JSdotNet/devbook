---
name: init
description: 'Set a repository up for this marketplace for the first time: choose which installed plugins it uses, write .devbook/config.json with its id and, when the delivery engine is adopted, the engine-owned keys, validate them, then hand each adopted component its own init. Refused where .devbook/config.json exists: run devbook-config:update. Use when: adopting the stack, wiring flows for the first time, "devbook-config init".'
---

# devbook-config init

Open the reply with `devbook-config@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

This file exceeds the 40-line body budget on purpose: it is one staged procedure — look, decide, write, validate, fan out — and a stage stated by half writes a config by half.

## Purpose

Turn a repository with no stack config into one the engine can run in. This runs **before any
component initializes itself**: the config is what a component's `init` reads to know what
it is installing into, so writing it first is the difference between a component asking the repository and a
component guessing.

This skill owns `id` and the engine keys — `bindings`, `phases`, `areas`, `policy`, `gates` —
and nothing else. Every `components.<name>` entry belongs to that component's own `init` and
`update`, the only things that know what it materialized; writing one from here would
record work this skill did not do.

## Steps

1. **Look before writing.** Run `node scripts/report.mjs --root <repository>` from
   this plugin's root. If it reports a `.devbook/config.json` already present, or a
   `.github/ai-agent-stack.json` left from before the config moved, say "already
   initialized, run `devbook-config:update`" and stop — this skill is for the empty case.

2. **Decide which components this repository adopts.** Offer only what the report's scope
   table shows as `adoptable`, and `available` once the user enables it here. A plugin the
   report shows as not installed is never set up from here: say so in one line and move on.
   Installing it is the user's to do, and a stamp for a component this machine lacks would
   be `blocked` on the very next update. Ask; never impose a default shape.

3. **Write the config.** Set `id` to a name for the repository — lowercase, digits, hyphens;
   the repository name is usually right — and never rename it after: it is what a machine
   keys its own overlay for this repository on.

   The engine keys are `delivery.*` settings and are written **only when `delivery` is
   among the components adopted in step 2**. Nothing else reads them, so a phase wired where
   no flow ever runs is a setting nobody maintains. Without delivery, the whole
   file is `{ "id": "<name>" }` plus step 4's grill binding; validate in step 5 only where
   delivery is installed, and skip step 6.

   With delivery: ask which tracker, policy switches, and gates this repository really has
   a reason for, and per phase of each flow the agent, skill, model, and effort the team
   runs it with. Name an agent only from a plugin the report shows installed and enabled,
   and a skill only where one exists here. Start from the delivery plugin's
   `resources/config-template.json` — its checkout root is the report's catalog line, or the
   plugin's `installPath` from `--json`: it carries both flow maps complete, at the cost
   profile the engine ships with. Keep each map whole — a committed map lists every phase its
   flow has, and `{}` is a complete entry — and drop a top-level key nobody chose. Read
   `resources/engine-contract.md` in that same plugin, under *Phases*, for each field and
   gate. A model and an effort here are team defaults each person's overlay may override;
   never put a secret in this file.

4. **The change lane**, when `devbook-openspec` is among the components adopted in step 2.
   Ask its three questions, in this order:
   - **Is the OpenSpec CLI here?** Run `openspec --version`. Absent, print
     `npm install -g @fission-ai/openspec@latest` and wait until it answers; never run it
     yourself. Declined, the lane is not adopted and nothing below is written.
   - **Adopt the change lane?** A yes adds `changes` to what `devbook:init` adopts in step 7.
     With delivery adopted, write `"skill": "devbook-openspec:spec"` on flow-code's
     `phase-scope` — flow-spec builds no change, so its map never names it — and `{ "provider": "devbook-openspec:tracker" }` as
     `bindings["delivery.tracker"]`, and offer the two optional gates in the bridge's
     README under *What the engine binds*.
   - **Grill an idea before proposing it?** Name the `plugin:skill` the person uses — it
     comes from another marketplace, so never propose one — and write it as
     `bindings["openspec.grill"]`, delivery or not. No answer is `null`.

5. **Validate.** Run that plugin's `tools/stack-config/check.mjs` against the file. An
   unknown key is an error, not a warning: a typo must never become a silently absent
   setting. Fix and re-run until it exits `0`.

   Write no overlay here: an overlay lives under the user's devbook config directory, is
   true of the person running this and of nobody they set a repository up for, and step 9
   offers `devbook-config:local`, which writes it.

6. **Declare the default MCP servers.** Every phase whose `mcp` step 3 left absent takes the
   engine default — `microsoft-learn`, `aspire`, `playwright` — and a default is only a name until a
   host can start the server. The report's **MCP servers** lines say which of those ids
   `.mcp.json`, `.vscode/mcp.json`, and `.github/mcp.json` already declare. When the
   repository has none of the three files, copy the delivery plugin's
   `resources/mcp-template.json` to `.mcp.json` and `resources/mcp-vscode-template.json` to
   `.vscode/mcp.json`; drop `aspire` and `playwright` when nothing here runs, and drop
   `microsoft-learn` when the stack is not Microsoft's. When a file exists, add only the
   missing ids in its own shape and change nothing else in it. These files are the
   repository's, unstamped, and never touched again by this plugin.

7. **Let each adopted component initialize itself.** For every component chosen in step 2,
   invoke that component's own `init` and let it materialize its payload and write its
   own stamp, in the order the report's reconcile list gives — `devbook:init` for the
   devbook folders and the repository's `run`, `capture`, `diagnose`, `estimate`, and
   `prototype` skills, `devbook-derived:init` for the committed index, `devbook-openspec:init`
   for the change lane, `delivery:init` for the engine's stamp, `delivery-schedule:init` for
   its schedules. Answer devbook's procedures question from the engine keys just written: flow-code's
   `phase-verify.app` of `null` drops `run` and `diagnose`; `policy.qa.depth` of `skipped` drops `capture`; no engine key answers `estimate` or `prototype`, so ask them. Do not copy a component's files
   by hand: a copy made here lands unstamped, and the next reconcile cannot tell it from a file someone deliberately customized.

8. **Verify.** Re-run the report and run `devbook-config:doctor`. An init that ends on a
   failing check is reported as failing, never as done.

9. **Offer `devbook-config:local`.** The report now says whether a user overlay exists for
   the person running this. When none does, say that the first flow here runs at the team's
   defaults, and offer to run `local` now. Their machine, their answer.

10. **Close on `devbook-config:report`**, passing step 8's doctor findings, every component
    this run initialized for *This run* with *Before* as `not adopted`, and what was
    deliberately left unbound, not installed and therefore not offered, or failing for
    *Still open*.

Policy switches, phases, and gate purposes are closed sets the engine declares: choose among
them and never invent one. Configuration may add a gate anywhere and never removes one.
