# Flow Repo Context

<!--
Copy this file to `.devbook/flow-context.md` in your repository and fill it in.
The file is optional; delete any section that does not apply.
Never put actual secrets here — `## Test Credentials` takes a pointer only.
Never pin a model here — model choice is personal and never comes from the repository.
Convention: resources/flow-repo-context.md
-->

## Application

- **Runnable application:** Orders platform (Aspire distributed app)
- **AppHost project:** `src/Orders.AppHost/Orders.AppHost.csproj`

<!-- A repo with nothing to start declares exactly: **Runnable application:** none -->

## How to Run

```bash
aspire start
```

- Run from the repository root.
- Requires the .NET SDK and a running container runtime.

## Base URLs

- Aspire dashboard: `https://localhost:17090`
- Web front end: `https://localhost:7080`
- API base: `https://localhost:7081/api`

## Test Credentials

- Local development uses the seeded `qa@example.test` account.
- The password is read from the `ORDERS_QA_PASSWORD` environment variable, provisioned from
  the team's secret store entry `orders/local-qa`.
- Never record the value in this file.

## MCP Servers

- `your-guidelines-server` — repository conventions and governed asset guidance, bound to
  `spec` and `docs.update` in `.devbook/config.json`.
- `microsoft-learn` — official .NET, Azure, and Aspire documentation.
- `playwright` — browser automation for QA validation.

<!-- Informational only; `.mcp.json` declares the servers and `bindings["delivery.mcp"]` binds them per point. -->

## Healthy Startup

- All AppHost resources reach `Running`, and the database resource reports `Healthy`.
- `GET /health` on the API returns `200`.
- Logs show `Application started` for the web and API resources.
- Known benign: a single `Detected container runtime restart` warning on first start.

## QA Depth

`targeted`

- Payment scenarios always need Playwright capture, even in `targeted` mode.
- The reporting module has no UI; validate it through the API only.

## Repo-Native Flow Skills

<!-- Optional. Omit this section when the repo defines no flow-* skills of its own. -->

- `flow-release` — cutting a release: version bump, changelog, tag.
- `flow-migration` — database schema migrations and their rollback path.
