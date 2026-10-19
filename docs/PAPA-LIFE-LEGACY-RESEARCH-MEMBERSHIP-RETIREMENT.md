# Papa Life OS legacy iShareHow / membership retirement
2026-10-18

## Purpose
Papa Life OS is now the owner command center for existing authenticated workers, approvals, site operations, and digital services. It must not require or invoke the old Research Lab / Unified Orchestrator / iShareHow membership flow.

## Changes in this local branch
- The approved worker assignment and Approvals & Queue pages use the existing Papa Life administrator session, never Research Lab allowlisting.
- Hidden the Research Lab and Members navigation from normal admin views. The old /research-lab bookmark redirects to Papa Life OS.
- Replaced the Human Impact shortcut with Daily Work Reports; reports are stored in Papa Life's existing database, with no outbound journal transmission.
- Disabled old Make/iShareHow cloud forwarding even if historical cloud URL variables are set. Local GoHighLevel contact alerts are preserved.
- Retired new member account registration and the old membership CTA. Member checkout had already been closed; existing member records, signed agreements, payment history, and historical portal access are not deleted.
- The GoDaddy preview workflow was removed in the preceding commit; Railway hosting and domain registrations are unchanged.

## Security and verification
- Owner/admin login, per-assignment approvals, and the zero-purchase read-only worker scope remain in force.
- No iShareHow or Research Lab credentials are configured on the Railway production service (verified October 18).
- Local worker intake, cloud relay, and Mac poller tests passed; TypeScript and build passed.
- No production deployment, customer send, payment, DNS change, or membership record deletion is part of this local change.

## After explicit production publishing approval
- Merge protected GitHub branch and wait for Railway to deploy healthy.
- Confirm normal admin can queue and approve without Research Lab access.
- Check that new membership registration returns 410, Research Lab route redirects, and daily reports save locally without contacting the legacy server.
- Submit and approve one no-cost read-only website-worker assignment from Android; verify the Mac receipt and completion.
