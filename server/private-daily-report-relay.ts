/**
 * Dedicated pull-only report relay. A Mac client authenticates with a separate
 * token and collects admin-submitted reports from the website database.
 * This endpoint is not a general-purpose worker executor or public twin tool.
 */
import { timingSafeEqual } from "node:crypto";
import type { Express, Request, Response, NextFunction } from "express";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";

export type PrivateReport = {
  id: number; report_date: string; brand: "papa-life" | "ai-boss-mobility";
  markdown: string; created_at: string; created_by: string | null;
};
export function ensureDailyReportRelayColumns(db: BetterSqliteDatabase) {
  const columns = (db.prepare("PRAGMA table_info(papa_daily_work_reports)").all() as { name: string }[]).map(x => x.name);
  if (!columns.includes("brand")) db.exec("ALTER TABLE papa_daily_work_reports ADD COLUMN brand TEXT NOT NULL DEFAULT 'papa-life'");
  if (!columns.includes("sheets_sync_status")) db.exec("ALTER TABLE papa_daily_work_reports ADD COLUMN sheets_sync_status TEXT NOT NULL DEFAULT 'pending_mac'");
  if (!columns.includes("sheets_sync_error")) db.exec("ALTER TABLE papa_daily_work_reports ADD COLUMN sheets_sync_error TEXT");
  if (!columns.includes("sheets_synced_at")) db.exec("ALTER TABLE papa_daily_work_reports ADD COLUMN sheets_synced_at TEXT");
}
function tokenMatches(provided: string, configured: string) {
  if (configured.length < 32 || provided.length !== configured.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(configured));
}
export function listPendingDailyReports(db: BetterSqliteDatabase, limit = 30): PrivateReport[] {
  ensureDailyReportRelayColumns(db);
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  return db.prepare(`SELECT id, report_date, brand, markdown, created_at, created_by
    FROM papa_daily_work_reports
    WHERE COALESCE(sheets_sync_status, 'pending_mac') NOT IN ('synced_mac','synced')
      AND brand IN ('papa-life', 'ai-boss-mobility')
    ORDER BY id ASC LIMIT ?`).all(safeLimit) as PrivateReport[];
}
export function acknowledgeDailyReport(db: BetterSqliteDatabase, id: number, evidenceKey: string) {
  ensureDailyReportRelayColumns(db);
  if (!Number.isSafeInteger(id) || id <= 0 || evidenceKey !== `Website daily report #${id}`)
    throw new Error("Invalid report acknowledgment");
  const report = db.prepare("SELECT id, sheets_sync_status FROM papa_daily_work_reports WHERE id = ?").get(id) as
    { id: number; sheets_sync_status: string } | undefined;
  if (!report) throw new Error("Report not found");
  if (report.sheets_sync_status === "synced_mac") return { id, status: "synced_mac", alreadySynced: true };
  // Only a restricted Mac token can acknowledge receipt, after the caller's
  // Google Sheets readback. The API itself does not assert Google verification.
  db.prepare(`UPDATE papa_daily_work_reports SET sheets_sync_status='synced_mac',
    sheets_sync_error=NULL, sheets_synced_at=datetime('now') WHERE id=?`).run(id);
  return { id, status: "synced_mac", alreadySynced: false };
}
export function registerDailyReportMacRelayRoutes(app: Express, db: BetterSqliteDatabase) {
  const verify = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store");
    const configured = String(process.env.PAPA_REPORT_MAC_RELAY_TOKEN || "");
    if (configured.length < 32) return res.status(503).json({ ok: false, error: "Reporting relay not configured" });
    const bearer = String(req.headers.authorization || "");
    const provided = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
    if (!tokenMatches(provided, configured)) return res.status(401).json({ ok: false, error: "Unauthorized" });
    next();
  };
  // POST rather than GET prevents accidentally caching private report payloads.
  app.post("/api/internal/mac-daily-reports/pull", verify, (_req, res) => {
    try { res.json({ ok: true, reports: listPendingDailyReports(db) }); }
    catch { res.status(500).json({ ok: false, error: "Report listing unavailable" }); }
  });
  app.post("/api/internal/mac-daily-reports/:id/ack", verify, (req, res) => {
    try {
      const id = Number(req.params.id);
      res.json({ ok: true, ...acknowledgeDailyReport(db, id, String(req.body?.evidenceKey || "")) });
    } catch { res.status(400).json({ ok: false, error: "Invalid acknowledgment" }); }
  });
}
