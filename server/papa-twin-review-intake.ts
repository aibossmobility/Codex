import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { queueWorkerAssignment } from "./ai-boss-worker-assignments";

// No arbitrary LLM instruction enters the worker queue. This bridge does not
// approve tasks, accept identity claims, or execute tools on its own.
const FIXED_INSTRUCTION =
  "Check website health and public pages and routes for Papa Life. Report HTTP evidence for owner review.";
const TASK = "papa_public_website_audit" as const;
const DAILY_LIMIT = 3;
const SOURCE_PREFIX = "mobile-worker-";

type IntakeBody = { task: typeof TASK };

export function evaluateTwinRequest(
  db: BetterSqliteDatabase,
  body: unknown,
  suppliedBearer: string,
  environment: { enabled?: string; token?: string },
) {
  if (environment.enabled !== "true") return { status: 503, body: { ok: false, error: "Twin intake disabled" } };
  const expected = environment.token || "";
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(suppliedBearer, "utf8");
  if (a.length < 48 || a.length !== b.length || !timingSafeEqual(a, b)) {
    return { status: 401, body: { ok: false, error: "Unauthorized" } };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body as object).length !== 1 || (body as IntakeBody).task !== TASK) {
    return { status: 400, body: { ok: false, error: "Unsupported review-only request" } };
  }
  // Cap queue noise even if a visitor manages to trigger the agent's tool.
  // A public voice visitor has no authority to approve, spend, or view records.
  return db.transaction(() => {
    const count = db.prepare(
      `SELECT COUNT(*) AS total FROM executive_actions
       WHERE source_conversation_ref LIKE ?
         AND created_at >= datetime('now', '-1 day')`,
    ).get(SOURCE_PREFIX + "%") as { total: number };
    // Existing mobile assignments count toward the cap conservatively.
    if (count.total >= DAILY_LIMIT) return { status: 429, body: { ok: false, error: "Review queue limit reached" } };
    const queued = queueWorkerAssignment(db, {
      project: "papa-life",
      role: "seo-website",
      instruction: FIXED_INSTRUCTION,
      request_id: randomUUID(),
    });
    return { status: 202, body: { ok: true, request_id: queued.id, status: "awaiting_approval",
      message: "Queued for owner's review. Nothing has been run or published." } };
  })();
}

export function papaTwinReviewIntakeRoute(db: BetterSqliteDatabase) {
  return (req: Request, res: Response) => {
    const header = String(req.headers.authorization || "");
    const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    try {
      const result = evaluateTwinRequest(db, req.body, bearer, {
        enabled: process.env.PAPA_TWIN_REVIEW_INTAKE_ENABLED,
        token: process.env.PAPA_TWIN_REVIEW_INTAKE_TOKEN,
      });
      res.status(result.status).json(result.body);
    } catch {
      res.status(500).json({ ok: false, error: "Review intake unavailable" });
    }
  };
}
