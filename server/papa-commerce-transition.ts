import type { Express, RequestHandler } from "express";
import type Database from "better-sqlite3";

/**
 * Planned launch: October 15, 2026 at midnight America/Los_Angeles (PDT).
 * Change PAPA_SUPPORTER_CUTOVER_AT to a valid ISO timestamp to move the date.
 * This does not enable sales: provider-verified GoHighLevel checkout must be
 * independently approved and tested. Preserve all prepaid entitlements.
 */
export const DEFAULT_PAPA_SUPPORTER_CUTOVER_AT = "2026-10-15T07:00:00.000Z";
const configuredCutover = process.env.PAPA_SUPPORTER_CUTOVER_AT?.trim();
if (configuredCutover && (!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$/.test(configuredCutover) || !Number.isFinite(Date.parse(configuredCutover)))) {
  throw new Error("PAPA_SUPPORTER_CUTOVER_AT must be a valid UTC ISO timestamp");
}
export const PAPA_SUPPORTER_CUTOVER_AT = configuredCutover || DEFAULT_PAPA_SUPPORTER_CUTOVER_AT;
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
  // The former higher public/regular price becomes the sole standard price.
  // Never substitute a discounted member price if a catalog override is lower.
  const establishedRegularPrice =
    product.code.startsWith("curriculum.digital.module.") || product.code.startsWith("curriculum.manuscript.module.")
      ? 1499
      : product.code === "curriculum.digital.complete"
        ? 7900
        : product.code === "curriculum.bundle.complete"
          ? 12900
          : product.price_cents;
  return Math.max(product.price_cents, product.public_price_cents ?? establishedRegularPrice);
}

export function registerPapaEstimateRequestRoutes(
  app: Express,
  db: Database.Database,
  notify: (message: { event_type: string; subject: string; summary: string; payload: unknown }) => Promise<unknown>,
  requireAdmin: RequestHandler
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

  // Estimate queue is private; never expose names, emails or notes publicly.
  app.get("/api/admin/papa-estimate-requests", requireAdmin, (req, res) => {
    const requestedLimit = Number(req.query.limit || 50);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 50;
    const status = typeof req.query.status === "string" ? req.query.status : "";
    if (status && !["estimate_requested", "estimate_prepared", "estimate_sent", "signed_verified", "payment_requested", "deposit_received", "invoiced", "fulfilled", "void"].includes(status)) {
      return res.status(400).json({ ok: false, error: "Invalid estimate status." });
    }
    const records = status
      ? db.prepare("SELECT * FROM papa_estimate_requests WHERE status = ? ORDER BY created_at DESC LIMIT ?").all(status, limit)
      : db.prepare("SELECT * FROM papa_estimate_requests ORDER BY created_at DESC LIMIT ?").all(limit);
    return res.json({ ok: true, records });
  });

  app.get("/api/public/papa-commerce-policy", (_req, res) => {
    res.json({
      effective_at: PAPA_SUPPORTER_CUTOVER_AT,
      active: isPapaSupporterMode(),
      donation: { suggested_cents: [499, 500], optional: true, unlocks_content: false, automatic_conversion: false },
      purchase: {
        sales_ready: false,
        price_source: "authorized GoHighLevel location only",
        steps: ["item and posted price", "written estimate and agreement", "customer reviews and signs", "verified deposit/payment request", "payment confirmed", "receipt/invoice and fulfillment"],
        estimate_required: true,
        signature_before_payment: true,
        deposit_terms: "50% upfront and 50% on completion only when the accepted agreement specifies this; standalone goods can require full payment under their estimate.",
      },
    });
  });

  app.post("/api/public/papa-estimate-requests", (_req, res) => {
    // This endpoint cannot quote from the website's legacy price table.
    // The replacement must create/send estimates entirely from Brian's
    // authorized GHL location with a provider-verified product and price.
    return res.status(503).json({
      ok: false,
      error: "Papa Life estimates are being connected to the verified GoHighLevel sales catalog. No estimate, invoice, or payment was created.",
      next_step: "Please use Papa Life's contact option for product questions while we verify the GoHighLevel workflow.",
    });
  });
}
