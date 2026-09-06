import type { Express, Request, Response, NextFunction } from "express";
import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { buildYouTubeAuthorizationUrl, exchangeYouTubeAuthorizationCode, executeYouTubeConnectorAction } from "./ai-boss-youtube-connector";
import { pickPilotVideos, type YouTubeVideoMetrics } from "./ai-boss-youtube-growth";

type Middleware = (req: Request, res: Response, next: NextFunction) => unknown;

export function ensureYouTubeIntegrationTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_boss_youtube_integrations (
      admin_id INTEGER PRIMARY KEY,
      refresh_token TEXT,
      scope TEXT,
      connected_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ai_boss_youtube_oauth_states (
      state TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function rowForAdmin(db: Database.Database, adminId: number) {
  return db.prepare(`SELECT refresh_token, scope, connected_at, updated_at FROM ai_boss_youtube_integrations WHERE admin_id = ?`).get(adminId) as any;
}

function durationDaysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayUtc() { return new Date().toISOString().slice(0, 10); }

function analyticsRows(report: any) {
  const names = (report?.columnHeaders || []).map((h: any) => h.name);
  return (report?.rows || []).map((row: any[]) => Object.fromEntries(names.map((name: string, i: number) => [name, row[i]])));
}

export function registerYouTubeIntegrationRoutes(app: Express, db: Database.Database, requireAuth: Middleware, requireResearchLabAccess: Middleware) {
  ensureYouTubeIntegrationTables(db);
  const guarded = [requireAuth, requireResearchLabAccess] as const;

  app.get("/api/admin/ai-boss/youtube/status", ...guarded, async (req, res) => {
    const adminId = Number((req.session as any).adminId);
    const row = rowForAdmin(db, adminId);
    if (!row?.refresh_token) return res.json({ ok: true, connected: false });
    try {
      const channel = await executeYouTubeConnectorAction({ operation: "channel" }, fetch, row.refresh_token);
      const item = channel?.items?.[0];
      return res.json({ ok: true, connected: true, channel: item ? { id: item.id, title: item.snippet?.title, statistics: item.statistics } : null, connectedAt: row.connected_at });
    } catch (error) {
      return res.status(502).json({ ok: false, connected: true, error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/admin/ai-boss/youtube/authorization-url", ...guarded, (req, res) => {
    const adminId = Number((req.session as any).adminId);
    db.prepare(`DELETE FROM ai_boss_youtube_oauth_states WHERE expires_at < datetime('now')`).run();
    const state = nanoid(32);
    db.prepare(`INSERT INTO ai_boss_youtube_oauth_states (state, admin_id, expires_at) VALUES (?, ?, datetime('now', '+15 minutes'))`).run(state, adminId);
    res.json({ ok: true, url: buildYouTubeAuthorizationUrl(state) });
  });

  app.get("/ai-boss/youtube/callback", requireAuth, requireResearchLabAccess, async (req, res) => {
    const adminId = Number((req.session as any).adminId);
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code || !state) return res.status(400).send("Missing YouTube authorization code or state.");
    const pending = db.prepare(`SELECT admin_id FROM ai_boss_youtube_oauth_states WHERE state = ? AND expires_at >= datetime('now')`).get(state) as any;
    if (!pending || Number(pending.admin_id) !== adminId) return res.status(400).send("YouTube authorization state is invalid or expired.");
    try {
      const token = await exchangeYouTubeAuthorizationCode(code);
      if (!token.refresh_token) return res.status(400).send("Google did not return an offline refresh token. Please reconnect and approve access again.");
      db.prepare(`
        INSERT INTO ai_boss_youtube_integrations (admin_id, refresh_token, scope, connected_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(admin_id) DO UPDATE SET refresh_token = excluded.refresh_token, scope = excluded.scope, connected_at = datetime('now'), updated_at = datetime('now')
      `).run(adminId, token.refresh_token, String((token as any).scope || ""));
      db.prepare(`DELETE FROM ai_boss_youtube_oauth_states WHERE state = ?`).run(state);
      return res.redirect("/ai-boss/youtube-growth?youtube=connected");
    } catch (error) {
      return res.status(502).send(`YouTube authorization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  app.get("/api/admin/ai-boss/youtube/pilot", ...guarded, async (req, res) => {
    const adminId = Number((req.session as any).adminId);
    const row = rowForAdmin(db, adminId);
    if (!row?.refresh_token) return res.status(409).json({ ok: false, error: "YouTube is not connected." });
    try {
      const videos = await executeYouTubeConnectorAction({ operation: "videos", max_results: 50 }, fetch, row.refresh_token);
      const items = videos?.items || [];
      const ids = items.map((v: any) => v.id).filter(Boolean);
      const report = await executeYouTubeConnectorAction({ operation: "analytics", start_date: durationDaysAgo(28), end_date: todayUtc(), video_ids: ids }, fetch, row.refresh_token);
      const rows = analyticsRows(report);
      const byId = new Map(rows.map((r: any) => [String(r.video), r]));
      const metrics: YouTubeVideoMetrics[] = items.map((v: any) => {
        const r: any = byId.get(String(v.id)) || {};
        return {
          videoId: String(v.id),
          title: String(v.snippet?.title || "Untitled"),
          impressions: Number(r.videoThumbnailImpressions || 0),
          clickThroughRate: Number(r.videoThumbnailImpressionsClickRate || 0),
          views: Number(r.views || 0),
          watchTimeMinutes: Number(r.estimatedMinutesWatched || 0),
          averageViewDurationSeconds: Number(r.averageViewDuration || 0),
          averageViewPercentage: Number(r.averageViewPercentage || 0),
          subscribersGained: Number(r.subscribersGained || 0),
        };
      });
      const selected = pickPilotVideos(metrics, 3).map((recommendation) => ({ recommendation, metrics: metrics.find((m) => m.videoId === recommendation.videoId) }));
      res.json({ ok: true, period: { start: durationDaysAgo(28), end: todayUtc() }, selected });
    } catch (error) {
      res.status(502).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });
}
