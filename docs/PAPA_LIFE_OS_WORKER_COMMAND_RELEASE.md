# Papa Life OS worker command and directory cleanup
Date: 2026-10-18
Status: Tested feature branch; NOT YET LIVE. New secure relay intentionally disabled without a dedicated secret.

## Mobile owner experience
- Replace the large "I JUST MET A FATHER" button with **GIVE ASSIGNMENT TO WORKERS** on /papa-life-os.
- Tap it, select Papa Life or AI Boss Mobility, select an existing allowed read-only worker, type or dictate the task, and press "Queue Worker Assignment".
- This creates a task requiring your approval; it does NOT start the worker or authorize paid model calls.
- Tap "Review Approvals & Queue"; approve or decline. Existing Mac workers pick up work only after separate secure relay activation and verified owner approval.
- Repeated submissions reuse the same UUID if an HTTP reply was lost. The server checks project and role mismatch before queuing.

## Zero-purchase architecture
- Cloud web app exposes restricted POST /api/admin/ai-boss/worker-assignments to authenticated authorized admin users.
- Cloud outbound worker relay endpoints require AI_BOSS_WORKER_RELAY_TOKEN. Without it they return 503; no unauthenticated execution.
- Cloud side claims only owner-approved, fixed, read-only assignments; five-minute lease prevents duplicate claims. Each completed report must match lease, role and project.
- Mac polls the HTTPS site outbound: server/ai-boss-worker-mac-poller.ts (one-shot; explicit --activate). It validates project/role/UUID, stores a unique remote-to-local mapping, mirrors already-verified owner approval, and allows only the existing agent-team-v1 read-only worker handler. No inbound Mac port, remote shell or external AI purchase.
- The Mac service is not scheduled/persistent; no secret is installed or published by this code change alone.
- No paid providers, subscriptions, ElevenLabs conversations, customer sends, invoice or financial account actions.
- Existing 11 general agent-team handlers are read-only and project restricted. Other specialized workers are not silently exposed.

## Link audit
- Admin All Pages list: 42 unique destinations; public directory: 22 destinations; generated public SEO sitemap/directory: 27.
- Removed deprecated membership, booking, redundant redirects and routes that simply showed the unrelated general AI page under a misleading label. Existing direct legacy routes left intact for old bookmarks/receipts.
- Corrected mobile Approvals & Queue shortcut so it opens its actual approval page, not Executive Memory.
- Replaced cross-domain Digital Twin iframe blocked by same-origin headers with a verified direct Open Digital Twin link. Voice chat may still consume ElevenLabs credits.
- scripts/audit-papa-directory.mjs checks active route mapping, duplicates, retired links, fixed quicklink and iframe.

## Tests executed
- TypeScript tsc --noEmit: PASS
- Worker queue intake test: PASS, explicit independent approval, project validation, zero provider cost and UUID dedup.
- Cloud claim/report test: PASS, only owner-approved tasks, role scope, five-minute lease and completion.
- Mac receipt + installed worker isolated integration: PASS, verified approval mirrored to local queue, no duplicate and actual local worker completes.
- Vite production frontend build: PASS (bundle-size warning only).
- Server esbuild bundle: PASS.
- Directory route/static audit: PASS. No customer data created or production database touched during isolated tests.

## Production boundary, never silently cross
- Production service currently watches GitHub main. Feature branch changes won't appear on phone until explicitly merged and deployed.
- Railway builds and running deployment resources, plus GitHub Actions on a PR/main, may count toward existing paid usage. Verify budget and get owner confirmation before any deploy/merge.
- Generate a NEW >=32-character dedicated machine bearer secret, store privately as 0600 on the Mac, configure AI_BOSS_WORKER_RELAY_TOKEN in the correct Railway service, and confirm the server and Mac copy match without logging it.
- Do an authenticated one-task live test AFTER release, verifying phone submission -> owner approval -> outbound Mac claim -> local worker completion -> cloud report. The worker task itself needs no ElevenLabs model call. Any new paid/provider tests require separate approval.
- Never turn on an always-running relay daemon until the one-shot path is verified; avoid accidental service restarts or broad changes to other workers.
