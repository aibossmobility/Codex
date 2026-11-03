import type { Express, RequestHandler } from "express";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { queueWorkerAssignment } from "./ai-boss-worker-assignments";

/**
 * Shared production and isolated-staging registration for the owner-authorized
 * worker assignment endpoint. Does not grant any worker new capabilities.
 */
export function registerWorkerAssignmentEndpoint(
  app: Express,
  db: BetterSqliteDatabase,
  requireAuth: RequestHandler,
) {
  app.post("/api/admin/ai-boss/worker-assignments", requireAuth, (req, res) => {
    try {
      const assignment = queueWorkerAssignment(db, req.body);
      res.status(201).json({
        ok: true,
        assignment,
        message: "Assignment queued for independent approval. Not yet dispatched to Mac.",
        external_ai_cost_micros: 0,
      });
    } catch (e) {
      res.status(400).json({ ok: false, error: e instanceof Error ? e.message : "Invalid assignment" });
    }
  });
}
