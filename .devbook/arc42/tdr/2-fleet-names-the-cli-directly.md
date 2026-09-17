# 2. fleet Names the Claude CLI Directly

```meta
date: 2026-09-03
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/domain/plugin-authoring/domain.md#host-slot", ".devbook/arc42/adr/hosts.md", ".devbook/arc42/adr/plugin-boundaries.md", ".devbook/tech/hosts.md#claude-code-cli"]
```

**Remediation state:** identified · **Severity:** medium · **Owner:** the maintainer

## The debt

```meta
```

`fleet-issue-sweep` launches each worker with `claude --bg`, tracks them with `claude agents`,
and runs its resolution stages through the `Workflow` tool.

That breaks a rule this repository has already written down, and the rule has since
tightened. The host profiles were the one place a host's own file, path, or capability could
be named; [they are gone](../adr/hosts.md), so no
asset here may name one. `fleet` still does.

## Origin

```meta
```

It was taken knowingly, in the change that extracted `fleet` into its own plugin, because
resolving it cost more than that change was allowed to spend.

The earlier reasoning for naming the CLI outright — that a slot generalises a divergence that
has happened twice, and this one had happened once — no longer holds. Removing the host
profiles closed the one address a host fact was allowed to have, which leaves this the only
asset in the marketplace still carrying one.

## Affected components

```meta
```

`fleet`, and through the fix, `delivery`. The slot set is closed and **declared by the
engine**, so the remedy is a contract change in `delivery` alone — one plugin and a version
bump. Removing the host profiles made this cheaper, not harder: there is no second and third
answer left to write.

## Impact

```meta
```

**On a host that cannot launch a background session, a sweep dispatches nothing.** It still
triages, marks the pickup pool, proposes closures, and reports what it would have dispatched,
so the degradation is visible rather than silent — but the parallelism is the whole point of
the skill, and it is gone.

The sharper cost is that nothing says so. `fleet` is a Claude-only plugin whose manifest
declares no such thing, and it ships a Copilot manifest, so Copilot will install it and the
user finds out when a sweep triages and dispatches nothing.

## Remediation options

```meta
```

| Option | Trade-off |
| --- | --- |
| Add a seventh host slot, `session-spawn` — declared by `delivery` and answered from the live session the way `stage-delegation` already is, unbound where no background session can be launched | The right fix, and not a redesign. The precedent is already here: every slot has a documented unbound behaviour, and "a sweep that triages and reports but dispatches nothing" is exactly that shape of default. Costs a contract change in one plugin and a version bump |
| Say in `fleet`'s README and manifest description that it is Claude-only, and drop its Copilot manifest | Cheap, honest, and stops the silent install. But it widens the rule instead of keeping it — a plugin naming a host directly becomes permitted rather than owed |
| Leave it | Every further host-specific reach in `fleet` becomes easier to justify by precedent |

Close this by adding the slot, not by widening the rule. The second option is worth taking
*alongside* the first if the slot is deferred again, because it costs nothing and removes the
silent failure.

**Trigger:** before `fleet` is offered to a Copilot user, or the next time the engine's slot
set is opened for any other reason — whichever comes first.
