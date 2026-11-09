# Papa Life Mac-first Digital Brian Voice + Outreach Collection
Status: integration code added; Mac runtime activation requires the REAL Mac mini online.

## Owner routing (explicit)
1. **Primary voice/data connector: Brian's Mac mini through Desktop Commander / Papa Life OS.**
2. **Selected voice identity: Brian Keith Hill's owner-selected HeyGen voice ID.** The voice ID identifies a synthesis voice; it does not connect a microphone, authorize a device, or guarantee native macOS TTS playback.
3. The Mac's speech-to-text interface supplies an explicitly authorized concise recap. Mac relay sends it over HTTPS to Papa Life, with no ElevenLabs session.
4. The site adds the recap to Brian's private outreach report and displays its source. It never assumes that a phone, Gmail, calendar event, voice widget, or social visit is a real conversation.
5. **ElevenLabs remains second/optional, user-initiated only.** No auto-start, provider call or paid voice conversion is triggered by the reporting code.

## Website endpoints
- GET /api/admin/papa-outreach/voice-status — session-authenticated, displays Mac heartbeat, relay readiness, selected voice family. A heartbeat is NOT proof of microphone or Desktop Commander connectivity.
- POST /api/papa-life/mac-voice/outreach — dedicated bearer-authenticated transcript-summary ingest; status 503 without a long PAPA_REPORT_MAC_RELAY_TOKEN and uniquely verified owner binding (PAPA_MAC_OWNER_EMAIL). Accepts only source `mac_desktop_commander`, unique source_ref, explicit authorized_to_store and a 2–6000 character summary. Deduplicates exactly once by owner/source_ref. Does not accept raw audio.
- GET /api/admin/papa-outreach/daily — owner-only, now separately counts authenticated Mac voice recaps. Existing owner browser dictation and saved website AI records continue to work.

## Mac outbound relay
- Code: scripts/papa-mac-voice-outreach-relay.mjs
- Mac-only; token must be a private mode 0600 file at ~/.config/papa-life-os/papa-report-mac-relay.token.
- Input is a pre-existing transcribed, authorized JSON recap, written by the trusted Mac voice workflow into ~/.ai-boss-os/voice-outreach/pending/<stable-id>.json.
- Execution: node scripts/papa-mac-voice-outreach-relay.mjs --activate
- On success the source file is moved to delivered/; failure leaves it for idempotent retry. Transcript text/token is not logged.
- Running once does not create a background schedule. After Mac is verified online, connect the existing Mac voice service to the pending/ folder and test one sanitized recap before enabling scheduled delivery.

## Mac/owner activation blockers
1. Verify **Brians-Mac-mini.local** is actually online in Desktop Commander. Do not use Android or a similarly named cloud node as a substitute.
2. Verify the chosen HeyGen voice ID in the existing Mac voice app, not just the website environment variable. Do not overwrite a working voice ID or incur voice generation costs for a test without explicit authorization.
3. Inspect the existing staged Railway patch. The PAPA_REPORT_MAC_RELAY_TOKEN exists in a staged patch alongside an unrelated Sheets setting; do not blindly deploy that whole patch. Bind the Mac relay to the unique website administrator via PAPA_MAC_OWNER_EMAIL after verifying the actual private admin login.
4. Store matching token on Mac with permissions 0600, never in source control, public markup or chat. Run an authenticated one-record test, verify in dashboard, then schedule a low-frequency outbound job if wanted.
5. Gmail, Google Calendar, GoHighLevel, and personal phone conversations require separate verified, consent-respecting sources. Do not count them merely because the Mac is connected.
6. Preserve the existing approval-before-outreach rules. Capturing a note does not send any message, edit a calendar event, make a purchase, or initiate a voice call.

## Security
- Source is the Mac's authenticated recap, not arbitrary web chat.
- Per-owner isolation; validated length and source reference; idempotent writes.
- No voice-clone credentials returned to browsers.
- Speaker identity is not established by a voice ID alone.
- No uncontrolled ambient recording of fathers, families, or private third parties.
