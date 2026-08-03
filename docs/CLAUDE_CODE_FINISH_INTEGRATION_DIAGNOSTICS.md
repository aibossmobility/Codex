# Claude Code Assignment: Finish Papa Life Integration Diagnostics

## Objective

Finish wiring the new guarded integration diagnostic module into the existing Papa Life MCP, validate it, and deploy through SSH using the saved `site-server` alias and `brian` account.

The new module already exists on branch:

`agent/papalife-integration-diagnostics`

File:

`server/integration-health.ts`

Repository:

`aibossmobility/Codex`

Production directory:

`/var/www/html/bossmobilelifecoach.com`

## Critical operating rules

1. SSH is the first deployment step. Use:

   `ssh site-server`

2. Production work must occur as the `brian` user in:

   `/var/www/html/bossmobilelifecoach.com`

3. Never restart `papalife-mcp-http`.

4. The approved application restart command is:

   `sudo /usr/local/bin/pm2 restart papalife`

5. Do not expose, print, commit, log, or copy any API key, private integration token, bearer token, webhook secret, or password.

6. Diagnostics must remain non-destructive. Health checks may read configuration and make dry-run requests only. They must not send emails or SMS, create contacts, move opportunities, alter workflows, or mutate CRM records.

7. Make one change at a time. Run checks before deployment. Back up the production state or create a rollback point before changing files.

## Work to complete

### 1. Inspect the existing MCP wiring

Review:

- `server/mcp-handlers.ts`
- `server/ghl-api.ts`
- `server/ghl-automation.ts`
- `mcp-streamable.ts`
- `server/index.ts`

Preserve all existing MCP tools and behavior.

### 2. Wire the diagnostic module into MCP

Import from `server/integration-health.ts`:

- `integrationConfigurationSummary`
- `diagnoseGhlConnection`
- `diagnoseMakeWebhook`
- `orchestrationHealthCheck`

Add these MCP tool definitions to `PAPALIFE_MCP_TOOL_DEFINITIONS`:

#### `papalife_integration_configuration_summary`

Purpose: Report whether required environment variables are configured without returning secret values.

Input schema: empty object.

#### `papalife_ghl_connection_diagnostic`

Purpose: Validate HighLevel token, location access, and contacts scope. Read-only.

Input schema: empty object.

#### `papalife_make_webhook_diagnostic`

Purpose: Send the module's explicitly marked dry-run diagnostic payload to `AUTOMATION_CLOUD_WEBHOOK_URL`.

Input schema: empty object.

#### `papalife_orchestration_health_check`

Purpose: Return one combined report for HighLevel, Make, Claude-key presence, MCP security configuration, and safety guarantees.

Input schema: empty object.

Add corresponding cases in `handlePapalifeTool`.

### 3. Reconcile environment variable names

Inspect `server/ghl-api.ts` and existing production configuration. The new module currently accepts:

- `GHL_PRIVATE_INTEGRATION_TOKEN`
- fallback `GHL_API_KEY`
- `GHL_LOCATION_ID`
- `GHL_API_BASE_URL`
- `GHL_API_VERSION`
- `AUTOMATION_CLOUD_WEBHOOK_URL`
- `ANTHROPIC_API_KEY`
- `MCP_BEARER_TOKEN`
- `PUBLIC_MCP_BASE_URL`

If the existing code uses different canonical names, update `integration-health.ts` to use the same credential resolver already used by `ghl-api.ts`. Do not duplicate secret-loading logic unnecessarily.

### 4. Add tests

Add focused tests covering:

- Missing credentials returns `not_configured`.
- Secret values are never returned.
- HighLevel 401/403 is reported safely.
- Make webhook is always sent with `dry_run: true`.
- Make diagnostic includes `X-PapaLife-Dry-Run: true`.
- Combined health check never claims that records were mutated or messages were sent.
- Timeouts and network errors return structured errors rather than crashing the MCP server.

Use mocked fetch calls. No tests may call live HighLevel or Make endpoints.

### 5. Validate locally

Run:

- `pnpm install --frozen-lockfile` only if dependencies are missing
- `pnpm run check`
- relevant unit tests
- `pnpm run build`

Fix only issues caused by this branch. Do not make unrelated site changes.

### 6. Review security

Confirm:

- No token or webhook URL is included in tool output.
- Only webhook hostname may be displayed.
- Response previews are capped.
- Network calls have timeouts.
- Diagnostics cannot accept arbitrary URLs.
- No live email or SMS tool is added in this assignment.
- Existing send/mutation tools are unchanged.

### 7. Commit and open a draft PR

Use a clear commit such as:

`Wire guarded HighLevel and Make diagnostics into Papa Life MCP`

Open a draft PR from:

`agent/papalife-integration-diagnostics`

to:

`main`

The PR body must list:

- tools added
- files changed
- tests run
- security protections
- production deployment steps
- rollback steps

### 8. Deploy through SSH only after validation

SSH must be the first production step:

```bash
ssh site-server
cd /var/www/html/bossmobilelifecoach.com
```

Then:

1. Confirm the current branch, commit, working tree, PM2 processes, and current health.
2. Create a rollback point before pulling.
3. Pull the approved code from `main` only after the PR is approved/merged, unless Brian explicitly authorizes deployment of the feature branch.
4. Install dependencies only if required.
5. Build.
6. Restart only:

   `sudo /usr/local/bin/pm2 restart papalife`

7. Do not restart `papalife-mcp-http`.
8. Verify the website, API health, and MCP endpoint.
9. Run the new tools and capture redacted results.
10. If any validation fails, roll back immediately and report the exact failure.

## Post-deployment verification

Verify:

- Public site still loads.
- Existing assessment, checkout, login, members area, media, CRM, and Tuesday Live routes still work.
- Existing MCP tools still list and execute.
- The four new diagnostic tools appear.
- No credentials appear in responses or logs.
- HighLevel diagnostic reports the correct location/account tied to `Brian@bossmobility.net` without exposing identifiers unnecessarily.
- Make diagnostic is recognized as dry-run and creates no production records or messages.

## Final report to Brian

Report in plain language:

1. What was changed.
2. What was verified.
3. Whether HighLevel credentials are valid.
4. Whether required scopes are present.
5. Whether the Make webhook responds.
6. Whether any environment variable or authorization is still missing.
7. Exact deployment commit.
8. Rollback point.
9. Confirmation that `papalife-mcp-http` was not restarted.

Do not ask Brian to perform technical work. Handle all implementation and validation possible through GitHub, SSH, the existing server environment, and the Unified Orchestration System. Only surface a genuine authorization step if the HighLevel private integration token is absent or expired.