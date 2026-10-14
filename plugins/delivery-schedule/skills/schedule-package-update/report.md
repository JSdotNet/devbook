# Package update report

The frame and its rules are `../../resources/report-contract.md`. Follow this shape exactly.

```markdown
## Package update · <owner/repo> · <YYYY-MM-DD>

**<Verdict: how many moved, the pull request, and whether build and tests passed.>**

### Needs you
| What | Where | Do |
| --- | --- | --- |
| Review the update | [#<n>](<url>) | [files](<url>/files) |
| Major bump left out | `<package>` <from> → <to> | `flow-code`, dependency kind |

### Packages
| Package | From | To | Result |
| --- | --- | --- | --- |
| `<package>` | `<version>` | `<version>` | `updated` or `skipped: <reason>` |

### Run
| Outcome | What | Why |
| --- | --- | --- |

*`schedule-package-update@<version>` · <ecosystems> · <ISO datetime UTC>*
```

Updated rows first, then skipped.
