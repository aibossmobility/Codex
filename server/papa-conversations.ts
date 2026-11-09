import type { Database } from 'better-sqlite3';
import type { Express, RequestHandler } from 'express';
import { papaConversationSchema, type PapaConversation } from '../shared/papa-conversations';

export function ensurePapaConversations(db: Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS papa_owner_conversations (
    owner_id INTEGER NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (owner_id, id)
  )`);
}
export function listPapaConversations(db: Database, owner: number): PapaConversation[] {
  return (db.prepare('SELECT data FROM papa_owner_conversations WHERE owner_id = ? ORDER BY updated_at DESC, id').all(owner) as {data: string}[]).map(r => JSON.parse(r.data));
}
export function savePapaConversation(db: Database, owner: number, raw: unknown) {
  const data = papaConversationSchema.parse(raw);
  db.prepare(`INSERT INTO papa_owner_conversations (owner_id,id,data) VALUES (?,?,?)
    ON CONFLICT(owner_id,id) DO UPDATE SET data=excluded.data,updated_at=datetime('now')`).run(owner, data.id, JSON.stringify(data));
  return data;
}
export function installPapaConversationRoutes(app: Express, db: Database, requireAuth: RequestHandler) {
  ensurePapaConversations(db);
  const root = '/api/admin/papa-conversations';
  app.get(root, requireAuth, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try { res.json({ok: true, conversations: listPapaConversations(db, Number((req.session as any).adminId))}); }
    catch { res.status(500).json({ok: false, error: 'Conversations could not be loaded. Please retry.'}); }
  });
  app.post(root, requireAuth, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const parsed = papaConversationSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ok: false, error: parsed.error.issues[0]?.message || 'Please check the conversation fields.'}); return; }
    try { res.json({ok: true, conversation: savePapaConversation(db, Number((req.session as any).adminId), parsed.data)}); }
    catch { res.status(500).json({ok: false, error: 'Saving failed. Your notes are still on screen. Please retry.'}); }
  });
}
