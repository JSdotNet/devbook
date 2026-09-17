# Devbook Collaboration

```meta
index: root
type: context
related: [".devbook/domain/context-map.md#devbook-collaboration", ".devbook/domain/devbook/context.md#dependencies"]
```

What this context is responsible for: that a chapter always says who owes the next move, and
that an approval on it was chosen by a person in the session that wrote it.

Inside the boundary: the review request, the reviewer, the verdict, the approval decision, and
the sweep that reports what is waiting on whom.

Outside it: what a chapter says, what its folder's rules are, the schema the state is stored
in, and the [annotation](../devbook/domain.md#annotation) a finding is written as — all
[Devbook](../devbook/domain.md)'s. This context owns no schema and no state of its own: the
three review fields it writes are devbook's, defined beside the approval triad and held to
their meaning by devbook's check, and a finding lives in devbook's own device
([the annotations record](../../arc42/adr/annotations.md)).

## Dependencies

What this context depends on and who depends on it. It is an L1 extension: exactly one
declared dependency, on the foundation whose schema it writes into.

### Outbound dependencies

| Depends on (context/module) | DDD pattern | Integration mechanism | Contract | Why |
|---|---|---|---|---|
| [Devbook](../devbook/context.md#dependencies) | Customer-Supplier, declared `devbook >=1.0.0 <2.0.0` | `review`, `reviewer`, `review-at` in a chapter's own `meta` block | The review triad in `devbook-chapter-metadata.md`: three optional fields, validated together and against the chapter's open notes | It has no store and no vocabulary of its own. The state it remembers about a chapter is three of devbook's fields in that chapter — [the annotations record](../../arc42/adr/annotations.md). |
| [Devbook](../devbook/domain.md#annotation) | Conformist, for the whole device | Writes findings through `.devbook/_tools/devbook-meta/annotations.mjs` | The [annotation](../devbook/domain.md#annotation) fence: its schema, its placement rule, and its open/resolved/gone lifecycle | A finding is devbook's device, not this context's. It reads the fences as the evidence a verdict stands on, and sweeping them is devbook's too — see [the annotations record](../../arc42/adr/annotations.md). |
| [Devbook](../devbook/domain.md#chapter) | Conformist, for one field | Writes `status: approved`, `approved-by`, `approved-at` directly | The shared `approved` rung and its two record fields | Approval is devbook's field and keeps devbook's meaning. This context runs the decision; it does not own the vocabulary. |
| Plugin Authoring | Shared Kernel | Plugin folder and two manifests | [domain.md](../plugin-authoring/domain.md#ubiquitous-language) | It is packaged like every other plugin here, and — alone among them — materializes nothing and stamps nothing. |
| Claude Code and Copilot Plugin APIs | Conformist | Manifests and skills | Each host's own schemas | Enabling the plugin is the whole adoption; the rules its skills follow are devbook's, and reach a host through devbook's install. |

### Inbound dependents (known)

| Consumer (context/module) | DDD pattern | Integration mechanism | Contract | What it relies on |
|---|---|---|---|---|
| [Devbook](../devbook/context.md#dependencies), as a reader | Conformist, reversed | Its check reads `status: approved` and the review triad, and reports an unsigned, undated, or orphaned approval, a half-written review, a verdict without its findings, or review state left on an approved chapter | The three approval fields and the three review fields | That this context writes the triads whole, and clears the review triad in the change that writes the rung. |
| [Delivery](../delivery/context.md#dependencies) | Separate Ways | A flow's approval gate reads whether a chapter was agreed before building from it | The `approved` rung, read from the chapter | Nothing from this plugin. It reads devbook's field, which is why the two never name each other. |
| [Devbook Config](../devbook-config/context.md#dependencies) | Conformist, read-only | Reports whether the plugin is installed and enabled | The marketplace entry and manifests | Nothing: there is no stamp to read and no install to invoke. |

### Notes

- **The review triad is the entire dependency, and it is devbook's.** Disable this plugin and
  the fields stay defined, validated, and meaningful — a person can write them by hand and be
  held to the same rules. What goes is the procedure, not the vocabulary.
- **This context reads no `ext` key.** The namespace it once stored its state in is reserved
  and unused; the first extension's state became schema instead.
- **Nothing declares this context.** It is above devbook in the layer order and below nothing,
  so no manifest anywhere names it — a repository that has not enabled it simply has no skill
  that writes review state, and every chapter still reads correctly.
- **Promotion to a work item is not here, and the Separate Ways row above is why.** A note that
  has become tracked work should be promoted through `bindings["delivery.tracker"]`, but the
  operations, their resolution order, and the key naming them are declared in `delivery`'s own
  surface contract — a file this context may not point at. Restating it here is what the
  Separate Ways relationship exists to prevent, so promotion belongs in `delivery` or in a
  bridge allowed to name both. See
  [the annotations record](../../arc42/adr/annotations.md).
