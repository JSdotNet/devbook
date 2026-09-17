# Hooks

```meta
date: 2026-09-07
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/domain/plugin-authoring/domain.md#hook", ".devbook/arc42/adr/configuration.md", ".devbook/arc42/adr/hosts.md"]
```

A hook is the one component that speaks unasked, so every hook this marketplace ships checks
before it speaks. A `SessionStart` hook stays silent unless the repository adopted the plugin —
named in its own `enabledPlugins`, or carrying the assets the guidance is about — and a tool
hook's matcher names the tools it needs and never `"*"`.

## Why

```meta
```

A plugin is enabled per machine and almost everything it ships is inert until asked for. An
unguarded session-start hook fires in every repository on the machine, spending context and
pushing routing toward skills the repository never adopted; five of them did. Each
`emit-session-context.mjs` now resolves the repository root and probes for the markers — a
devbook folder, `.devbook/config.json`, and the pre-move config path, which is an existence
probe rather than a second supported path. The explicit opt-in outranks the markers. Only the
marker list differs between the copies, and the logic is duplicated because a plugin installs
alone and may not import from a sibling. Copilot's `hooks.json` is `type: prompt` and cannot
guard itself, so that copy stays unconditional and hedges where the Claude one decides.

A `"*"` matcher on `PreToolUse`/`PostToolUse` is one process spawn per tool call in every
session the plugin is enabled in, whether or not a run is active — the run-active check inside
the process comes too late. The dashboard's matcher names shell, edits, artifacts, sub-agents,
skills, and every MCP tool, and drops the read-only ones, which are the bulk of a session's
calls and the least of its time. A panel that needs a new tool needs it in the matcher too.

## Rejected

```meta
```

- A shared guard module imported by every plugin's hook.
- A `"*"` matcher with the run-active check inside the process.

The cost of the guard is real: a repository running flows on pure defaults, with neither the
config nor an `enabledPlugins` entry, starts its sessions without the routing text. The flows
still work there; the file that restores the nudge is the one `devbook-config:setup` writes.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-07 | The dashboard's tool matcher names its tools and drops the read-only ones. |
| 2026-09-07 | Every session-start hook fires only where the repository adopted the plugin. |
