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
  checkins: z.number().int().nonnegative().optional(),
  memberships: z.number().int().nonnegative().optional(),
  membership_revenue_cents: z.number().int().nonnegative().optional(),
  posts_distributed: z.number().int().nonnegative().optional(),
  follow_ups_needed: z.number().int().nonnegative().optional(),
  latest_activity: z.string().trim().max(500).optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
}).strict();

function ensureColumn(db: BetterSqliteDatabase, name: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(ai_boss_campaign_snapshots)`).all() as Array<{ name?: string }>;
  if (!columns.some((column) => column.name === name)) {
    db.exec(`ALTER TABLE ai_boss_campaign_snapshots ADD COLUMN ${name} ${definition}`);
  }
}

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
      checkins INTEGER NOT NULL DEFAULT 0,
      memberships INTEGER NOT NULL DEFAULT 0,
      membership_revenue_cents INTEGER NOT NULL DEFAULT 0,
      posts_distributed INTEGER NOT NULL DEFAULT 0,
      follow_ups_needed INTEGER NOT NULL DEFAULT 0,
      latest_activity TEXT,
      raw_json TEXT NOT NULL DEFAULT '{}',
      last_synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (source, campaign_key)
    );
  `);
  ensureColumn(db, "checkins", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "memberships", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "membership_revenue_cents", "INTEGER NOT NULL DEFAULT 0");
}

export function upsertAiBossCampaignSnapshot(db: BetterSqliteDatabase, raw: unknown) {
  ensureAiBossCampaignTables(db);
  const input = campaignSnapshotSchema.parse(raw);
  db.prepare(`
    INSERT INTO ai_boss_campaign_snapshots
      (source, campaign_key, display_name, tracking_url, status, clicks, enrollments, checkins, memberships,
       membership_revenue_cents, posts_distributed, follow_ups_needed, latest_activity, raw_json, last_synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(source, campaign_key) DO UPDATE SET
      display_name = excluded.display_name,
      tracking_url = COALESCE(excluded.tracking_url, ai_boss_campaign_snapshots.tracking_url),
      status = excluded.status,
      clicks = excluded.clicks,
      enrollments = excluded.enrollments,
      checkins = excluded.checkins,
      memberships = excluded.memberships,
      membership_revenue_cents = excluded.membership_revenue_cents,
      posts_distributed = excluded.posts_distributed,
      follow_ups_needed = excluded.follow_ups_needed,
      latest_activity = excluded.latest_activity,
      raw_json = excluded.raw_json,
      last_synced_at = datetime('now')
  `).run(
    input.source,
    input.campaign_key,
    input.display_name,
    input.tracking_url || null,
    input.status,
    input.clicks || 0,
    input.enrollments || 0,
    input.checkins || 0,
    input.memberships || 0,
    input.membership_revenue_cents || 0,
    input.posts_distributed || 0,
    input.follow_ups_needed || 0,
    input.latest_activity || null,
    JSON.stringify(input.raw || {}),
  );
  return db.prepare(`
    SELECT source, campaign_key, display_name, tracking_url, status, clicks, enrollments, checkins, memberships,
      membership_revenue_cents, posts_distributed, follow_ups_needed, latest_activity, last_synced_at
    FROM ai_boss_campaign_snapshots WHERE source = ? AND campaign_key = ?
  `).get(input.source, input.campaign_key);
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
  const rows = db.prepare(`
    SELECT source, campaign_key, display_name, tracking_url, status, clicks, enrollments, checkins, memberships,
      membership_revenue_cents, posts_distributed, follow_ups_needed, latest_activity, last_synced_at
    FROM ai_boss_campaign_snapshots
    ORDER BY CASE source WHEN 'heycatch' THEN 0 ELSE 1 END, display_name
  `).all() as Array<Record<string, unknown>>;

  try {
    const node = db.prepare(`
      SELECT capabilities_json FROM ai_boss_nodes
      WHERE node_kind = 'mac' ORDER BY last_seen_at DESC LIMIT 1
    `).get() as { capabilities_json?: string } | undefined;
    const capabilities = JSON.parse(String(node?.capabilities_json || "[]")) as string[];
    const metrics = new Map<string, {
      clicks?: number;
      enrollments?: number;
      checkins?: number;
      memberships?: number;
      membership_revenue_cents?: number;
    }>();
    let lastSync = 0;

    for (const capability of capabilities) {
      const parts = String(capability).split(":");
      if (parts[0] !== "zipshare") continue;
      if (parts[1] === "last_sync") {
        lastSync = Number(parts[2] || 0);
        continue;
      }
      if (parts.length !== 4) continue;
      const code = parts[1];
      const metricName = parts[2] as "clicks" | "enrollments" | "checkins" | "memberships" | "membership_revenue_cents";
      const rawValue = parts[3];
      if (!["clicks", "enrollments", "checkins", "memberships", "membership_revenue_cents"].includes(metricName)) continue;
      const current = metrics.get(code) || {};
      current[metricName] = Math.max(0, Number(rawValue || 0));
      metrics.set(code, current);
    }

    if (metrics.size) {
      return rows.map((row) => {
        if (row.source !== "zipshare") return row;
        const live = metrics.get(String(row.campaign_key));
        if (!live) return row;
        return {
          ...row,
          status: "connected",
          clicks: live.clicks ?? row.clicks ?? 0,
          enrollments: live.enrollments ?? row.enrollments ?? 0,
          checkins: live.checkins ?? row.checkins ?? 0,
          memberships: live.memberships ?? row.memberships ?? 0,
          membership_revenue_cents: live.membership_revenue_cents ?? row.membership_revenue_cents ?? 0,
          latest_activity: "Synced from authenticated ZIPShare and Papa Life conversion tracking via Brian's Mac.",
          last_synced_at: lastSync ? new Date(lastSync).toISOString() : row.last_synced_at,
        };
      });
    }
  } catch {}

  return rows;
}
