---
name: push-branch
description: "Push the current branch to its remote and stop there — no pull request. Use when: pushing a branch, publishing local commits, setting the upstream for a new branch, or getting commits onto the remote so CI runs."
---

# Push Branch

Open the reply with `delivery@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

## Purpose

Get the current branch and its commits onto the remote, and nothing more — to back up work,
to trigger CI, or because a pull request already exists and only needs the new commits.

## Pull Request Lane

The push is git alone and never needs the lane. The pull-request status in step 5 is one
spelling of the `pr-lane` slot, per `resources/engine-contract.md`: resolve it, and when it is
unbound or unauthenticated skip that step and say so once. Never fail on a missing binary.

## Inputs

- None required. Everything is read from the repository.
- Optional: the remote name (default: `origin`).

## Hard Constraints

- Never create, update, or publish a pull request. This skill pushes and stops.
- Never force-push. If the remote has diverged, stop and hand off to `update-pr-branch`.
- Never commit, amend, stash, or rebase on the user's behalf without being asked.
- Never push secrets, `.env` files, or local settings — inspect the outgoing diff first.
- Never push to the default branch without explicit user confirmation.

## Workflow

### 1 — Check the branch

- If the branch is the repository default branch (`main`, `master`), say so and ask for
  confirmation before pushing.
- If there are uncommitted or untracked changes, list them and report that they will stay
  local. Ask whether to commit them first only if the user's intent looks like "push my
  work".
- If there is nothing to push (no commits ahead, upstream already current), report that and
  stop.

### 2 — Review what goes out

List the commits and files the push will publish — against `@{upstream}`, or against the
default branch for a branch with no upstream yet. Scan the file list for anything that should
not leave the machine (credentials, `.env`, local settings); stop and report if something
looks wrong.

### 3 — Push

Push, setting the upstream when the branch is published for the first time.

### 4 — Handle a rejected push

If the remote rejects the push because the branch diverged, report the rejection and hand off
to `update-pr-branch` to integrate the base branch first. If the push fails on
authentication, report the error and the remote URL so the user can fix their credentials.

### 5 — Report

State the branch, the upstream it now tracks, the commits pushed, and any local changes left
behind. If an open pull request exists for this branch, report its URL and check status.

This skill reports in chat and starts no surface run — a single push does not warrant one.

## Related Skills

- `update-pr-branch` — integrate the base branch and resolve conflicts after a rejected push.
- `fix-pr-checks` — diagnose and fix checks that go red after the push.
