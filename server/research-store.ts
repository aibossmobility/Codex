import type { Database as BetterSqliteDatabase } from "better-sqlite3";

export type BrandResearchDump = {
  id: number;
  title: string;
  raw_notes: string;
  char_count: number;
  word_count: number;
  executive_summary: string | null;
  themes_json: string | null;
  analysis_status: string;
  analysis_error: string | null;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandSocialSuggestion = {
  id: number;
  dump_id: number;
  platform: string;
  headline: string | null;
  body: string;
  hashtags: string | null;
  cta: string | null;
  status: string;
  sort_order: number;
  created_at: string;
};

export function ensureResearchTables(db: BetterSqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS brand_research_dumps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      raw_notes TEXT NOT NULL,
      char_count INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      executive_summary TEXT,
      themes_json TEXT,
      analysis_status TEXT NOT NULL DEFAULT 'pending',
      analysis_error TEXT,
      analyzed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS brand_social_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dump_id INTEGER NOT NULL REFERENCES brand_research_dumps(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      headline TEXT,
      body TEXT NOT NULL,
      hashtags TEXT,
      cta TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_brand_social_dump ON brand_social_suggestions(dump_id);
  `);
}

function countWords(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

export function createResearchDump(db: BetterSqliteDatabase, title: string, rawNotes: string) {
  const t = String(title || "").trim() || "Untitled research";
  const raw = String(rawNotes ?? "");
  const char_count = raw.length;
  const word_count = countWords(raw);
  const result = db
    .prepare(
      `INSERT INTO brand_research_dumps (title, raw_notes, char_count, word_count, analysis_status, updated_at)
       VALUES (?, ?, ?, ?, 'pending', datetime('now'))`
    )
    .run(t, raw, char_count, word_count);
  return Number(result.lastInsertRowid);
}

export function listResearchDumps(db: BetterSqliteDatabase, limit: number) {
  const lim = Math.min(Math.max(limit, 1), 200);
  return db
    .prepare(
      `SELECT id, title, char_count, word_count, analysis_status, analyzed_at, created_at, updated_at,
              substr(raw_notes, 1, 400) as preview_snippet
       FROM brand_research_dumps
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(lim) as Array<Record<string, unknown>>;
}

export function getResearchDumpById(db: BetterSqliteDatabase, id: number, includeRaw: boolean) {
  if (includeRaw) {
    return db.prepare("SELECT * FROM brand_research_dumps WHERE id = ?").get(id) as BrandResearchDump | undefined;
  }
  return db
    .prepare(
      `SELECT id, title, char_count, word_count, executive_summary, themes_json, analysis_status, analysis_error,
              analyzed_at, created_at, updated_at,
              substr(raw_notes, 1, 8000) as raw_preview
       FROM brand_research_dumps WHERE id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;
}

export function setDumpAnalysis(
  db: BetterSqliteDatabase,
  id: number,
  executiveSummary: string,
  themes: string[],
  status: "ok" | "error",
  error: string | null
) {
  db.prepare(
    `UPDATE brand_research_dumps SET
      executive_summary = ?,
      themes_json = ?,
      analysis_status = ?,
      analysis_error = ?,
      analyzed_at = datetime('now'),
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(executiveSummary, JSON.stringify(themes), status, error, id);
}

export function deleteSocialSuggestionsForDump(db: BetterSqliteDatabase, dumpId: number) {
  db.prepare("DELETE FROM brand_social_suggestions WHERE dump_id = ?").run(dumpId);
}

export function insertSocialSuggestion(
  db: BetterSqliteDatabase,
  row: {
    dump_id: number;
    platform: string;
    headline: string | null;
    body: string;
    hashtags: string | null;
    cta: string | null;
    sort_order: number;
  }
) {
  db.prepare(
    `INSERT INTO brand_social_suggestions (dump_id, platform, headline, body, hashtags, cta, sort_order, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`
  ).run(
    row.dump_id,
    row.platform,
    row.headline,
    row.body,
    row.hashtags,
    row.cta,
    row.sort_order
  );
}

export function listSocialSuggestions(db: BetterSqliteDatabase, dumpId: number) {
  return db
    .prepare(
      `SELECT * FROM brand_social_suggestions WHERE dump_id = ? ORDER BY sort_order ASC, id ASC`
    )
    .all(dumpId) as BrandSocialSuggestion[];
}

export function updateSuggestionStatus(db: BetterSqliteDatabase, suggestionId: number, status: string) {
  db.prepare("UPDATE brand_social_suggestions SET status = ? WHERE id = ?").run(status, suggestionId);
}
