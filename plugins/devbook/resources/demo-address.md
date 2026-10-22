---
name: demo-address
description: The versioned contract for pointing into a click demo and talking to one — the screen and walkthrough address a chapter's demo and playthrough fields and a note carry, and the five postMessage messages between a demo and the frame that hosts it. Owned by devbook; followed by the demo template, spec-manager, and Backlog.
---

# Demo Address

This is `devbook.demo.address@1`. devbook owns it; the demo template's script, spec-manager,
and Backlog follow it, and none of them extends it. A change that breaks a reader raises the
version, and every message carries it as `v`. Why a demo exists and where it lives is
`.devbook/arc42/adr/demos.md` in this repository.

## The Address

```text
<file>#<screen>[/<anchor>][?role=<key>&flags=<key>,<key>&vp=<key>]
<file>#walkthrough/<id>[/<step>]
```

- **`<file>`** is the demo's repository path, as a `demo` field writes it per
  `rules/devbook-chapter-metadata.md`. A message leaves it out and starts at `#`: the frame
  already names the file, and a demo never knows its own path.
- **`<screen>`** is the `id` of a `section[data-screen]`. Required for a screen address.
- **`<anchor>`** is a `data-anchor` value inside that screen. It narrows the address to one
  element.
- **The query** records the panel's state: `role` one actor key, `flags` a comma-separated
  list of feature-flag keys switched on, `vp` one viewport. Every key is the one `demo-model`
  lists, which is the repository's own `key` for that actor, flag, or setting. An omitted
  parameter means the panel's default.
- **`walkthrough/<id>`** names a walkthrough by its own `id` in `demo-model`. A free
  walkthrough playing an inline `#### Scenario:` takes the scenario's slug as its id; a linked
  one keeps its own id, and its `part` names the journey part it shows; a playthrough keeps
  its own id, and its `journey` names the whole journey it plays end to end. `<step>` is a
  1-based step number of the walkthrough, never a part's `step` index; omitted, the
  walkthrough opens at its first step. `walkthrough` is therefore never a screen id.

Every part resolves against `demo-model`, the `application/json` script with that id: an
address naming a screen, anchor, walkthrough, step, or key it does not list does not resolve.

## The Messages

A host frame and the demo exchange plain objects through `postMessage`, each
`{ "type": "<message>", "v": 1, ... }`. Ignore a message whose `type` is unknown or whose
`v` is higher than the reader's.

| Message | Direction | Payload |
| --- | --- | --- |
| `demo:ready` | demo → host | `template`: the template version; `screens`, `anchors`, `walkthroughs`: the lists from `demo-model`, each walkthrough with its `id` and `steps`, and a playthrough also with its `journey` |
| `demo:location` | demo → host | `address`: the current address; `playing: true` while a walkthrough advances on its own; in annotate mode also `element`, the address of the clicked `data-anchor` |
| `demo:goto` | host → demo | `address`: the address to open — screen and panel state set, anchor highlighted, walkthrough at its step |
| `demo:play` | host → demo | `address`: a walkthrough address, opened as `demo:goto` opens it, then advanced one step at a time to its last |
| `demo:pins` | host → demo | `addresses`: every address that carries a note, shown as pins; an empty list clears them |

The demo sends `demo:ready` once its panel is built and `demo:location` on every navigation,
and again when playing starts or stops. A host compares `demo:ready` with the addresses it
stores to find the ones that no longer resolve. A `demo:goto` or `demo:play` whose address
does not resolve changes nothing, and so does a `demo:play` naming a screen. Any navigation —
a `demo:goto`, a click in the demo, a step chosen in its panel — stops a walkthrough that is
playing. `demo:play` joined `@1` without raising it: a demo on an earlier template ignores the
unknown type, so a host that gets no `playing` back falls back to `demo:goto`.

## Activation

Who does what when a page shows a playthrough, so the three never overlap:

| Part | Owns |
| --- | --- |
| devbook | The convention: a `feature` or `sub-feature` chapter's `playthrough` field, per `rules/devbook-chapter-metadata.md`, and this contract |
| The host — spec-manager, Backlog | Activation: reading the field from the chapter or the index, framing the demo on the feature's page, and when to send `demo:play` — on opening the page, on a person's click, or never |
| The repository's template, `.devbook/design/demo-template.html` | The look: the caption over the product, the steps grouped by part, the pace, and the controls a person takes over with |

A host never styles the playthrough and a template never decides when one starts.

## The Frame

- **No parent frame, no messages.** A demo opened from disk or in its own tab, where
  `window.parent === window`, sends nothing and ignores every message.
- **Sandbox without same-origin.** The host frames the demo with `sandbox` set and
  `allow-same-origin` absent — `allow-scripts` is the only token a demo needs. The demo runs
  at an opaque origin, so it reaches no host storage or cookie, and messages are its only
  channel. The demo posts to `"*"`, since an opaque origin cannot name its parent; the host
  accepts a message only when `event.source` is the frame it created.
