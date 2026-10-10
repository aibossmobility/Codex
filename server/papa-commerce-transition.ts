import type { Express } from "express";
import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { getCommerceProductByCode } from "./commerce-entitlements";

/**
 * November 1, 2026 at midnight America/Los_Angeles (PDT at that moment).
 * Public checkout routes must not claim donation = membership after this instant.
 * Existing lifetime/purchased entitlements are never deleted by this transition.
 */
export const PAPA_SUPPORTER_CUTOVER_AT = "2026-11-01T07:00:00.000Z";
export const PAPA_SUPPORTER_CUTOVER_MS = Date.parse(PAPA_SUPPORTER_CUTOVER_AT);
export function isPapaSupporterMode(nowMs: number = Date.now()) {
  return nowMs >= PAPA_SUPPORTER_CUTOVER_MS;
}

/**
 * Temporary protection for pre-cutover paid members.
 * Do not silently revoke their streaming benefits on the policy switch.
 * A verified paid-through date and subscription closeout must replace this
 * safeguard before the final release; it does not create new membership sales.
 */
export function hasLegacyPrepaidStreamingRights(
  member: { status?: string; payment_status?: string; enrolled_at?: string | null; created_at?: string | null } | null | undefined
) {
  if (!member || member.status !== "active" || member.payment_status !== "paid") return false;
  const enrolledMs = Date.parse(String(member.enrolled_at || member.created_at || ""));
  if (!Number.isFinite(enrolledMs) || enrolledMs >= PAPA_SUPPORTER_CUTOVER_MS) return false;
  // Before changeover, legacy memberships retain their original terms.
  // After changeover, retain existing pre-paid rights pending provider reconciliation.
  return true;
}

export function papaPublicPriceCents(product: {
  code: string;
  price_cents: number;
  public_price_cents: number | null;
}) {
  if (product.public_price_cents != null) return product.public_price_cents;
  if (product.code.startsWith("curriculum.digital.module.") || product.code.startsWith("curriculum.manuscript.module.")) return 1499;
  if (product.code === "curriculum.digital.complete") return 7900;
  if (product.code === "curriculum.bundle.complete") return 12900;
  return product.price_cents;
}

export function registerPapaEstimateRequestRoutes(
  app: Express,
  db: Database.Database,
  notify: (message: { event_type: string; subject: string; summary: string; payload: unknown }) => Promise<unknown>
) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS papa_estimate_requests (
      id TEXT PRIMARY KEY,
      product_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quoted_subtotal_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'usd',
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'estimate_requested',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_papa_estimate_request_status
      ON papa_estimate_requests(status, created_at);
  `);

  app.get("/api/public/papa-commerce-policy", (_req, res) => {
    res.json({
      effective_at: PAPA_SUPPORTER_CUTOVER_AT,
      active: isPapaSupporterMode(),
      donation: { suggested_cents: [499, 500], optional: true, unlocks_content: false, automatic_conversion: false },
      purchase: {
        steps: ["item and posted price", "written estimate and agreement", "customer reviews and signs", "verified deposit/payment request", "payment confirmed", "receipt/invoice and fulfillment"],
        estimate_required: true,
        signature_before_payment: true,
        deposit_terms: "50% upfront and 50% on completion only when the accepted agreement specifies this; standalone goods can require full payment under their estimate.",
      },
    });
  });

  app.post("/api/public/papa-estimate-requests", async (req, res) => {
    if (!isPapaSupporterMode()) {
      return res.status(409).json({ ok: false, error: "The new Papa Life estimate process begins November 1, 2026." });
    }
    const name = String(req.body?.name || "").trim().replace(/\s+/g, " ");
    const email = String(req.body?.email || "").trim().toLowerCase();
    const productCode = String(req.body?.product_code || "").trim();
    const note = String(req.body?.note || "").trim();
    if (name.length < 2 || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || note.length > 1500 || productCode.length > 100) {
      return res.status(400).json({ ok: false, error: "Provide your name, email and selected product; keep your note under 1,500 characters." });
    }
    const product = getCommerceProductByCode(db, productCode);
    if (!product || !product.active || product.format === "membership") {
      return res.status(404).json({ ok: false, error: "That Papa Life item is not available for an estimate." });
    }
    const subtotalCents = papaPublicPriceCents(product);
    if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
      return res.status(503).json({ ok: false, error: "A verified price is not available for this item." });
    }
    const recentDuplicate = db.prepare(`
      SELECT id FROM papa_estimate_requests
      WHERE contact_email = ? AND product_code = ?
      AND created_at >= datetime('now', '-5 minutes')
      LIMIT 1
    `).get(email, product.code) as {id: string} | undefined;
    if (recentDuplicate) {
      return res.json({ ok: true, reference: recentDuplicate.id, status: "estimate_requested", duplicate: true });
    }
    const reference = "PL-EST-" + nanoid(12);
    db.prepare(`
      INSERT INTO papa_estimate_requests
      (id, product_code, product_name, quoted_subtotal_cents, currency, contact_name, contact_email, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(reference, product.code, product.canonical_name, subtotalCents, product.currency, name, email, note);
    // Notification is best-effort: the request is stored even if no email provider exists.
    void notify({
      event_type: "papa_estimate_requested",
      subject: `Papa Life estimate request ${reference}`,
      summary: `Papa Life estimate request ${reference}\nItem: ${product.canonical_name}\nAdvertised subtotal: ${subtotalCents} cents ${product.currency}\nCustomer: ${name} <${email}>\nNotes: ${note}\nPrepare signed estimate, then arrange payment. Do not issue an invoice without verified agreement.`,
      payload: { reference, product_code: product.code, subtotal_cents: subtotalCents, contact_email: email },
    }).catch(() => {});
    return res.status(201).json({
      ok: true,
      reference,
      status: "estimate_requested",
      product: product.canonical_name,
      subtotal_cents: subtotalCents,
      currency: product.currency,
      tax_notice: "Applicable tax and any payment schedule must be disclosed in the final written estimate before approval.",
      next_step: "Your request has been recorded. An estimate is not yet signed or invoiced.",
    });
  });
}
