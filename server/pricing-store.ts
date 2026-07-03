import Database from "better-sqlite3";

export type PricingSettings = {
  member_trial_hours: number;
  member_price_usd_cents: number;
  member_currency: string;
  member_product_name: string;
  member_stripe_price_id: string;
  checkout_payment_link: string;
};

const DEFAULT_CHECKOUT_PAYMENT_LINK =
  "https://agent.bossmobility.net/payment-link/68d610ad67ee3bd205696444";

function defaults(): PricingSettings {
  return {
    member_trial_hours: Number(process.env.MEMBER_TRIAL_HOURS || 24),
    member_price_usd_cents: Number(process.env.MEMBER_PRICE_USD_CENTS || 499),
    member_currency: (process.env.MEMBER_PRICE_CURRENCY || "usd").trim().toLowerCase(),
    member_product_name: (process.env.MEMBER_PRODUCT_NAME || "PAPA Life Member Access").trim(),
    member_stripe_price_id: (process.env.STRIPE_PRICE_ID || "").trim(),
    checkout_payment_link: (process.env.CHECKOUT_PAYMENT_LINK || DEFAULT_CHECKOUT_PAYMENT_LINK).trim(),
  };
}

function asPositiveInt(input: unknown, fallback: number) {
  const n = Number(input);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function normalizeCurrency(input: unknown, fallback: string) {
  const c = String(input ?? "").trim().toLowerCase();
  return c.length === 3 ? c : fallback;
}

export function ensurePricingSettingsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const insert = db.prepare(
    `INSERT INTO pricing_settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO NOTHING`
  );
  const d = defaults();
  insert.run("member_trial_hours", String(d.member_trial_hours));
  insert.run("member_price_usd_cents", String(d.member_price_usd_cents));
  insert.run("member_currency", d.member_currency);
  insert.run("member_product_name", d.member_product_name);
  insert.run("member_stripe_price_id", d.member_stripe_price_id);
  insert.run("checkout_payment_link", d.checkout_payment_link);
}

export function getPricingSettings(db: Database.Database): PricingSettings {
  const rows = db
    .prepare("SELECT key, value FROM pricing_settings")
    .all() as Array<{ key: string; value: string }>;
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const d = defaults();
  return {
    member_trial_hours: asPositiveInt(map.member_trial_hours, d.member_trial_hours),
    member_price_usd_cents: asPositiveInt(map.member_price_usd_cents, d.member_price_usd_cents),
    member_currency: normalizeCurrency(map.member_currency, d.member_currency),
    member_product_name: String(map.member_product_name || d.member_product_name).trim(),
    member_stripe_price_id: String(map.member_stripe_price_id || d.member_stripe_price_id).trim(),
    checkout_payment_link: String(map.checkout_payment_link || d.checkout_payment_link).trim(),
  };
}

export function updatePricingSettings(
  db: Database.Database,
  patch: Partial<PricingSettings>
) {
  const current = getPricingSettings(db);
  const merged: PricingSettings = {
    member_trial_hours:
      patch.member_trial_hours !== undefined
        ? asPositiveInt(patch.member_trial_hours, current.member_trial_hours)
        : current.member_trial_hours,
    member_price_usd_cents:
      patch.member_price_usd_cents !== undefined
        ? asPositiveInt(patch.member_price_usd_cents, current.member_price_usd_cents)
        : current.member_price_usd_cents,
    member_currency:
      patch.member_currency !== undefined
        ? normalizeCurrency(patch.member_currency, current.member_currency)
        : current.member_currency,
    member_product_name:
      patch.member_product_name !== undefined
        ? String(patch.member_product_name || "").trim() || current.member_product_name
        : current.member_product_name,
    member_stripe_price_id:
      patch.member_stripe_price_id !== undefined
        ? String(patch.member_stripe_price_id || "").trim()
        : current.member_stripe_price_id,
    checkout_payment_link:
      patch.checkout_payment_link !== undefined
        ? String(patch.checkout_payment_link || "").trim() || current.checkout_payment_link
        : current.checkout_payment_link,
  };

  const upsert = db.prepare(
    `INSERT INTO pricing_settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  );
  upsert.run("member_trial_hours", String(merged.member_trial_hours));
  upsert.run("member_price_usd_cents", String(merged.member_price_usd_cents));
  upsert.run("member_currency", merged.member_currency);
  upsert.run("member_product_name", merged.member_product_name);
  upsert.run("member_stripe_price_id", merged.member_stripe_price_id);
  upsert.run("checkout_payment_link", merged.checkout_payment_link);

  return merged;
}
