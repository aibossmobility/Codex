import type { Database as BetterSqliteDatabase } from "better-sqlite3";

export type SiteCtaRow = {
  id: number;
  placement: string;
  headline: string | null;
  body: string | null;
  button_label: string | null;
  button_url: string | null;
  variant: string;
  active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function ensureSiteCtasTable(db: BetterSqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_ctas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placement TEXT NOT NULL,
      headline TEXT,
      body TEXT,
      button_label TEXT,
      button_url TEXT,
      variant TEXT NOT NULL DEFAULT 'amber',
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_site_ctas_placement ON site_ctas(placement, active, sort_order);
  `);
}

export function listSiteCtasPublic(db: BetterSqliteDatabase, placements: string[]) {
  if (!placements.length) return [];
  const placeholders = placements.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT id, placement, headline, body, button_label, button_url, variant, sort_order
       FROM site_ctas
       WHERE active = 1 AND placement IN (${placeholders})
       ORDER BY placement ASC, sort_order ASC, id ASC`
    )
    .all(...placements) as SiteCtaRow[];
}

export function listSiteCtasAdmin(db: BetterSqliteDatabase, placement: string | null) {
  if (placement) {
    return db
      .prepare(
        `SELECT * FROM site_ctas WHERE placement = ? ORDER BY sort_order ASC, id ASC`
      )
      .all(placement) as SiteCtaRow[];
  }
  return db.prepare(`SELECT * FROM site_ctas ORDER BY placement ASC, sort_order ASC, id ASC`).all() as SiteCtaRow[];
}

export function upsertSiteCta(
  db: BetterSqliteDatabase,
  row: {
    id?: number;
    placement: string;
    headline?: string | null;
    body?: string | null;
    button_label?: string | null;
    button_url?: string | null;
    variant?: string;
    active?: boolean;
    sort_order?: number;
  }
) {
  const placement = String(row.placement ?? "").trim();
  if (!placement) throw new Error("placement is required");

  if (row.id) {
    const existing = db.prepare("SELECT * FROM site_ctas WHERE id = ?").get(row.id) as SiteCtaRow | undefined;
    if (!existing) throw new Error("CTA not found");
    const sortOrder =
      row.sort_order !== undefined && Number.isFinite(Number(row.sort_order))
        ? Number(row.sort_order)
        : Number(existing.sort_order ?? 0);
    const variant =
      row.variant !== undefined
        ? String(row.variant ?? "amber").trim() || "amber"
        : String(existing.variant ?? "amber");
    const active =
      row.active !== undefined ? (row.active === false ? 0 : 1) : Number(existing.active ?? 1);
    db.prepare(
      `UPDATE site_ctas SET
        placement = ?, headline = ?, body = ?, button_label = ?, button_url = ?,
        variant = ?, active = ?, sort_order = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      placement,
      row.headline !== undefined ? row.headline : existing.headline ?? null,
      row.body !== undefined ? row.body : existing.body ?? null,
      row.button_label !== undefined ? row.button_label : existing.button_label ?? null,
      row.button_url !== undefined ? row.button_url : existing.button_url ?? null,
      variant,
      active,
      sortOrder,
      row.id
    );
    return row.id;
  }
  const variant = String(row.variant ?? "amber").trim() || "amber";
  const active = row.active === false ? 0 : 1;
  const sortOrder =
    row.sort_order !== undefined && Number.isFinite(Number(row.sort_order))
      ? Number(row.sort_order)
      : 0;
  const r = db
    .prepare(
      `INSERT INTO site_ctas (placement, headline, body, button_label, button_url, variant, active, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      placement,
      row.headline ?? null,
      row.body ?? null,
      row.button_label ?? null,
      row.button_url ?? null,
      variant,
      active,
      sortOrder
    );
  return Number(r.lastInsertRowid);
}

export function deleteSiteCta(db: BetterSqliteDatabase, id: number) {
  db.prepare("DELETE FROM site_ctas WHERE id = ?").run(id);
}
