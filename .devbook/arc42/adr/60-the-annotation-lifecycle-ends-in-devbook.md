# 60. The Annotation Lifecycle Ends in devbook

```meta
date: 2026-09-09
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/8-comments-are-findings-until-the-fence-lands.md", ".devbook/arc42/adr/52-annotations-reach-the-devbook-folders-and-nothing-else.md", ".devbook/domain/devbook-collaboration/dependencies.md"]
```

The sweep that deletes resolved annotation fences is `devbook:annotation-sweep`, in `devbook`,
not in `devbook-collaboration` with the rest of the review pass.

The lifecycle is `devbook`'s and always was: `devbook-annotations.md` states open, resolved,
and gone, and says the third is a step rather than a hope. `annotations.mjs` is the only writer
of a fence, and it lives here. A repository that never installs `devbook-collaboration` still
gets notes — a person leaves one in an editor, a converter's reviewer leaves one in a pull
request — and still needs them swept. Putting the sweep in the review plugin would make the
foundation's own lifecycle unfinishable without an extension, which is the shape a layered
stack exists to avoid.

Chapter-scoped, and deliberately not folder-scoped. A folder-wide sweep would delete notes
nobody looked at, in files the person running it never opened; a chapter address is what makes
the list in step 2 something a person can actually read before the delete.

**The third piece of this layer is not built, and the reason is the layering.** A note that
needs to become tracked work should be promoted through the tracker binding, with the entry
referencing the chapter address and the note then resolved and swept. `bindings["delivery.tracker"]`
is not a plugin dependency — [record 11](11-the-stack-config-lives-in-devbook.md) makes reading
`.devbook/config.json` free, and the surface contract says a tracker is bound per repository
and never depended on. What is not free is the vocabulary: the operations `create_item` and
`link_change`, the resolution order behind them, and the key that names them are all declared
in `delivery`'s `resources/surface-contract.md`, which neither `devbook` nor
`devbook-collaboration` may point at. Writing the skill would mean restating that contract in
a second file, and `devbook-collaboration` and `delivery` are
[Separate Ways](../../domain/devbook-collaboration/dependencies.md) precisely so that the two
never name each other. So promotion belongs in `delivery`, beside the other two skills that
already speak to the tracker, or in a bridge that is allowed to name both — and until one is
written, a note that has become work is promoted by hand and the chapter address goes in the
work item by hand.
