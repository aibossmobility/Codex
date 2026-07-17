# Papa Life Commercial System

## Canonical Commercial Model

Papa Life operates one recurring community membership and a separately purchased twelve-module curriculum. **Papa Life Membership costs $4.99 per month and grants community-area access only.** It does not include the Papa Life Audio Curriculum. Curriculum purchases grant permanent product-specific access and do not depend on an active community membership.

All displayed amounts are **base prices before tax**. The payment provider must calculate applicable tax from the customer's location, show that tax before payment confirmation, and charge the displayed subtotal plus tax. Application entitlement checks validate the approved pre-tax subtotal when a provider sends one.

| Product family | Billing | Base price | Access |
|---|---:|---:|---|
| Papa Life Membership | Monthly recurring | $4.99 | Community and membership area only |
| Individual digital/audio module | One time | $9.99 | The purchased lesson only |
| Individual manuscript PDF | One time | $9.99 | The purchased protected PDF only |
| Complete 12-module digital curriculum | One time | $59.00 | All twelve digital/audio lessons |
| Complete digital curriculum plus manuscripts | One time | $99.00 | All twelve digital/audio lessons and all twelve protected PDFs |

## Canonical Product Codes

The application seeds twenty-seven active catalog records: one membership, twelve digital modules, twelve manuscript products, and two complete-program bundles. The following product codes are stable commerce identifiers and must be copied into Stripe or HighLevel metadata exactly.

| Product | Product code | Base price | Billing |
|---|---|---:|---|
| Papa Life Membership | `membership.community.monthly` | $4.99 | Monthly recurring |
| Complete 12-module digital curriculum | `curriculum.digital.complete` | $59.00 | One time |
| Complete digital curriculum plus manuscripts | `curriculum.bundle.complete` | $99.00 | One time |
| Digital module 01 through 12 | `curriculum.digital.module.01` … `curriculum.digital.module.12` | $9.99 each | One time |
| Manuscript module 01 through 12 | `curriculum.manuscript.module.01` … `curriculum.manuscript.module.12` | $9.99 each | One time |

The two complete-program products are true application bundles. `curriculum.digital.complete` expands to all twelve digital module products. `curriculum.bundle.complete` expands to all twelve digital module products and all twelve manuscript products.

## Membership, Curriculum, and Legacy Access

The member session exposes separate `community`, `curriculum`, and `manuscripts` scopes. Community pages, journal content, brotherhood features, events, and the general resource library remain restricted to active Papa Life Membership customers. Curriculum-only buyers can authenticate and access purchased lessons or purchased manuscripts without being treated as active community members.

The new model is additive. Historical member, course, lesson, and explicit legacy course-access records are preserved. The product catalog and purchase-event tables do not delete, rename, or overwrite historical customer records.

## Enrollment and Checkout Flow

The canonical membership entry point is `/go/join`. That route now records campaign attribution and redirects to the native `/join` page instead of bypassing intake. The native page uses the existing Papa Life intake component, saves the lead through `POST /api/leads`, and only then opens the verified $4.99 membership checkout.

> The application intentionally does not fabricate curriculum checkout links. Curriculum product pages and external provider identifiers remain unset until an authenticated Stripe or HighLevel billing administrator creates and verifies the corresponding live objects.

## Commerce Tables

The additive schema includes the following tables.

| Table | Purpose |
|---|---|
| `commerce_products` | Canonical product, price, tax, provider, and delivery mapping |
| `commerce_product_components` | Bundle-to-component expansion |
| `member_product_entitlements` | Buyer-specific active or revoked product access |
| `commerce_events` | Idempotent payment-event processing and error history |

## Payment Event Contract

Payment providers and automation platforms must call `POST /api/webhooks/commerce-paid` only after a completed payment. The route uses the existing `PAYMENT_WEBHOOK_SECRET` authentication boundary and the same supported authorization pattern as the existing membership payment webhook.

A minimum normalized payload is:

