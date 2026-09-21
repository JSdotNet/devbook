# Devbook Procedures

```meta
index: root
type: context
related: [".devbook/domain/context-map.md#devbook-procedures", ".devbook/domain/devbook/context.md#dependencies", ".devbook/arc42/adr/plugin-boundaries.md", ".devbook/arc42/adr/install.md"]
```

What this context is responsible for: that a repository has, by name, the four procedures
every repository has and no plugin can write — `start`, how its application comes up;
`show`, how the feature being built is put in front of a reviewer; `capture`, how evidence is
taken; `debug`, how a cause is found inside the running application — and that each one's
goal reads the same in every repository while how it is done never does.

Inside the boundary: the four seeds and their goals, the wrapper per host that carries a
goal, the install that puts them in a repository and records which were adopted, and the
rule that a body is the repository's from its first edit.

Outside it: everything a procedure is *for*. The engine's Validation phase says what it does
with evidence and when capture is required; a session that wants a demo invokes `show`; none
of that is this context's. It owns no flow, no gate, and no state beyond its stamp.

## Dependencies

What this context depends on and who depends on it. It is an L1 extension: exactly one
declared dependency, on the convention whose reconcile protocol it follows.

### Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| [Devbook](../devbook/context.md#dependencies) | Customer-Supplier, declared `devbook >=1.0.0 <2.0.0` | Follows `assets/reconcile-protocol.md` — the stamp's two shared fields, the hash rules, the plan-before-write phase — and stamps `components.devbook-procedures` | The protocol's **The stamp** section | It copies files and records hashes exactly the way devbook's rules land, and invents no second way. |
| Plugin Authoring | Shared Kernel | Plugin folder, two manifests, the seeds under `assets/skills/`, the stamp | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | It is packaged, installed, and stamped like every other plugin here. |
| Claude Code and Copilot Plugin APIs | Conformist | Manifests, one install skill, the hook pair, and the skill wrappers its install writes | Each host's own skill schema | A skill is reached by name only through a folder the host scans, which is what the wrapper is for. |
| A consuming repository | Customer-Supplier, this context supplying | `devbook-procedures:install` materializes `.agents/skills/<name>.md` and a wrapper per host for each adopted name; `components.devbook-procedures` records `adopted` and every hash | The seed's `goal`, rendered into the wrapper | The body is the repository's from its first edit; only the goal is refreshed. |

### Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| [Delivery](../delivery/context.md#dependencies) | Separate Ways | Names `start` at its `app.start` point and `capture` inside Validation, and reads `.agents/skills/<name>.md` when the flow-runner finds it | The skill names and the path — never this plugin | Nothing: a repository may hand-write both, and a flow that finds one absent does without and says so. |
| [Devbook Config](../devbook-config/context.md#dependencies) | Conformist, read-only | Reads `components.devbook-procedures`, invokes the install during setup and a fan-out, and answers its adoption question from the engine keys it just wrote | The stamp shape and the install skill's name | That the stamp exists and keeps its shape; it writes none of it. |
| Any session, either host | Conformist | Invokes `start`, `show`, `capture`, or `debug` by name | The goal in the wrapper | That the goal holds whatever the body says. |

### Notes

- **The goal is the seam.** Every procedure's body differs per repository; the one sentence
  that does not is what a caller may rely on, and it lives in the file the plugin keeps
  rewriting rather than the one the repository owns.
- **Nothing below names this context.** The engine names two skill names and a path; a
  repository that never enables this plugin and writes both by hand is indistinguishable to
  it. That is what lets this context sit over `devbook` without the engine following it.
