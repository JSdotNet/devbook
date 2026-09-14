# 63. An Open flag Is Shown at the Gate and Never Blocks It

```meta
date: 2026-09-14
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/40-the-overlay-may-add-a-gate-and-never-remove-one.md", ".devbook/arc42/adr/62-the-chapter-gate-is-devbook-collaborations-and-reads-the-chapter.md", ".devbook/domain/devbook-collaboration/domain.md#finding", ".devbook/domain/devbook/domain.md#annotation"]
```

`kind: flag` was accepted by devbook's annotation schema and read by nothing. It is read now,
by the chapter gate, and its whole effect is visibility: `chapter-approve` shows every open note
with the chapter, ordered by kind — questions first, because they block; flags next; then
suggestions and comments — and on a chapter that already carries `approved-at`, it names each
note dated after that day as **raised since the approval**, a reason to lift the rung and send
the chapter back through review. A flag is the loudest remark the fence can carry, and the gate
reads it that way: first among the remarks, quoted in full, and the first reason offered to
choose revise. It never blocks.

Only an open `kind: question` blocks, and that is devbook's rule rather than this plugin's: an
unanswered question is a hole in the chapter and outranks `status`, while a `comment`, a
`suggestion`, or a `flag` is a remark about a chapter that stands. Making a flag block from
here would either change what a devbook field means from a plugin one layer up — a devbook
release for a review plugin's policy, which is the shape the `ext` namespace exists to avoid —
or leave devbook's rule saying one thing and the gate doing another.

Blocking was weighed and left open on purpose. A note that can halt a decision has the standing
of a gate, and every gate here got the same care: [record 40](40-the-overlay-may-add-a-gate-and-never-remove-one.md)
says configuration may add a checkpoint and never remove one, and a repository that wants its
chapter gate stricter should get it the same way, by a switch it commits rather than by a
reviewer's choice of `kind`. Where that switch would live follows from
[record 62](62-the-chapter-gate-is-devbook-collaborations-and-reads-the-chapter.md): the gate is
not in a run, so the engine's `policy` keys — which describe how a run behaves — cannot reach
it, and devbook's schema may not carry it. It would be this plugin's own key under
`components.collaboration` in the stack config, the one place in a repository that is already
L1's to write, and it would only ever tighten. Nobody has asked for it, so it is not built; the
first repository that needs a chapter it cannot approve over a flag is the trigger.

Consequence: `chapter-review` now says when to write `flag` — when the objection should be the
first thing the approver reads — where before it listed the kind without a reason to pick it.
And `chapter-review-queue` gains a row for an approval with an open note dated after it, so the
same reading reaches the person who is not standing at the gate.
