# delivery-run-view

```meta
related: [".devbook/arc42/building-blocks/README.md", ".devbook/arc42/05-building-block-view.md#plugin-folder", ".devbook/arc42/adr/surfaces.md", ".devbook/arc42/building-blocks/delivery-surface-dashboard.md", ".devbook/arc42/building-blocks/delivery-surface-backlog.md"]
```

A delivery run drawn inside Claude Code itself. Responsible for one thing: that the person in
the session sees the run they are in — its phases, how each one ran, and the phase it is in now
— without opening another window, and hears when any run on the machine stops for them.

Inside the block: reading the run files the surfaces write, inferring what a run does not
record, drawing the result as a pane, a band above the prompt, inline transcript rows, and
the status line, alerting when any checkout's run reaches a gate or blocks, and handing the
person's gate answer to the session. Outside it: recording the run, which is every surface's
job; deciding what a run records, which is the surface contract's; and deciding the gate, which
is the flow-runner's — a button here only types the reply the person would have typed. It
writes no file, answers no operation, and stamps nothing.

It is not a surface. A surface is a server named `delivery-surface-*` that answers the
contract's operations, and the engine records a run on every one it finds
([surfaces](../adr/surfaces.md)); a reader under that prefix would be resolved as a place to
record, so this block keeps the subsystem's stem and is named for what it shows.

## Interfaces

```meta
```

| Interface | Kind | Reached by |
| --- | --- | --- |
| `/flows` | Command, opening the pane | A person; the pane also opens on its own once per run of this session, the first time that run appears, never for another session's run or the main checkout's |
| `/flows-demo` | Command, a simulated `flow-code` run held in memory | A person trying the view with no run to show |
| Pane, band, inline rows, status line | Function-hook `ui.render` handlers and `$.ui.status` | Claude Code, on every render |
| Gate alert | `$.ui.toast`, `$.audio.play` of `sounds/gate.wav`, and the status line | A stage of any checkout's run turning `waiting` or `blocked`, once per transition |
| Personal Validation review card | Approve, Revise, and Reject buttons in the pane, each `$.prompt.submit` of the gate's reply as the person's own prompt | A person, while this session's run waits at Personal Validation |

The inline rows replace the transcript's raw JSON for a surface's `start_run` and
`update_stage` calls, matched by pattern in either host spelling, so they draw a call to any
surface, not only the two whose files this block reads.

## Structure

```meta
```

One module, `hooks/register.tsx`, the state contract it keeps, `types/index.d.ts`, and the clip
the gate alert plays, `sounds/gate.wav`.

```mermaid
flowchart LR
    D["~/.claude/delivery-surface-dashboard/<br/>&lt;slug&gt;-&lt;hash&gt;/runs/*.json"] --> R["poll every 3s<br/>read, merge, infer"]
    B["~/.claude/backlog/<br/>&lt;slug&gt;-&lt;hash&gt;/runs/*.json"] --> R
    R --> S["$.state runs"]
    S --> P["Pane"]
    S --> A["Band above the prompt"]
    S --> T["Inline tool rows"]
    R --> L["Status line"]
    O["every other checkout's<br/>&lt;slug&gt;-&lt;hash&gt;/runs/*.json<br/>moved in the last day,<br/>every 15s"] --> G["compare tones with $.state seen"]
    S --> G
    G --> N["Toast and sound, once per transition"]
    G --> L
    P --> C["Review card: Approve, Revise, Reject"]
    C --> Q["$.prompt.submit into this session"]
```

A phase's mode, agent, skill, model, effort, MCP servers, and chores are read from the run's
`runContext.phases` entry — what was resolved — with the stage's `execution` — what ran —
over it, and inferred where the run records neither. Where the two differ the row carries a
`≠` and the phase's detail names the field. The row also carries what the pass found, when
the stage's `execution` records it — `round 2 · 1 blocker` on Review, `0 defects` on Verify —
yellow for an open blocker, red for a defect, and nothing for a stage that records none.

| Invariant | Enforced at | Evidence |
| --- | --- | --- |
| Nothing is written outside the plugin's own `$.state`; `/flows-demo` writes no run file | `register.tsx` | `claude plugin validate` lists the module's writes |
| An inferred mode is drawn dimmed with a `?`, never as if recorded | `register.tsx`, `badge` | untested |
| A phase is named by its configured agent when it ran — through an effort runner too — else by its longest-running sub-agent | `register.tsx`, `boundWorker` | `hooks/register.test.ts` |
| A sub-agent that ran under the gate is shown as a revise round's | `register.tsx`, `stageOf` | `hooks/register.test.ts` |
| What ran is compared with what was resolved, field by field, and a difference or a fallback is marked | `register.tsx`, `stageOf` | `hooks/register.test.ts` |
| A stage's `round`, `blockers`, and `defectsFound` are drawn only when they are whole counts in range, never inferred | `register.tsx`, `stageOf`, `countsOf` | `hooks/register.test.ts` |
| A worktree with no runs of its own shows the main checkout's | `register.tsx`, `loadRuns` | `hooks/register.test.ts` |
| The pane opens on its own for a run of this session, once | `register.tsx`, `refresh` | `hooks/register.test.ts` |
| A run file that does not parse is skipped, not fatal | `register.tsx`, `parseRun` | untested |
| A stage turning `waiting` or `blocked` in any checkout alerts once, the first poll of a session alerting nothing, and the gate's status entry clears once nothing waits | `register.tsx`, `alertGates` | `hooks/register.test.ts` |
| Another checkout's run that has not moved in a day is not read, and the other checkouts are listed every fifth poll | `register.tsx`, `loadRuns` | `hooks/register.test.ts` |
| The review card is drawn only for this session's run at Personal Validation, and a press submits the gate's reply, never a decision of its own | `register.tsx`, Pane and `answerGate` | `hooks/register.test.ts` |

## Dependencies

```meta
related: [".devbook/arc42/08-crosscutting-concepts.md#layer"]
```

Declares nothing and is declared by nothing. Its one real coupling is to a file format no
contract publishes; the gate replies it submits are the flow-runner's words — `approve`,
`revise`, `decline` — read by a model, not parsed by a contract.

### Outbound

```meta
```

| Depends on | Pattern | Mechanism | Contract | Why |
| --- | --- | --- | --- | --- |
| [delivery-surface-dashboard](delivery-surface-dashboard.md) and [delivery-surface-backlog](delivery-surface-backlog.md) | Conformist, read-only, to an unpublished format | Reads their run files under the profile, every checkout's for the gate alert | None: the dashboard's run file shape, which the Backlog app writes too | The run files already hold everything the view draws. A surface that changes its file shape breaks this view without breaking the contract — the cost of reading rather than asking. |
| [The plugin kernel](../08-crosscutting-concepts.md) | Shared Kernel | Plugin folder and the Claude manifest alone | [Chapter 5](../05-building-block-view.md#plugin-folder) | Function-hook modules load on one host, so it ships that host's manifest only. |
| Claude Code function-hook API | Conformist | `hooks/hooks.json` naming `./register.tsx` under `modules`, and `types` in the manifest | The host's own module and state shapes | The pane, band, and transcript rows are the host's to draw. |

### Inbound

```meta
```

None. Nothing names this plugin, and a session without it records every run as before.
