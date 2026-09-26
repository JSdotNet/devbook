---
name: start
description: "Start this repository's application the way this repository says to, and leave it running. Use when: starting or running the app locally, 'start the app', 'run it', resuming work on a branch, or a flow needs a runtime at app.start."
goal: "Leave this repository's application running and healthy, and report the command that started it, the health verdict, and its entry points. Never hand the person a command to run themselves."
---

# Start the Marketplace

There is no application here. This repository is the `jsdotnet-devbook` plugin marketplace,
`extensions.app.start` is `null`, and "running" means one thing: a Claude Code host loading
the plugins from this working copy instead of from GitHub, so the change on this branch is
what a skill, rule, hook, or MCP server does when invoked. `AGENTS.md` under *Trying a change*
is the source; this file is how it is done.

## Run

1. **Check what is already there.** `claude plugin marketplace list`. When `jsdotnet-devbook`
   already reads as a path, and that path is this worktree, reuse it and say so. Another
   worktree's path is not this branch: replace it and say so.
2. **Add this working copy by path**, for this checkout only:

   ```bash
   claude plugin marketplace add . --scope local
   ```

   The name comes from `.claude-plugin/marketplace.json` and is the same `jsdotnet-devbook`
   `.claude/settings.json` declares from GitHub. `--scope local` writes the gitignored
   `.claude/settings.local.json`, never the committed settings and never the person's user
   settings. Never remove or rewrite the user- or project-scope declaration to make the path
   win.
3. **Enable what is being edited.** `claude plugin install <plugin>@jsdotnet-devbook --scope
   local` for each plugin under `plugins/` that `git diff --name-only main...HEAD` touches —
   the CLI form of `/plugin`. One already enabled at project scope needs nothing.
4. **Reload.** A host reads plugins when a session starts. Say that the change is live in the
   next session, or after `/reload-plugins` in an interactive one; never claim it is live in
   this one.

For one headless run that writes no setting at all, `claude --plugin-dir plugins/<plugin>`
loads that plugin for that session only — `show` uses it.

## Healthy

- `claude plugin marketplace list` shows `jsdotnet-devbook` with this worktree's path as its
  source, not GitHub.
- `claude plugin list` shows every plugin the branch touches as enabled, at the version in its
  `plugins/<plugin>/.claude-plugin/plugin.json`.
- `claude plugin validate --strict plugins/<plugin>` passes for each of them. A manifest the
  validator rejects is a failed start, whatever the list says.
- A source still reading GitHub after step 2 is not healthy: report it and stop, never edit the
  person's settings by hand to force it.

## Entry points

| Entry point | Where |
| --- | --- |
| A skill | `/<plugin>:<skill>`, from `plugins/<plugin>/skills/<skill>/SKILL.md` |
| An agent | `<plugin>:<role>`, from `plugins/<plugin>/agents/<role>.agent.md` |
| A rule | Loads when the host opens a file its `paths` match — open one |
| An MCP server | `mcpServers` in the plugin's `.claude-plugin/plugin.json` |

## Never

- Write `.claude/settings.json` or the person's user settings. Local scope only.
- Uninstall a plugin, or remove a marketplace, the person did not add in this session.
- Report the branch as tried from a session that started before step 2.
