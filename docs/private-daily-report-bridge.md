# Two-service private daily reporting — local-first operating mode

**Decision (November 2026):** Do not involve ElevenLabs or create another paid service. The Mac mini is the daily reporting worker; the Google Sheet is the owner-controlled ledger.

## Operational workflow (verified on the Mac)
- Reporting source: sanitized, accepted rows in the existing Mac worker-proof SQLite outbox.
- Script installed locally at `~/.ai-boss-os/bin/two-brand-daily-report-sync.py`.
- Existing dedicated Mac Google Sheets OAuth credential at `~/.ai-boss-os/secrets/google-sheets-report-oauth.json` (file permission 0600); it is **not** stored in GitHub, Railway, or the public website.
- One Google workbook holds distinct tabs: **Papa Life Daily** and **AI Boss Mobility Daily**.
- Mac LaunchAgent `com.aibossos.two-brand-daily-report-sync` runs at **08:20 Pacific daily while the user is signed in to the Mac** and once at login, with idempotent read-before-write operation.
- Records labeled Completed locally / QA Passed do **not** establish that a customer-facing or external task completed.
- The writer skips previously exported proof IDs and verifies each newly written row by reading it back; one record is never knowingly exported twice.
- Logs: `~/.ai-boss-os/logs/two-brand-daily-report-sync.{log,err}` (counts only; no OAuth secrets).
- Initial controlled run exported 6 Papa Life and 9 AI Boss Mobility historical proof records; rerun exported 0 duplicates. These were dated October 19–22, not today's completed work.
- The standalone script in `scripts/two-brand-daily-report-sync.py` is a source-controlled, secret-free template. It requires `PAPA_REPORT_SHEETS_SPREADSHEET_ID` in the Mac environment; the actual installed script is configured privately on the Mac.

## Data and privacy boundaries
- Do not transfer private workbook content, credentials, or customer information to an ElevenLabs or other public conversational agent.
- Do not add service accounts, paid Google Cloud projects, new Railway services, or additional recurring API costs.
- Keep website order/payment/membership flows unchanged.
- Don't mistake the worker-proof source for a complete picture of Gmail, GHL, revenue, or all daily business activity; other sources require separate verified ingestion.
- Mac LaunchAgent jobs depend on the Mac being online and the user logged in. They do not run while the Mac is powered off.

## GitHub PR #247 and production
The earlier draft website integration code still proposes a server-side Google Sheets bridge. **Do not deploy that version as a live reporting solution**; it is not yet configured or verified to read Mac-local credentials, and the website's protected SQLite reports are separate from the Mac proof data.

Before merging any production changes, review application authentication, protect the site's report form, test end-to-end with a controlled private report, and document how an authenticated website entry reaches the Mac ledger without exposing personal Google tokens to Railway.

There is no ElevenLabs deliverable for this project.
