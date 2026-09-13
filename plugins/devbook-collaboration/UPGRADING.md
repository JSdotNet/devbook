# Upgrading devbook-collaboration

Behaviour changes a consumer would notice, newest first.

## 0.5.0: a finding is an annotation fence

**Breaking for chapters that carry findings, and the migration is manual.** Nothing
this plugin materializes changed shape, so `devbook-collaboration:install` moves the
rule and the two wrappers as usual; what changed is where a finding lives, and that is
in your chapters.

`ext.devbook-collaboration.open-<n>` is gone. A finding is one devbook `annotation`
fence in the chapter body, with an author, a date, a kind, a quoted passage, and
replies — the device `devbook` has shipped since 3.1.0. Until now a repository with
both plugins had two places to leave a comment, and the single-line key was the worse
of them: it recorded no author, could not be replied to in place, and never said which
passage it was about.

**Convert what you have.** For each `open-<n>` key on a chapter, add one fence and
delete the key:

```
node .github/tools/devbook-meta/annotations.mjs add --chapter <path#slug> \
    --kind question --author unknown --date <the chapter's review-at> \
    --body "<the line, verbatim>"
```

Against the chapter, not a passage: a finding never recorded which passage it was
about, and guessing one now would put a note beside prose nobody meant. `author` is
`unknown` for the same reason — the key never held one, and inventing one would sign
somebody's name to a question they may not have asked. Where the chapter's history
does say who raised it, write them instead.

`review`, `reviewer`, and `review-at` are untouched, and they are now the whole
namespace.

**Two consequences to expect.** An open `kind: question` fence on an `approved`
chapter is an **error** in `devbook`'s check, where an `open-<n>` key was silent — so
a chapter that was approved over an unresolved finding starts failing the gate.
Resolve and sweep the note, or take the approval off. And `resolved` notes now
accumulate until somebody sweeps them: run `devbook:annotation-sweep` before a branch
merges.

Requires `devbook >= 3.4.0`, for the sweep.
