# Hosts

```meta
rating: adopted
```

The platforms that read an asset, the one that runs it, and the one library a host supplies at
load time. Nothing in this layer is a dependency in a manifest; each is what the checked-in
files are authored for.

## Claude Code Plugin API

```meta
rating: adopted
type: platform
related: [".devbook/arc42/05-building-block-view.md#marketplace-root"]
```

Reads `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json`, scans `skills/`, and
loads `hooks/hooks.json`. Registry, cache, and installed-plugin records are all keyed by
marketplace name.

## Claude Code CLI

```meta
rating: trial
type: platform
depends-on: [".devbook/tech/hosts.md#claude-code-plugin-api"]
related: [".devbook/arc42/tdr/2-fleet-names-the-cli-directly.md"]
```

No asset invokes it any more. Until 2026-09-21 `fleet` shelled out to it to launch each
worker as an independent background session (`claude --bg`) and to tell a worker still
running from one that exited (`claude agents --json --all`); the plugin is deleted and the
sweep that replaced it runs in the session its trigger gave it — see
[the debt record](../arc42/tdr/2-fleet-names-the-cli-directly.md), now resolved. It stays
listed because it is what a person runs to start a session at all.

## Copilot Plugin API

```meta
rating: adopted
type: platform
related: [".devbook/arc42/adr/hosts.md"]
```

Reads `.github/plugin/plugin.json` and `hooks.json`, applies a *repository's* instruction files
from `applyTo` — never a plugin's, which it has no key for — and honours the `handoffs` key.
The second reader every asset is authored for.

## Copilot Extension SDK

```meta
rating: trial
type: library
date: 2026-09-04
depends-on: [".devbook/tech/hosts.md#copilot-plugin-api"]
related: [".devbook/arc42/05-building-block-view.md#plugin-folder"]
```

`@github/copilot-sdk/extension`, imported by both canvas extensions — `devbook-derived`'s
`devbook-graph` and `delivery-surface-canvas`'s own — for `joinSession` and `createCanvas`. It is the
only third-party import anywhere in this repository, and it is not installed: the Copilot CLI
resolves it when it opens the extension, which is why no `package.json` declares it and why
nothing here breaks when it is absent.

`trial`: nothing in this repository has opened a canvas on that host. The unverified part is
not the import — it is whether these pages render the same way through `createCanvas` as they
did over the MCP viewer they were written against. `delivery-surface-canvas` kept both transports until
it became canvas-only, so there is no longer a second one to answer that on its behalf.

## Scheduled Routines

```meta
rating: trial
type: platform
date: 2026-09-28
depends-on: [".devbook/tech/hosts.md#claude-code-plugin-api"]
related: [".devbook/arc42/adr/plugin-boundaries.md", ".devbook/arc42/05-building-block-view.md#schedule-plugin"]
```

Cron-scheduled local routines: a name, a five-field expression in the machine's own timezone,
a working folder, and one prompt, run on this machine with the plugins, MCP servers, and
settings installed there, with the tools approved on the routine itself, and with no memory
between runs. They fire only while the host app runs; one due while it was closed runs on the
next launch. The second platform here an asset
*drives* rather than is read by: `delivery-schedule` creates and updates them through the
scheduler tool the session exposes, and reads their runs and logs back. Claude Code calls the
page Routines and the GitHub Copilot app calls it Automations; the tool is resolved from the
live tool list, so the plugin names neither.

The cloud flavour — a repository, a tool allowlist, a model, and an environment in place of
the working folder, on a fresh clone — is not used. On 2026-09-28 a cloud run of the Backlog
issue sweep started with none of this marketplace's plugins installed, though the repository's
committed settings enabled them, and stopped without its skill; a session that starts without
its skill has scheduled nothing. `delivery-schedule` creates local routines only and disables
any cloud copy it finds.

`trial`: local routines have run these targets against several repositories since
2026-09-26. The unverified part is the machine: a routine needs it on and the host app open.
Its absence costs the cadence, never the procedure: every target runs by hand exactly as
before.