```json
{
  "provider": "stripe",
  "event_id": "evt_or_checkout_session_id",
  "type": "checkout.session.completed",
  "product_code": "curriculum.digital.complete",
  "email": "buyer@example.com",
  "payment_status": "paid",
  "amount_subtotal": 5900
}
```

The handler requires a unique provider event or transaction ID, a valid active canonical product code, a completed payment status, and an existing Papa Life member found by member ID or intake/account email. If `amount_subtotal` is supplied, it must equal the approved pre-tax product price. The event key is idempotent, so repeated provider deliveries do not create duplicate access grants.

The payment provider should send the canonical `product_code` in product or checkout metadata. For Stripe, put it in metadata on the product or Payment Link/Checkout Session and map it into the normalized webhook payload. Tax is not included in `amount_subtotal`; the provider's tax and total fields may be retained in the raw event for audit.

## Secure Manuscript Delivery

Each manuscript purchase resolves to a protected server-side PDF in `server/private-resources/papa-life-manuscripts`. The files were created as delivery copies from the canonical Google Drive DOCX masters. The production masters remain unchanged.

Authenticated buyers retrieve their available manuscripts from `GET /api/member/manuscripts`. A download request to `GET /api/member/manuscripts/:code/download` is authorized against the exact active manuscript entitlement or the complete $99 bundle. Files are streamed from private server storage and are never exposed through a public static URL.

The production build runs `scripts/copy-private-resources.mjs` before bundling the server. This preserves the protected delivery files under `dist/private-resources` without placing them in `dist/public`.

## Secure Audio Delivery Repair

Five canonical audio masters—modules 1, 3, 4, 7, and 11—were not playable to unauthenticated customers through their existing Google Drive preview URLs. Approved delivery copies are stored under `server/private-resources/papa-life-audio`; the Google Drive production masters and their permissions remain unchanged.

For an entitled buyer, the course response substitutes the protected endpoint `GET /api/member/audio/:lessonId` for those five modules. The endpoint validates an exact digital-module entitlement or an explicit legacy course grant before streaming the MP3 from private server storage. Unentitled buyers receive no content URL, and the audio files are not placed under `dist/public`.

## Administrative Controls

Authenticated administrators can inspect the canonical catalog, list a member's product entitlements, grant an approved product entitlement, or revoke a product entitlement. Product grants do not change community membership status. Community membership changes do not grant curriculum or manuscript products.

The commerce webhook accepts existing intake/account buyers only. This prevents an unauthenticated provider payload from creating a broad member account or granting community features. Customers must complete intake and account creation before product access is provisioned.

## Live Billing Handoff

Authenticated Stripe or HighLevel billing access is required to finish the provider side. The provider administrator must create or reconcile the twenty-seven canonical objects, keep prices tax-exclusive, enable automatic tax where supported, add the exact canonical `product_code` metadata, create verified purchase links, and register completed-payment events with the commerce webhook.

| Required provider task | Application readiness |
|---|---|
| Create/reconcile products and prices | Catalog and exact product codes are ready |
| Set automatic tax and exclusive tax behavior | Application prices and validation are tax-exclusive |
| Add metadata | `product_code` contract is ready |
| Create curriculum checkout links | Catalog can store provider and checkout identifiers |
| Register completed-payment webhook | Idempotent provisioner is ready |
| Test payment, tax, receipt, welcome, and access | Application tests pass; live provider test remains required |

No live curriculum checkout should be marketed until all provider IDs, links, tax settings, and webhook delivery are verified in production.

## Validation

The implementation passes TypeScript validation, the full production build, protected-resource packaging verification for twelve PDFs and five repaired MP3 delivery copies, audio file-type validation, and isolated commerce tests. The deterministic test suite verifies the twenty-seven-product catalog, approved prices, tax-exclusive behavior, individual digital access, individual manuscript access, $59 bundle expansion, $99 bundle expansion, revocation, and payment-event idempotency.

The final live acceptance test must use provider test mode or an approved real purchase/refund sequence. It must verify intake, checkout, tax display, successful charge, receipt, welcome email, account access, exact lesson/PDF access, duplicate-event safety, and clean status tracking.
