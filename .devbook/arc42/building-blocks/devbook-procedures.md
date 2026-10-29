# devbook-procedures

```meta
related: [".devbook/arc42/building-blocks/devbook.md", ".devbook/arc42/building-blocks/README.md", ".devbook/arc42/adr/demos.md", ".devbook/arc42/12-glossary.md#prototype"]
c4: ["marketplace.devbook.procedure", "marketplace.devbook.goal", "marketplace.devbook.demo-template"]
code: ["plugins/devbook/assets/procedures"]
```

The procedures part of [devbook](devbook.md), a block inside it. Responsible for one thing:
that every repository has the five things it knows how to do and no plugin can write — `run`,
`capture`, `diagnose`, `estimate`, `prototype` — each with a goal this block fixes and a body
the repository owns.

Inside the block: the five seeds and the goal each carries, and the starting demo template
`prototype` builds on.

Outside it: the reconcile that materializes a seed into a repository, which is
[devbook](devbook.md#reconciler)'s and stamps each file under `components.devbook`; the
demo file and the rules its check enforces, which are devbook's [Demo](devbook.md#demo); and
the flows that start an application or take evidence through these procedures, which are
[delivery-phases](delivery-phases.md#phase-verify)'s.

## Interfaces

```meta
related: [".devbook/arc42/building-blocks/devbook.md#interfaces", ".devbook/arc42/building-blocks/devbook.md#init", ".devbook/arc42/building-blocks/devbook.md#update"]
```

Five seeds and one asset, each reached in a repository through the copy `init` or `update`
materialized, never from the plugin.

| Interface | Kind | Reached by |
| --- | --- | --- |
| `run`, `capture`, `diagnose`, `estimate`, `prototype` | seeds under `assets/procedures/skills/`, each with a `goal` | Materialized by `init` and `update` into `.agents/skills/<name>.md` with a wrapper per host — `run` as a `.claude/skills/run-<name>/SKILL.md` recipe with a Copilot twin; then any session, either host, by name |
| `assets/procedures/demo-template.html` | the starting demo template | `prototype`, through the repository's copy at `.devbook/design/demo-template.html`; the sample beside it, by spec-manager and Backlog as a test fixture |

## Structure

```meta
related: [".devbook/arc42/building-blocks/devbook.md#structure"]
```

The procedure, the goal that is its seam, and the template a demo starts from.

![devbook-procedures' components](c4:devbook-procedures)

### Procedure

```meta
related: [".devbook/arc42/building-blocks/devbook-procedures.md#goal", ".devbook/arc42/building-blocks/devbook.md#init", ".devbook/arc42/08-crosscutting-concepts.md#plugin-rule"]
```

Also called: procedure skill, repository skill, seeded skill.

One of five named things a repository knows how to do and a plugin cannot: `run`,
`capture`, `diagnose`, `estimate`, `prototype`. In a repository it is three files — the body at
`.agents/skills/<name>.md`, and a wrapper per host at `.claude/skills/<name>/SKILL.md` and
`.github/skills/<name>/SKILL.md` — and one stamp entry per file under
`components.devbook.materialized`. The body is seeded once and is the repository's
from its first edit: a hash matching no shipped release marks it `managed: false`, reported on
every reconcile and never overwritten. The wrappers stay managed. A name in the stamp's
`procedures.adopted` list is a procedure the repository has; one dropped from the list orphans its three
files, reported and never deleted.

`run` is two files. Claude Code ships a `run` skill that follows a project recipe at
`.claude/skills/run-<name>/SKILL.md`, which its `/run-skill-generator` records, so that recipe
is the body — the generator's, or the `run` seed where no host can run it — stamped
`managed: false` from the moment it lands, and Claude Code's own `run` is its Claude wrapper.
Copilot's twin at `.github/skills/run/SKILL.md` carries the goal and points at every recipe.
One name reaches it on both hosts. `migrations/001-start-is-run/` moves a `start` procedure
into that shape.

No procedure shares a name with a command or skill a host bundles: a project skill replaces
the host's own of the same name. `diagnose` was `debug` until it was found to hide Claude
Code's `/debug`; `migrations/002-debug-is-diagnose/` renames it.

None is a dependency of anything; `diagnose` invokes `run` by name. `show`, which walked
the branch's feature for a reviewer through `run` and `capture`, was removed because no flow
invoked it; `migrations/003-show-removed/` takes it out of a repository.

| Invariant | Enforced at | Evidence |
| --- | --- | --- |
| A procedure is three files — the body and one wrapper per host — with one stamp entry each | `init`, `update` | untested |
| A body whose hash matches no shipped release is marked `managed: false`, reported on every reconcile and never overwritten | `init`, `update` | untested |
| The wrappers stay managed whatever the body's state | `init`, `update` | untested |
| A name dropped from `adopted` orphans its three files, reported and never deleted | `init`, `update` | untested |
| `run`'s body is a `.claude/skills/run-<name>/SKILL.md` recipe, never written after it lands, and Copilot's twin points at every one | `init`, `update`, `tools/check-assets.mjs` | `check-assets` over this repository |
| No procedure other than `run` takes the name of a command or skill a host bundles | the seeds under `assets/procedures/skills/` | untested |

### Goal

```meta
related: [".devbook/arc42/building-blocks/devbook-procedures.md#procedure", ".devbook/arc42/08-crosscutting-concepts.md#published-languages", ".devbook/arc42/adr/demos.md", ".devbook/arc42/12-glossary.md#prototype"]
```

The one sentence a procedure must satisfy whatever its body says: what a caller gets back.
`run` leaves the application running and reports the command, the health verdict, and the
entry points; `capture` returns one file per checkpoint and per failure, under the worktree root, the
form named honestly; `diagnose` names a cause and proves it, doing the debugging itself and
leaving nothing behind; `estimate` returns story points off 1/2/3/5/8/13/21 per unit of work,
sized against the repository's own finished work and naming the reference compared with, so
that a pace measured in points means the same across plans; `prototype` starts only from a
design question stated in one sentence, writes that sentence into the file's `demo-meta` as its
`question`, and ends with a one-line answer for whoever asked, never recorded in the file, which
carries no stage, status, verdict, or page. It delivers one standalone HTML file, everything
inline and nothing fetched: a logic question as a model anyone can drive through a state panel
labelled in the ubiquitous language, free play, and walkthroughs; a UI one as two or more
structurally different variants on the repository's demo template, its managed region kept and
no script outside it but `demo-model` and `demo-meta`, in its design system, with the guideline,
token, or story each came from. Given an existing demo it returns the revision with every
surviving screen id and anchor kept. The prototype is never merged: it writes into no
`.devbook/` folder and changes no source file, and the answer reaches the devbook only through
a change. It is the `goal` field of the
seed, rendered into both wrappers above the pointer, and refreshed on every upgrade.
A repository edits the body to meet it and never edits it.

`prototype` is the only writer of a demo outside the template's managed region, per the
[demos record](../adr/demos.md). Its file
stays a standalone prototype until its author carries it into `domain/`, in a `flow-spec` pull
request or an OpenSpec proposal, and a
prototype nobody takes further stays where it is as evidence. A UI prototype is promoted with
exactly one variant. A logic prototype never is, because it is code, and its answer lands as a
delta to `domain.md` or an invariants subpage. The seed's body carries the rest of
the record: variants trimmed to the chosen one only when the file is carried into `domain/`, walkthroughs
listed in `demo-model` by id — the scenario's slug when a free one plays a case, a journey
part's step text re-copied into a linked one on every revision — data at real density,
the 500 KB target kept with inline SVG, shared markup, and page demos and allowed to be exceeded,
and the two things it is not for: a settled design goes to `flow-code`, a bug to `diagnose`.

| Invariant | Enforced at | Evidence |
| --- | --- | --- |
| Every seed carries a `goal`, rendered into both wrappers above the pointer | `init`, `update` | untested |
| A goal is refreshed on every upgrade, so a repository meets it by editing the body and never the goal | `init`, `update` | untested |

### Demo Template

```meta
related: [".devbook/arc42/adr/demos.md", ".devbook/arc42/building-blocks/devbook.md#demo", ".devbook/arc42/building-blocks/devbook-procedures.md#goal"]
```

The starting template every demo is built on, shipped as `assets/procedures/demo-template.html`. Where
`prototype` is adopted and the `design/` folder is too, `init` and `update` seed it at
`.devbook/design/demo-template.html`, where the repository makes it its own through
`flow-spec`; without `design/` they say so and skip it. Like a body, it is refreshed only while
it still hashes to a shipped release, and once edited it is the repository's. It is one HTML file. Between `<!-- template:begin hash=… -->` and
`<!-- template:end -->` sits the managed region: the design-token styles, the app shell, the
control panel, and the one script a demo carries. The rest of the file is the demo's own: its
screens in `main[data-demo-app]`, its `demo-model`, and its `demo-meta`. The comment that opens
the region is the authoring reference for both.

The hash is `sha256:` over the region's text between the two markers, every CRLF read as LF,
spelled as the reconcile protocol spells a file's. The panel reads it back from the marker and
sends it as the template version in `demo:ready`, so a host and a later check tell one release
of the region from another without a version number of their own.

The panel jumps to any screen or state, plays walkthroughs with their scenario lines beside the
screen, switches role, flags, settings, viewport, and, while there are two or more, variants,
and shows the pins a host sends. Its script implements the four messages of
`resources/demo-address.md`. It is dark, monospaced, and hazard-striped, so nobody takes it for
the product.

`assets/procedures/demo-sample/features.demo.html` is a demo built on it: an ordering context's screens at
real density with one walkthrough, `a-declined-card-keeps-the-basket`. spec-manager and
Backlog test against it.

| Invariant | Enforced at | Evidence |
| --- | --- | --- |
| The region's begin marker carries the hash of the region | the asset | `unit:node:plugins/devbook/tools/devbook-meta/demo-template.test.mjs` |
| The sample holds the template's region byte for byte, and its `demo-model` and screens list each other exactly | the asset | `unit:node:plugins/devbook/tools/devbook-meta/demo-template.test.mjs` |
| No script sits outside the region except `demo-model` and `demo-meta`, and nothing is fetched | the asset | `unit:node:plugins/devbook/tools/devbook-meta/demo-template.test.mjs` |
| The template lands only where `prototype` and `design` are both adopted, and is refreshed only while it hashes to a shipped release | `init`, `update` | untested |

## Dependencies

```meta
related: [".devbook/arc42/building-blocks/devbook.md#dependencies"]
```

Part of devbook's L0 foundation: nothing here is a dependency of anything, and `diagnose`
invoking `run` by name is the only reach between the five.

### Outbound

```meta
```

| Depends on | Pattern | Mechanism | Contract | Why |
| --- | --- | --- | --- | --- |
| [devbook](devbook.md#reconciler) | Shared Kernel, its parent | `init` and `update` seed each body, rewrite each wrapper, and stamp every file | The reconcile protocol and `procedures.adopted` | A seed is payload, and devbook's reconcile is the only writer of payload in a repository. |

### Inbound

```meta
```

| Consumer | Pattern | Mechanism | Contract | What it relies on |
| --- | --- | --- | --- | --- |
| [delivery](delivery.md#dependencies) | Separate Ways | Names `run` and `capture` in its verify phase, and reads `.claude/skills/run-<name>/SKILL.md` and `.agents/skills/capture.md` when the flow-runner finds them | The skill names and the path — never this block | Nothing: a repository may hand-write both, and a flow that finds one absent does without and says so. |
| Any session, either host | Conformist | Invokes `run`, `capture`, `diagnose`, `estimate`, or `prototype` by name | The goal in the wrapper | That the goal holds whatever the body says. |

**A procedure's goal is the seam.** Every procedure's body differs per repository; the one
sentence that does not is what a caller may rely on, and it lives in the wrapper devbook
keeps rewriting rather than the body the repository owns. The engine names two skill names
and a path, so a repository that writes both by hand is indistinguishable to it, and the
engine never follows this block for them.

