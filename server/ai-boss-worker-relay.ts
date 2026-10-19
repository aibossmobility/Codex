import { randomUUID } from "node:crypto";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { z } from "zod";
import { workerAssignmentInput } from "./ai-boss-worker-assignments";
import { beginExecutiveActionExecution, completeExecutiveActionExecution } from "./executive-action-queue-store";

const reportSchema = z.object({
  lease: z.string().uuid(),
  project: workerAssignmentInput.shape.project,
  role: workerAssignmentInput.shape.role,
  read_only: z.literal(true),
  completed: z.literal(true),
}).strict();

export function ensureWorkerRelayTables(db: BetterSqliteDatabase) {
  db.exec(`CREATE TABLE IF NOT EXISTS ai_boss_worker_relay_claims (
    action_id INTEGER PRIMARY KEY,
    lease TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
}
function validatedAction(row: any) {
  if (row?.status !== "approved" || row.target_system !== "desktop_commander" ||
    row.target_ref !== "agent-team-readonly" || row.execution_route !== "local" ||
    row.provider_id != null || row.estimated_external_ai_cost_micros !== 0 ||
    !String(row.source_conversation_ref || "").startsWith("mobile-worker-") ||
    row.authority_level !== "observe" || row.approval_required !== 1) return null;
  let payload: any;
  try { payload = JSON.parse(row.action_payload_json || "{}"); } catch { return null; }
  if (payload.worker !== "agent-team-v1" || payload.mode !== "read_only" ||
    payload.no_writes !== true || payload.no_purchases !== true ||
    payload.no_outreach !== true || payload.origin !== "papa-life-os-mobile" ||
    payload.project !== row.project_key || typeof payload.instruction !== "string") return null;
  try {
    workerAssignmentInput.parse({
      project: payload.project,
      role: payload.role,
      instruction: payload.instruction,
      request_id: String(row.source_conversation_ref).slice("mobile-worker-".length),
    });
  } catch { return null; }
  if (payload.role === "papa-life-director" && payload.project !== "papa-life" ||
    payload.role === "ai-boss-mobility-director" && payload.project !== "ai-boss-mobility") return null;
  return { action_id: Number(row.id), project: payload.project as "papa-life"|"ai-boss-mobility",
    role: payload.role as string, instruction: payload.instruction as string,
    request_id: String(row.source_conversation_ref).slice("mobile-worker-".length) };
}
/** Cloud-side claim: only independently approved, fixed-cost, read-only worker assignments.
 * No server-to-Mac connection or execution occurs here. The Mac makes outbound HTTPS calls.
 */
export function claimApprovedWorkerAssignment(db: BetterSqliteDatabase) {
  ensureWorkerRelayTables(db);
  return db.transaction(() => {
    const rows = db.prepare(`SELECT a.*
      FROM executive_actions a LEFT JOIN ai_boss_worker_relay_claims c ON c.action_id=a.id
      WHERE a.status='approved' AND a.project_key IN ('papa-life','ai-boss-mobility')
        AND a.target_system='desktop_commander' AND a.target_ref='agent-team-readonly'
        AND a.source_conversation_ref LIKE 'mobile-worker-%'
        AND (c.action_id IS NULL OR c.expires_at <= datetime('now'))
      ORDER BY a.id LIMIT 30`).all() as any[];
    for (const row of rows) {
      const safe = validatedAction(row);
      if (!safe) continue;
      const lease = randomUUID();
      db.prepare(`INSERT INTO ai_boss_worker_relay_claims(action_id,lease,expires_at)
        VALUES(?,?,datetime('now','+5 minutes'))
        ON CONFLICT(action_id) DO UPDATE SET lease=excluded.lease,expires_at=excluded.expires_at,updated_at=datetime('now')`)
        .run(row.id,lease);
      return { ...safe, lease };
    }
    return null;
  })();
}
export function reportWorkerResult(db: BetterSqliteDatabase, actionId: number, raw: unknown) {
  const input = reportSchema.parse(raw);
  if (!Number.isSafeInteger(actionId) || actionId <= 0) throw new Error("Invalid action identifier");
  ensureWorkerRelayTables(db);
  return db.transaction(() => {
    const row = db.prepare("SELECT * FROM executive_actions WHERE id=?").get(actionId) as any;
    const safe = validatedAction(row);
    if (!safe || safe.project !== input.project || safe.role !== input.role) throw new Error("Unauthorized action or scope");
    const claim = db.prepare("SELECT lease,expires_at FROM ai_boss_worker_relay_claims WHERE action_id=?").get(actionId) as any;
    const deadline = claim ? db.prepare("SELECT (datetime('now') < ?) AS live").get(claim.expires_at) as { live: number } | undefined : null;
    if (!claim || claim.lease !== input.lease || deadline?.live !== 1) {
      throw new Error("Missing or expired dispatch lease");
    }
    beginExecutiveActionExecution(db,actionId,"verified-mac-worker-relay");
    const updated = completeExecutiveActionExecution(db,actionId,
      "Worker " + safe.role + " completed an approved local read-only review for " + safe.project,
      "verified-mac-worker-relay",
      { role: safe.role, project: safe.project, read_only: true, remote_receipt_id: actionId });
    return { id: actionId, status: updated?.status };
  })();
}
