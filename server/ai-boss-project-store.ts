import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { z } from "zod";

const projectInputSchema = z.object({
  project_key: z.string().trim().min(3).max(120).regex(/^[a-z0-9][a-z0-9._-]*$/),
  title: z.string().trim().min(3).max(200),
  outcome: z.string().trim().min(3).max(2000),
  status: z.enum(["active", "waiting", "completed", "archived"]).default("active"),
  priority: z.enum(["now", "next", "later"]).default("next"),
  source_ref: z.string().trim().max(240).nullable().optional(),
}).strict();

export type AiBossProjectInput = z.input<typeof projectInputSchema>;

export function ensureAiBossProjectTables(db: BetterSqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_boss_projects (
      project_key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      outcome TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'waiting', 'completed', 'archived')),
      priority TEXT NOT NULL CHECK (priority IN ('now', 'next', 'later')),
      source_ref TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_boss_projects_status_priority
      ON ai_boss_projects(status, priority, updated_at DESC);
  `);
}

export function saveAiBossProject(db: BetterSqliteDatabase, raw: AiBossProjectInput) {
  const input = projectInputSchema.parse(raw);
  db.prepare(`
    INSERT INTO ai_boss_projects (project_key, title, outcome, status, priority, source_ref, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(project_key) DO UPDATE SET
      title = excluded.title,
      outcome = excluded.outcome,
      status = excluded.status,
      priority = excluded.priority,
      source_ref = excluded.source_ref,
      updated_at = datetime('now')
  `).run(input.project_key, input.title, input.outcome, input.status, input.priority, input.source_ref || null);
  return db.prepare("SELECT * FROM ai_boss_projects WHERE project_key = ?").get(input.project_key);
}

export function listAiBossProjects(
  db: BetterSqliteDatabase,
  options: { status?: string; limit?: number } = {}
) {
  const limit = Math.min(Math.max(options.limit || 50, 1), 200);
  if (options.status) {
    return db.prepare(`
      SELECT * FROM ai_boss_projects WHERE status = ?
      ORDER BY CASE priority WHEN 'now' THEN 0 WHEN 'next' THEN 1 ELSE 2 END,
               updated_at DESC LIMIT ?
    `).all(options.status, limit);
  }
  return db.prepare(`
    SELECT * FROM ai_boss_projects
    ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'waiting' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
             CASE priority WHEN 'now' THEN 0 WHEN 'next' THEN 1 ELSE 2 END,
             updated_at DESC LIMIT ?
  `).all(limit);
}

export function getAiBossProjectWork(db: BetterSqliteDatabase, projectKey: string) {
  const project = db.prepare("SELECT * FROM ai_boss_projects WHERE project_key = ?").get(projectKey);
  if (!project) return null;
  const work = db.prepare(`
    SELECT * FROM executive_actions WHERE project_key = ?
    ORDER BY CASE status
      WHEN 'awaiting_approval' THEN 0 WHEN 'failed' THEN 1 WHEN 'approved' THEN 2
      WHEN 'executing' THEN 3 WHEN 'proposed' THEN 4 ELSE 5 END,
      COALESCE(due_at, '9999-12-31T23:59:59.999Z'), created_at DESC
  `).all(projectKey);
  return { project, work };
}
