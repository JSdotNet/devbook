# Hosts

```meta
date: 2026-09-25
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/05-building-block-view.md#host-slots", ".devbook/arc42/08-crosscutting-concepts.md#host", ".devbook/arc42/08-crosscutting-concepts.md#host-slot", ".devbook/tech/hosts.md#copilot-plugin-api", ".devbook/arc42/adr/install.md"]
```

Every asset is authored once and read by both Claude Code and GitHub Copilot. Where the two
hosts disagree on a filename, the file is authored once in a host-neutral place and each host
gets a wrapper of frontmatter and one sentence. Nothing in the marketplace names one host's own
file, path, or capability, save the four divergences recorded below, and no plugin exists per host. A checker over the hand-authored
files, `tools/check-assets.mjs`, replaces the generator that once derived one host's files from
the other's.

## Why

```meta
```

Both hosts ignore keys they do not know, which is what lets one file serve both. The cost is
paid inside the authored file: a tool list carries both hosts' ids, a model preference goes in a
body section rather than a pin one host refuses, and anything one host ignores — `handoffs`,
`applyTo` — is restated in prose or by path.

That does not stretch to a scoped rule, because the two hosts disagree on the *filename*:
Claude reads `.claude/rules/<topic>.md` with `paths`, Copilot reads
`.github/instructions/<topic>.instructions.md` with `applyTo`. So a repository rule is authored
in `.agents/rules/<topic>.md` — the `name` / `description` / `paths` shape of the open
[agents.md proposal](https://github.com/agentsmd/agents.md/issues/179) — and wrapped per host,
with `applyTo` exactly `paths.join(",")` so the wrappers are derivable and the checker fails on
drift. A wrapper never restates a rule: a third host adds a third wrapper, never a second copy.
The root file is `AGENTS.md` for the same reason: `CLAUDE.md` is an `@AGENTS.md` import and
`.github/copilot-instructions.md` one sentence, and only the Claude wrapper is load-bearing.

A host profile plugin was the one place a host's facts were allowed to live, and it cost a plugin
per host in a marketplace whose premise is one copy, plus a standing obligation that every slot
the engine added be answered twice. The slot set outlives its binders: every slot resolves
unbound unless a repository binds it, and a slot nobody binds still keeps a shared asset from
growing an if-this-host clause. The three session skills that went with the profiles — `start`,
`session-handoff`, `update-open-sessions` — were deleted rather than folded into the engine,
because each opened a host's own pane or walked a host's own worktrees.

The runner's `tools` allowlist follows the same line, with one exception. It names the surface
servers this marketplace ships, because an exact-match allowlist cannot hold a pattern
([surfaces](surfaces.md)), and it names the one tool that opens a URL in Claude Code's in-app
browser pane, `mcp__Claude_Browser__preview_start`. A dashboard the user has to click open
is a run they watch only when they remember to, and a link cannot choose to open in the pane:
where a clicked link opens is the host's choice, not something a surface can ask for. So the
runner opens the dashboard in the pane itself when that tool is in the live tool list, and
publishes the link either way. A host without a pane, or one whose id is not named, keeps the
plain link, so the contract still reads the same on both.

## Rejected

```meta
```

- **A generated sync layer.** Written, verified, and dropped on 2026-09-02: it bought
  consistency for a plugin set that did not exist and made every Claude manifest a file nobody
  could edit. What it linted came back on 2026-09-05 as the checker, after a review found five
  agents carrying tools a decision one day earlier had removed — a checker reports and writes
  nothing, and both manifests stay hand-authored.
- **One host's folder holding the rule, the other pointed at it.** One file fewer and a
  favourite picked; three files keep one copy and a wrapper per host in both places.
- **Folding the session skills into `delivery`.** Moves the host-naming into the engine rather
  than out of the marketplace.
- **Only a plain link to the dashboard.** Held from 2026-09-09 to 2026-09-25 on the grounds
  above: a host's pane is a capability, not a shipped server, and every call site had a
  plain-link fallback. Reversed because the click was the part that did not happen — a
  surface nobody opens steers nothing — and because no link format makes the host open the
  pane on its own.
- **All three pane ids, as before 2026-09-09.** `tabs_context` and `navigate` only reused a
  tab; opening once per session needs one call, so one id is named.

Four divergences stand on purpose: `devbook-config`'s report names a host's plugin directories,
because where a plugin is installed is a fact about a host and nothing else; and
`delivery-schedule` names the scheduler tool, because an install that could not would schedule
nothing, and the workflow tool its issue sweep runs each resolution under, because a sweep that
could not would resolve nothing ([plugin boundaries](plugin-boundaries.md)). And every
`delivery` skill that calls `start_run` carries `${CLAUDE_SESSION_ID}`, because Claude Code
substitutes a session id only into skill content: a skill without the token could not tell a
surface which session drove its run. The token is still bound and not branched — a host that
substitutes nothing, as Copilot CLI does, leaves a placeholder, which is the `session-id`
slot's unbound case ([chapter 5](../05-building-block-view.md#host-slots)). And `flow-runner`
names Claude Code's pane tool, because the runner is the one place the dashboard is opened
and an allowlist cannot reach a tool by pattern; the surface contract describes the pane
generically, so the name lives in the allowlist and nowhere else.

## History

```meta
```

| Date | Change |
| --- | --- |
| 2026-09-25 | `flow-runner` names `mcp__Claude_Browser__preview_start` and opens the dashboard in the pane: the fourth divergence, reversing 2026-09-09. |
| 2026-09-23 | The `session-id` slot: `delivery`'s `start_run` callers carry `${CLAUDE_SESSION_ID}`, the lane's third recorded divergence. |
| 2026-09-21 | `fleet` deleted: no asset names the Claude CLI. `delivery-schedule`'s issue sweep names the workflow tool, the lane's second recorded divergence. |
| 2026-09-09 | The runner's three browser-pane ids removed: a host capability, not a shipped server. |
| 2026-09-07 | Repository rules move to `.agents/rules/` with a wrapper per host; `CLAUDE.md` goes from 154 lines to an import. |
| 2026-09-05 | The checker `tools/check-assets.mjs` returns what the dropped generator used to lint, without owning the files. |
| 2026-09-05 | `claude-desktop` and `copilot-app` deleted; every slot resolves unbound unless a repository binds it. |
| 2026-09-02 | The generator deriving Claude files from Copilot ones dropped; both manifests hand-authored. |
| 2026-09-02 | One authored copy per asset, relying on both hosts ignoring unknown keys. |
