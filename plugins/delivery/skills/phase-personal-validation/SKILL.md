---
name: phase-personal-validation
description: "Personal Validation handoff of flow-code and flow-spec: starts the app, publishes review links and demos, presents the results, never approves. flow-runner only."
---

# Phase: Personal Validation — The Review Handoff

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

**Does**

- Starts the app, publishes the review links and a short what-to-check list
- Lists every demo the change implements beside the app, opened where the chapters point
- Lists the screenshots of every scenario page Verify ran beside the review links
- Presents the review, QA and spec-check results
- Commits the change set when `commit.at` is `gate`
- Closes on one picture from Verify and the running app's URLs, then waits

**Doesn't**

- Approve, or let anything approve for you
- Take a phases entry
- Run without a person (it parks)

It answers one question for the person the run hands back to: *what do I open, and what am I
looking for?* The approve / revise / decline gate that follows belongs to the `flow-runner`
agent and to **The gate** in `resources/flow-phases.md` — the recorded decision, the commit
rule, and parking an unattended run live there. Nothing here can approve, skip, or soften it.

It runs inline in the owner session, so the links are clickable in the conversation the person
is reading, and again on every revise round: a revised change set is a new thing to look at, so
re-run the whole skill rather than pointing back at the previous handback.

## Step 1 — Make Sure It Is Actually Running

A link to a process that is not listening is worse than no link.

- **Reuse the instance Verify left running** when there is one. Start a second only after
  confirming the first is gone.
- **Otherwise start it** with the provider `phase-verify.app` names — the repository's `run`
  recipe when unset — or the command Verify proved this run. **Never hand the person a command
  to run themselves**: starting it is this phase's job.
- **Confirm health before publishing anything**, against the repository's `## Healthy`
  signals: the resources that must reach running, the health endpoints, the log lines that mean
  ready. Do not report its declared benign warnings as failures.
- **On a repeat pass, refresh over restart** where the repository's startup mode supports it,
  per **Reverifying After Requested Changes** in `skills/phase-verify/SKILL.md`. Record which
  one happened, and re-check the URLs — they move on a restart.
- **Startup failure blocks the phase.** Report the actual error and the recovery command; never
  hand back a review the person cannot perform.
- **Nothing to start** — a `flow-spec` run, or `phase-verify.app` set to `null` — skips the
  startup and the app's links, says so in one line, publishes a demo as Step 2 says, and goes
  to Step 3 over the changed files.

## Step 2 — Publish The Links

- **Both places, every time.** Pass them as `links` on the stage so the surface renders
  buttons, **and** write them as clickable URLs in the conversation.
- **Deep-link to what changed** — the route, page, or endpoint the change set touches, not the
  site root. **Then the supporting ones:** the runtime dashboard, the health endpoint, any second
  surface the change reaches.
- **The demo beside the app.** When the change implements a click demo — a `*.demo.html` under
  the change's `devbook-delta/`, or one the scoped chapters pair or name in their `demo` field
  — publish each by path next to the app link it shows, with every address those chapters
  name, walkthroughs included, each a `file:` URL ending in `#<id>` — the demo opens at that
  screen, state, or walkthrough. It opens from disk, so it needs no health check; report an
  address whose file is missing instead of publishing it.
- **The scenario screenshots beside the links.** For each page Verify ran, under the page's
  title and path, list each part with its outcome and the PNGs its `run.json` `shots` name for
  that part — a failed part adds its `failureShot` — each beside the app link of the screen it
  shows, so the person can hold the run against the live page. Name a page Verify recorded as
  not run, with its reason, instead of reusing an older run's images. They are files on disk,
  so they need no health check: link each as a `file:` URL, report one whose file is missing
  instead of linking it, and display them as **Show image evidence** in Step 4 says.
- **Label each one** with what it is for, in the person's terms.
- **Publish nothing unconfirmed.** Every URL here was reachable in Step 1.

## Step 3 — Say What To Check

When the `show-me` skill is available, write this step and Step 4 per that skill. A short
numbered list, each item naming **where to look, what to do, and what should happen.**

- **Derive it from the scope's acceptance criteria and the change set**, not from what QA
  already drove — QA's result is presented in Step 4.
- **Lead with what QA cannot judge** — layout, copy, spacing, tone, whether it is usable at all.
- **Against the demo, when there is one**: per screen and walkthrough, open the demo's address
  and the app's page side by side, and name what must match — the screens, the states, the
  copy, the path. The demo is the agreed reference; a difference is a finding, never a taste.
- **Against the scenario screenshots, when there are some**: per part, the screenshot and the
  app's screen it was taken on, and what the part's **Then** steps say should be visible.
- **Name the non-obvious blast radius**: a migration that ran, a changed default, a shared
  component another screen also uses.
- **Keep it to a few minutes.** What will not fit belongs in the automated suite.
- **For a `flow-spec` run, or a chapter Spec Check edited**, list the chapters by path and the
  specific claim in each one to read for.

## Step 4 — Present The Results

In this order:

1. **The ready check's open items**, when it handed the run over with its budget spent — every
   one, first, with what recorded it. Then its questions: the `code-ahead` and `unresolved`
   Spec Check rows.
2. **The code review**: `review.md` from `phase-review` — blockers open, blockers fixed,
   advisories, each with its citation. When review was off or did not run, say so.
3. **The QA review** when Verify ran: the scenarios in order, each with its pass/fail and its
   evidence, then the monitoring findings. When it was skipped, say so and why — never imply a
   result that was not produced.
4. **The spec-check table** from `phase-spec-check`, and every chapter it edited, listed beside
   the code. A rejected chapter edit reopens Spec Check, per **The gate**.

**Show image evidence; never only list it.** Display every screenshot, and every frame of a
per-step sequence, inline under its scenario's pass/fail, through whatever file or image display
the host offers — reading an image into your own context shows the person nothing. Only when the
host cannot display images, give each path as a clickable link and say once why. A video, a
trace, or a log extract stays a clickable path.

## Step 5 — Commit

When `policy.commit.at` is `gate`, commit the change set before handing back, per **The gate**
in `resources/flow-phases.md`, and report the result; under `manual`, commit nothing. In an
unattended run there is no one to hand back to: park per **The gate**, `approval` left
`pending`, and skip Step 6.

## Step 6 — Close On The App, Then Hand Back

The person reads the end of the reply first and scrolls least, so the reply ends here. Write
this block **after everything else** — results, commit report, any wrap-up or status text —
so nothing pushes it out of view, and repeat it on every revise round.

1. **One picture from Verify**, displayed inline per **Show image evidence**: the screenshot of
   the screen the change touches most, or a failed part's `failureShot` when one failed. Under
   it, one line naming the scenario, part, and outcome it shows. When Verify took no
   screenshot — skipped, startup-only, nothing to start — say so in one line instead.
2. **The running app's URLs**, as clickable labelled links, each one confirmed in Step 1: the
   deep link to what changed first, then the dashboard, the health endpoint, and any second
   surface. Nothing to start: say in one line that no app is running.

Then stop and wait for the gate.

## Dashboard Reporting

Report as the `Personal Validation` stage via the **Reporting Contract** in
`resources/surface-contract.md`, passing `links` for the started application and every review
target. The flow-runner owns the `approval` values recorded with `set_run_context`.
