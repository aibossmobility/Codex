import Database from "better-sqlite3";

export type CommerceProduct = {
  id: number;
  code: string;
  canonical_name: string;
  format: "membership" | "digital" | "manuscript" | "bundle";
  module_number: number | null;
  price_cents: number;
  currency: string;
  billing_type: "recurring" | "one_time";
  tax_behavior: "exclusive";
  lesson_id: number | null;
  document_filename: string | null;
  external_provider: string | null;
  external_product_id: string | null;
  external_price_id: string | null;
  checkout_url: string | null;
  public_price_cents: number | null;
  public_external_product_id: string | null;
  public_external_price_id: string | null;
  public_checkout_url: string | null;
  active: number;
};

export const PAPA_CURRICULUM_LESSONS = [
  "Listening Without Defending",
  "Owning Impact Without Shame",
  "The First Repair Sentence",
  "Presence Over Pressure",
  "When Your Adult Child Pulls Away",
  "Authority Without Control",
  "Apology Without Explanation",
  "Consistency After the Conversation",
  "Rebuilding Trust in Small Deposits",
  "When Silence Feels Personal",
  "Leading With Purpose, Not Panic",
  "Becoming Safe to Talk To",
] as const;

const manuscriptFiles = [
  "01-listening-without-defending.pdf",
  "02-owning-impact-without-shame.pdf",
  "03-the-first-repair-sentence.pdf",
  "04-presence-over-pressure.pdf",
  "05-when-your-adult-child-pulls-away.pdf",
  "06-authority-without-control.pdf",
  "07-apology-without-explanation.pdf",
  "08-consistency-after-the-conversation.pdf",
  "09-rebuilding-trust-in-small-deposits.pdf",
  "10-when-silence-feels-personal.pdf",
  "11-leading-with-purpose-not-panic.pdf",
  "12-becoming-safe-to-talk-to.pdf",
] as const;

function moduleCode(kind: "digital" | "manuscript", moduleNumber: number) {
  return `curriculum.${kind}.module.${String(moduleNumber).padStart(2, "0")}`;
}

export function ensureCommerceEntitlementTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS commerce_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      canonical_name TEXT NOT NULL,
      format TEXT NOT NULL CHECK (format IN ('membership','digital','manuscript','bundle')),
      module_number INTEGER,
      price_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'usd',
      billing_type TEXT NOT NULL CHECK (billing_type IN ('recurring','one_time')),
      tax_behavior TEXT NOT NULL DEFAULT 'exclusive' CHECK (tax_behavior = 'exclusive'),
      lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
      document_filename TEXT,
      external_provider TEXT,
      external_product_id TEXT,
      external_price_id TEXT,
      checkout_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS commerce_product_components (
      bundle_product_id INTEGER NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
      component_product_id INTEGER NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (bundle_product_id, component_product_id)
    );

    CREATE TABLE IF NOT EXISTS member_product_entitlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
      source TEXT NOT NULL DEFAULT 'purchase',
      external_order_id TEXT,
      metadata_json TEXT,
      granted_at TEXT NOT NULL DEFAULT (datetime('now')),
      revoked_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(member_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS commerce_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_key TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      event_type TEXT NOT NULL,
      external_customer_id TEXT,
      external_order_id TEXT,
      member_email TEXT,
      product_code TEXT,
      payload_json TEXT,
      status TEXT NOT NULL DEFAULT 'received',
      error TEXT,
      received_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_member_product_entitlements_member
      ON member_product_entitlements(member_id, revoked_at);
    CREATE INDEX IF NOT EXISTS idx_commerce_products_lesson
      ON commerce_products(lesson_id, active);
    CREATE INDEX IF NOT EXISTS idx_commerce_events_order
      ON commerce_events(provider, external_order_id);
  `);

  try { db.exec("ALTER TABLE commerce_products ADD COLUMN public_price_cents INTEGER"); } catch {}
  try { db.exec("ALTER TABLE commerce_products ADD COLUMN public_external_product_id TEXT"); } catch {}
  try { db.exec("ALTER TABLE commerce_products ADD COLUMN public_external_price_id TEXT"); } catch {}
  try { db.exec("ALTER TABLE commerce_products ADD COLUMN public_checkout_url TEXT"); } catch {}

  const lessonByTitle = db.prepare("SELECT id FROM lessons WHERE title = ? ORDER BY id DESC LIMIT 1");
  const upsert = db.prepare(`
    INSERT INTO commerce_products (
      code, canonical_name, format, module_number, price_cents, currency,
      billing_type, tax_behavior, lesson_id, document_filename, active, updated_at
    ) VALUES (
      @code, @canonical_name, @format, @module_number, @price_cents, 'usd',
      @billing_type, 'exclusive', @lesson_id, @document_filename, 1, datetime('now')
    )
    ON CONFLICT(code) DO UPDATE SET
      canonical_name = excluded.canonical_name,
      format = excluded.format,
      module_number = excluded.module_number,
      price_cents = excluded.price_cents,
      currency = excluded.currency,
      billing_type = excluded.billing_type,
      tax_behavior = excluded.tax_behavior,
      lesson_id = excluded.lesson_id,
      document_filename = excluded.document_filename,
      active = 1,
      updated_at = datetime('now')
  `);

  upsert.run({
    code: "membership.community.monthly",
    canonical_name: "Papa Life Membership",
    format: "membership",
    module_number: null,
    price_cents: 499,
    billing_type: "recurring",
    lesson_id: null,
    document_filename: null,
  });

  PAPA_CURRICULUM_LESSONS.forEach((title, index) => {
    const moduleNumber = index + 1;
    const lesson = lessonByTitle.get(title) as { id?: number } | undefined;
    upsert.run({
      code: moduleCode("digital", moduleNumber),
      canonical_name: `Papa Life Audio Curriculum — Module ${String(moduleNumber).padStart(2, "0")} — ${title}`,
      format: "digital",
      module_number: moduleNumber,
      price_cents: 999,
      billing_type: "one_time",
      lesson_id: lesson?.id || null,
      document_filename: null,
    });
    upsert.run({
      code: moduleCode("manuscript", moduleNumber),
      canonical_name: `Papa Life Manuscript — Module ${String(moduleNumber).padStart(2, "0")} — ${title}`,
      format: "manuscript",
      module_number: moduleNumber,
      price_cents: 999,
      billing_type: "one_time",
      lesson_id: null,
      document_filename: manuscriptFiles[index],
    });
  });

  upsert.run({
    code: "curriculum.digital.complete",
    canonical_name: "Papa Life Audio Curriculum — Complete 12-Module Digital Program",
    format: "bundle",
    module_number: null,
    price_cents: 5900,
    billing_type: "one_time",
    lesson_id: null,
    document_filename: null,
  });
  upsert.run({
    code: "curriculum.bundle.complete",
    canonical_name: "Papa Life Audio Curriculum — Complete Digital Program + All Manuscripts",
    format: "bundle",
    module_number: null,
    price_cents: 9900,
    billing_type: "one_time",
    lesson_id: null,
    document_filename: null,
  });

  const productId = db.prepare("SELECT id FROM commerce_products WHERE code = ?");
  const insertComponent = db.prepare(`
    INSERT INTO commerce_product_components (bundle_product_id, component_product_id)
    VALUES (?, ?)
    ON CONFLICT(bundle_product_id, component_product_id) DO NOTHING
  `);
  const digitalBundle = productId.get("curriculum.digital.complete") as { id: number };
  const completeBundle = productId.get("curriculum.bundle.complete") as { id: number };
  for (let moduleNumber = 1; moduleNumber <= 12; moduleNumber += 1) {
    const digital = productId.get(moduleCode("digital", moduleNumber)) as { id: number };
    const manuscript = productId.get(moduleCode("manuscript", moduleNumber)) as { id: number };
    insertComponent.run(digitalBundle.id, digital.id);
    insertComponent.run(completeBundle.id, digital.id);
    insertComponent.run(completeBundle.id, manuscript.id);
  }
}

export function listCommerceProducts(db: Database.Database): CommerceProduct[] {
  return db
    .prepare(`
      SELECT id, code, canonical_name, format, module_number, price_cents, currency,
             billing_type, tax_behavior, lesson_id, document_filename,
             external_provider, external_product_id, external_price_id, checkout_url,
             public_price_cents, public_external_product_id, public_external_price_id, public_checkout_url, active
      FROM commerce_products
      WHERE active = 1
      ORDER BY
        CASE code
          WHEN 'membership.community.monthly' THEN 0
          WHEN 'curriculum.digital.complete' THEN 1
          WHEN 'curriculum.bundle.complete' THEN 2
          ELSE 3
        END,
        module_number ASC,
        format ASC
    `)
    .all() as CommerceProduct[];
}

export function getCommerceProductByCode(
  db: Database.Database,
  code: string
): CommerceProduct | undefined {
  return db
    .prepare(`
      SELECT id, code, canonical_name, format, module_number, price_cents, currency,
             billing_type, tax_behavior, lesson_id, document_filename,
             external_provider, external_product_id, external_price_id, checkout_url,
             public_price_cents, public_external_product_id, public_external_price_id, public_checkout_url, active
      FROM commerce_products WHERE code = ? AND active = 1
    `)
    .get(code) as CommerceProduct | undefined;
}

export function getMemberEntitledProducts(
  db: Database.Database,
  memberId: number
): CommerceProduct[] {
  return db
    .prepare(`
      WITH entitled_products AS (
        SELECT mpe.product_id
        FROM member_product_entitlements mpe
        WHERE mpe.member_id = ? AND mpe.revoked_at IS NULL
        UNION
        SELECT cpc.component_product_id
        FROM member_product_entitlements mpe
        JOIN commerce_product_components cpc ON cpc.bundle_product_id = mpe.product_id
        WHERE mpe.member_id = ? AND mpe.revoked_at IS NULL
      )
      SELECT DISTINCT p.id, p.code, p.canonical_name, p.format, p.module_number,
             p.price_cents, p.currency, p.billing_type, p.tax_behavior, p.lesson_id,
             p.document_filename, p.external_provider, p.external_product_id,
             p.external_price_id, p.checkout_url, p.active
      FROM commerce_products p
      JOIN entitled_products ep ON ep.product_id = p.id
      WHERE p.active = 1
      ORDER BY p.module_number ASC, p.format ASC
    `)
    .all(memberId, memberId) as CommerceProduct[];
}

export function memberHasAnyCurriculumEntitlement(
  db: Database.Database,
  memberId: number
) {
  const row = db
    .prepare(`
      SELECT 1 AS ok
      FROM member_product_entitlements mpe
      JOIN commerce_products p ON p.id = mpe.product_id
      WHERE mpe.member_id = ?
        AND mpe.revoked_at IS NULL
        AND p.code LIKE 'curriculum.%'
      LIMIT 1
    `)
    .get(memberId) as { ok?: number } | undefined;
  return row?.ok === 1;
}

export function memberCanAccessLesson(
  db: Database.Database,
  memberId: number,
  lessonId: number
) {
  const row = db
    .prepare(`
      WITH entitled_products AS (
        SELECT mpe.product_id
        FROM member_product_entitlements mpe
        WHERE mpe.member_id = ? AND mpe.revoked_at IS NULL
        UNION
        SELECT cpc.component_product_id
        FROM member_product_entitlements mpe
        JOIN commerce_product_components cpc ON cpc.bundle_product_id = mpe.product_id
        WHERE mpe.member_id = ? AND mpe.revoked_at IS NULL
      )
      SELECT 1 AS ok
      FROM commerce_products p
      JOIN entitled_products ep ON ep.product_id = p.id
      WHERE p.lesson_id = ? AND p.format = 'digital' AND p.active = 1
      LIMIT 1
    `)
    .get(memberId, memberId, lessonId) as { ok?: number } | undefined;
  return row?.ok === 1;
}

export function getMemberManuscripts(
  db: Database.Database,
  memberId: number
): CommerceProduct[] {
  return getMemberEntitledProducts(db, memberId).filter(
    (product) => product.format === "manuscript" && Boolean(product.document_filename)
  );
}

export function memberCanAccessManuscript(
  db: Database.Database,
  memberId: number,
  productCode: string
) {
  return getMemberManuscripts(db, memberId).some((product) => product.code === productCode);
}

export function grantMemberProductEntitlement(
  db: Database.Database,
  input: {
    memberId: number;
    productCode: string;
    source?: string;
    externalOrderId?: string | null;
    metadata?: unknown;
  }
) {
  const product = getCommerceProductByCode(db, input.productCode);
  if (!product) throw new Error(`Unknown commerce product code: ${input.productCode}`);
  db.prepare(`
    INSERT INTO member_product_entitlements (
      member_id, product_id, source, external_order_id, metadata_json,
      granted_at, revoked_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'), NULL, datetime('now'))
    ON CONFLICT(member_id, product_id) DO UPDATE SET
      source = excluded.source,
      external_order_id = COALESCE(excluded.external_order_id, member_product_entitlements.external_order_id),
      metadata_json = COALESCE(excluded.metadata_json, member_product_entitlements.metadata_json),
      revoked_at = NULL,
      updated_at = datetime('now')
  `).run(
    input.memberId,
    product.id,
    input.source || "purchase",
    input.externalOrderId || null,
    input.metadata === undefined ? null : JSON.stringify(input.metadata)
  );
  return product;
}

export function revokeMemberProductEntitlement(
  db: Database.Database,
  memberId: number,
  productCode: string
) {
  const product = getCommerceProductByCode(db, productCode);
  if (!product) throw new Error(`Unknown commerce product code: ${productCode}`);
  const result = db.prepare(`
    UPDATE member_product_entitlements
    SET revoked_at = datetime('now'), updated_at = datetime('now')
    WHERE member_id = ? AND product_id = ? AND revoked_at IS NULL
  `).run(memberId, product.id);
  return result.changes > 0;
}

export function recordCommerceEvent(
  db: Database.Database,
  input: {
    eventKey: string;
    provider: string;
    eventType: string;
    externalCustomerId?: string | null;
    externalOrderId?: string | null;
    memberEmail?: string | null;
    productCode?: string | null;
    payload?: unknown;
  }
) {
  const result = db.prepare(`
    INSERT INTO commerce_events (
      event_key, provider, event_type, external_customer_id, external_order_id,
      member_email, product_code, payload_json, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'received')
    ON CONFLICT(event_key) DO NOTHING
  `).run(
    input.eventKey,
    input.provider,
    input.eventType,
    input.externalCustomerId || null,
    input.externalOrderId || null,
    input.memberEmail?.trim().toLowerCase() || null,
    input.productCode || null,
    input.payload === undefined ? null : JSON.stringify(input.payload)
  );
  return result.changes > 0;
}

export function completeCommerceEvent(
  db: Database.Database,
  eventKey: string,
  status: "processed" | "ignored" | "failed",
  error?: string | null
) {
  db.prepare(`
    UPDATE commerce_events
    SET status = ?, error = ?, processed_at = datetime('now')
    WHERE event_key = ?
  `).run(status, error || null, eventKey);
}
