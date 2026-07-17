# Codex Assignment `PL-MPCR-001`

## Verify the complete $4.99 Membership Checkout-to-Course-11 Customer Journey

> **Authoritative control record:** `docs/Papa_Life_Commercial_System_Master_Production_Control_Record.md`  
> **Assignment owner:** Brian Keith Hill  
> **Master operator:** Manus  
> **Technical builder:** Codex  
> **Priority:** P0 — required before claiming the membership launch is customer-ready

## Objective

Trace the actual paid-customer journey for the active **$4.99/month Papa Life Membership** from checkout through payment, recurring subscription, customer/member record creation, portal account creation, Course 11 entitlement, login communication, member login, and playback of the first and final Course 11 lessons.

The immediate membership fulfillment scope is **Course 11, Lessons 75–86**, comprising twelve audio lessons. The assignment must prove each stage with dated production or authorized test evidence. It must not guess, infer, or mark a stage complete solely because source code exists.

## Scope

| Included | Excluded |
|---|---|
| Existing $4.99/month membership checkout | Wrestling the Silence Away Book audiobook |
| Payment and recurring-subscription event path | Wrestling the Silence Away Podcast series |
| Customer/contact/member record creation | Course 7 and other legacy-course repair |
| Account creation and credential/login delivery | Future individual modules, manuscript PDFs, and bundles |
| Exact Course 11 access for Lessons 75–86 | New product creation unless strictly required to complete a confirmed repair |
| First and final lesson playback | Destructive cleanup, record merging, or historical-data changes |
| Cancellation behavior discovery | Real financial charges without explicit owner confirmation |

## Non-Negotiable Safety and Preservation Controls

1. **Do not make a real payment, refund, cancellation, or billing-provider configuration change** unless Brian Keith Hill explicitly authorizes that exact financial action. Prefer the provider’s authenticated test mode. If test mode is unavailable, document the access condition and stop at the safe boundary.
2. **Do not use, alter, merge, revoke, delete, or overwrite** the following protected records: Darren White; both Joe Muck purchases/records; and Daryl Howell. Before any data-touching test or repair, capture a before-state snapshot or equivalent evidence for each.
3. Create a unique controlled test identity only in an approved test environment. Use an unmistakable non-personal address pattern, such as `pl-mpcr-001-<timestamp>@example.invalid`, and never send a production customer communication to it unless the provider supports safe test delivery.
4. Do not inspect or modify Book/podcast materials during this assignment.
5. Do not use Claude, its endpoints, prompts, models, or legacy automation paths for this assignment. `AUTOMATION_CLOUD_WEBHOOK_URL` is not evidence of payment-to-access completion.
6. Do not alter scope, pricing, trial policy, catalog, member records, or access rules to make a test pass. Repair only a **directly confirmed defect** within existing authorized access, and record the repair evidence in the Master Production Control Record.
7. Never mark an untested component as broken. Use **TEST REQUIRED** until direct evidence shows a failure. Use **BLOCKED BY ACCESS** only when a named credential, permission, production setting, or provider feature is specifically unavailable.

## Required Evidence Record

Create and maintain a dated execution record at:

`docs/codex_assignments/evidence/PL-MPCR-001_execution_record.md`

For every step, capture the observed URL/system, time, test identifier (if any), result, immutable or inspectable evidence location, and resulting status. Update the Master Production Control Record’s **Evidence Ledger** and relevant row only after the evidence exists.

| Evidence item | Minimum proof |
|---|---|
| Checkout rendering | URL, product name, $4.99 monthly price, recurring wording, trial display state, and checkout fields. |
| Provider/payment path | Identified provider and whether a safe test mode exists; test transaction ID only if an approved test succeeds. |
| Subscription creation | Provider subscription/customer status and unique reference. |
| Customer/contact/member creation | Resulting identifiers and deduplication decision; no duplicate records. |
| Account creation | Controlled account identifier, activation state, and login route. |
| Course 11 entitlement | API/admin/portal evidence showing access to Course 11 Lessons 75–86 only as approved. |
| Login delivery | Template/trigger/delivery evidence or a specific failure trace. |
| Login | Successful controlled-member session and access-scope evidence. |
| Lesson 01 and Lesson 12 playback | Player response, HTTP/media result, duration/load state, and entitlement authorization. |
| Cancellation behavior | Discovery of provider policy and event path; do not cancel a real subscription without explicit authorization. |

## Execution Sequence

### Step 0 — Reconfirm the official baseline

Read the Master Production Control Record. Record all existing component statuses before work begins. Treat it as authoritative over prior audits, checklists, and commercial-model references. Confirm that the current membership scope is Course 11 Lessons 75–86 and that book/podcast items are future products.

### Step 1 — Preserve protected existing members

Without changing any record, capture existing access, status, purchases, billing references, and identifiers for Darren White, both Joe Muck records/purchases, and Daryl Howell. Store a redacted evidence summary in the execution record. If their information cannot be inspected safely, record the exact access block and do not proceed with any data-touching operation.

### Step 2 — Inspect the active $4.99 checkout

