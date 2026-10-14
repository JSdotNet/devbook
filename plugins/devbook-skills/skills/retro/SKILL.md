---
name: retro
description: 'Run a retrospective over one session or delivery run with the person present, and rank what would make the next one get further — a pointer, a check, context, a tool call, an instruction, a model or effort choice. A mechanical violation gets a check, never a written rule. Presents candidates and writes nothing. Use when: a session went badly, a run took several revise rounds, "/retro".'
---

# Retro

Open the reply with `devbook-skills@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

The subject is the agent's environment, never the person. Default to the current session;
take another session from the host's session list, or a delivery run from the bound surface —
its stages, the ones repeated, its revise rounds at Personal Validation. Read the repository's
own check command and its CI workflow before proposing a check.

## Lenses

| Lens | Look for | The change |
| --- | --- | --- |
| Navigation | A file or fact found slowly; a hidden dependency between files | A pointer where the next agent reads first |
| Rediscovery | The same exploration or correction twice; a stage rerun; a gate that took rounds | One line in the file the next session loads at that point |
| Automated checks | A mistake a check would have caught; a check that exists but is unwired or broken; no pre-commit hook and no CI job at all | The check, or its wiring |
| Coding standards | A mistake review let through | A check when mechanical; a reviewer's rule when a judgement call |
| Baseline size | `AGENTS.md`, `CLAUDE.md`, and what loads before the first turn, here or in the person's global scope | Move steering into a check, a rule loaded on read, or a pointer |
| Unused context | Loaded and never used; a whole folder read where one chapter would do; a compaction | Narrow the load, or move it behind a pointer |
| No-ops | An instruction that changes nothing against the model's default | Delete it |
| Tool economy | An expensive, failed, or repeated tool call; a token-heavy tool; a wait on a permission prompt | A cheaper call, a script, or an allowlist entry |
| Information access | A fact the agent could not reach: server logs, a read-only view of a service | The access |
| Model and effort | The strongest model on housekeeping; a lighter one on work that needed reruns | The setting, for the person — a phase's model in their overlay, or the team default |

**Mechanical gets a check.** A fixed syntactic pattern, a banned API, an import shape, a file
location: build the check in the repository's own linter, hook, or CI — whichever its
guardrail makes cheapest — rather than write the rule. A written rule is for a judgement call
alone, and it goes to review, which reads a diff, not to implementation, which carries the
most context.

## Output

Candidates ranked by the turns or tokens each would have saved. Each names its lens, its
evidence — a turn, a tool call, a stage, a count; a one-line paraphrase, never a quoted
transcript, nothing personal — the file it changes, and check or rule. A lens with no
evidence gets no candidate. Present them and stop: each accepted candidate is its own change,
through the flow that owns the file.
