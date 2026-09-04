import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { z } from "zod";

const campaignSnapshotSchema = z.object({
  source: z.enum(["zipshare", "heycatch"]),
  campaign_key: z.string().trim().min(2).max(80),
  display_name: z.string().trim().min(2).max(140),
  tracking_url: z.string().url().optional(),
  status: z.enum(["connected", "tracking", "attention"]).default("tracking"),
  clicks: z.number().int().nonnegative().optional(),
  enrollments: z.number().int().nonnegative().optional(),
  posts_distributed: z.number().int().nonnegative().optional(),
  follow_ups_needed: z.number().int().nonnegative().optional(),
  latest_activity: z.string().trim().max(500).optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
}).strict();

export function ensureAiBossCampaignTables(db: BetterSqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_boss_campaign_snapshots (
      source TEXT NOT NULL,
      campaign_key TEXT NOT NULL,
      display_name TEXT NOT NULL,
      tracking_url TEXT,
      status TEXT NOT NULL DEFAULT 'tracking',
      clicks INTEGER NOT NULL DEFAULT 0,
      enrollments INTEGER NOT NULL DEFAULT 0,
      posts_distributed INTEGER NOT NULL DEFAULT 0,
      follow_ups_needed INTEGER NOT NULL DEFAULT 0,
      latest_activity TEXT,
      raw_json TEXT NOT NULL DEFAULT '{}',
      last_synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (source, campaign_key)
    );
  `);
}

export function upsertAiBossCampaignSnapshot(db: BetterSqliteDatabase, raw: unknown) {
  const input = campaignSnapshotSchema.parse(raw);
  db.prepare(`
    INSERT INTO ai_boss_campaign_snapshots
      (source, campaign_key, display_name, tracking_url, status, clicks, enrollments, posts_distributed, follow_ups_needed, latest_activity, raw_json, last_synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(source, campaign_key) DO UPDATE SET
      display_name = excluded.display_name,
      tracking_url = COALESCE(excluded.tracking_url, ai_boss_campaign_snapshots.tracking_url),
      status = excluded.status,
      clicks = excluded.clicks,
      enrollments = excluded.enrollments,
      posts_distributed = excluded.posts_distributed,
      follow_ups_needed = excluded.follow_ups_needed,
      latest_activity = excluded.latest_activity,
      raw_json = excluded.raw_json,
      last_synced_at = datetime('now')
  `).run(
    input.source, input.campaign_key, input.display_name, input.tracking_url || null, input.status,
    input.clicks || 0, input.enrollments || 0, input.posts_distributed || 0, input.follow_ups_needed || 0,
    input.latest_activity || null, JSON.stringify(input.raw || {}),
  );
  return db.prepare(`SELECT source, campaign_key, display_name, tracking_url, status, clicks, enrollments, posts_distributed, follow_ups_needed, latest_activity, last_synced_at FROM ai_boss_campaign_snapshots WHERE source = ? AND campaign_key = ?`).get(input.source, input.campaign_key);
}

export function seedAiBossCampaigns(db: BetterSqliteDatabase) {
  const defaults = [
    { source: "zipshare", campaign_key: "AIBOSSZIP", display_name: "ZIPShare — AI Boss Mobility", tracking_url: "https://zipshare.ai/?ref=AIBOSSZIP", status: "tracking", posts_distributed: 1, latest_activity: "AI Boss Mobility campaign link active." },
    { source: "zipshare", campaign_key: "PAPALIFECOACH", display_name: "ZIPShare — Papa Life", tracking_url: "https://zipshare.ai/?ref=PAPALIFECOACH", status: "tracking", posts_distributed: 2, latest_activity: "Papa Life campaign link active." },
    { source: "heycatch", campaign_key: "PAPALIFE", display_name: "HeyCatch — PapaLifeCoach.com", tracking_url: "https://papalifecoach.com/", status: "connected", latest_activity: "Website analytics integration installed." },
  ];
  for (const item of defaults) {
    db.prepare(`
      INSERT OR IGNORE INTO ai_boss_campaign_snapshots
        (source, campaign_key, display_name, tracking_url, status, posts_distributed, latest_activity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(item.source, item.campaign_key, item.display_name, item.tracking_url, item.status, item.posts_distributed || 0, item.latest_activity);
  }
}

export function getAiBossCampaigns(db: BetterSqliteDatabase) {
  ensureAiBossCampaignTables(db);
  seedAiBossCampaigns(db);
  return db.prepare(`
    SELECT source, campaign_key, display_name, tracking_url, status, clicks, enrollments,
      posts_distributed, follow_ups_needed, latest_activity, last_synced_at
    FROM ai_boss_campaign_snapshots
    ORDER BY CASE source WHEN 'heycatch' THEN 0 ELSE 1 END, display_name
  `).all();
}
