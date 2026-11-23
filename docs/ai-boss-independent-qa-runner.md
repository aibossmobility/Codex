# AI Boss Mobility — independent acceptance testing (all 50%-down services)

This is a read-only QA runner plus signed evidence adapter, not automated invoicing and not a full customer-fulfillment agent.

## Trust and prerequisites

1. The signed agreement registry, rather than the customer's submitted text or builder, supplies the exact expected scope SHA-256, artifact SHA-256, and acceptance-criteria SHA-256.
2. The operator supplies an exact trusted origin allowlist. The runner rejects URLs not in it, non-HTTPS public endpoints, URL credentials, query strings, redirects, private-IP DNS results, large responses and requests that would modify a remote system.
3. All acceptance criteria must match the signed-criteria digest and correct build version. Supported evidence checks in this iteration are read-only HTTP GET status/content and local artifact SHA-256. The runner records observed results, response digests, timestamps, run ID and explicit failures.
4. The builder must not hold the QA worker's Ed25519 private signing key. Store that key only with the separate QA agent. Only its PUBLIC key is configured on the server that ingests signed QA reports.
5. The protected adapter recordSignedHalfDownQa checks the signature, report integrity, current order/version, signed scope, every acceptance criterion, non-builder QA identity and duplicate run IDs. A report moves only the QA evidence gate. A pass alone does not release invoices or customer data.
6. A separately restored backup and authenticated customer acceptance are still mandatory before authorizing the second 50%.

## Boundaries that must not be confused with completion

- The runner is not yet connected to a customer portal, live GoHighLevel final-invoice action, deposit webhook, or live service-building worker.
- Success in a local authorized fixture does not prove real customer CRM/email/scheduling integrations: those require separate authenticated, read-only provider adapters or safely scoped test accounts.
- A signed report does not establish customer acceptance, backup recoverability, or payment authorization.
- The app must obtain the Ed25519 public verification key through trusted configuration, not through a request body.
- A customer's agreement/criteria must be bound to real provider-verified signature and payment events. The shared ledger's basic references are not a substitute for provider-side verification.

## Internal test strategy

- Test a local server whose responses prove both passing and failing scenarios.
- Confirm that missing response markers, HTTP errors, redirects, changed scopes, unapproved targets or bad artifact digests fail.
- Use an ephemeral signing key to ensure report tampering fails signature verification.
- Use an in-memory order ledger to verify a valid signed QA record still cannot authorize final invoicing without verified backup and customer acceptance.
- Keep live billing and customer messages disabled during testing.

## Remaining integration work

Add trusted signed-agreement criteria registry, provider-specific CRM/email/scheduler verification, separate backup restoration, customer acceptance verification and a GoHighLevel invoice-dispatch adapter that calls the shared final-invoice gate with idempotency safeguards. No component should both build and approve a completed order.
