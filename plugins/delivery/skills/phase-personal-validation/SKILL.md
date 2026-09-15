---
name: phase-personal-validation
description: 'Shared Personal Validation review handoff for every flow-* flow. Brings the application up, publishes the review links as clickable URLs, and says what to check by hand. Runs again on every revise round. It presents and never decides — the mandatory approval gate stays with the flow-runner. Invoked by the flow-runner agent.'
---

# Phase: Personal Validation — The Review Handoff

Reusable **Personal Validation** handoff shared by every `flow-*` flow. It answers one
question for the person the run hands back to: *what do I open, and what am I looking for?*

**This skill presents; it never decides.** It brings the app up, publishes the links, and
writes the check list. The approve / revise / decline gate that follows it belongs to the
`flow-runner` agent and to `resources/flow-phases.md`, which is where the recorded decision,
the commit rule, and the unattended-run behaviour live. Nothing here can approve, skip, or
soften that gate.

## When To Run

- **Every tier**, after Spec Verification for code-modifying flows and after the flow's own
  stages for documentation/config flows.
- **Again on every revise round.** A revised change set is a new thing to look at: re-run
  this whole skill rather than pointing back at the previous handback. The gate re-opens with
  `approval: "pending"` either way.
- **Inline, in the owner session.** No agent and no model — the links have to be clickable in
  the conversation the person is reading, and a sub-agent has no user turn to hand back to.

## Step 1 — Make Sure It Is Actually Running

A link to a process that is not listening is worse than no link.

- **Reuse the instance QA Validation left running** when there is one. Start a second only
  after confirming the first is gone.
- **Otherwise start it** with the `app.start` service — the repository's `start` skill when
  that is the provider — or the command QA proved this run. **Never hand the person a
  command to run themselves** — starting it is
  this phase's job, and stopping at a command list is a failed handback, not a shortcut.
- **Confirm health before publishing anything**, against the repository's
  `## Healthy Startup` signals: the resources that must reach running, the health endpoints,
  the log lines that mean ready. Do not report its declared benign warnings as failures.
- **On a repeat pass, refresh over restart** where the repository's startup mode supports it,
  per **Revalidation After Requested Changes** in `skills/phase-qa-validation/SKILL.md`.
  Record which one happened, and re-check the URLs — they move on a restart.
- **Startup failure blocks the phase.** Report the actual error and the recovery command;
  never hand back a review the person cannot perform.
- **Nothing to start** — a documentation/config flow, or a repository binding
  `extensions.app.start` to `null` — skips the startup and the links, says so in one line,
  and goes to Step 3 over the changed files.

## Step 2 — Publish The Links

- **Both places, every time.** Pass them as `links` on the stage so the surface renders
  buttons, **and** write them as clickable URLs in the conversation. A surface is never a
  dependency, and the person is reading the session either way.
- **Deep-link to what changed.** The route, page, or endpoint the change set touches — not
  the site root, which makes the person navigate to find it.
- **Then the supporting ones:** the runtime dashboard, the health endpoint, and any second
  surface the change reaches (an admin view, an API doc page, a queue UI).
- **Label each one** with what it is for, in the person's terms. A bare URL list is a
  navigation puzzle.
- **Publish nothing unconfirmed.** Every URL here was reachable in Step 1.

## Step 3 — Say What To Check

The part no automated stage produces. A short numbered list, each item naming **where to
look, what to do, and what should happen.**

- **Derive it from the run's acceptance criteria and change set**, not from what QA already
  drove. QA's result is presented in Step 4; repeating it as homework wastes the one review a
  person actually performs.
- **Lead with what QA cannot judge** — layout, copy, spacing, tone, whether the thing is
  usable at all. Assertions are the suite's job; judgement is why this gate exists.
- **Name the non-obvious blast radius**: a migration that ran, a changed default, a shared
  component this change touched that another screen also uses.
- **Keep it to what fits in a few minutes.** A twenty-item list gets skimmed and approved.
  If it will not fit, the rest belongs in the automated suite, not in this list.
- **For a documentation/config flow**, list the chapters by path and the specific claim in
  each one to read for.

## Step 4 — Present The Reviews

- **The code review** of the change set, for the person to read.
- **The recorded QA review** when QA Validation ran: scenarios with pass/fail, monitoring
  findings, and the captured evidence paths. When it was skipped, say so and why — never
  imply a result that was not produced.
- **The spec verdict** when Spec Verification ran: the table, one row per item, with the
  `spec-ahead` and `conflict` rows first — those are what a revise decision acts on. When it
  was skipped, say so and why.

Then stop. Hand control back and wait. The decision, its recording, and everything downstream
of it are the gate's, in `resources/flow-phases.md`.

## Inputs

- The change set, the run's scope and acceptance criteria, and the change kind.
- The QA result and evidence from `phase-qa-validation`, when that phase ran.
- The verdict table from Spec Verification, when that phase ran.
- The `app.start` result — base URLs and health verdict — and the path of the repository's
  `start` skill when the flow-runner found one.

## Outputs

- A running application with confirmed health, or a `blocked` result naming the startup
  failure and the recovery command, or a recorded reason there was nothing to start.
- The labelled review links, in the stage's `links` and in the conversation.
- The what-to-check list, the code review, the QA review, and the spec verdict.

## Dashboard Reporting

- Report as the `Personal Validation` stage via the shared **Reporting Contract** in
  `resources/surface-contract.md`, passing `links` for the started application and every
  review target. The flow-runner owns the `approval` values recorded with `set_run_context`.

## Agents

- **None.** This phase uses no agent and no model. Do not delegate it, and do not let a
  provider perform it on the run's behalf.

## Reference

Gate contract and the recorded decision: `resources/flow-phases.md`.
Runtime facts: the repository's `start` skill, seeded from `assets/skills/start.md`.
Revalidation on a repeat pass: `skills/phase-qa-validation/SKILL.md`.
