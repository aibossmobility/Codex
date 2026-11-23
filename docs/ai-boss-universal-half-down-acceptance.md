# AI Boss Mobility — universal 50%-down acceptance policy

**Applies to every AI Boss Mobility service sold with 50% due upfront.**
Service-specific acceptance criteria vary; the required controls never do.

## Non-negotiable sequence
1. Store an immutable signed scope and independently provider-verified 50% deposit.
2. The production agent builds the customer's specific purchased deliverables, with version and source references.
3. An independent quality agent (not the building agent) executes every signed acceptance criterion against the real target system, recording observed results and evidence links, not just a model's "done" assertion.
4. A separate backup destination stores the deliverable/version. The backup verifier must retrieve/restore a copy and compare SHA-256 with the completed artifact. A path or claimed backup is insufficient.
5. Give the customer a preview and evidence report. The customer may accept or request repairs. A change request blocks final invoicing; new builds invalidate earlier QA, backup verification and acceptance.
6. Only after QA passed + restored backup verified + customer explicitly accepted may the final 50% invoice be authorized for dispatch.
7. Final payment must then be independently verified before access/ownership handoff; retain restoration details, QA evidence, signed terms, acceptance, transaction references and handoff receipts.

## Separation of duties
- The builder and quality checker must have different identities.
- The builder and restore verifier must have different identities.
- Customer approval must originate from an authenticated, provider-verified customer action; internal AI, staff or customer-facing email text may not assert it.
- Tests require expected and observed results and evidence for every signed criterion. A failed or missing test is a fail.
- No routine founder approval. Exceptions may be escalated for financial/security/access problems; ordinary revisions return to AI producer and independent testers.

## Current engineering boundary
The shared module server/ai-boss-half-down-quality-gate.ts provides an evidence-based order gate for any enrolled AI Boss 50%-deposit service code, without hardcoded product names. Its database tables retain versioned decisions and audit events.

It does not send invoices, charge cards, run live customer tests, perform backups by itself, or authenticate signature/customer portal webhook events. Verified provider integrations, real test-runner adapter, independent backup reader/restore, the final-invoice dispatch gate, and final-payment-to-handoff connection must be implemented and tested separately. Until then, do NOT publish an automated final-invoice workflow or completion claim. Eligibility in this module does not establish a live ready system.

## Integration acceptance tests
- Signed agreement plus exact deposit provider transaction matched to the correct AI Boss location.
- All acceptance criteria saved before build; all checked against actual target system.
- Test failures block final payment request.
- Backup unavailable, wrong location, or mismatch on restore blocks final payment request.
- Customer changes requested, stale approval, and modified versions block final payment request.
- Successful independent QA, verified restored backup and authenticated customer acceptance create one authorization for only the remaining 50%.
- Duplicate webhook/order replay never creates duplicate invoices or charges.
- Secure final delivery waits for verified final payment; customer copy and independent backup remain retrievable.
