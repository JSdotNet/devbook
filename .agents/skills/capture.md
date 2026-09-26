---
name: capture
description: "Capture screenshots and recordings as evidence for the feature being built — at every scenario checkpoint, at every failure, and for a demo of finished work. Use when: capturing QA evidence, screenshotting a flow, recording a multi-step scenario, or a phase asks for evidence."
goal: "Return evidence a reviewer can open instead of taking your word for it: one file per checkpoint and per failure, every path under the git worktree root, and the form named honestly — a screenshot sequence is never called a video or a trace."
---

# Capture Evidence

Evidence here is text: command output, a host's transcript, a diff. There is no browser and no
screen, so the form is always a **text log** — never call it a screenshot, a recording, or a
trace.

## The three checks

Every capture of a branch's state is these three, run from the worktree root on the commit
under review, each into its own file:

| Check | Command |
| --- | --- |
| Assets | `node tools/check-assets.mjs` |
| Devbook metadata | `node plugins/devbook/tools/devbook-meta/build.mjs --check` |
| Manifests | `claude plugin validate --strict .`, then once per `plugins/*/` with a `.claude-plugin/plugin.json` |

These are the three `.github/workflows/repo-checks.yml` runs; a local capture that disagrees
with CI is a finding about the environment, reported as one.

## Take it

1. **Record what it was run on.** The first lines of every file: the command, `git rev-parse
   --short HEAD`, and whether the tree was clean.
2. **Take the whole output**, stdout and stderr together, and end the file with the exit
   code. A trimmed log hides the line that mattered.
3. **Capture a failure before fixing it.** The failing run is the one that cannot be retaken
   once the fix lands.

An invocation `show` walks is captured the same way: the prompt, the host's full output, and
the files it wrote as `git status --short` plus the diff.

## Where it lands

```
.wip/evidence/<branch>/<NN>-<what-it-shows>.txt
```

`<branch>` is the branch name with `/` as `-`; `<NN>` is zero-padded in the order taken. Name a
failure so it reads as one: `03-validate-strict-fails.txt`. Never overwrite a file; a rerun is
the next number. `.wip/` is gitignored — evidence is never committed. What a reviewer needs from
it travels in the pull request body: each check's verdict and summary line, with the path it
came from.

## In the report

Every claim cites its file. "The checks pass" is a claim; `0 error(s)` quoted from
`.wip/evidence/<branch>/01-check-assets.txt` is evidence. Report a budget overrun or a note as
what it is — reported, not an error — and never round it into a pass or a fail.
