# Runtime View

```meta
number: 6
related: [".devbook/arc42/building-blocks/README.md", ".devbook/arc42/08-crosscutting-concepts.md", ".devbook/arc42/05-building-block-view.md#plugin-folder", ".devbook/arc42/building-blocks/devbook.md", ".devbook/arc42/building-blocks/devbook-derived.md", ".devbook/arc42/building-blocks/devbook-config.md", ".devbook/arc42/building-blocks/delivery.md", ".devbook/arc42/building-blocks/delivery-schedule.md", ".devbook/arc42/building-blocks/fleet.md"]
```

The scenarios that cross several blocks: a file becoming something a host loads, payload
becoming state in somebody else's repository, and the run a flow skill describes. A flow that
stays inside one block lives in that block's file under `## Runtime` — see
[building-blocks/](building-blocks/README.md). Structure lives in
[chapter 5](05-building-block-view.md) and the vocabulary in
[chapter 8](08-crosscutting-concepts.md).

## Authoring an Asset

```meta
related: [".devbook/arc42/05-building-block-view.md#plugin-folder", ".devbook/arc42/05-building-block-view.md#marketplace-root", ".devbook/arc42/08-crosscutting-concepts.md#host", ".devbook/arc42/08-crosscutting-concepts.md#marketplace", ".devbook/ai/01-author.md#claude-code-as-authoring-host", ".devbook/ai/03-verify.md#plugin-evaluation"]
```

A file is written once and read by two hosts, so the lifecycle has one authoring step and two
independent load paths. Nothing is assembled in between — there is no build — which is why the
only place a mistake can be caught before a consumer's install is the authoring host itself.

```mermaid
flowchart LR
    write["Write the asset"] --> manifests["Declare the manifests"]
    manifests --> deps{"Needs a lower layer?"}
    deps -->|yes| declare["Declare dependencies, Claude manifest only"]
    deps -->|no| list
    declare --> list["List in marketplace.json"]
    list --> check["Validate the shape"]
    check -->|shape rejected| write
    check -->|clean| install["Host installs by plugin@jsdotnet-devbook"]
    install --> claude["Claude Code loads it"]
    install --> copilot["Copilot loads it"]
```

- A plugin folder that never reaches `marketplace.json` does not exist to a host, so the list
  step is the one that cannot be skipped for a plugin meant to be installed.
  `delivery-surface-canvas` skips it deliberately: it is a Copilot canvas extension and reaches
  its host another way.
