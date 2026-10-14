# Review report

The frame and its rules are `../../resources/report-contract.md`. Follow this shape exactly.

```markdown
## Review · <owner/repo> · <YYYY-MM-DD>

**<Verdict: the blocking count, and the one finding to fix first.>**

| Layer | Findings | Blocking or high | Issues opened |
| --- | --- | --- | --- |
| TODO | <n> | <n> | <n> |
| Suggestions | <n> | <n> | <n> |
| Code review | <n> | <n> | <n> |

### Needs you
| What | Where | Do |
| --- | --- | --- |
| <blocking finding, own words> | `<file>:<line>` | [#<n>](<url>) or <the fix, one line> |

### Findings
| Severity | Layer | Where | Finding | Issue |
| --- | --- | --- | --- | --- |
| `blocking` | Code review | `<file>:<line>` | <own words, 12 at most> | [#<n>](<url>) or — |

### Run
| Outcome | What | Why |
| --- | --- | --- |

*`schedule-review@<version>` · <scope> · layers <list> · <ISO datetime UTC>*
```

The severity words are `../../resources/findings-contract.md`'s. The issues this skill opens
are findings someone works; the report links them and is not one.
