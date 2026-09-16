---
name: setup
description: 'Set a repository up for this marketplace for the first time — decide which installed plugins it will actually use, write .devbook/config.json with its id and, when the delivery engine is among them, the engine-owned keys (bindings, extensions, policy, gates), validate them against the schema, and then hand each adopted component its own install skill to materialize what it installs. Writes the engine keys only, never another component''s stamp, and never sets up a plugin this machine has not installed. Use when: adopting the stack in a repository, wiring flows for the first time, or creating the stack config. Triggers on: "set up the stack here", "adopt the delivery engine", "create the stack config", "create .devbook/config.json", "wire up my flows", "onboard this repo".'
---

# devbook-config setup

## Purpose

Turn a repository with no stack config into one the engine can run in. This runs **before any
component installs itself**: the config is what an install reads to know what it is installing
into, so writing it first is the difference between a component asking the repository and a
component guessing.

This skill owns `id` and the four engine keys — `bindings`, `extensions`, `policy`, `gates` —
and nothing else. Every `components.<name>` entry belongs to that component's own install
skill, which is the only thing that knows what it materialized; writing one from here would
record work this skill did not do.

## Steps

1. **Look before writing.** Run `node scripts/report.mjs --root <repository>` from
   this plugin's root. If it reports a `.devbook/config.json` already present, or a
   `.github/ai-agent-stack.json` left from before the config moved, stop and run
   `devbook-config:update` instead — this skill is for the empty case.

2. **Decide which components this repository adopts.** Offer only what the report's scope
   table shows as `adoptable`, and `available` once the user enables it here. A plugin the
   report shows as not installed is never set up from here: say so in one line and move on.
   Installing it is the user's to do, and a stamp for a component this machine lacks would
   be `blocked` on the very next update. Ask; never impose a default shape.

3. **Write the config.** Set `id` to a name for the repository — lowercase, digits, hyphens;
   the repository name is usually right — and never rename it after: it is what a machine
   keys its own overlay for this repository on.

   The four engine keys are `delivery.*` settings and are written **only when `delivery` is
   among the components adopted in step 2**. Nothing else reads them, so a role or a point
   bound where no flow ever runs is a setting nobody maintains. Without delivery, the whole
   file is `{ "id": "<name>" }`; skip steps 4 and 5.

   With delivery: ask which roles, tracker, extension points, policy switches, and gates
   this repository really has a provider or a reason for. Bind a role only to a plugin the
   report shows installed and enabled, and an extension point only to a provider that
   exists here. An unset key takes the engine's documented default, which is almost always
   better than a binding nobody maintains. Start from the delivery plugin's
   `resources/config-template.json` — its checkout root is the report's catalog line, or the
   plugin's `installPath` from `--json` — and keep only the keys chosen. Read
   `resources/surface-contract.md` in that same plugin for what each point and gate means.
   Never put a model or a secret in this file.

4. **Validate.** Run that plugin's `tools/stack-config/check.mjs` against the file. An
   unknown key is an error, not a warning: a typo must never become a silently absent
   setting. Fix and re-run until it exits `0`.

   Write no overlay here — not `.devbook/config.local.json`, and not the user-scope copies
   under the devbook config directory. An overlay is machine-scope, so it is nobody's to
   create on somebody else's behalf; mention that the three exist, and that
   `resources/config.local-template.json` in the delivery plugin is where each starts.

5. **Declare the default MCP servers.** Every point left absent in step 3 takes the engine
   default — `microsoft-learn`, `aspire`, `playwright` — and a default is only a name until a
   host can start the server. The report's **MCP servers** lines say which of those ids
   `.mcp.json`, `.vscode/mcp.json`, and `.github/mcp.json` already declare. When the
   repository has none of the three files, copy the delivery plugin's
   `resources/mcp-template.json` to `.mcp.json` and `resources/mcp-vscode-template.json` to
   `.vscode/mcp.json`; drop `aspire` and `playwright` when nothing here runs, and drop
   `microsoft-learn` when the stack is not Microsoft's. When a file exists, add only the
   missing ids in its own shape and change nothing else in it. These files are the
   repository's, unstamped, and never touched again by this plugin.

6. **Let each adopted component install itself.** For every component chosen in step 2,
   invoke that component's own install skill and let it materialize its payload and write its
   own stamp — `devbook:install` for the devbook folders. Do not copy a component's
   files by hand: a copy made here lands unstamped, and the next reconcile cannot tell it
   from a file someone deliberately customized.

7. **Verify and report.** Re-run the report, run each adopted component's own check skill,
   and say plainly what was set up, what was deliberately left unbound, what was not
   installed and therefore not offered, and anything that ended failing. A setup that ends
   on a failing check is reported as failing, never as done.

This skill is the empty case only. Everything about moving an already-configured repository
forward — version drift, migrations, the fan-out across components — belongs to
`devbook-config:update`, which runs the whole stack in one go.

## Do not

- Do not write, edit, or remove a `components.<name>` key. It is not yours.
- Do not set up, or ask about, a plugin the report shows as not installed. Report it; do not
  install it on the user's behalf.
- Do not write an engine key into a repository that is not adopting `delivery`.
- Do not write an overlay, at any of its three layers. It belongs to whoever runs here.
- Do not rewrite an existing MCP configuration file. Add a missing default id; never remove,
  rename, or reshape a server somebody declared.
- Do not invent a policy switch, an extension point, or a gate purpose. All three sets are
  closed and declared by the engine; configuration chooses among behaviour it already has.
- Do not remove a gate. Configuration may add one anywhere and may never take one away.
