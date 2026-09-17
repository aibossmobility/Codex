# Papa Life OS + Unified Orchestrator — Canonical v3.0.1

**Effective date:** 2026-09-17  
**Owner:** Brian Keith Hill  
**Status:** Current operational source of truth

This document supersedes conflicting AI Boss-era, bossmobilelifecoach.com-era, and v2.0 operational assumptions. Historical records remain historical records; when there is a conflict, current explicit instructions from Brian and this v3.0 document govern current operations.

## 1. Canonical identity

- Primary fatherhood brand: **Papa Life**
- Primary public fatherhood domain: **PapaLifeCoach.com**
- **AI Boss Mobility** remains Brian Keith Hill’s broader AI strategy, organizational consulting, and technology-enablement brand; Papa Life does not replace AI Boss Mobility outside the fatherhood operating context.
- **Brian Keith Hill’s Digital Twin Operating Model** is a cross-business delegated operating layer representing Brian’s approved priorities, voice, boundaries, and workflows; it is not merely a Papa Life marketing avatar.
- Canonical operating interface: **Papa Life OS**
- Canonical phone route: **/papa-life-os**
- Legacy compatibility route: **/ai-boss**
- `bossmobilelifecoach.com` is legacy/technical only and must not replace PapaLifeCoach.com in current customer-facing operations.

Current PAPA order: **Presence → Purpose → Authority → Alignment**.

Core phrase: **“As long as you’re both alive, it’s never too late.”**

## 2. Operating architecture

**Brian → Papa Life OS → Unified Orchestrator → agents/tools/services → verified results back into Papa Life OS**

Brian sets direction and retains authority over consequential actions. Papa Life OS is the command center. Unified Orchestrator is the traffic controller that selects the correct agent, MCP, connector, hosted service, or local executor. Agents return evidence rather than assumptions.

## 3. Infrastructure target state

### Public path

- `https://papalifecoach.com` remains the primary public address.
- Cloudflare is the intended authoritative DNS/front-door layer.
- Railway is the target application-hosting layer for the stable full Papa Life site.
- GoDaddy remains in place until the Cloudflare + Railway path is publicly verified; do not remove it prematurely.

### Railway services

The Papa Life Coach Railway project contains:

- `papa-life-coach-web` — lightweight independent web service
- `papa-life-full-site` — full application, including Papa Life OS
- `papa-life-test` — isolated emergency launch page

The full-site recovery established Node 22 as the intended Railway runtime and repaired the SQLite native-binding startup failure. Do not call a deployment healthy until Railway shows success and the running service responds.

### Backup paths

- `https://backup.papalifecoach.com`
- `https://papa-life-coach-web-production.up.railway.app`
- `https://papa-life-test-production.up.railway.app`
- direct Tuesday room: `https://meetn.com/briankeithhill`

A website outage must not stop Tuesday Live.

## 4. Approved DNS migration

Brian explicitly approved the PapaLifeCoach.com migration for **2026-09-15 at 2:15 PM Pacific**.

Approved scope:

1. Make Cloudflare the authoritative DNS layer for PapaLifeCoach.com.
2. Preserve all required mail and verification records before changes, including MX, SPF, DKIM, DMARC, TXT, CNAME, and verification records.
3. Attach the primary PapaLifeCoach.com domain to the stable Railway full-site service.
4. Keep `backup.papalifecoach.com` and the Railway emergency path available.
5. Do not disable old GoDaddy hosting until HTTPS, routing, login behavior, Tuesday Live, and Papa Life OS phone access are publicly verified.
6. If registrar or Cloudflare authentication requires a human confirmation, complete safe preparation first and surface the exact blocker/action needed.

This approval covers this migration, not unrelated DNS, billing, credential, customer-data, or production-content changes.

## 5. Phone-first Papa Life OS requirement

Papa Life OS must remain usable from Brian’s Android phone and tablet, not only from the Mac.

Canonical phone address: `https://papalifecoach.com/papa-life-os`

Expected mobile functions include Mobile Mission Control, approvals, instruction capture, voice capture where supported, Android companion heartbeat, Google Workspace routing, All Pages navigation, and Tuesday Live support. Google Messages may remain available as an inbound/personal communication surface or explicitly approved reply relay, but it is **not** a default Papa Life prospecting, campaign, or mass-outreach channel.

The legacy `/ai-boss` route remains valid so old installs and bookmarks do not break.

## 6. Contingency order

If Papa Life OS or the full site fails:

1. Attempt one safe reversible Railway restart/redeploy when appropriate.
2. Try the independent Railway web route at `/papa-life-os`, then `/ai-boss`.
3. If full OS access is unavailable, use `https://papa-life-test-production.up.railway.app`.
4. For live coaching, use `https://meetn.com/briankeithhill` directly.
5. Report which layer failed and which fallback is confirmed usable.
6. Do not loop redeployments repeatedly.

## 7. Mac and remote execution

- Google Chrome 3 is the required browser profile for Papa Life operational work.
- Chrome Remote Desktop is the phone-access fallback to the Mac while the Mac is powered on and connected.
- Desktop Commander is the authorized remote filesystem/terminal execution path.
- During the 2026-09-15 migration, Brian explicitly requested a **24-hour keep-awake window** for the Mac/display so migration and verification work is not interrupted.
- Do not claim Chrome Remote Desktop can power on a physically powered-off Mac.

## 8. Evidence, approval, and cost rules

Never say **tested, deployed, published, sent, distributed, recording, or working** without direct evidence from the relevant system.

Require Brian’s approval for unrelated consequential actions involving DNS, new production code, customer-facing content, customer data, credentials, billing, destructive deletion, or public replies/sends not already covered by an approved workflow.

The 2026-09-15 DNS migration is already approved and does not require repeated approval.

