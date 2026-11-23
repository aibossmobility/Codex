# AI Boss Mobility — customer acceptance after independent QA (all 50%-deposit services)

## Required order of events

1. A customer's signed agreement and exact 50% deposit are independently verified with GoHighLevel/provider records. A submitted intake form, redirect, or seller-authored payment marker is not proof.
2. The assigned AI production worker delivers the **versioned, signed-scope** implementation.
3. A separate QA worker executes the agreement's acceptance criteria against authorized systems, signs the result with its own Ed25519 key, and its public signature is verified in the trusted order service.
4. A separate backup worker retrieves/RESTORES the actual finished version from independent storage and checks the SHA-256 against the exact delivered artifact.
5. An authorized customer preview system displays the completed deliverables and test results.
6. Only then does the internal acceptance issuer create a random, one-time, time-limited customer token. The issuer is **not a public HTTP endpoint**. The token must be delivered to the email on the provider-verified order by a trusted email service.
7. The customer reviews the preview, explicitly **accepts** or **requests changes**, and writes an explanation. A correction request blocks final invoicing and requires a new build, QA, backup, and invitation.
8. The final invoice may be prepared only after verified acceptance; its actual send remains a separate protected provider integration and is **not activated** by these modules.

## Current implementation

- Single-use acceptance token is SHA-256 hashed at rest, scoped to exact order, service, version, scope SHA, QA gate SHA, restored-backup SHA and latest signed QA + backup event IDs. Default 72h expiration, maximum 7 days, with revocation on new invitations.
- The acceptance function rejects token replay, expired tokens, wrong versions, unsigned QA results, self-review, stale backup verification, unaccepted work, and mismatched customer emails.
- Customer response requires the review attestation, an explicit acceptance checkbox when accepting, and meaningful notes.
- Any renewed QA or backup check invalidates outstanding links, even if the file checksum is the same. Customer objections also block further invitations until the builder submits a new version.
- HTTP preview/decision endpoints exist but are **OFF unless AI_BOSS_ACCEPTANCE_PORTAL_ENABLED=true**. They cannot issue links, send messages, charge money, or authorize invoices. DO NOT enable until real provider verification and customer preview/email adapters pass end-to-end tests.

## Known integration blockers — do not claim live acceptance

- Current order ledger can store synthetic-looking provider references. The company must implement provider-side, AI Boss location-isolated verification of the actual signed GoHighLevel document and 50% deposit before trusting production enrollment.
- The current preview evidence is an internal reference string; there is no verified customer-facing preview delivery adapter yet. A fabricated reference must not be accepted as proof of real work.
- The customer email delivery and single-use link UX do not yet exist, and a token is merely a proof of control of its delivery channel, not legal identity verification.
- Customer-specific CRM, workflow, email, calendar and permission-based integration QA must be executed against the actual agreed service, not this internal local test fixture.
- The signed QA report's signed-criteria digest must ultimately be matched to a trusted provider-signed agreement/criteria registry; a SHA-looking string alone is insufficient.
- All final-invoice dispatch and customer delivery workflows remain unactivated until a tested invoice provider and final-payment confirmation adapter enforce the whole acceptance gate.

No subscriptions, live payments, customer messaging, or customer purchases are enabled by these changes.
