# Tooling

```meta
status: adopted
```

What a plugin's executable parts run on. Both entries are runtimes a consuming repository
already has; neither is installed by anything here.

## Node

```meta
status: adopted
type: runtime
date: 2026-09-04
related: [".devbook/arc42/05-building-block-view.md#plugin-folder"]
```

What a plugin's executable parts run on: the `devbook` generator with its six test suites, the
`devbook-tech` package-inventory scripts, the migration scripts, `delivery`'s stack-config
checker and the tests behind it, `delivery-schedule`'s catalog checker, `devbook-config`'s
read-only report script, the two MCP-backed surfaces' servers — the dashboard's with its HTTP
viewer, telemetry hook, and `dev/` checks, the collector's headless — the two canvas extensions
with their own HTTP viewers, the command hook each plugin uses to emit session-start context,
and this repository's own `tools/check-assets.mjs`. All of that is ESM against `node:`
built-ins with no third-party dependency, which is why `npm install` is not a step anywhere in
this repository.

Two things the flat claim used to get wrong, both worth stating because they are the seams
where the constraint is negotiated rather than held:

- **Two package manifests exist**, one per surface plugin that runs a server, under
  `mcp/<server>/package.json`. Each is `private`, declares `type: module` and an entry point, and carries **no
  `dependencies`** — the manifest is there to name the server and floor the runtime at
  `engines.node >= 18`, not to pull anything in. So a version *is* pinned, as a floor; what is
  absent is a lockfile and an install step.
- **The two Copilot canvas extensions are the exception to `node:`-only.** Both import
  `@github/copilot-sdk/extension`, which their host supplies at load time — see
  [the SDK entry](hosts.md#copilot-extension-sdk). Nothing else here imports anything it does
  not ship.

Nothing runs it automatically here. This repository has no CI, so the suites, the checker, and
the generator's `--check` are run by hand before a commit, and the workflow files under
`plugins/devbook/assets/workflows/` are payload for a consuming repository rather than a
pipeline of this one.

The surface servers are where the constraint bites hardest and still holds: an HTTP server, a
server-sent event stream, a Markdown renderer, and a Mermaid page are all reachable from
`node:http` plus a CDN script tag in the page itself.

## PowerShell

```meta
status: retired
type: runtime
date: 2026-09-17
depends-on: [".devbook/tech/tooling.md#node"]
related: [".devbook/arc42/adr/4-no-generated-sync-layer.md", ".devbook/arc42/adr/76-derived-artifacts-are-computed-never-committed.md", ".devbook/arc42/05-building-block-view.md#plugin-folder"]
```

Retired twice, for two different scripts. The Copilot-to-Claude sync generator was written and
dropped the same day — [No Generated Sync Layer](../arc42/adr/4-no-generated-sync-layer.md) —
and the runtime went with it. It came back as `adopted` on 2026-09-04 because `devbook` still
shipped `assets/build/Update-DevbookIndex.ps1`, a wrapper over `build.mjs` that reported which
index files a refresh moved, installed into every consuming repository's `build/`. That script
is gone with the derived files it refreshed
([record 76](../arc42/adr/76-derived-artifacts-are-computed-never-committed.md)): nothing is
written, so nothing moves, so there is nothing for a wrapper to report.

No plugin here ships a `.ps1` any more. Node is the one runtime a plugin's executable parts run
on, in this repository and in the repositories it installs into.
