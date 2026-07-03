import type { Database as BetterSqliteDatabase } from "better-sqlite3";

export type SiteMediaRow = {
  id: number;
  placement: string;
  media_url: string;
  media_type: string;
  poster_url: string | null;
  alt_text: string | null;
  title: string | null;
  active: number;
  created_at: string;
  updated_at: string;
};

export function ensureSiteMediaTable(db: BetterSqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placement TEXT NOT NULL UNIQUE,
      media_url TEXT NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'video',
      poster_url TEXT,
      alt_text TEXT,
      title TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_site_media_placement ON site_media(placement, active);
  `);
}

export function getSiteMediaPublic(db: BetterSqliteDatabase, placement: string) {
  return db
    .prepare(
      `SELECT id, placement, media_url, media_type, poster_url, alt_text, title
       FROM site_media
       WHERE placement = ? AND active = 1
       LIMIT 1`
    )
    .get(placement) as Omit<SiteMediaRow, "active" | "created_at" | "updated_at"> | undefined;
}

export function listSiteMediaAdmin(db: BetterSqliteDatabase, placement: string | null) {
  if (placement) {
    return db
      .prepare("SELECT * FROM site_media WHERE placement = ? ORDER BY id ASC")
      .all(placement) as SiteMediaRow[];
  }
  return db.prepare("SELECT * FROM site_media ORDER BY placement ASC, id ASC").all() as SiteMediaRow[];
}

export function upsertSiteMedia(
  db: BetterSqliteDatabase,
  row: {
    placement: string;
    media_url: string;
    media_type?: string;
    poster_url?: string | null;
    alt_text?: string | null;
    title?: string | null;
    active?: boolean;
  }
) {
  const placement = String(row.placement ?? "").trim();
  const mediaUrl = String(row.media_url ?? "").trim();
  if (!placement) throw new Error("placement is required");
  if (!mediaUrl) throw new Error("media_url is required");

  const mediaType = String(row.media_type ?? "video").trim() || "video";
  const active = row.active === false ? 0 : 1;

  const result = db
    .prepare(
      `INSERT INTO site_media (
        placement, media_url, media_type, poster_url, alt_text, title, active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(placement) DO UPDATE SET
        media_url = excluded.media_url,
        media_type = excluded.media_type,
        poster_url = excluded.poster_url,
        alt_text = excluded.alt_text,
        title = excluded.title,
        active = excluded.active,
        updated_at = datetime('now')`
    )
    .run(
      placement,
      mediaUrl,
      mediaType,
      row.poster_url ?? null,
      row.alt_text ?? null,
      row.title ?? null,
      active
    );

  const existing = db.prepare("SELECT id FROM site_media WHERE placement = ?").get(placement) as
    | { id: number }
    | undefined;
  return existing?.id ?? Number(result.lastInsertRowid);
}

export function deleteSiteMedia(db: BetterSqliteDatabase, placement: string) {
  db.prepare("DELETE FROM site_media WHERE placement = ?").run(placement);
}