- The two load paths never rejoin. A shape one host rejects is fatal there and invisible on the
  other, which is what makes authoring in a host the practice recorded in
  [ai/01-author.md](../ai/01-author.md#claude-code-as-authoring-host).
- The loop through `check` is the whole verification story today. Whether a skill *triggers* is
  not on this path — see [ai/03-verify.md](../ai/03-verify.md#plugin-evaluation).

## Materializing a Component

```meta
related: [".devbook/arc42/08-crosscutting-concepts.md#stamp", ".devbook/arc42/08-crosscutting-concepts.md#migration", ".devbook/arc42/05-building-block-view.md#level-2-what-lands-in-a-repository", ".devbook/arc42/05-building-block-view.md#stack-config", ".devbook/arc42/building-blocks/devbook.md", ".devbook/arc42/building-blocks/devbook-derived.md", ".devbook/arc42/building-blocks/delivery.md", ".devbook/arc42/building-blocks/delivery-schedule.md", ".devbook/arc42/building-blocks/devbook-config.md", ".devbook/arc42/adr/install.md", ".devbook/arc42/tdr/3-devbook-rename-has-no-migration.md"]
```

The one flow whose state persists outside this repository. A
[stamp](08-crosscutting-concepts.md#stamp) is the consuming repository's record of what a
plugin put there, and it is read by presence — a missing key means *absent*, never *older*.
Four blocks run it, one stamp each — [devbook](building-blocks/devbook.md),
[devbook-derived](building-blocks/devbook-derived.md), [delivery](building-blocks/delivery.md),
and [delivery-schedule](building-blocks/delivery-schedule.md) — and
[devbook-config](building-blocks/devbook-config.md) invokes each one's install in turn without
writing a stamp of its own.

```mermaid
stateDiagram-v2
    [*] --> NotAdopted
    NotAdopted --> Materialized: install copies payload, writes the component's stamp
    Materialized --> Reconciling: install runs again
    Reconciling --> Materialized: every key resolves, hashes match
    Reconciling --> Drifted: a materialized file changed underneath
    Reconciling --> Pending: ledger is missing a migration id
    Pending --> Materialized: the migration runs, its id joins the ledger
    Pending --> Pending: the check still reports work
    Drifted --> Materialized: a person resolves it, install never overwriting silently
    Materialized --> [*]: component removed
```

- **The ledger decides whether a migration runs, never a version comparison.** A repository
  that skipped three releases replays the ids it lacks, in order, and a repository that already
  ran one never runs it twice — which is what `--check` is for.
- **A renamed payload path is a new key, not a moved one.** Reconcile resolves it as absent and
  creates it while the old file stays on disk unmanaged; that is exactly
  [debt record 3](tdr/3-devbook-rename-has-no-migration.md), and this transition is where it
  bites.
- Nobody writes another owner's key. The engine keys and each `components.<name>` stamp move
  through this flow independently, so two components are never mid-migration as one thing.

## A Flow Run

```meta
related: [".devbook/arc42/08-crosscutting-concepts.md#flow-skill", ".devbook/arc42/08-crosscutting-concepts.md#extension-point", ".devbook/arc42/08-crosscutting-concepts.md#gate", ".devbook/arc42/08-crosscutting-concepts.md#surface", ".devbook/arc42/08-crosscutting-concepts.md#fleet-skill", ".devbook/arc42/building-blocks/delivery.md", ".devbook/arc42/building-blocks/delivery-surface-dashboard.md", ".devbook/arc42/building-blocks/delivery-surface-canvas.md", ".devbook/arc42/building-blocks/delivery-surface-collector.md", ".devbook/arc42/building-blocks/fleet.md", ".devbook/arc42/adr/flow-engine.md"]
```

What a [flow skill](08-crosscutting-concepts.md#flow-skill) does with the closed set of
[extension points](08-crosscutting-concepts.md#extension-point), in one session. Services are
on the spine; chores hang off it and may never move it. The engine
([delivery](building-blocks/delivery.md)) owns the spine, the providers a repository binds fill
the points, and whichever [surface](08-crosscutting-concepts.md#surface) answers renders it.

```mermaid
flowchart TD
    sessionStart(["session.start · chore"]) --> stage0["Stage 0 · resolve scope"]
    stage0 --> flowStart(["flow.start · chore"])
    flowStart --> spec["spec · service"]
    spec --> implement["implement · service"]
    implement --> validate["validate · service"]
    validate -->|failing| implement
    validate -->|green| dataPrepare(["data.prepare · chore"])
    dataPrepare --> appStart["app.start · service"]
    appStart --> qaRun["qa.run · service"]
    qaRun --> gate{"Personal Validation"}
    gate -->|approve| deliver["deliver · service"]
    gate -->|revise| implement
    gate -->|decline| stop(["Blocked · never a silent skip"])
    deliver --> verify["verify · service"]
    verify --> flowEnd(["flow.end · chore"])
```

- **The gate is the only place a run stops for a human, and configuration may only add more.**
  It sits before `deliver` and never inside it, so approval is a recorded decision rather than
  a step a provider can perform on its own behalf.
- `implement` and `validate` are the only cycle. It is bounded by the flow, not by the providers,
  which is why the two commonly bind to one provider and resolve their model per stage.
- `verify` is the last service, after `deliver`, and repairs nothing: the change set against the
  specification the run built on and the chapters it touches, one verdict per item, reported
  where the reviewer reads.
- **A point with no provider costs capability, not the run.** Unbound, `spec` is written inline
  and `deliver` produces file artifacts only; the run continues and says so once.
- Whether the surface renders any of this is resolved from the live tool list, and none
  answering is normal — the file artifacts are written either way.
- The documentation tier of flows runs the same picture without `implement`, `validate`,
  `data.prepare`, `app.start`, `qa.run`, and `verify`: gate, then `deliver`. The tier a bridge
  plugin's flow declares is its own, because the engine may not name a skill in a layer above
  it.
- An unattended run does not have this shape at the gate. It **parks** with a handoff brief and
  never self-approves, which is the boundary between a flow and a
  [fleet skill](08-crosscutting-concepts.md#fleet-skill).
