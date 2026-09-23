# devbook-procedures

The four procedures every repository has and no plugin can write. One product runs
`aspire start`, the next `docker compose up`; one has tracing, the next has screenshots; one is
debugged from an Aspire dashboard, the next from a browser console. What never varies is what
each procedure is *for*. So this plugin fixes the goal and seeds the procedure:

| Procedure | Goal, fixed by the plugin | The repository owns |
|---|---|---|
| `start` | Leave the application running and healthy; report the command, the health verdict, the entry points | the command, the readiness signals, the entry points, the credential pointer |
| `show` | Put the feature on this branch in front of a reviewer: running through `start`, opened at what the branch changes, walked, every step evidenced through `capture` | the branch-to-area map, the walk, the report |
| `capture` | Return evidence a reviewer can open: one file per checkpoint and per failure, paths under the worktree root, the form named honestly | the layout, the naming, the tooling |
| `debug` | Name the cause of an observed issue and prove it — a log line, a trace span, a breakpoint's state — without handing the person a debugger, and leave nothing behind in the change | where the logs live, which debugger reaches the app, how a reproduction is set up |

Each lands as one editable copy under `.agents/skills/<name>.md` with a managed wrapper per
host that carries the goal. Edit the copy and it is yours: its hash matches no release, so
every later reconcile reports it and leaves it alone. The wrappers are refreshed on every
upgrade, so the goal and the text a host routes on stay the plugin's.
[assets/skill-wrappers.md](assets/skill-wrappers.md) has the shape.

An L1 extension: it depends on `devbook` — whose reconcile protocol and stamp it follows —
and nothing else. It names no engine. A flow engine that wants a runtime or evidence names
the skill `start` or `capture` and finds it or does without; a session without one invokes
`show` or `debug` by name like any other skill.

## Installation

```bash
claude plugin marketplace add JSdotNet/devbook
```

Then enable `devbook-procedures` with `/plugin` and run `devbook-procedures:init` in the
repository. It asks which of the four to adopt on the first run and records the answer as
`components.devbook-procedures.adopted` in `.devbook/config.json`; a repository with nothing
to start adopts neither `start`, `show`, nor `debug`, and one that takes no evidence adopts
neither `capture` nor `show`.

## What it ships

| Part | What it is |
|---|---|
| `assets/skills/<name>.md` | The four seeds: `name`, `description`, and `goal` in the frontmatter, an example-filled procedure below |
| `assets/skill-wrappers.md` | How a seed lands: one editable copy, a managed wrapper per host, and where the goal sits |
| `hooks/` | A session-start pointer: invoke the repository's procedure skill rather than guessing a command, a URL, or a layout |

## Skills

| Skill | What it does |
|---|---|
| `init` | Materializes the adopted procedures and their wrappers and stamps `components.devbook-procedures` in `.devbook/config.json`. Refused where that stamp exists. Payload-only: no contract version and no migration ledger, per devbook's `assets/reconcile-protocol.md` |
| `update` | Refreshes the wrappers and every unedited body, seeds a newly adopted procedure, orphans a dropped one, and re-stamps. Refused where no stamp exists. Idempotent — an upgrade, a changed seed, and a changed adoption are one run |

## The line

- **The goal is the plugin's; the procedure is the repository's.** A wrapper is rewritten on
  every upgrade; a procedure is never overwritten once its hash stops matching a release.
- **Nothing depends on a procedure.** A caller that names `start` or `capture` and finds it
  absent does without and says so. `show` composes `start` and `capture` by name and stops
  when either is missing.
- **A present file that was never stamped here is asked about, once.** A repository whose
  `start` or `capture` arrived from an earlier seed keeps it as its own or takes the new seed;
  the wrapper is replaced either way.

## License

MIT
