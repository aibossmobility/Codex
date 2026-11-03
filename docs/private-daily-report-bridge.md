# Two-brand daily reporting: Mac-first secure website handoff

**Decision:** No ElevenLabs; no paid Google Cloud project; no new Railway services. The Mac mini holds the only Google Sheets credential.

## Currently operating
- The Mac mini's existing worker-proof outbox automatically syncs into separate **Papa Life Daily** and **AI Boss Mobility Daily** tabs of Brian's restricted executive workbook, with local QA labels and idempotent evidence keys.
- Installed Mac LaunchAgent `com.aibossos.two-brand-daily-report-sync` runs at 08:20 Pacific daily while the Mac is awake and the user is logged in.
- 15 historical Mac worker proof rows (6 Papa Life / 9 AI Boss Mobility), plus four dated executive historical rollups, were independently read back from Google Sheets; duplicate runs added nothing.

## New secure website-to-Mac handoff — coded and integration-tested, not deployed
1. Authenticated **owner-only** submission at `POST /api/admin/papa-daily-work-reports` saves to the website's existing SQLite table, tagged by business, with status `pending_mac`. No Google access token or credentials are held by Railway.
2. A **separate 32+ character bearer token**, staged as Railway `PAPA_REPORT_MAC_RELAY_TOKEN` and stored locally at `~/.ai-boss-os/secrets/papa-daily-report-relay.token` (0600), protects:
   - `POST /api/internal/mac-daily-reports/pull`: read up to 30 pending reports
   - `POST /api/internal/mac-daily-reports/:id/ack`: mark a report `synced_mac` after the Mac verified Google Sheets readback
3. The Mac-side script `scripts/mac-website-daily-report-pull.py` uses HTTPS outbound polling, the private token file, and the existing local dedicated Google Sheets OAuth credential. It reads the appropriate tab's existing IDs, appends only new website reports, verifies the exact ID in Google Sheets, and then acknowledges the website report. A failed append or failed acknowledgment can be retried without duplicate rows.
4. **No public Digital Twin / ElevenLabs access.** Any owner-private briefing must remain behind authenticated website permissions.

## Controlled test results (Mac)
- Isolated local Express relay with real SQLite, two synthetic report records, real Mac Google OAuth and real private Google Sheets workbook:
  - 1 Papa Life + 1 AI Boss Mobility test report appended to their separate tabs and read back
  - Both relay acknowledgments succeeded
  - A second poll added **zero duplicates**
  - Both synthetic test rows were deleted afterward, with cleanup readback; existing business records preserved
- `pnpm exec tsx --test server/private-daily-report-relay.test.ts`: owner relay behavior, separate brand routing, unauthorized 401 and wrong acknowledgment 400 passed
- `python3 -m unittest scripts/test_mac_website_daily_report_pull.py`: two-brand routing, idempotent retry, formula escaping passed
- `pnpm exec tsc --noEmit` and `pnpm run build`: passed

## Release prerequisites — do not claim production completion
- PR #247 remains **draft** and Railway `main` remains live. Staged variables have **not** been deployed.
- The code now prevents an insecure hardcoded administrator password on **new** installations, using optional private `PAPA_ADMIN_BOOTSTRAP_PASSWORD` (minimum 16 characters). Existing administrator records and passwords are intentionally untouched; verify the production owner credential has been rotated away from the previous default before production enablement. Do not silently rotate the live password or touch payment/member records.
- Confirm the staged Railway bearer token matches the restricted local token and install an appropriate Mac polling LaunchAgent **after the production API exists**. The Mac polling script is not running against the live site before deployment.
- Test a real owner-authenticated browser report submission in the deployed website and observe it reach the actual workbook, then verify 401/403 for unauthenticated or non-owner requests and no duplicate rows. The isolated local test is not a substitute.
- Keep the existing Railway SQLite volume, existing payment system, and existing services unchanged. Do not publish the secret token or Google credentials in GitHub, client code, tool logs, or public knowledge content.
- Do not treat a report submitted by an owner as proof of external work without independent receipts.

## Mac-side activation after website deployment
Use only private local environment settings, not hardcoded IDs or tokens in GitHub:
```text
PAPA_REPORT_WEBSITE_URL=https://papalifecoach.com
PAPA_REPORT_SHEETS_SPREADSHEET_ID=(private Google Sheet ID)
PAPA_REPORT_MAC_TOKEN_FILE=~/.ai-boss-os/secrets/papa-daily-report-relay.token
PAPA_REPORT_SHEETS_OAUTH_FILE=~/.ai-boss-os/secrets/google-sheets-report-oauth.json
```
Run `python3 scripts/mac-website-daily-report-pull.py` to validate before scheduling. Never place `~` in quoted env values expecting shell expansion; the default token/OAuth paths already resolve the home folder automatically.
