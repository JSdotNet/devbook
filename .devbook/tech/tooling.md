# Tooling

```meta
rating: adopted
```

A plugin's executable parts run on these two runtimes. A consuming repository already has both, and
nothing here installs either.

## Node

```meta
rating: adopted
type: runtime
date: 2026-09-04
related: [".devbook/arc42/05-building-block-view.md#plugin-folder"]
```

A plugin's executable parts run on it:

- `devbook`'s checker with its test suites and its `devbook-tech` package-inventory scripts
- its scenario tools
- the migration scripts
- `delivery`'s stack-config checker and the tests behind it
- `delivery-schedule`'s catalog checker
- `devbook-config`'s read-only report script
- the two MCP-backed surfaces' servers: the dashboard's with its HTTP viewer, telemetry hook, and
  `dev/` checks, and the collector's headless
- the two canvas extensions with their own HTTP viewers
- the command hook each plugin uses to emit session-start context
- this repository's own `tools/check-assets.mjs`

All of that is ESM against `node:` built-ins with no third-party dependency, which is why
`npm install` is not a step anywhere in this repository.

The flat claim used to get three things wrong. They are the seams where the constraint is
negotiated rather than held:

- **Two package manifests exist**, one per surface plugin that runs a server, under
  `mcp/<server>/package.json`. Each is `private`, declares `type: module` and an entry point, and
  carries **no `dependencies`**. The manifest names the server and floors the runtime at
  `engines.node >= 18`, and pulls nothing in. So a version *is* pinned, as a floor; only a lockfile
  and an install step are absent.
- **The two Copilot canvas extensions are one exception to `node:`-only.** Both import
  `@github/copilot-sdk/extension`, which their host supplies at load time, per
  [the SDK entry](hosts.md#copilot-extension-sdk). Only the scenario tools, below, also import
  something they do not ship.
- **The scenario tools' two Playwright files are the other exception.** `setup.ts` and `shot.ts`
  under `plugins/devbook/tools/scenarios/` use `@playwright/test`, which the adopting repository's
  own e2e suite supplies. `playwright.mjs` resolves it from the running Playwright, so a suite that
  is its own npm package works. The folder's `package.json` loads both as ES modules under an ES
  module suite. A CommonJS suite needs Node 22.12 to load the `.mjs` modules beside them. Every
  `.mjs` there stays on `node:` built-ins: the parser, the signature, the reporter, the coverage
  check, the loader.

The checker runs here from two paths. It is authored in `plugins/devbook/tools/devbook-meta/`.
`.devbook/_tools/devbook-meta/` is the copy `devbook:update` vendored, as into any adopting
repository, and the one this repository's `AGENTS.md` section names. `tools/check-assets.mjs` fails
when the two differ by a byte, so an edit to the first lands with its refresh of the second.

On every pull request, `.github/workflows/repo-checks.yml` runs:

- the asset checker
- the authored generator's `--check`
- every `*.test.mjs` under `plugins/` and `tools/` through `node --test`
- `claude plugin validate --strict`

`devbook-meta.yml`, the workflow `devbook:update` materialized from
`plugins/devbook/assets/workflows/`, runs the vendored one's `--check`.

The surface servers are where the constraint bites hardest and still holds. `node:http` plus a CDN
script tag in the page itself reach an HTTP server, a server-sent event stream, a Markdown renderer,
and a Mermaid page.

## PowerShell

```meta
rating: adopted
type: runtime
date: 2026-09-04
depends-on: [".devbook/tech/tooling.md#node"]
related: [".devbook/arc42/adr/hosts.md", ".devbook/arc42/05-building-block-view.md#plugin-folder"]
```

This is the second runtime a plugin's executable parts run on, and the only one whose script runs in
a *consuming* repository rather than here. `devbook-derived` ships
`assets/build/Update-DevbookIndex.ps1`, and `devbook-derived:init` installs it into `build/`
unconditionally. It is one of only two payload entries with no adoption condition, the other being
the generator it wraps, because a repository that skips GitHub Actions gets this script alone and
manual refresh. It wraps `build.mjs` to add what the raw `node` call cannot say: which index files
moved, so a refresh that changed nothing is visibly a no-op. `-Scope` narrows it to one folder, and
`-Check` validates without writing.

It requires PowerShell 7, stated as `#Requires -Version 7.0` in the script itself. The generator
README, `devbook:validate`, both refresh workflows, and the drift warning's own warning text all name
it as the way to refresh a branch. `node build.mjs` is the fallback for CI and for anywhere `pwsh` is
not installed.

Previously `retired`, the entry read only as far as the repository's own tooling. The
Copilot-to-Claude sync generator was written and dropped the same day, and the runtime was retired
alongside it. That decision stands and this entry does not reopen it; see
[the hosts record](../arc42/adr/hosts.md). Retiring the *runtime* with it was the error. A
repository-level generator was removed, but a shipped payload script was not. `retired` reads as "no
longer used" to everyone downstream of a plugin that installs it into their repository on every sync.

This repository holds the script since 2026-09-26, and uses it for `-Check` only: a session here
never refreshes, per [the checks and indexes record](../arc42/adr/checks-and-indexes.md).
`devbook-meta-nightly.yml` at 02:17 UTC and the daily `devbook-validate` schedule behind it refresh
the default branch, both passing `--write` to the vendored checker.
