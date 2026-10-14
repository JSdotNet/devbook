# Security review report

The frame and its rules are `../../resources/report-contract.md`. Follow this shape exactly.

```markdown
## Security review · <owner/repo> · <YYYY-MM-DD>

**<Verdict: new findings at or above the threshold, or "Nothing new at <threshold> or above.">**

| Layer | Findings | High | Issues opened | Already open |
| --- | --- | --- | --- | --- |
| Dependencies | <n> | <n> | <n> | <n> |
| Secrets | <n> | <n> | <n> | <n> |
| Workflows | <n> | <n> | <n> | <n> |
| Code | <n> | <n> | <n> | <n> |

### Needs you
| What | Where | Do |
| --- | --- | --- |
| Secret committed: rotate it, then remove it | `<file>:<line>` | [#<n>](<url>) |

### Findings
| Severity | Layer | Where | Finding | Issue |
| --- | --- | --- | --- | --- |

### Run
| Outcome | What | Why |
| --- | --- | --- |

*`schedule-security-review@<version>` · <scope> · threshold <severity> · <ISO datetime UTC>*
```

No cell ever holds a secret value: the kind and the location. The issues this skill opens are
findings someone works; the report links them and is not one.
