# Architecture Decision Records

```meta
index: root
related: [".devbook/arc42/09-architecture-decisions.md"]
```

A choice this repository made and can defend. One record per decision, numbered by filename,
each carrying the day the decision was taken.

A record belongs here rather than in
[chapter 11](../11-risks-and-technical-debt.md) when **something was decided**. A decision
records a choice somebody made and can defend; a debt record names a gap somebody found and
left open. The test is whether the document can end in an answer. If it ends in two options and
no pick, it is [debt](../tdr/README.md).

## The number is an identifier, not a chronology

```meta
```

Records 1 to 46 came out of [chapter 9](../09-architecture-decisions.md) in the order they sat
in it, which was thematic: the marketplace, then the folder convention, then the engine, then
the naming wave. Numbers 47 and up are assigned as records are written. So the sequence groups
related decisions and the `date` field carries the chronology — reading top to bottom follows an
argument, not a timeline.

A number is claimed when the record is written, and two branches writing at once claim
different ones: 53, 54, and 55 were argued as chapter 9's forty-seventh, forty-eighth, and
forty-ninth decisions on `main` while 47 to 52 were being written here, and took the next free
numbers on the merge rather than displacing them. It happened three more times the same day:
57 was written as 56 and took 57 when it merged behind `main`'s 56, which was already in the
index; 58 moved twice on its way in; and
[59](59-the-design-artifacts-are-no-longer-cited.md) claimed 56, then 58, and landed on the
first number still free — and [60](60-the-annotation-lifecycle-ends-in-devbook.md) had claimed
59 on its own branch and moved behind it. So the split's own boundary — 46 — is the last point
at which the number and the position in chapter 9 agreed.

The rule below is about a number that has landed. A number claimed on an unmerged branch has
not, and the branch that arrives second moves rather than displacing what is already indexed.

A number is never reused and never renumbered. A superseded decision keeps its number and says
so in its own body, pointing at whatever replaced it, because the record of a choice that was
later reversed is the part a reader most needs.

## The set

```meta
```

