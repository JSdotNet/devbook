---
name: start
description: "Start this repository's application the way this repository says to, then open it. Use when: starting or running the app locally, 'start the app', 'run it and open it', resuming work on a branch, or a flow needs a runtime at app.start."
---

# Start the Application

Start the app from what this repository declares, not from a command guessed per session,
then open it. **Edit this file** — it is yours, and the sections below are a starting point,
not a contract. The engine only expects a skill named `start` to exist and to leave a
running application behind.

## Read the facts first

`.devbook/flow-context.md` holds the declared facts: `## How to Run`, `## Base URLs`,
`## Healthy Startup`, `## Test Credentials`. This file holds the procedure. When the two
disagree, the context file is right — fix it there, not here.

`**Runnable application:** none` under `## Application` means there is nothing to start.
Say so and stop.

## Run it

1. **Check whether it is already running** before starting a second copy — worktrees share
   ports. Reuse a running instance and say so.
2. **Run the declared command** in the background. Never substitute a different command when
   the declared one fails; report the failure.
3. **Wait for the declared readiness signal.** Stop waiting on a fatal error, or after two
   minutes of silence. Do not report a partially-started app as healthy.
4. **Open the front end.** Re-read the port every start — it changes. Use the host's inline
   browser when it has one; otherwise give the plain URL.

Report in a couple of lines: the command, the health verdict, the open URL. Leave the app
running — a flow's later stages validate against it.

## Sign in

<!-- Replace with this repository's local sign-in path, or delete the section. -->

- Follow the pointer in `## Test Credentials`. Never type a password, token, or key into a
  form yourself: open the page, name where the credential lives, and let the user sign in.

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
