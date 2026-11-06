# Hosts

```meta
rating: adopted
```

These are the platforms that read an asset, the one that runs it, and the one library a host
supplies at load time. No manifest declares any of them; the checked-in files are authored for each.

## Claude Code Plugin API

```meta
rating: adopted
type: platform
related: [".devbook/arc42/05-building-block-view.md#marketplace-root"]
```

It reads `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json`, scans `skills/`, and
loads `hooks/hooks.json`. The marketplace name keys registry, cache, and installed-plugin records.

## Claude Code CLI

```meta
rating: trial
type: platform
depends-on: [".devbook/tech/hosts.md#claude-code-plugin-api"]
related: [".devbook/arc42/tdr/2-fleet-names-the-cli-directly.md"]
```

No asset invokes it any more. Until 2026-09-21 `fleet` shelled out to it for two things:

- launching each worker as an independent background session (`claude --bg`)
- telling a worker still running from one that exited (`claude agents --json --all`)

The plugin is deleted, and the sweep that replaced it runs in the session its trigger gave it.
[The debt record](../arc42/tdr/2-fleet-names-the-cli-directly.md) is now resolved. The CLI stays
listed because a person runs it to start a session at all.

## Copilot Plugin API

```meta
rating: adopted
type: platform
related: [".devbook/arc42/adr/hosts.md"]
```

Every asset targets this second reader. It reads `.github/plugin/plugin.json` and
`hooks.json`, honours the `handoffs` key, and applies a *repository's* instruction files from
`applyTo`, never a plugin's, which it has no key for.

## Copilot Extension SDK

```meta
rating: trial
type: library
date: 2026-09-04
depends-on: [".devbook/tech/hosts.md#copilot-plugin-api"]
related: [".devbook/arc42/05-building-block-view.md#plugin-folder"]
```

Both canvas extensions, `devbook-derived`'s `devbook-graph` and `delivery-surface-canvas`'s own,
import `@github/copilot-sdk/extension` for `joinSession` and `createCanvas`. It is the only
third-party import anywhere in this repository, and it is not installed. The Copilot CLI resolves
it when it opens the extension, so no `package.json` declares it and nothing here breaks when it
is absent.

`trial`: nothing in this repository has opened a canvas on that host. The unverified part is
whether these pages render through `createCanvas` as they did over the MCP viewer they were
written against, not the import. `delivery-surface-canvas` kept both transports until it became
canvas-only, so no second one answers that on its behalf now.

## Scheduled Routines

```meta
rating: trial
type: platform
date: 2026-09-28
depends-on: [".devbook/tech/hosts.md#claude-code-plugin-api"]
related: [".devbook/arc42/adr/plugin-boundaries.md", ".devbook/arc42/05-building-block-view.md#schedule-plugin"]
```

Cron-scheduled local routines have a name, a five-field expression in the machine's own timezone,
a working folder, and one prompt. They run on this machine with the plugins, MCP servers, and
settings installed there, with the tools approved on the routine itself, and with no memory
between runs. They fire only while the host app runs; one due while it was closed runs on the
next launch.

This is the second platform here an asset *drives* rather than is read by. `delivery-schedule`
creates and updates them through the scheduler tool the session exposes, and reads their runs and
logs back. Claude Code calls the page Routines and the GitHub Copilot app Automations.
The plugin resolves the tool from the live tool list, so it names neither.

The cloud flavour is not used: a repository, a tool allowlist, a model, and an environment in place
of the working folder, on a fresh clone. On 2026-09-28 a cloud run of the Backlog issue sweep started
with none of this marketplace's plugins installed, though the repository's committed settings enabled
them. It stopped without its skill, and a session without its skill has scheduled nothing. `delivery-schedule` creates local routines only and disables any cloud copy
it finds.

`trial`: local routines have run these targets against several repositories since 2026-09-26. The
unverified part is the machine: a routine needs it on and the host app open. Its absence costs the
cadence, never the procedure: every target still runs by hand.
