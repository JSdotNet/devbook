# 11. The Viewers Are Hard-Coded Dark

```meta
date: 2026-11-26
severity: low
related: [".devbook/arc42/11-risks-and-technical-debt.md", ".devbook/arc42/tdr/README.md", ".devbook/arc42/building-blocks/delivery-surface-dashboard.md#viewer", ".devbook/arc42/building-blocks/delivery-surface-canvas.md#view", ".devbook/arc42/08-crosscutting-concepts.md#surface"]
c4: ["marketplace.delivery-surface-dashboard", "marketplace.delivery-surface-canvas"]
```

**Owner:** the maintainer

## The debt

```meta
```

A surface page sits beside a conversation, so it follows the viewer's light or dark theme, as
the [dashboard](../building-blocks/delivery-surface-dashboard.md#viewer) and
[canvas](../building-blocks/delivery-surface-canvas.md#view) blocks state. The run timeline
does. The four viewer pages do not: the Mermaid and Markdown views of both plugins declare
`color-scheme: light dark` and then paint a fixed dark palette, and the Mermaid view initializes
with `theme: "dark"`.

## Origin

```meta
```

Found, not taken. The viewers were written dark first and copied between the two plugins; the
theme rule was written down later and checked only against the run timeline.

## Impact

```meta
```

In a light-themed host the panel is a dark block beside a light conversation. Nothing is lost
and nothing is unreadable, so the cost is the look alone.

## Affected components

```meta
```

`views/mermaid.html` and `views/markdown.html` in `delivery-surface-dashboard`'s MCP server and
in `delivery-surface-canvas`'s extension.

## Remediation options

```meta
```

Give each page the timeline's treatment: the host's tokens with light fallbacks, dark values
under `prefers-color-scheme: dark`, and a Mermaid theme picked from the resolved scheme at
render time. The two plugins keep one copy of each page each, so the fix lands in both in one
change. Take it up the next time either viewer changes for another reason.