| Record | Taken |
| --- | --- |
| [1. Marketplace Named jsdotnet](1-marketplace-named-jsdotnet.md) | 2026-09-02 |
| [2. One Folder Per Plugin](2-one-folder-per-plugin.md) | 2026-09-02 |
| [3. One Authored Copy Per Asset](3-one-authored-copy-per-asset.md) | 2026-09-02 |
| [4. No Generated Sync Layer](4-no-generated-sync-layer.md) | 2026-09-02 |
| [5. devbook Still Ships the Graph Canvas](5-devbook-still-ships-the-graph-canvas.md) | 2026-09-03 |
| [6. Flat Devbook Folders Only](6-flat-devbook-folders-only.md) | 2026-09-03 |
| [7. approved Is a Status Rung](7-approved-is-a-status-rung.md) | 2026-09-03 |
| [8. Comments Are Findings Until the Fence Lands](8-comments-are-findings-until-the-fence-lands.md) | 2026-09-04 |
| [9. The Point Set Is Closed](9-the-point-set-is-closed.md) | 2026-09-03 |
| [10. One Config File, Two Kinds of Key](10-one-config-file-two-kinds-of-key.md) | 2026-09-03 |
| [11. The Stack Config Lives in devbook](11-the-stack-config-lives-in-devbook.md) | 2026-09-07 |
| [12. Extension Points and Gates Live in the Surface Contract](12-extension-points-and-gates-live-in-the-surface-contract.md) | 2026-09-03 |
| [13. A Tracker Is a Binding, Not a Phase Name](13-a-tracker-is-a-binding-not-a-phase-name.md) | 2026-09-03 |
| [14. delivery Ships No Surface](14-delivery-ships-no-surface.md) | 2026-09-03 |
| [15. Three Surfaces, One Contract](15-three-surfaces-one-contract.md) | 2026-09-03 |
| [16. A Surface Declares Only the Contract's Tool Names](16-a-surface-declares-only-the-contracts-tool-names.md) | 2026-09-03 |
| [17. No Host Profile Plugins](17-no-host-profile-plugins.md) | 2026-09-05 |
| [18. delivery-surface-canvas Ships the Canvas Only](18-delivery-surface-canvas-ships-the-canvas-only.md) | 2026-09-05 |
| [19. A Role Plugin Holds No Flow Control](19-a-role-plugin-holds-no-flow-control.md) | 2026-09-04 |
| [20. Budgets Are Disclosure Triggers, Not Gates](20-budgets-are-disclosure-triggers-not-gates.md) | 2026-09-05 |
| [21. Four arc42 Chapters](21-four-arc42-chapters.md) | 2026-09-05 |
| [22. Fan-Out Is Its Own Plugin](22-fan-out-is-its-own-plugin.md) | 2026-09-03 |
| [23. The Guide Names Every Plugin and Depends on None](23-the-guide-names-every-plugin-and-depends-on-none.md) | 2026-09-07 |
| [24. The Specialists Leave the Marketplace](24-the-specialists-leave-the-marketplace.md) | 2026-09-07 |
| [25. Devbook Payload Named After Its Plugin](25-devbook-payload-named-after-its-plugin.md) | 2026-09-05 |
| [26. The Unattended Lane Is Its Own Plugin](26-the-unattended-lane-is-its-own-plugin.md) | 2026-09-07 |
| [27. One Rule, One Wrapper Per Host](27-one-rule-one-wrapper-per-host.md) | 2026-09-07 |
| [28. devbook Owns One Section of AGENTS.md](28-devbook-owns-one-section-of-agentsmd.md) | 2026-09-07 |
| [29. Automation Owns the _meta Refresh](29-automation-owns-the-_meta-refresh.md) | 2026-09-07 |
| [30. The Handback Is the Commit Point](30-the-handback-is-the-commit-point.md) | 2026-09-07 |
| [31. Every Run Opens With Update Base](31-every-run-opens-with-update-base.md) | 2026-09-07 |
| [32. An MCP Server Is Bound Per Point](32-an-mcp-server-is-bound-per-point.md) | 2026-09-07 |
| [33. Surfaces Carry the Surface Word](33-surfaces-carry-the-surface-word.md) | 2026-09-07 |
| [34. Flows Belong to Delivery](34-flows-belong-to-delivery.md) | 2026-09-07 |
| [35. The Word Knowledge Is Retired](35-the-word-knowledge-is-retired.md) | 2026-09-07 |
| [36. devbook's Canvas Carries No Surface Word](36-devbooks-canvas-carries-no-surface-word.md) | 2026-09-07 |
| [37. A Plugin's Rules Reach a Host Through the Install](37-a-plugins-rules-reach-a-host-through-the-install.md) | 2026-09-07 |
| [38. An Install Is Not a Sync](38-an-install-is-not-a-sync.md) | 2026-09-07 |
| [39. Every Install Skill Is Called install](39-every-install-skill-is-called-install.md) | 2026-09-07 |
| [40. The Overlay May Add a Gate and Never Remove One](40-the-overlay-may-add-a-gate-and-never-remove-one.md) | 2026-09-07 |
| [41. A Session-Start Hook Fires Only Where the Repository Adopted the Plugin](41-a-session-start-hook-fires-only-where-the-repository-adopted-the-plugin.md) | 2026-09-07 |
| [42. A Tool Matcher Names Its Tools](42-a-tool-matcher-names-its-tools.md) | 2026-09-07 |
| [43. Only a Delivered Rule Lives in `rules/`](43-only-a-delivered-rule-lives-in-rules.md) | 2026-09-07 |
| [44. One Plugin, One Bounded Context](44-one-plugin-one-bounded-context.md) | 2026-09-08 |
| [45. A Context Describes Its Skills, and Keeps Its Terms in domain.md](45-a-context-describes-its-skills-and-keeps-its-terms-in-domainmd.md) | 2026-09-08 |
| [46. The Engine Owns the Capture Contract; the Repository Owns the Procedure](46-the-engine-owns-the-capture-contract-the-repository-owns-the-procedure.md) | 2026-09-08 |
| [47. The Runner Names the Surface Servers It Can Reach](47-the-runner-names-the-surface-servers-it-can-reach.md) | 2026-09-09 |
| [48. Three Folders Rest at `active`](48-three-folders-rest-at-active.md) | 2026-09-09 |
| [49. The Role Set Has Seven Members](49-the-role-set-has-seven-members.md) | 2026-09-09 |
| [50. Personal Validation Is a Phase Skill, and the Gate Is Not](50-personal-validation-is-a-phase-skill-and-the-gate-is-not.md) | 2026-09-09 |
| [51. Raising a Pull Request Is Not a Skill](51-raising-a-pull-request-is-not-a-skill.md) | 2026-09-09 |
| [52. Annotations Reach the Devbook Folders and Nothing Else](52-annotations-reach-the-devbook-folders-and-nothing-else.md) | 2026-09-09 |
| [53. The Hard Gate Runs the Schema Validator](53-the-hard-gate-runs-the-schema-validator.md) | 2026-09-09 |
| [54. The Pull Request Skills Read the pr-lane Slot](54-the-pull-request-skills-read-the-pr-lane-slot.md) | 2026-09-09 |
| [55. A Bounded Context Says Who Works With It](55-a-bounded-context-says-who-works-with-it.md) | 2026-09-09 |
| [56. Payload-Only Components Carry No Contract Version](56-payload-only-components-carry-no-contract-version.md) | 2026-09-09 |
| [57. A Workflow Gates the Checks the Schedule Cannot](57-a-workflow-gates-the-checks-the-schedule-cannot.md) | 2026-09-09 |
| [58. The Runner Opens No Browser Pane](58-the-runner-opens-no-browser-pane.md) | 2026-09-09 |
| [59. The Design Artifacts Are No Longer Cited](59-the-design-artifacts-are-no-longer-cited.md) | 2026-09-09 |
| [60. The Annotation Lifecycle Ends in devbook](60-the-annotation-lifecycle-ends-in-devbook.md) | 2026-09-09 |
| [61. The Marketplace Stamps Itself and Materializes Nothing](61-the-marketplace-stamps-itself-and-materializes-nothing.md) | 2026-09-09 |
| [62. The Chapter Gate Is devbook-collaboration's, and It Reads the Chapter](62-the-chapter-gate-is-devbook-collaborations-and-reads-the-chapter.md) | 2026-09-14 |
| [63. An Open flag Is Shown at the Gate and Never Blocks It](63-an-open-flag-is-shown-at-the-gate-and-never-blocks-it.md) | 2026-09-14 |
| [64. 1.0.0 Is the First Release](64-1-0-0-is-the-first-release.md) | 2026-09-14 |
| [65. The Repository Is Named devbook](65-the-repository-is-named-devbook.md) | 2026-09-14 |
| [66. The Marketplace Is Named jsdotnet-devbook](66-the-marketplace-is-named-jsdotnet-devbook.md) | 2026-09-14 |
| [67. The Install Creates the Root Wrappers Where Absent](67-the-install-creates-the-root-wrappers-where-absent.md) | 2026-09-15 |
| [68. The Generator Lives Under .devbook/tools/](68-the-generator-lives-under-devbook.md) | 2026-09-15 |

Four records carry a supersession note and stay where they are.
[1](1-marketplace-named-jsdotnet.md) is superseded on the name it chose and kept on the
warning it gave — [66](66-the-marketplace-is-named-jsdotnet-devbook.md) renames the
marketplace on that warning's own terms.
[5](5-devbook-still-ships-the-graph-canvas.md) is superseded outright on its flow half — the
flows moved twice and the bridge is gone.
[8](8-comments-are-findings-until-the-fence-lands.md) and
[37](37-a-plugins-rules-reach-a-host-through-the-install.md) are superseded in part: the first
lost the premise it rested on and is now closed as well, its migration shipped;
the second lost only where a plugin-internal contract lives. Each names what replaced it, in
its own body, under its own number.