Open the active membership checkout from the current production route. Confirm that the product is the membership, the displayed base price is **$4.99 monthly**, recurring terms are visible, and the trial display aligns with the no-trial policy. Record the checkout provider, checkout URL, customer fields, tax display behavior, cancellation wording, and any provider identifiers exposed without authentication.

A mismatched customer-facing name is a repair candidate only if the underlying current product and billing behavior are positively identified. Do not change live billing labels without authenticated provider access and owner authorization.

### Step 3 — Identify the payment-to-access event path

Trace every reachable source and configured route from a completed membership payment to account/member creation and Course 11 entitlement. Verify the exact provider event name, signing/authorization requirement, endpoint, product identifier or metadata, idempotency key, and persistence layer. Explicitly determine whether `AUTOMATION_CLOUD_WEBHOOK_URL`, any Make scenario, or legacy contact webhook participates in this path. Do not infer participation from the variable name alone.

If source and live routes disagree, record the exact divergence. Do not deploy merely to resolve it unless an authorized deployment mechanism exists.

### Step 4 — Establish a safe test method

Attempt to locate authenticated **test-mode** access in the active provider or a documented sandbox route. If a safe test mode exists, use the unique controlled test identity and provider-approved test credentials. If only a production payment flow exists, do not charge a real card or submit payment; record **BLOCKED BY ACCESS** or **TEST REQUIRED**, explaining whether the missing element is test mode, authorized payment method, provider login, or production deployment.

### Step 5 — Execute the membership payment trace when safe

Only in the approved test environment, complete one $4.99-equivalent test checkout. Verify that exactly one customer/contact/member record and exactly one recurring subscription result. Confirm that the receipt/confirmation and welcome/login communication are neither duplicated nor omitted. Record all IDs in the execution record, redacting secrets and personal data.

If a direct failure occurs, classify the affected component **NEEDS REPAIR**. Diagnose and repair only the confirmed fault within existing authorized access. Re-run the minimum necessary test to prove the repair.

### Step 6 — Verify account creation and Course 11 access

Using the controlled identity, open the portal login route and authenticate. Verify that the user has access to Course 11, Lessons 75–86. Verify that access is not falsely granted to manuscript PDFs or unrelated future products. If the configured membership scope includes community features, verify them separately without using them as evidence of Course 11 entitlement.

### Step 7 — Verify first and final lesson playback

Play **Lesson 01** and **Lesson 12** as the controlled, entitled user. Confirm that each media route returns buyer-authorized media, the player loads, playback begins, and neither route exposes a public private-resource path. Record HTTP/media evidence and UI/player observations. The two tests are representative controls for all 12 linked masters; do not claim all 12 are playback-verified unless all 12 are actually tested.

### Step 8 — Discover cancellation behavior safely

Inspect the provider and application handling for cancellation, payment failure, renewal, reversal, and duplicate event behavior. Do not cancel an active production subscription without exact owner approval. Report whether the policy preserves or revokes Course 11 access, and whether that behavior is implemented, tested, or unknown.

### Step 9 — Repair and update control records

Repair any direct confirmed defect within authorized repository, configuration, or integration access. Before modifying code, reproduce the failure and record it. After modifying, run the relevant static checks, production build, targeted tests, and controlled retest. Update only the relevant Master Production Control Record status row and Evidence Ledger entry with dated proof.

### Step 10 — Stop and hand off

Stop immediately if progress requires a real financial transaction, new provider credentials, a production deployment permission, a CAPTCHA, a customer’s private credentials, or an owner-only commercial decision. Record the exact unmet requirement and the next single action. Do not ask Brian to troubleshoot code or navigate a platform unless his authorization or credentials are the only remaining block.

## Acceptance Criteria

| Journey stage | Pass condition | Failure status if direct evidence disproves it |
|---|---|---|
| Checkout | $4.99 monthly membership checkout renders with correct recurring/no-trial terms. | **NEEDS REPAIR** |
| Payment event | A safe test payment produces exactly one verified completed event. | **NEEDS REPAIR**; otherwise **TEST REQUIRED** or **BLOCKED BY ACCESS** |
| Subscription | One recurring subscription is created and associated with the test identity. | **NEEDS REPAIR** |
| Customer/member record | Exactly one deduplicated record exists, with no protected-record change. | **NEEDS REPAIR** |
| Account | Controlled account is created or linked, and the login path works. | **NEEDS REPAIR** |
| Course 11 | Controlled user can access Lessons 75–86. | **NEEDS REPAIR** |
| Welcome/login communication | Exactly one expected message or verified configured delivery event exists. | **NEEDS REPAIR** |
| Lesson 01 | Entitled playback begins through a protected route. | **NEEDS REPAIR** |
| Lesson 12 | Entitled playback begins through a protected route. | **NEEDS REPAIR** |
| Preservation | Darren White, both Joe Muck records/purchases, and Daryl Howell remain unchanged. | **NEEDS REPAIR** |
| Cancellation | Policy and event path are identified; no unapproved cancellation occurs. | **TEST REQUIRED** unless direct failure is proven |

## Required Final Codex Update

End the assignment by updating the Master Production Control Record and then report only these four fields:

**Working now:**  
**Needs testing:**  
**Confirmed problem:**  
**Next action:**  

Do not issue a generic summary, create a competing readiness report, or refer work to Claude.
