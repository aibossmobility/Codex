# AI Boss Mobility: read-only GoHighLevel agreement verification

The module server/ai-boss-ghl-signed-document.ts reads HighLevel Documents & Contracts via GET /proposals/document with Version: v3 and exactly the AI Boss Mobility Consulting location ID. The caller must supply the expected document ID, signer contact ID/email, document name, revision, and deposit-document amount. The document must be completed/accepted, not deleted or expired, with the correct primary signer and a completed customer signature field.

A successful lookup proves only **provider-reported signature status and document metadata**. It does **NOT** prove that the signed PDF bytes match the archived signed scope, and it does **NOT** verify that the 50% deposit has been paid. The module intentionally returns scopeBytesVerified=false, depositPaymentVerified=false, authorizedToEnroll=false, invoiceSent=false.

For production:
- Use a dedicated read-only Documents & Contracts token from the correct AI Boss GHL location, separate from the contact-write and purchase-verification tokens. It is not yet provisioned.
- Independently fetch/archive the immutable signed document, compare its SHA-256 and acceptance criteria to the versioned client agreement, and independently verify the exact deposit transaction and company location before starting work.
- Do not invoke this verifier from an untrusted public input directly.
- Do not activate customer-facing estimate/contract/invoice workflows based only on this metadata.
- The customer acceptance invitation system remains OFF until actual preview delivery, signed evidence, verified backup and token delivery are tested end-to-end.

Provider documentation: https://marketplace.gohighlevel.com/docs/ghl/proposals/list-documents-contracts/
