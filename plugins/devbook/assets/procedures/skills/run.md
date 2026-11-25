---
name: run
description: "Build and launch this repository's application the way this repository says to, and leave it running. Use when: running or starting the app locally, 'run it', 'start the app', resuming work on a branch, or a flow's verify phase needs the application running."
goal: "Leave this repository's application running and healthy, and report the command that started it, the health verdict, and its entry points. Never hand the person a command to run themselves."
---

# Run the Application

Build and launch the app from what this file declares, not from a command guessed per
session. **Edit this file** — it is yours: the facts are examples to replace, the procedure a
starting point. Whoever invokes `run` expects only what the goal says: a running application
and the three facts reported.

This is the seed a host without Claude Code's `/run-skill-generator` lands at
`.claude/skills/run-<id>/SKILL.md`. Where the generator ran, its recipe is this file instead;
keep `## Healthy` and `## Entry points` in it either way — a flow's validation reads them.

## Setup

<!-- What a clean checkout needs before the first launch. Replace the example. -->

- The .NET SDK named in `global.json` and a running container runtime.
- `dotnet restore` from the repository root.
- Environment: none beyond the AppHost's own user secrets.

## Launch

<!-- The command, where it runs from. Replace the example. -->

```bash
aspire start --format json
```

- From the repository root. AppHost: `src/Orders.AppHost/Orders.AppHost.csproj`
- Aspire 17 detaches on its own and returns when the AppHost is up: one JSON object with
  `appHostPath`, `appHostPid`, `cliPid`, `dashboardUrl` (login token included), and `logFile`.
  It names no resource URL and writes no file into the repository. `--isolated` randomizes the
  ports, so two worktrees can run side by side.

1. **Check whether it is already running** before starting a second copy — worktrees share
   ports. `aspire ps --format json` lists each running AppHost by `appHostPath`. Reuse a running
   instance and say so: `aspire start` on an AppHost already running stops it and starts anew.
2. **Run the declared command.** Never substitute a different command when the declared one
   fails; report the failure and the `logFile` it names.
3. **Wait for the signals under Healthy** — `aspire wait <resource>` blocks until the resource
   reports healthy, 120 seconds by default. Do not report a partially-started app as healthy.
4. **Re-read the entry points** every launch — a port changes. `aspire describe <resource>
   --format json` lists a resource's `urls`.

Report in a couple of lines: the command, the health verdict, the entry points. Leave the app
running — `diagnose` and a flow's later stages work against it.

## Healthy

<!-- What a good start looks like, and which warnings are known and benign. -->

- Every AppHost resource reaches `Running`; the database resource reports `Healthy`.
- `GET /health` on the API returns `200`.
- Benign: one `Detected container runtime restart` warning on first start.

## Entry points

<!-- What a person opens and a stage validates against. -->

| Entry point | URL |
| --- | --- |
| Aspire dashboard | `https://localhost:17090` |
| Web front end | `https://localhost:7080` |
| API | `https://localhost:7081/api` |

## Sign in

<!-- A pointer only — where the credential lives, never its value. Delete if there is no sign-in. -->

- Local development uses the seeded `qa@example.test` account; its password is the
  `ORDERS_QA_PASSWORD` environment variable, provisioned from the team's secret store.
- Never type a password, token, or key into a form yourself: open the page, name where the
  credential lives, and let the user sign in.

## Stop

<!-- How to stop this checkout's application and nothing else. -->

- `aspire stop --apphost src/Orders.AppHost/Orders.AppHost.csproj` from this worktree's root.
  Name the AppHost, so the stop reaches this checkout's instance and no other.

## Never

- Restart a running instance without saying so.
- Run destructive setup — a database drop, a volume prune, `git clean` — as part of running.
  Propose it instead.
- Put a secret in this file. It is committed.
