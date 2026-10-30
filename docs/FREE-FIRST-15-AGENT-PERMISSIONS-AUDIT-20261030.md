# Zero-new-cost agent capability and permissions inventory — 2026-10-30

## Verified structure
The canonical owner-approved model has 15 actors: 1 Digital Brian conversational interface, 1 Papa Life OS dispatcher, 4 directors, and 9 specialist roles (brand/assets, prospect research, outreach, content distribution, SEO/website, CRM/sales, finance records, scheduling, quality/compliance). The newer server assignment roster has 12 selectable roles including GHL customer service, while Brand & Digital Assets and Prospect Research are specialized local workers rather than selectable remote roster entries. Those counts are different abstractions, not evidence that all 15 can run paid orders.

## Capability findings
- **Existing Mac worker v1**: role-aware read-only observation; cannot produce files, send emails, change GHL, or deploy. Never use a v1 completion receipt as proof of fulfillment.
- **Existing Mac worker v2**: several allowlisted local skills already implemented (website/asset preparation, approved quality checks, limited local director scope). These need their specific approved skill route; assigning a task to v1 will not give it write capability. No generic remote shell.
- **Papa Life verified sale**: currently accepts only approved exact GHL product/price mappings and grants existing digital-library entitlements. This works for its covered digital catalog; it does not manufacture a consulting report.
- **Workspace**: local Drive and Calendar connector is currently read-only. Gmail has had invalid_grant errors. Writing customer deliverables to Drive or sending email requires verified authorization.
- **HighLevel included**: Workflow AI builder, Generate with AI, Funnel AI, and Email AI are described by vendor as included/free subject to restrictions. **Agent Studio is token-billed; Managed Agents may bill**, and certain workflow AI premium actions bill per execution. Do not assume the agency's plan makes any generative action free.
- **Google Gemini developer free tier**: limited free tokens on certain models, but production-account availability, privacy terms, rate limits and quota controls are not yet verified; no customer-data routing authorized.
- **Local Ollama**: $0 local inference is possible in principle; no daemon is running on this Mac mini. Install only after hardware suitability, model license, and owner no-cost authorization are checked.
- **Digital Brian**: conversation interface is not a worker that can silently execute external financial or account actions; use authenticated backend endpoints with explicit permissions.

## Free-first assignment policy
1. Canonical product lookup, quoting, order tracking and immutable amount checks: local deterministic routines; no LLM tokens needed.
2. Local drafting and file generation: existing v2 allowlisted Mac worker skills; never accept arbitrary commands from customer prompts.
3. QA: local automated tests plus a separate quality worker; failing tests block release.
4. Existing Papa Life PDFs and audio: grant verified access from owned catalog after exact payment validation.
5. GoHighLevel workflow builder: use only actions confirmed free and existing within the relevant *separate* location.
6. Gemini: only if verified no-cost tier, no billing overrun, consent and appropriate handling of customer data.
7. Outside agent marketplaces: evaluate privacy, licensing, security, API access and actual usage costs before installing or granting client-data access.

## Missing permissions to grant through constrained tools, not role-name changes
- Website/SEO: allowlisted write to a disposable or version-controlled preview workspace; existing v2 skills, owner-approved production release.
- CRM/Sales: fixed-scope quote generation can be automatic; customer agreements and GHL changes need authenticated named actions and audit receipts.
- Directors: limited dispatch to existing capabilities; no general root or shell access.
- Finance Records: verify a known transaction and amount, read-only provider details, durable receipt; never initiate refunds or charges by default.
- Quality/Compliance: independent read-only artifact inspection + allowlisted pass/fail status update only.
- Distribution: deliver pre-approved file/access only after payment and QA with customer identity checks; no unrestricted bulk sending.
- Customer Service: permitted access recovery and explanations; authentication and rate limits; no disclosure of other customer purchases.
- Google Workspace: validate scopes, accounts, two-way sync, then individually authorize necessary write operations.
- Brand assets and Prospect Research: remain specialist internal tasks; use approved source material and no scraping private customer information.

## Gate before making a product checkout active
Demonstrate brand isolation, approved fixed scope, exact price, authenticated payment proof, durable work queue, worker execution, QA evidence, customer delivery, retry without charging twice, and failed-delivery recovery. Live charging is forbidden as a testing shortcut.

## Reference documentation (current as of 2026-10-30)
HighLevel: https://help.gohighlevel.com/support/solutions/articles/155000006652-ai-product-pricing
Gemini: https://ai.google.dev/gemini-api/docs/pricing
Ollama: https://registry.ollama.com/pricing
