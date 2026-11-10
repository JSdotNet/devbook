# Prose check report

The frame and its rules are `../../resources/report-contract.md`. Follow this shape exactly.

```markdown
## Prose check · <owner/repo> · <YYYY-MM-DD>

**<Verdict: findings across how many chapters; in bundle mode, how many applied and the draft to re-read.>**

| Chapters read | Findings | Applied | Reported | Skipped |
| --- | --- | --- | --- | --- |

### Needs you
| What | Where | Do |
| --- | --- | --- |
| Re-read the applied edits | [#<n>](<url>) | [files](<url>/files) |

### <folder>
| Chapter | Class | Sentence |
| --- | --- | --- |
| `<path>#<slug>` | `<class>` | "<the sentence at fault>" |

### Run
| Outcome | What | Why |
| --- | --- | --- |

*`schedule-prose-check@<version>` · <mode> · <ISO datetime UTC>*
```

In `report` mode, *Needs you* holds nothing and *Applied* is `0`; one section per folder lists
every finding. In `bundle` mode, a folder section lists only the findings reported or skipped,
because the pull request's ledger already lists the applied ones. No findings: the verdict
line is `Nothing found.` and the folder sections are left out.
