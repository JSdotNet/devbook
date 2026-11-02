---
name: decision
description: The versioned contract for workflow state and review notes kept outside git — the capability group a host answers over MCP, how a caller resolves it, the three subjects, the seven operations, and what a caller does with no host or two. Owned by devbook; answered by spec-manager and Backlog.
---

# Decision

This is `devbook.decision@1`. devbook owns it; spec-manager and Backlog answer it, and none of
them extends it. A change that breaks a caller or a host raises the version. Why the state
lives in a host and not in the chapter is `.devbook/arc42/adr/chapter-schema.md#branch-true-devbook`
and `.devbook/arc42/adr/annotations.md` in this repository.

## Resolution

A host answers the group from an MCP server, and a caller resolves it at run time from the live
tool list, as a delivery surface is resolved: never a dependency, absent until listed.

- **The pattern is the operation prefix.** Every operation below is a tool named `devbook_*`,
  surfacing as `mcp__<server>__<name>` or `mcp__plugin_<plugin>_<server>__<name>`. Match both
  spellings. A server binds when it lists all seven; one listing some is not bound. An `approve` or `resolve_comment` without the prefix is never this group.
- **No host bound is a normal outcome.** The caller reports the decision it would record —
  subject, operation, fingerprint, note — and writes nothing: no field, no fence, no file.
- **Each host keeps its own state, and two may differ.** The caller uses the host that answers
  in its session, the first alphabetically by server name when more than one does, and names
  it in every report. It never writes to two hosts and never copies state between them.

## Subjects

Every call carries `repository`, as `owner/name`. The four state operations carry a `subject`:

| `kind` | Keyed by | States |
| --- | --- | --- |
| `proposal` | `name`: the change's folder name under `openspec/changes/` | `draft`, `approved`, `accepted` |
| `decision` | `path`: the record's repository path, and `pullRequest`: its number | `proposed`, `decided`, `declined` |
| `debt` | `path`: the record's repository path | `identified`, `planned`, `in-progress`, `resolved` |

The states are closed within `@1`. An ordinary chapter is no subject: merged, it is in force.

## Operations

| Operation | Takes | Answers |
| --- | --- | --- |
| `devbook_get_state` | `subject` | `state`, `null` when the host keeps none; for a proposal also `approval` and `acceptance`, each `{ by, at, fingerprint }` or `null` |
| `devbook_set_state` | `subject`, `state` | The state as `get_state` answers it |
| `devbook_approve` | `subject`, `fingerprint` | The same |
| `devbook_accept` | `subject`, `fingerprint` | The same |
| `devbook_list_notes` | `address` | `notes`: each `{ id, address, kind, status, body, by, at, replies }`, a reply `{ by, at, body }` |
| `devbook_post_note` | `address`, `body`, and `kind` or `replyTo` | The note |
| `devbook_resolve_note` | `id` | The note, `status: resolved` |

- **The fingerprint** is `devbook.chapter.fingerprint@1` of the change, per
  `chapter-fingerprint.md` beside this file; the caller computes it with `chapter-hash.mjs`
  and the host stores it. A decision whose fingerprint differs from the change's current one
  has lapsed: the caller reports it lapsed and asks the person to decide it again. It never
  approves or accepts again on its own.
- **Approve and accept are a person's decision.** Call either only on that person's explicit
  word in this session, never on a reviewer's verdict or an unattended run's. The host records
  who, and when as ISO 8601 UTC, from its own session; a caller never passes either.
- **Approve and accept take a `proposal` subject alone**, and are its only way to `approved`
  and `accepted`. Accept stands on an approval at the same fingerprint: with none it refuses
  `not-approved`, with one at another `fingerprint-mismatch`. `set_state` to `draft` withdraws
  both; `set_state` to `approved` or `accepted`, or to a state outside the subject's row, and
  approve or accept on another kind, refuse `bad-state`.
- **A note's `address`** is a chapter address, `<path>` or `<path>#<slug>`; in a change, the
  path in its folder, `openspec/changes/<name>/proposal.md` or a delta's. The contract carries
  no branch: a host that also keys a note by branch answers for the default branch. `kind` is
  `comment` (default), `question`, `suggestion`, or `flag`, and the host keeps it. An open `question` at any address under
  `openspec/changes/<name>/` makes approve and accept on that change refuse `open-question`;
  `comment`, `suggestion`, and `flag` never block.
- **A refusal** answers `{ refused, message }`, `refused` one of `open-question`,
  `not-approved`, `fingerprint-mismatch`, `bad-state`, `unknown-note`, and writes nothing.
  The caller reports it and never retries around it.
