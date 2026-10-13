# Issue sweep report

The frame and its rules are `../../resources/report-contract.md`. Follow this shape exactly.

```markdown
## Issue sweep · <owner/repo> · <YYYY-MM-DD>

**<Verdict: "12 triaged, 2 closed, 3 draft pull requests, 1 did not complete. 4 proposals need an answer.">**

### Needs you: validate the drafts
| Issue | Draft | What could not be proved |
| --- | --- | --- |

### Needs you: answer the proposals
| Issue | Proposal | Evidence | Do |
| --- | --- | --- | --- |
| [#<n>](<url>) | close as stale, label `<label>`, or ask | <own words> | `gh issue close <n> --comment "<evidence>"` |

### Flagged
| Issue | Quoted text |
| --- | --- |

### Did not complete
| Issue | Stopped at | Reason | Label left |
| --- | --- | --- | --- |

### Closed
| Issue | Evidence |
| --- | --- |

### Triaged and deferred
| Type or reason | Count | Issues |
| --- | --- | --- |
| excluded: `wayfinder:*` | <n> | — |

### Run
| Outcome | What | Why |
| --- | --- | --- |

*`schedule-issue-sweep@<version>` · maxTriage <n> · maxResolve <n> · <ISO datetime UTC>*
```

The two *Needs you* sections take the frame's place for this skill. A classification below
`labelConfidence`, a label the repository lacks, a `needs-info` question asked, and a duplicate
named but not closed are each a proposal row. *Triaged and deferred* counts the classifications
written per type and severity, and the issues judged but not resolved — a conflict, with what
it collides with; past `maxResolve`; past `maxTriage`.

The `wayfinder:*` row is a count, never a list: those issues belong to the person working the
map, so the brief names none of them. Omit the row when the count is zero.
