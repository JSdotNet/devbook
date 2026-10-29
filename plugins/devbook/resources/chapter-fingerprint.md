---
name: chapter-fingerprint
description: The versioned contract for the content fingerprint of a devbook block and of a change proposal — what is hashed, how it is normalised, which demos fold in, and the shared vector every implementation must reproduce. Owned by devbook; followed by spec-manager and Backlog.
---

# Chapter Fingerprint

This is `devbook.chapter.fingerprint@1`. devbook owns it and `tools/devbook-meta/chapter-hash.mjs`
implements it, through `chapterFingerprint` and `changeHash` in `metadata.mjs`; spec-manager and
Backlog recompute it, and none of them extends it. A change that alters any value raises the
version. Why a decision is recorded against a fingerprint is
`.devbook/arc42/adr/chapter-schema.md#branch-true-devbook` in this repository.

## The Value

`sha256:` followed by the first eight lowercase hex characters of SHA-256 over the canonical
text, encoded as UTF-8. Split every Markdown input on `\r?\n`; there a lone `\r` is no break.

## A Block

The address is `<path>` for the file block, the file's first `#` heading, or `<path>#<slug>` for
the first heading whose anchor is `<slug>`. A heading is a line matching `^(#{1,6})\s+(.*)$`,
at column 0, outside a fence. For finding headings, a line matching ``^\s*(`{3,}|~{3,})`` opens a
fence and the next such line of the same character, at least as long, closes it.

1. **Span.** From the heading line to the line before the next heading at the same or a higher
   level, else to the end of the file. A `#` block ends at the next `#`; a `##` covers its `###`.
2. **Heading.** The second group of the heading pattern, as written: trailing whitespace and
   closing `#`s stay. A nested heading in the span is an ordinary line, markers included.
3. **Fences.** In the span after the heading, a line matching
   `` ^\s*(`{3,}|~{3,})\s*([^\s`~]*)\s*$ `` opens a fence, closed by the first later line
   matching `^\s*C{n,}\s*$`, `C` its character and `n` its length; unclosed, it runs to the end
   of the span. A fence labelled `meta` or `annotation`, in any case, is dropped whole. Any other
   fence is kept whole, opener and closer included. An opener with a second word in its info
   string matches nothing and is an ordinary line.
4. **Lines.** In every kept line, replace each run of whitespace with one space and trim; drop
   the empty lines.
5. **Text.** The heading text, when not empty, then the kept lines, joined by `\n`.

**Demos.** A `#` block takes the page demo beside its file: `<page>.demo.html` for `<page>.md`,
`demo.html` for `context.md`. Every block takes each path in the `demo` and `playthrough` fields
of its own heading's `meta` block and of every heading nested in its span, read up to its `#`,
when the path names a `demo.html` or `*.demo.html`. A heading's `meta` block is a fence whose
first line, trimmed, is exactly `` ```meta `` and is the first non-blank line under the heading.
Keep the demos that exist, once each, sorted by path in code-unit order. A demo's text is its
file with CRLF and CR turned to LF and every match of
`` /<!--\s*template:begin\b[^>]*?-->[\s\S]*?(?:<!--\s*template:end\b[^>]*?-->|$)/gi `` removed.
With no demo, the canonical text is the block's text. With some, it is the block's value, then
for each demo its path, `\n`, and its text, all joined by `\n`.

## A Change

The address is `openspec/changes/<name>`; its `proposal.md` names the same change. The
canonical text joins by `\n`:

1. The value of `proposal.md`'s file block, per *A Block*, with no demo folded in.
2. For every `*.md` and every demo under `devbook-delta/`, at any depth, sorted by target in
   code-unit order: the target — the path under `devbook-delta/` re-rooted at `.devbook/` —
   then `\n` and its text. A Markdown delta's text is steps 3 to 5 over every line of the file,
   with no heading and dropping `annotation` fences only: in a delta, `meta` blocks and headings
   are content. A demo delta's text is read as a demo's is.

## The Vector

`tools/devbook-meta/chapter-fingerprint.vector.json` is the shared vector, beside the journey
signature's `tools/scenarios/scenario-page.vector.json`. Each case carries its input, its
`canonical` text, and its `fingerprint`; `sameAs` and `differsFrom` name a case it must equal or
differ from. An implementation agrees with this contract when it reproduces every case's
canonical text and fingerprint. `chapter-fingerprint.test.mjs` beside it proves devbook's own.
