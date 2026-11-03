# Private two-service daily reporting bridge

## Intended workflow
- **Google Workspace:** Owner-controlled native sheet (not a public Knowledge Base): `YOUR_PRIVATE_GOOGLE_SHEET_ID`. Tabs: Executive Dashboard, Papa Life Daily, AI Boss Mobility Daily, Digital Twin Brief.
- **Papa Life OS:** The existing `/papa-daily-work-report` form saves authenticated manual submissions in its SQLite database, tagged to the selected service. Only after that local save does the server attempt Google Sheets sync.
- **Daily OS automation:** Continues to independently write verified activities to the private Google Sheet. This source is not automatically copied back to the website's SQLite report history; avoid double-counting.
- **Owner-only briefing:** `GET /api/admin/daily-report-twin-brief` requires an authenticated Papa Life admin session. It reads the latest "Digital Twin Brief" from the owner-controlled Sheet. This is NOT an ElevenLabs agent tool, and no private report data should be embedded in public Twin prompts or training content.

## Railway configuration (not yet installed)
Only for the live Papa Life **production web service** and only after a privately authorized Google OAuth connection with the Google Sheets read/write scopes:

```text
PAPA_REPORT_SHEETS_SPREADSHEET_ID=YOUR_PRIVATE_GOOGLE_SHEET_ID
PAPA_REPORT_GOOGLE_CLIENT_ID=<server secret>
PAPA_REPORT_GOOGLE_CLIENT_SECRET=<server secret>
PAPA_REPORT_GOOGLE_REFRESH_TOKEN=<server secret>
```

Store these as encrypted Railway variables, **not** in GitHub, browser code, a client endpoint, the public Digital Twin or a ChatGPT conversation. The existing ChatGPT Google Drive connector authorization does NOT automatically grant Railway permission. Verify the correct Google account owns or has edit access to the spreadsheet. Do not reuse unrelated application OAuth tokens unless scopes, consent, and security are verified.

If credentials are missing, website reports still save to the local database, and the UI correctly says Google sync is not configured. If Google Sheets is temporarily unavailable, local reports remain saved and are labeled as not synced; do not count them as synchronized. A failed Sheets sync does not automatically retry in this change.

## Check sequence
1. Run `node --import tsx --test server/private-daily-report-sync.test.ts`, `npm run check` and `npm run build`.
2. Verify `GET /api/admin/daily-report-twin-brief` and `GET /api/admin/papa-daily-work-reports` return 401 for unauthenticated requests.
3. In a staging/development Railway service, verify production-like session login; submit one controlled `papa-life` entry and one `ai-boss-mobility` entry, confirm both stored in SQLite and written to distinct Sheet tabs, and read back exact row IDs.
4. As a signed-in owner, read the private latest Twin brief. Confirm an unauthenticated visitor cannot access the endpoint.
5. Deploy only with current database/volume backup, tested OAuth scope, zero interruption to payments/memberships, and verified site readback.
6. **ElevenLabs**: Public agent cannot read these private reports. An owner-authenticated agent integration requires a separate security review and user-session authorization (agent-wide tokens would expose private reports to public visitors).
