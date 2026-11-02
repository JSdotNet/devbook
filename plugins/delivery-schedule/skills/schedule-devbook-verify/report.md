# Devbook verify report

The frame and its rules are `../../resources/report-contract.md`. Follow this shape exactly.

```markdown
## Devbook verify · <owner/repo> · <YYYY-MM-DD>

**<Verdict: how many chapters drifted, and which way.>**

| Aligned | Code ahead | Spec ahead | Conflict | Unresolved |
| --- | --- | --- | --- | --- |

### Needs you
| What | Where | Do |
| --- | --- | --- |
| Conflict: <the question, own words> | `<chapter>#<heading>` | [#<n>](<url>) |
| Code ahead: capture it | `<unit id>` | `devbook:capture-specs <unit id>` |
| Orphan: <its reason> | `<chapter>` | add the `related` it lacks |
| Drift issue now aligned | [#<n>](<url>) | `gh issue close <n>` |

### Drift
| Verdict | Unit | Chapter | Evidence | Issue |
| --- | --- | --- | --- |

### Run
| Outcome | What | Why |
| --- | --- | --- |

*`schedule-devbook-verify@<version>` · <n> units · <ISO datetime UTC>*
```

*Drift* holds every row that is not `aligned`; the `aligned` rows are the count alone.
