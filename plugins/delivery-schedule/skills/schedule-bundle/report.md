# Bundle report

The frame and its rules are `../../resources/report-contract.md`. Follow this shape exactly.

```markdown
## <Bundle title> · All repos · <YYYY-MM-DD>

**<Verdict: drafts to review across how many repositories, and what stopped the rest.>**

### Needs you
| What | Where | Do |
| --- | --- | --- |
| Review the draft: <own words> | `<owner/repo>` · <job title> | [#<n>](<url>) |
| <a job's own Needs you row, its words kept> | `<owner/repo>` · <job title> | <its Do> |
| <job title> failed: <why> | `<owner/repo>` | `schedule-run <bundle name>`, or the job's own routine where it still has one |

### Jobs
| Repository | <job title> | <job title> | … |
| --- | --- | --- | --- |
| `<owner/repo>` | draft [#<n>](<url>) | done | skipped: <reason> |
| `<owner/repo>` | failed: <why> | not run | — |

### Drift
| Repository | Verdict | Unit | Chapter | Evidence | Issue |
| --- | --- | --- | --- | --- | --- |

### Security
| Repository | Severity | Layer | Where | Finding |
| --- | --- | --- | --- | --- |

### Digest

#### <owner/repo>

<the weekly update, then the change report, each as its job returned it, headings one level down>

### Run
| Outcome | What | Why |
| --- | --- | --- |
| skipped | `<checkout>` | <the reason the plan gave> |
| skipped | <n> jobs not run | <usage limit, or two agents in a row returned nothing> |
| worktree | none of the bundle's own | each job removes or leaves its own, per its report |

*`schedule-bundle@<version>` · <n> repositories × <m> jobs · <ISO datetime UTC>*
```

- *Jobs* has one row per repository and one column per job, in the bundle's order, the digest
  jobs included. A cell is one of: `draft` with its link, `done`, `skipped: <reason>`,
  `failed: <why>`, `not run`, or `—` where the repository does not select the job.
  `delivery-schedule:update` reads `draft` and `done` as the job having run there, and nothing
  else.
- *Needs you* gathers every job's own *Needs you* rows, most urgent first, then one row per
  draft. The ten-row rule holds across the whole section.
- *Drift* is every repository's devbook verify table, per that skill's *In a bundle*, the
  `Repository` column added. *Security* is every repository's security review *Findings*,
  ranked as they came, with `Repository` added and `Issue` dropped: in a bundle it opens none. *Digest* is one subsection per repository whose digest jobs ran.
  Omit any of the three when empty.
- A cell an agent returned nothing for reads `failed`, unless a second followed it: the host
  gives no reason, so two in a row are read as the usage limit and both read `not run`.
- *Run* carries each skipped checkout, and the jobs left unstarted. Each job's own *Run* stays
  in its report; the cell links the draft that holds it.
