---
name: machine-sync
description: The machine-level mode of delivery-schedule:update — the bundle routines titled "All repos · <title>", the checkout list and bundle selection it reads from the user's devbook config directory, the per-repository routines it deletes once a bundle's first run has passed, and the rule that keeps a per-repository sync off a job a bundle covers.
---

# Machine Sync

A bundle is one routine for the whole machine, so it is synced from the machine, not from a
repository. `delivery-schedule:update` runs this mode when the person asks for the bundles,
"all repos", or a bundle by name. It needs no `components.schedule` stamp and writes nothing
into any repository. Everything not stated here is `schedule-catalog-contract.md`.

## The Machine Record

The user layer of the stack-config overlay, `<config dir>/config.local.json`, under the
plugin's own `ext` namespace, as the delivery engine's `engine-contract.md` *The overlays*
reserves it. `<config dir>` is `$XDG_CONFIG_HOME/devbook` when set, else `%APPDATA%\devbook`
on Windows and `~/.config/devbook` elsewhere.

```json
{ "ext": { "delivery-schedule": {
  "checkouts": ["D:/Repos/devbook", "D:/Repos/Backlog"],
  "bundles": ["sunday-devbook-review"]
} } }
```

- `checkouts`: absolute paths of main checkouts, forward slashes. Read from the user layer
  alone, since it is true of the machine and of no one repository; the same key in a
  repository layer is reported and ignored.
- `bundles`: the machine's selection, by bundle `name`. Changed only where the person asks.
- Absent means no bundle is enabled, which is how every machine read before this mode.

This mode is the namespace's only writer, and it writes a key only on the person's own turn:
a checkout they name, once `git rev-parse --git-common-dir` shows it is a main checkout and
not a worktree, or a bundle they enable or disable. Every other key in the file is left as is.

## Steps

1. **Read** the record and every bundle file — a schedule file whose frontmatter carries
   `jobs`, per the contract. A listed checkout that is missing, a worktree, or carries no
   `components.schedule` is reported and skipped. Each remaining one resolves to
   `<owner>/<repo>` by its `origin` remote; the first checkout per repository wins.
2. **Stop in a worktree** for the reason the contract's *What a local routine changes* gives:
   the routine starts in this session's folder.
3. **Resolve the local scheduler** as the per-repository mode does. None: print each enabled
   bundle's prompt with its cron and stop at step 6.
4. **Create or update** each enabled bundle, matched on `All repos · <title>`: the prompt is
   the bundle's body with its placeholders substituted, and carries neither the preamble nor
   the pickup gate — each job's own prompt carries the preamble. The cron is local time and is
   not converted. A disabled or unknown bundle's routine is set `enabled: false`.
5. **Retire what a bundle replaces**, once it has passed. A bundle has passed when the
   scheduler lists a finished run of its routine that did not fail and whose summary does not
   start `Skipped:`; one that has not is reported as *waiting for its first run* and deletes
   nothing. For a passed bundle, the covered routines are every `<owner>/<repo> · <title>`
   where the checkout's `enabled` names one of the bundle's `jobs` and `<title>` is that job's
   catalog title. List them and wait for the person to confirm in this turn before deleting
   any: a deleted routine cannot be restored, and its run history goes with it. Then delete
   each through the scheduler's `delete`; a scheduler without one gets `enabled: false` and a
   row saying the deletion is done on the host's own page. Never delete a routine whose title
   is not on that list.
6. **Report** one table: bundle, local cron, created / updated / disabled / waiting, the link,
   then a row per covered routine — deleted, disabled, or left — and every checkout skipped
   with its reason. Close by pointing at `schedule-run` for a bundle not yet run.

## A Job a Bundle Covers

A job is covered in a repository when an enabled bundle lists it in `jobs` and a listed
checkout resolves to that repository. The per-repository sync neither creates nor updates the
routine of a covered job, and leaves the job in `enabled`, because the bundle reads that
selection to know what to run. Its report row says *covered by All repos · <title>*. A
routine already there stays as it is until step 5 retires it.
