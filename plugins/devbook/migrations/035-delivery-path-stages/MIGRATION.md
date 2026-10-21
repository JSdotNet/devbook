# 035 — ai/ stages move onto the delivery path

```meta
contractVersion: 35
appliesTo: [ai]
breaking: yes
```

## What

Contract 35 places an `ai/` chapter on the seven-stage delivery path — `decide`, `specify`,
`code`, `verify`, `integrate`, `release`, `operate` — and the DevOps loop's eight words are
errors. This migration rewrites every `stage` list in a `meta` block under `.devbook/ai/` by
this mapping, de-duplicates the result, and writes it in path order:

| Loop word | Path word |
| --- | --- |
| `plan` | `specify` |
| `code` | `code` |
| `build` | `integrate` |
| `test` | `verify` |
| `release` | `integrate` |
| `deploy` | `release` |
| `operate` | `operate` |
| `monitor` | `operate` |

`[plan, code, test]` becomes `[specify, code, verify]` and `[operate, monitor]` becomes
`[operate]`. A scalar `stage` stays a scalar where it maps to one word. Only lines inside a
`meta` fence are read, so a sample in a `text` fence is left alone.

`release` is a word of both vocabularies. A block is read as the loop's when it names `plan`,
`build`, `test`, `deploy`, or `monitor`, and a block naming only `code`, `release`, or
`operate` is read as the loop's when another block in the same folder is. Each of these is
reported on every run it is met:

- a block naming `release` beside only `code` or `operate`, in a folder with no loop-only
  word, is left as it is and never counts as work — it reads the same under both vocabularies,
  so a person says whether it meant `integrate`;
- a block mixing both vocabularies, written half by hand, is partly moved: its loop-only words
  move, and a `release` in it is kept as the path's Release & deploy;
- a word of neither vocabulary is kept, after the path's words, for the checker to report.

It adds no `substage`, `layer`, `feeds`, or `evidence`, and writes no **Moves up when** bullet.
Those are the repository's to place: where a stage splits, which usages run underneath every
stage on `thread`, `upkeep`, or `harness`, what a usage hands work to, and how far its
evidence goes are a reading of the repository, not a rename. The report says so.

## Why

The loop's words placed a usage by the tool's lifecycle, not by the question the work answers,
so `build` and `test` split one session's check in two and `monitor` repeated `operate`. The
path places it by that question. Unlike the first placement, the old words map onto the new
ones, so the rename is a script, not a hand edit in every repository. The record is
`.devbook/arc42/adr/chapter-schema.md` in the marketplace.

## What breaks

A `stage` entry still naming a loop word is an error to the checker. After the run none is
left. A usage that ran under every stage — a worktree, a rule, a scheduled job — now sits at
the stage its old word mapped to and likely belongs on a layer; the check does not say so,
and the folder's next edit through `flow-spec` is where it moves. A repository without `ai/`
adopted records `not-applicable` in the ledger, per `assets/reconcile-protocol.md`.

## Released in 1.30.0

Every plugin is `1.30.0`; contract 35 ships in it, and this is the one migration. The names a
consuming repository's plan writes against are the fields `devbook-ai.md` defines — `stage`,
`substage`, `layer`, `feeds`, `evidence` — and the **Moves up when** bullet.

## Run it

```bash
node migrate.mjs --check
```

`--check` lists every change the run would make, writes nothing, and exits `1` while one is
left. Drop the flag to apply. Running it twice changes nothing. Both forms take `--root <path>`,
defaulting to the working directory.
