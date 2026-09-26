---
name: show
description: "Show the feature being built the way a reviewer would see it: the app running, opened at what the current branch changes, walked through, with evidence taken. Use when: 'show me', 'demo it', 'let me see it working', a flow wants a demo of finished work, or a review needs to look rather than read."
goal: "Put the feature on the current branch in front of a reviewer: the application running through `start`, opened at the area this branch changes, its scenario walked end to end, every step evidenced through `capture` and cited by path. A demo without evidence paths is not a demo."
---

# Show the Change

A change here is a text asset a model reads, so a reviewer sees three things side by side:
the diff, what a host does with the changed asset when it is invoked from this working copy,
and the check output. There is no UI and no screenshot to take.

## Run it

Invoke the `start` skill and reuse what it reports. For a headless walk that writes no setting,
load the touched plugin for one run: `claude -p --plugin-dir plugins/<plugin> "<prompt>"`.

## Go to

Match `git diff --name-only main...HEAD` against the first column and walk every row that hits.

| Changed | Shown by |
| --- | --- |
| `plugins/<p>/skills/<s>/` | Invoking `/<p>:<s>` with the arguments its description names |
| `plugins/<p>/agents/<role>.agent.md` | A prompt addressed to `<p>:<role>` |
| `plugins/<p>/rules/`, `.agents/rules/` | Opening a file the rule's `paths` match and asking what applies |
| `plugins/<p>/hooks/`, `hooks.json` | The hook's command run with the event payload, per `debug` |
| `plugins/<p>/mcp/<server>/` | One tool call through the server, per `debug` |
| `.devbook/` | `build.mjs --check` over it; a chapter has no other runtime |
| `tools/`, manifests | The three checks alone |

A skill that writes into a repository — an `init`, an `update`, a migration — is never walked
against this worktree: run it in a throwaway `git init` under `.wip/try/<slug>/`, and show its
diff there.

## Walk it

1. **The diff.** `git diff --stat main...HEAD`, then the hunks for the rows above.
2. **The invocation.** Per row, the prompt given and the host's output, taken whole — the
   answer, the files it wrote, the tool calls it made.
3. **The checks.** The three from `capture`, run on this branch.

Invoke `capture` for each step. A step that fails is captured before anything is done about
it, and the walk stops there.

## Report

Which rows the branch hit and why, what each invocation did in one line, and one evidence path
per step. Say which host the walk used; the Copilot side of a dual-host asset is not shown by a
Claude run, and is named as not walked.

## Never

- Change an asset to make the walk come out right. A walk that needs a change is a finding.
- Invoke a writing skill against this worktree, or leave `.wip/try/` content in the change.
