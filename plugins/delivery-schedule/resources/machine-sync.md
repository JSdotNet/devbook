---
name: machine-sync
description: The machine-level mode of delivery-schedule:update — the bundle routines titled "All repos · <title>", the checkout list and bundle selection it reads from the user's devbook config directory, the per-repository routines it deletes once a bundle has run their job, and the rule that keeps a per-repository sync off a job a bundle covers.
---

# Machine Sync

A bundle is one routine for the whole machine, so `delivery-schedule:update` syncs it at machine
level: when the person asks for the bundles, "all repos", or a bundle by name. It needs no
`components.schedule` stamp and writes nothing into any repository. The rest is
`schedule-catalog-contract.md`.

## The Machine Record

`<config dir>/config.local.json`, the user layer of the overlay, under `ext.delivery-schedule`,
the namespace the delivery engine's `engine-contract.md` *The overlays* reserves. `<config dir>`
is `$XDG_CONFIG_HOME/devbook` when set, else `%APPDATA%\devbook` on Windows and
`~/.config/devbook` elsewhere.

- `checkouts`: absolute paths of main checkouts, forward slashes, for example
  `["D:/Repos/devbook", "D:/Repos/Backlog"]`. Read from the user layer alone; the key in a
  repository layer is reported and ignored.
- `bundles`: the bundle `name`s this machine runs. Absent, it runs none.

This mode writes either key only on the person's own turn — a checkout they name, or a bundle
they enable or disable — and leaves every other key in the file as it is. A named folder whose
`git rev-parse --show-toplevel` differs from the parent of its `--git-common-dir` is a
worktree and is refused.

## Steps

1. **Read** the record and every bundle file, one whose frontmatter carries `jobs`. Report and
   skip a listed checkout that is missing, a worktree, or has no `components.schedule`. Resolve
   each other one to `<owner>/<repo>` by its `origin` remote; the first per repository wins.
2. **Stop in a worktree:** the routine starts in this session's folder and would outlive it.
3. **Check `requires`** of each bundle and each of its jobs against this session's plugins, per
   the contract's *The Prerequisite*. A job missing one is reported, and step 6 never retires it.
4. **Resolve the local scheduler.** None: print each enabled bundle's prompt with its cron and
   continue at step 6.
5. **Sync.** Match on `All repos · <title>`. An enabled bundle is created or updated with its
   body as the prompt, `{{name}}` and `{{title}}` substituted, without the preamble or the
   pickup gate. Its cron is local time and is not converted. Its worktree option is off: the
   bundle's skill assembles each job's prompt at run time per the contract's *The Prompt*, and
   has the preamble's rule 1 take its `worktree add` branch, since no job starts in a worktree
   of its own repository. A catalog bundle
   not enabled has its routine set `enabled: false`; any other `All repos` title is left alone.
6. **Retire** what a bundle replaced. Read the report of the bundle routine's latest finished
   run, from its run log or session. A job ran in a repository when that report's cell for the
   pair is a draft pull request or a finished result. A failed, not-run, or skipped cell does
   not count, and neither does a run with no readable report. For each pair that ran, the
   covered routine is `<owner>/<repo> · <title>`, `<title>` being the job's catalog title.
   List those routines and wait for the person's reply. Delete nothing without a yes: a
   deleted routine cannot be restored, and its run history goes with it. On a yes, delete each
   through the scheduler's `delete`; without one, set `enabled: false` and say the deletion is
   done on the host's own page. Never delete a routine that is not on the list.
7. **Report** one table: bundle, local cron, created / updated / disabled / waiting for its
   first run, and the link. Then one row per covered routine, deleted, disabled, or left, and
   each skipped checkout with its reason. Point at `schedule-run` for a bundle not yet run.

## A Job a Bundle Covers

A job is covered in a repository when an enabled bundle lists it in `jobs` and a listed
checkout resolves to that repository. The per-repository sync neither creates nor updates its
routine, a migration's re-time included, and keeps the job in `enabled`: the bundle reads that
selection to know what to run. The report row says *covered by All repos · <title>*.
