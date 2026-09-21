---
name: sweep-brief
description: 'Write the brief for an issue sweep that died before writing its own — the host closed during the wait, or the session ended — or re-read a past sweep: read the manifest and every worker result and produce the one-screen brief the state contract defines. Read-only; it never acts. Use when: a sweep went quiet and no brief.md appeared, or catching up on sweeps after time away. Not the daily repository brief — that is schedule-morning-brief in delivery-schedule.'
disable-model-invocation: true
---

# Sweep Brief

Open the reply with `fleet@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

`fleet-issue-sweep` writes its own brief once its workers finish. When it cannot — the host
closed during the wait, the session ended, a worker is still running past `maxWaitMinutes` —
the manifest and the worker result files still hold everything the brief needs, and this
skill writes it from them. It spawns nothing and claims nothing: it is the one skill here
that may run any time.

## Inputs

- Sweep directory (absolute path); with none given, the most recently created sweep under
  `${CLAUDE_ISSUE_SWEEP_DIR:-$HOME/.claude/issue-sweep}/`.
- `sweeps`: how many recent sweeps to cover (default `1`); more after time away.

## Workflow

1. **Read** the sweep directory or directories, newest first — `sweep.json` and every
   `workers/*.json` — per **The Brief → Reading the sweep** in
   `resources/fleet-issue-sweep-contract.md`: a picked-up issue with no result file is
   unknown until `claude agents` says whether it is still running or exited without writing.
2. **Refresh** the live pull request and issue state the brief will ask a person to act on.
3. **Write** the brief in the contract's shape — the lead line, sections ① to ⑥, the machine
   state — and deliver it as the contract says: chat, `<sweep dir>/brief.md`, and the bound
   render surface where one answers. Set `briefWrittenAt` in `sweep.json`.

## Do not

- Do not close an issue, merge a pull request, remove a worktree, or re-run a failed worker.
  Every actionable line carries its command; running it is a decision for the session you are
  in.
- Do not read a pull request's existence as a worker's success. The result file is the record.

## Related Skills

- `fleet-issue-sweep` — writes the manifest, dispatches the workers, and writes this same
  brief itself when it reaches the end of its wait.
- `fleet-resolve-issue` — the worker that writes each result file.
- `pr-merge-ready` (`delivery` plugin) — takes the pull requests in section ③ to merge-ready,
  one per pass.