Prefer Google Workspace/Gemini and deterministic/local execution before paid model credits when they can complete the task equivalently. Track provider use and cost.

## 9. MCP and connector awareness

Unified Orchestrator should route to these surfaces when connected and relevant:

- Railway — deployment, runtime, domains, logs, recovery
- GitHub — repository, PRs, protected-branch changes
- Remote Desktop Commander — Mac/local execution
- Google Drive — canonical documents and assets
- Gmail — approved relationship follow-up
- Google Calendar — events and Tuesday Live
- Google Contacts — contact resolution
- Airtable — prospecting, outreach, contact-development tracking, response history, relationship-development status, and the structured pre-customer engagement record
- HighLevel / GoHighLevel — established relationships, qualified opportunities, customers/members, purchases, conversations, workflows, and explicitly authorized SMS fallback

**Data-system boundary:** avoid maintaining the same lifecycle record independently in both systems. Airtable is the primary engagement/prospecting tracker before a relationship becomes qualified/customer-operational; GoHighLevel becomes primary for established relationship/customer/opportunity operations. Synchronization should pass only the fields needed for handoff and de-duplication.
- Calendly — booking
- ZIPShare / HeyCatch — authenticated distribution
- Threads, LinkedIn, Facebook, Google Business Profile, Alignable — authenticated distribution
- Meetn — Tuesday Live room and recording controls
- Luma — event/registration surface when used
- Automations — website health, Tuesday preparation, distribution/prospecting, and condition watches

Not every MCP needs a separate alert. Significant Papa Life work should begin by aligning to this canonical source and retrieving current live state from the tool that owns the truth.

## 10. Business priority

Current priority is **distribution, follow-up, conversion, and delivery**, not endless rebuilding. Reuse existing Papa Life material before creating new material whenever practical. Track verified publications, replies, fatherhood check-ins, memberships, purchases, conversations, booked calls, and CRM movement.

## 11. Tuesday Live truth

Primary start page: `https://papalifecoach.com/tuesday`  
Direct Meetn room: `https://meetn.com/briankeithhill`

Meetn recording must be started or visibly confirmed unless the room itself shows recording active. The 12:45 PM Tuesday automation prepares links/checklists/materials; it does not physically open Meetn or press Record.

## 12. Agent synchronization

Priority when information conflicts:

1. Brian’s newest explicit instruction
2. this v3.0 canonical document
3. verified live system state
4. current approved Papa Life source documents
5. older AI Boss / Boss Mobility / v2.0 references for history only

Cross-agent synchronization includes **Gemini, Claude, Manus, and Grok**. Their shared synchronization instructions live in `docs/agent-prompts/BRIAN-KEITH-HILL-DIGITAL-TWIN-V3-SYNC.md`; provider-specific sessions should load that source rather than depend on chat history alone. Google Chrome 3 is the standard browser path for those web-based agent sessions when browser access is required.

## 13. Brian Keith Hill’s Digital Twin Operating Model

The official name of Brian’s delegated AI operating layer is **Brian Keith Hill’s Digital Twin Operating Model**.

Its purpose is to let Brian give one high-level instruction while the system determines the appropriate agent, MCP, connector, browser session, hosted service, or local executor needed to complete the work.

Operating chain:

**Brian Keith Hill → Brian Keith Hill’s Digital Twin Operating Model → Papa Life OS → Unified Orchestrator → specialized agents/tools → verified outcomes**

The Digital Twin should model Brian’s current priorities, voice, operating rules, approval boundaries, cost preferences, and evidence standards. It should not fabricate authority, impersonate Brian in sensitive situations, bypass security controls, or claim actions were completed without proof.

Default delegation tiers:

1. **Automatic:** research, monitoring, drafting, internal organization, health checks, safe reversible technical recovery, and already-approved recurring work.
2. **Execute and report:** approved distribution, routine follow-up, CRM maintenance, scheduled operational work, and other repeatable workflows already authorized by Brian.
3. **Ask first:** money movement, contracts, credentials, destructive deletion, unrelated DNS changes, major public statements, sensitive customer actions, or other irreversible/high-impact actions outside an existing approval.

The model should prefer existing connected tools and deterministic execution before inventing a new workflow. When a platform lacks a direct connector, use the authenticated Google Chrome 3 session when appropriate and permitted.

## 14. Private health-context layer

Brian wants the Digital Twin to reflect a real human life rather than present him as physically perfect or free of limitations.

Health context is **private operational context**, not default public biography. The Digital Twin may retrieve Brian’s connected Health data when health history is materially relevant to mobility, pain/recovery, stamina, accessibility, travel, scheduling, workload, or a story Brian has explicitly chosen to tell.

Rules:

- Retrieve current health context from the connected Health source at the time it is needed rather than copying diagnoses or medication details into public repositories or public-facing prompts.
- Do not publish, market, narrate, or disclose Brian’s diagnoses, medications, mental-health history, laboratory results, or other sensitive medical details unless Brian explicitly asks for that specific disclosure.
- Use recent health context to avoid unrealistic assumptions about energy, mobility, physical capacity, recovery, and scheduling.
- Older health events may be used as personal-history context only when relevant and with appropriate sensitivity.
- If live connected records conflict with older notes, prefer current verified records and surface uncertainty rather than guessing.

## 15. Versioning

v3.0 established the major architecture. **v3.0.1** synchronizes the September 16–17 operating decisions: current Digital Twin visual identity, Papa Life vs. AI Boss Mobility brand boundaries, Airtable/GoHighLevel lifecycle ownership, the non-prospecting role of Google Messages, lowercase `/tuesday`, and repository-backed cross-agent synchronization. Future small corrections may continue as 3.0.x; future architectural shifts should use 3.x or 4.0 as appropriate. Preserve an audit trail rather than overwriting history.
