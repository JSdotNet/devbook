# 18. delivery-surface-canvas Ships the Canvas Only

```meta
date: 2026-09-05
related: [".devbook/arc42/09-architecture-decisions.md", ".devbook/arc42/adr/15-three-surfaces-one-contract.md", ".devbook/arc42/05-building-block-view.md#plugin-folder"]
```

`delivery-surface-canvas` is a Copilot canvas extension and nothing else. No MCP server, no Claude
manifest, no marketplace entry — its two viewer pages live in `extensions/delivery-surface-canvas/views/`
and the canvas actions `render_diagram` and `render_markdown` are the whole surface.

It shipped both transports for two days, on the argument that the layered design's combination
table lists *delivery + delivery-surface-canvas* as a supported outcome and a host without a canvas
panel could not reach it otherwise. That argument was answered from the wrong side:
`delivery-surface-dashboard` already implements the render group with the same two viewers, and it is
what the `surface` slot resolves to wherever there is no canvas to open. So the MCP half was a
second implementation of a covered capability, kept for a combination nobody with the dashboard
installed has a reason to add.

What made this cheap to reverse is that the canvas half never depended on the server half: the
extension declares its own actions and serves its own pages, so removing 870 lines of server,
MCP App bridge, MCPB manifest, and stdio dev check changed no behaviour on the host that keeps
it. The two viewer pages carry no MCP-specific code and moved unedited.

Consequence, and it is the reason this record exists rather than a deletion: the render
capability now has one implementation per host, so the contract's priority order — dashboard
before collector before canvas — goes back to being theoretical, and a surface can now arrive
as something other than an MCP server. The contract's resolution rule says so explicitly: match
the operation names, not the transport. The cost is that `delivery-surface-canvas` has no automated
check any more — the only one drove the deleted server over stdio — and its pages are now
verified on the Copilot host or not at all, which is the open half of the `trial` status on
[the SDK](../../tech/hosts.md#copilot-extension-sdk).
