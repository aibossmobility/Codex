import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { z } from "zod";

const heartbeatSchema = z.object({
  node_id: z.string().trim().min(2).max(100),
  display_name: z.string().trim().min(2).max(120),
  node_kind: z.enum(["mac", "desktop", "server"]),
  capabilities: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
}).strict();

type AiBossNode = {
  node_id: string;
  display_name: string;
  node_kind: "mac" | "desktop" | "server";
  capabilities_json: string;
  last_seen_at: string;
  online: boolean;
  capabilities: string[];
};

export function ensureAiBossMobileTables(db: BetterSqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_boss_nodes (
      node_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      node_kind TEXT NOT NULL,
      capabilities_json TEXT NOT NULL DEFAULT '[]',
      last_seen_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_boss_nodes_last_seen ON ai_boss_nodes(last_seen_at DESC);
  `);
}

export function recordAiBossNodeHeartbeat(db: BetterSqliteDatabase, raw: unknown) {
  const input = heartbeatSchema.parse(raw);
  db.prepare(`
    INSERT INTO ai_boss_nodes (node_id, display_name, node_kind, capabilities_json, last_seen_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(node_id) DO UPDATE SET
      display_name = excluded.display_name,
      node_kind = excluded.node_kind,
      capabilities_json = excluded.capabilities_json,
      last_seen_at = datetime('now'),
      updated_at = datetime('now')
  `).run(input.node_id, input.display_name, input.node_kind, JSON.stringify(input.capabilities));
  return getAiBossNodes(db).find((node) => node.node_id === input.node_id);
}

export function getAiBossNodes(db: BetterSqliteDatabase, onlineWindowSeconds = 90) {
  const boundedWindow = Math.min(Math.max(Math.round(onlineWindowSeconds), 30), 600);
  const rows = db.prepare(`
    SELECT node_id, display_name, node_kind, capabilities_json, last_seen_at,
      CASE WHEN last_seen_at >= datetime('now', ?) THEN 1 ELSE 0 END AS online
    FROM ai_boss_nodes ORDER BY last_seen_at DESC
  `).all(`-${boundedWindow} seconds`) as Array<Record<string, unknown>>;
  return rows.map((row): AiBossNode => ({
    node_id: String(row.node_id),
    display_name: String(row.display_name),
    node_kind: heartbeatSchema.shape.node_kind.parse(row.node_kind),
    capabilities_json: String(row.capabilities_json || "[]"),
    last_seen_at: String(row.last_seen_at),
    online: Boolean(row.online),
    capabilities: JSON.parse(String(row.capabilities_json || "[]")),
  }));
}

export function getAiBossMissionControl(db: BetterSqliteDatabase) {
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'awaiting_approval' THEN 1 ELSE 0 END) AS awaiting_approval,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'executing' THEN 1 ELSE 0 END) AS executing,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN status = 'approved' AND execution_route = 'local' THEN 1 ELSE 0 END) AS local_ready
    FROM executive_actions
  `).get() as Record<string, number | null>;
  const nodes = getAiBossNodes(db);
  const macOnline = nodes.some((node) => node.node_kind === "mac" && node.online);
  const openInstructions = (db.prepare(
    "SELECT COUNT(*) AS count FROM executive_conversation_briefs WHERE channel = 'other' AND session_ref LIKE 'mobile-%' AND status IN ('active', 'waiting')"
  ).get() as { count: number }).count;
  return {
    nodes,
    mac_online: macOnline,
    queue: {
      awaiting_approval: counts.awaiting_approval || 0,
      approved: counts.approved || 0,
      executing: counts.executing || 0,
      failed: counts.failed || 0,
      waiting_for_mac: macOnline ? 0 : counts.local_ready || 0,
    },
    open_mobile_instructions: openInstructions,
  };
}
