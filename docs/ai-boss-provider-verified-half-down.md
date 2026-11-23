# AI Boss Mobility — real GoHighLevel signed-deposit verification

Applies to ALL AI Boss Mobility services requiring 50% down.

## Read-only verifier checks

- Exact expected order comes from trusted business agreement/offer registry, NOT a public form.
- Payment-read token fetches transaction and order in the AI Boss location qJ83IIaK5y2ZPHzLfGG1. Transaction must be live, succeeded, nonrefunded, nonrecurring, and for exactly 50% in USD. Order, contact and customer email must match.
- The order/transaction must directly link to the expected GHL document ID. Invoice-origin payments without a confirmed link are BLOCKED until a provider-supported reconciliation exists.
- A distinct documents-read token checks the correct signed document revision, primary signer, completed signature field, and matching deposit amount through GET /proposals/document.
- The payment must occur AFTER signing.

## Critical boundary

The verifier does not enroll or build customer work, send invoices or money, or confirm the immutable PDF file. Even complete provider metadata and deposit verification return signedAgreementBytesArchived=false, productionAuthorized=false, finalInvoiceAuthorized=false, and invoiceSent=false.

Document-list metadata is not signed-scope PDF bytes. We need a trusted signed PDF download and archived checksum before production, plus independently verified customer-system permissions.

## Credential status

The existing AI_BOSS_GHL_API_TOKEN is present in the Papa Life Railway service but its payment-read permission must be verified live. On November 23, 2026, a new AI Boss subaccount Private Integration named AI Boss Signed Agreements - Read Only was created with ONLY documents_contracts/list.readonly. Its one-time credential has NOT yet been securely installed as AI_BOSS_GHL_DOCUMENTS_READ_TOKEN.

Never share that token in conversation, logs, or source control. Connect it using Railway's secured Variables interface and verify a harmless read-only request.

## Testing and launch guard

Unit tests use explicitly labeled internal synthetic provider responses. No customer is created, contacted, billed, or enrolled. Final invoice remains blocked until signed PDF archived, successful build, signed independent QA, restored backup, authenticated customer acceptance, verified balance payment, and secure handoff.

Sources:
https://marketplace.gohighlevel.com/docs/ghl/proposals/list-documents-contracts/index.html
https://marketplace.gohighlevel.com/docs/ghl/payments/get-transaction-by-id/index.html
https://marketplace.gohighlevel.com/docs/ghl/payments/get-order-by-id/index.html
