import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { z } from "zod";

const memoryCategory = z.enum([
  "identity",
  "preference",
  "relationship",
  "commitment",
  "project",
  "decision",
  "fact",
]);

const sensitivity = z.enum(["standard", "sensitive", "restricted"]);

export const executiveMemoryInputSchema = z
  .object({
    canonical_key: z.string().trim().min(3).max(160).regex(/^[a-z0-9][a-z0-9._-]*$/),
    category: memoryCategory,
    value: z.string().trim().min(1).max(4000),
    context: z.string().trim().max(2000).nullable().optional(),
    source_ref: z.string().trim().max(240).nullable().optional(),
    sensitivity,
    confidence: z.number().min(0).max(1).default(1),
    effective_at: z.string().datetime().optional(),
  })
  .strict();

export const executiveConversationInputSchema = z
  .object({
    session_ref: z.string().trim().min(3).max(160),
    channel: z.enum([
      "chatgpt",
      "email",
      "calendar",
      "web",
      "file",
      "desktop_commander",
      "github",
      "ghl",
      "other",
    ]),
    summary: z.string().trim().min(1).max(6000),
    user_intent: z.string().trim().max(2000).nullable().optional(),
    next_action: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(["active", "waiting", "completed", "blocked"]).default("active"),
    occurred_at: z.string().datetime().optional(),
  })
  .strict();

export type ExecutiveMemoryInput = z.input<typeof executiveMemoryInputSchema>;
export type ExecutiveConversationInput = z.input<typeof executiveConversationInputSchema>;

export function ensureExecutiveMemoryTables(db: BetterSqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS executive_memory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_key TEXT NOT NULL,
      version INTEGER NOT NULL,
      category TEXT NOT NULL,
      value TEXT NOT NULL,
      context TEXT,
      source_ref TEXT,
      sensitivity TEXT NOT NULL,
      confidence REAL NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'superseded', 'archived')),
      effective_at TEXT NOT NULL,
      superseded_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(canonical_key, version)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_executive_memory_active_key
      ON executive_memory_items(canonical_key) WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_executive_memory_category_status
      ON executive_memory_items(category, status);

    CREATE TABLE IF NOT EXISTS executive_conversation_briefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_ref TEXT NOT NULL UNIQUE,
      channel TEXT NOT NULL,
      summary TEXT NOT NULL,
      user_intent TEXT,
      next_action TEXT,
      status TEXT NOT NULL CHECK (status IN ('active', 'waiting', 'completed', 'blocked')),
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_executive_conversations_status_time
      ON executive_conversation_briefs(status, occurred_at DESC);
  `);
}

export function rememberExecutiveMemory(db: BetterSqliteDatabase, rawInput: ExecutiveMemoryInput) {
  const input = executiveMemoryInputSchema.parse(rawInput);
  const effectiveAt = input.effective_at || new Date().toISOString();
  const transaction = db.transaction(() => {
    const current = db
      .prepare(
        `SELECT id, version FROM executive_memory_items
         WHERE canonical_key = ? AND status = 'active'`
      )
      .get(input.canonical_key) as { id: number; version: number } | undefined;

    if (current) {
      db.prepare(
        `UPDATE executive_memory_items
         SET status = 'superseded', superseded_at = datetime('now') WHERE id = ?`
      ).run(current.id);
    }

    const version = (current?.version || 0) + 1;
    const result = db
      .prepare(
        `INSERT INTO executive_memory_items (
          canonical_key, version, category, value, context, source_ref,
          sensitivity, confidence, status, effective_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
      )
      .run(
        input.canonical_key,
        version,
        input.category,
        input.value,
        input.context || null,
        input.source_ref || null,
        input.sensitivity,
        input.confidence,
        effectiveAt
      );
    return { id: Number(result.lastInsertRowid), version, superseded_id: current?.id || null };
  });
  return transaction();
}

export function listExecutiveMemories(
  db: BetterSqliteDatabase,
  options: { query?: string; category?: string; includeArchived?: boolean; limit?: number } = {}
) {
  const conditions = [options.includeArchived ? "1 = 1" : "status = 'active'"];
  const values: Array<string | number> = [];
  if (options.category) {
    conditions.push("category = ?");
    values.push(options.category);
  }
  if (options.query) {
    conditions.push("(canonical_key LIKE ? OR value LIKE ? OR context LIKE ?)");
    const query = `%${options.query}%`;
    values.push(query, query, query);
  }
  const limit = Math.min(Math.max(options.limit || 100, 1), 500);
  values.push(limit);
  return db
    .prepare(
      `SELECT * FROM executive_memory_items
       WHERE ${conditions.join(" AND ")}
       ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, effective_at DESC, id DESC
       LIMIT ?`
    )
    .all(...values);
}

export function getExecutiveMemoryHistory(db: BetterSqliteDatabase, canonicalKey: string) {
  return db
    .prepare(
      `SELECT * FROM executive_memory_items
       WHERE canonical_key = ? ORDER BY version DESC`
    )
    .all(canonicalKey);
}

export function archiveExecutiveMemory(db: BetterSqliteDatabase, id: number) {
  return db
    .prepare(
      `UPDATE executive_memory_items
       SET status = 'archived', superseded_at = COALESCE(superseded_at, datetime('now'))
       WHERE id = ? AND status = 'active'`
    )
    .run(id).changes;
}

export function saveExecutiveConversationBrief(
  db: BetterSqliteDatabase,
  rawInput: ExecutiveConversationInput
) {
  const input = executiveConversationInputSchema.parse(rawInput);
  const occurredAt = input.occurred_at || new Date().toISOString();
  db.prepare(
    `INSERT INTO executive_conversation_briefs (
      session_ref, channel, summary, user_intent, next_action, status, occurred_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(session_ref) DO UPDATE SET
      channel = excluded.channel,
      summary = excluded.summary,
      user_intent = excluded.user_intent,
      next_action = excluded.next_action,
      status = excluded.status,
      occurred_at = excluded.occurred_at,
      updated_at = datetime('now')`
  ).run(
    input.session_ref,
    input.channel,
    input.summary,
    input.user_intent || null,
    input.next_action || null,
    input.status,
    occurredAt
  );
  return db
    .prepare("SELECT * FROM executive_conversation_briefs WHERE session_ref = ?")
    .get(input.session_ref);
}

export function listExecutiveConversationBriefs(
  db: BetterSqliteDatabase,
  options: { status?: string; limit?: number } = {}
) {
  const limit = Math.min(Math.max(options.limit || 50, 1), 200);
  if (options.status) {
    return db
      .prepare(
        `SELECT * FROM executive_conversation_briefs
         WHERE status = ? ORDER BY occurred_at DESC, id DESC LIMIT ?`
      )
      .all(options.status, limit);
  }
  return db
    .prepare(
      `SELECT * FROM executive_conversation_briefs
       ORDER BY occurred_at DESC, id DESC LIMIT ?`
    )
    .all(limit);
}
