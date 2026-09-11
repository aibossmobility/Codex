import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { z } from "zod";

const inboundSchema = z.object({
  device_id: z.string().trim().min(2).max(100),
  external_id: z.string().trim().min(1).max(200),
  thread_ref: z.string().trim().max(200).optional().nullable(),
  sender_address: z.string().trim().min(3).max(80),
  sender_label: z.string().trim().max(160).optional().nullable(),
  body: z.string().max(8000),
  received_at: z.string().datetime(),
}).strict();

const replySchema = z.object({
  message_id: z.number().int().positive(),
  destination: z.string().trim().min(3).max(80),
  body: z.string().trim().min(1).max(1600),
}).strict();

export function ensureAndroidSmsRelayTables(db: BetterSqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS android_sms_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      external_id TEXT NOT NULL,
      thread_ref TEXT,
      sender_address TEXT NOT NULL,
      sender_label TEXT,
      body TEXT NOT NULL,
      received_at TEXT NOT NULL,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(device_id, external_id)
    );
    CREATE TABLE IF NOT EXISTS android_sms_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES android_sms_messages(id),
      destination TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'awaiting_approval',
      approved_at TEXT,
      claimed_at TEXT,
      completed_at TEXT,
      delivery_route TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_android_sms_messages_received ON android_sms_messages(received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_android_sms_replies_status ON android_sms_replies(status, created_at);
  `);
}

export function ingestAndroidSms(db: BetterSqliteDatabase, raw: unknown) {
  const input = inboundSchema.parse(raw);
  db.prepare(`
    INSERT INTO android_sms_messages
      (device_id, external_id, thread_ref, sender_address, sender_label, body, received_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(device_id, external_id) DO NOTHING
  `).run(input.device_id, input.external_id, input.thread_ref ?? null, input.sender_address,
    input.sender_label ?? null, input.body, input.received_at);
  return db.prepare("SELECT * FROM android_sms_messages WHERE device_id = ? AND external_id = ?")
    .get(input.device_id, input.external_id);
}

export function listAndroidSms(db: BetterSqliteDatabase, limit = 100) {
  return db.prepare("SELECT * FROM android_sms_messages ORDER BY received_at DESC, id DESC LIMIT ?")
    .all(Math.min(Math.max(Math.round(limit), 1), 250));
}

export function queueAndroidSmsReply(db: BetterSqliteDatabase, raw: unknown) {
  const input = replySchema.parse(raw);
  const message = db.prepare("SELECT id FROM android_sms_messages WHERE id = ?").get(input.message_id);
  if (!message) throw new Error("Inbound message not found");
  const result = db.prepare(`
    INSERT INTO android_sms_replies (message_id, destination, body)
    VALUES (?, ?, ?)
  `).run(input.message_id, input.destination, input.body);
  return db.prepare("SELECT * FROM android_sms_replies WHERE id = ?").get(result.lastInsertRowid);
}

export function approveAndroidSmsReply(db: BetterSqliteDatabase, id: number) {
  db.prepare(`UPDATE android_sms_replies SET status = 'approved', approved_at = datetime('now')
    WHERE id = ? AND status = 'awaiting_approval'`).run(id);
  return db.prepare("SELECT * FROM android_sms_replies WHERE id = ?").get(id);
}

export function claimApprovedAndroidSmsReply(db: BetterSqliteDatabase, deviceId: string) {
  const transaction = db.transaction(() => {
    const row = db.prepare(`SELECT r.* FROM android_sms_replies r
      JOIN android_sms_messages m ON m.id = r.message_id
      WHERE r.status = 'approved' AND m.device_id = ? ORDER BY r.approved_at, r.id LIMIT 1`).get(deviceId) as Record<string, unknown> | undefined;
    if (!row) return null;
    db.prepare("UPDATE android_sms_replies SET status = 'claimed', claimed_at = datetime('now') WHERE id = ? AND status = 'approved'")
      .run(row.id);
    return db.prepare("SELECT * FROM android_sms_replies WHERE id = ?").get(row.id);
  });
  return transaction();
}

export function completeAndroidSmsReply(db: BetterSqliteDatabase, id: number, delivered: boolean, error?: string) {
  db.prepare(`UPDATE android_sms_replies SET status = ?, delivery_route = 'android', error = ?,
    completed_at = datetime('now') WHERE id = ? AND status = 'claimed'`)
    .run(delivered ? "sent" : "failed", error?.slice(0, 1000) || null, id);
  return db.prepare("SELECT * FROM android_sms_replies WHERE id = ?").get(id);
}

