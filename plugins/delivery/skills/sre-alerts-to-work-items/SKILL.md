---
name: sre-alerts-to-work-items
description: >
  Create work items from active Azure Monitor SRE alerts, in whatever tracker the repository
  binds — GitHub issues, Jira tickets, or Markdown chapters.
  Use when: triaging Azure alerts, translating SRE incidents to tracked work,
  syncing Azure Monitor findings to the backlog, bulk item creation from an alert feed.
---

# SRE Alerts to Work Items

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Query Azure Monitor for active SRE alerts and create one work item per alert, enriched with
context, severity, and suggested next steps. Skips alerts that already have an open item, so a
repeated run never duplicates one.

## Tracker

Every read and write here goes through the tracker operations — `find_item`, `create_item` —
resolved from `bindings["delivery.tracker"]`. See **Bindings → Tracker** in
`resources/surface-contract.md` for how an operation resolves and what each provider maps an
item to. Name the operation, never a provider's command.

With no tracker bound, run Phases 1 and 2 as a report and stop: list what would be created and
say that nothing was, because there is nowhere to create it.

## Inputs

- Azure subscription ID or name (required).
- Resource group or resource filter (optional; default: all resources).
- Minimum alert severity to include: `Sev0`, `Sev1`, `Sev2`, `Sev3`, `Sev4` (default: `Sev2`).
- Target the bound tracker addresses items in — a repository, a project, or a folder, whichever
  the binding names (default: the binding's own configured target).
- Labels to apply to created items (default: `sre`, `alert`). A tracker without labels records
  them however it records categories.
- Assignee, in the bound tracker's own user identity (optional).
- Dry-run mode: `true` skips creation and only reports what would be created (default: `false`).

## Workflow

### Phase 1 — Fetch Active Alerts

1. Use the Azure skill or MCP tool to retrieve active Azure Monitor alerts:
   - Filter by subscription and optional resource group.
   - Filter by severity threshold.
   - Filter to `fired` state only (skip `resolved` alerts).
2. List all matching alerts with: alert name, resource, severity, fired time, description.

### Phase 2 — Deduplicate Against Open Items

3. `find_item` for each alert name, restricted to open items in the target.
4. Mark alerts that already have a matching open item as **skipped**.
5. Present the full list — to-create and skipped — and ask for confirmation before proceeding
   (unless `dry-run` is `true`, in which case stop here with the preview).

### Phase 3 — Create Work Items

6. `create_item` for each alert not already tracked, with this structure:

**Title:** `[SRE] <Alert Name> — <Resource Name> (<Severity>)`

**Body:**

```markdown
## Alert Details

| Field | Value |
|-------|-------|
| **Alert Name** | `<alert-name>` |
| **Resource** | `<resource-id>` |
| **Severity** | `<Sev0–Sev4>` |
| **Fired At** | `<ISO timestamp>` |
| **Subscription** | `<subscription-name>` |
| **Resource Group** | `<resource-group>` |

## Description

<alert description from Azure Monitor>

## Condition

<metric/log condition that triggered the alert>

## Suggested Actions

- Review the resource in Azure Portal: [Open in Portal](<azure-portal-link>)
- Check recent deployments or configuration changes for `<resource-name>`.
- Consult the runbook if available: `<runbook-url if present>`.
- Escalate to on-call if severity is Sev0 or Sev1.

## References

- Azure Alert ID: `<alert-id>`
- Azure Monitor: [View Alert](<direct-link>)
```

7. Apply the labels (`sre`, `alert`, and a severity label such as `sev2`) and the optional
   assignee. Drop what the bound tracker has no field for, and say which once.
8. Record the created item id against the alert ID.

### Phase 4 — Summary

9. Output a summary table:

| Alert Name | Resource | Severity | Action | Item |
|------------|----------|----------|--------|------|
| `<name>` | `<resource>` | Sev2 | Created | #42 |
| `<name>` | `<resource>` | Sev1 | Skipped (existing #38) | #38 |

## Surface Reporting

Follow the **Reporting Contract** in `resources/surface-contract.md`.
With no surface bound, skip the calls, say so once, and continue — file artifacts remain
the source of truth.

- `start_run` with `skillId: "sre-alerts-to-work-items"` and these stages: Fetch Active
  Alerts, Deduplicate Against Open Items, Create Work Items, Summary.
  Pass `sessionId: "${CLAUDE_SESSION_ID}"` — the host's session id, per the `session-id` slot.

## Output

- One work item per new alert, in the bound tracker.
- Summary table with the action taken for each alert.
- No duplicate items created.

## Notes

- Requires the Azure skill or an Azure MCP tool for alert retrieval. Azure is the alert source
  here, not the tracker — the two are bound separately.
