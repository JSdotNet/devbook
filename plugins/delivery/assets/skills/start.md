---
name: start
description: "Start this repository's application the way this repository says to, then open it. Use when: starting or running the app locally, 'start the app', 'run it and open it', resuming work on a branch, or a flow needs a runtime at app.start."
---

# Start the Application

Start the app from what this file declares, not from a command guessed per session, then
open it. **Edit this file** — it is yours: the facts are examples to replace, the procedure a
starting point rather than a contract. The engine only expects a skill named `start` to exist
and to leave a running application behind, and it names this file to whichever provider fills
`app.start` and to Validation as the repository's declared runtime facts.

A repository with nothing to start binds `extensions.app.start` to `null` in
`.devbook/config.json` instead of keeping this file.

## Run

<!-- The command, where it runs from, and what it needs. Replace the example. -->

```bash
aspire start
```

- From the repository root; needs the .NET SDK and a running container runtime.
- AppHost: `src/Orders.AppHost/Orders.AppHost.csproj`

1. **Check whether it is already running** before starting a second copy — worktrees share
   ports. Reuse a running instance and say so.
2. **Run the declared command** in the background. Never substitute a different command when
   the declared one fails; report the failure.
3. **Wait for the signals under Healthy.** Stop waiting on a fatal error, or after two
   minutes of silence. Do not report a partially-started app as healthy.
4. **Open the front end** from the table under Open. Re-read the port every start — it
   changes. Use the host's inline browser when it has one; otherwise give the plain URL.

Report in a couple of lines: the command, the health verdict, the open URL. Leave the app
running — a flow's later stages validate against it.

## Healthy

<!-- What a good start looks like, and which warnings are known and benign. -->

- Every AppHost resource reaches `Running`; the database resource reports `Healthy`.
- `GET /health` on the API returns `200`.
- Benign: one `Detected container runtime restart` warning on first start.

## Open

<!-- The entry points a stage validates against. -->

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

## Go to

<!-- Area — route — the source path it owns. Used to land on what the current branch changes.
     Replace these rows; delete the section if the app has one entry point. -->

| Area | Route | Owns |
| --- | --- | --- |
| _example_ | `/orders` | `src/Orders.Web/Pages/Orders/` |

Match `git diff --name-only` against the `Owns` column and open the first area that hits.

## Never

- Restart a running instance without saying so.
- Run destructive setup — a database drop, a volume prune, `git clean` — as part of starting.
  Propose it instead.
- Put a secret in this file. It is committed.
