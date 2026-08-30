import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { z } from "zod";

export const actionTargetSystems = [
  "gmail",
  "calendar",
  "web",
  "files",
  "desktop_commander",
  "github",
  "ghl",
  "papa_life",
  "human_impact",
  "system",
] as const;

export const actionTypes = [
  "read",
  "search",
  "create",
  "update",
  "send",
  "publish",
  "delete",
  "execute",
  "analyze",
] as const;

export const executionRoutes = ["direct", "local", "local_model", "cloud_model"] as const;
export const authorityLevels = ["observe", "act_reversible", "act_external", "sensitive"] as const;

export const executiveActionInputSchema = z
  .object({
    action_type: z.enum(actionTypes),
    target_system: z.enum(actionTargetSystems),
    target_ref: z.string().trim().max(500).nullable().optional(),
    requested_outcome: z.string().trim().min(3).max(4000),
    authority_level: z.enum(authorityLevels),
    execution_route: z.enum(executionRoutes).optional(),
    approval_required: z.boolean().optional(),
    provider_id: z.string().trim().max(100).nullable().optional(),
    estimated_external_ai_cost_micros: z.number().int().min(0).max(100_000_000).default(0),
    source_conversation_ref: z.string().trim().max(160).nullable().optional(),
    human_impact_observation_id: z.number().int().positive().nullable().optional(),
  })
  .strict();

const decisionSchema = z
  .object({
    decision: z.enum(["approve", "decline"]),
    note: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export type ExecutiveActionInput = z.input<typeof executiveActionInputSchema>;

const deterministicActionTypes = new Set(["read", "search", "create", "update", "send", "publish", "delete", "execute"]);

export function defaultExecutionRoute(input: {
  action_type: (typeof actionTypes)[number];
  target_system: (typeof actionTargetSystems)[number];
}) {
  if (input.action_type === "analyze") return "local_model" as const;
  if (input.target_system === "files" || input.target_system === "desktop_commander") {
    return "local" as const;
  }
  if (deterministicActionTypes.has(input.action_type)) return "direct" as const;
  return "local" as const;
}

export function actionRequiresApproval(input: {
  action_type: (typeof actionTypes)[number];
  authority_level: (typeof authorityLevels)[number];
  execution_route: (typeof executionRoutes)[number];
  approval_required?: boolean;
}) {
  const mandatory =
    input.authority_level === "act_external" ||
    input.authority_level === "sensitive" ||
    ["create", "update", "send", "publish", "delete", "execute"].includes(input.action_type) ||
    input.execution_route === "cloud_model";
  return mandatory || input.approval_required === true;
}

export function ensureExecutiveActionQueueTables(db: BetterSqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS executive_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      target_system TEXT NOT NULL,
      target_ref TEXT,
      requested_outcome TEXT NOT NULL,
      authority_level TEXT NOT NULL,
      execution_route TEXT NOT NULL,
      approval_required INTEGER NOT NULL,
      provider_id TEXT,
      estimated_external_ai_cost_micros INTEGER NOT NULL DEFAULT 0,
      source_conversation_ref TEXT,
      human_impact_observation_id INTEGER REFERENCES human_impact_observations(id) ON DELETE SET NULL,
      status TEXT NOT NULL CHECK (status IN (
        'proposed', 'awaiting_approval', 'approved', 'executing',
        'completed', 'failed', 'declined'
      )),
      result_summary TEXT,
      error_summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      approved_at TEXT,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_executive_actions_status_created
      ON executive_actions(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_executive_actions_target_created
      ON executive_actions(target_system, created_at DESC);

    CREATE TABLE IF NOT EXISTS executive_action_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_id INTEGER NOT NULL REFERENCES executive_actions(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      note TEXT,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_executive_action_audit_action
      ON executive_action_audit(action_id, id ASC);
  `);
}

export function createExecutiveAction(db: BetterSqliteDatabase, rawInput: ExecutiveActionInput) {
  const parsed = executiveActionInputSchema.parse(rawInput);
  const executionRoute = parsed.execution_route || defaultExecutionRoute(parsed);
  const approvalRequired = actionRequiresApproval({ ...parsed, execution_route: executionRoute });

  if (executionRoute === "cloud_model" && !parsed.provider_id) {
    throw new Error("Cloud-model actions must name the optional provider so usage stays visible.");
  }
  if (executionRoute !== "cloud_model" && parsed.estimated_external_ai_cost_micros > 0) {
    throw new Error("External AI cost must be zero unless execution_route is cloud_model.");
  }
  if (["direct", "local"].includes(executionRoute) && parsed.provider_id) {
    throw new Error("Direct and local actions cannot depend on an AI provider.");
  }

  const status = approvalRequired ? "awaiting_approval" : "approved";
  const transaction = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO executive_actions (
          action_type, target_system, target_ref, requested_outcome, authority_level,
          execution_route, approval_required, provider_id,
          estimated_external_ai_cost_micros, source_conversation_ref,
          human_impact_observation_id, status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        parsed.action_type,
        parsed.target_system,
        parsed.target_ref || null,
        parsed.requested_outcome,
        parsed.authority_level,
        executionRoute,
        approvalRequired ? 1 : 0,
        parsed.provider_id || (executionRoute === "local_model" ? "local_default" : null),
        parsed.estimated_external_ai_cost_micros,
        parsed.source_conversation_ref || null,
        parsed.human_impact_observation_id || null,
        status
      );
    const id = Number(result.lastInsertRowid);
    db.prepare(
      `INSERT INTO executive_action_audit
       (action_id, event_type, from_status, to_status, note, actor)
       VALUES (?, 'created', NULL, ?, ?, 'system')`
    ).run(id, status, `Route selected: ${executionRoute}; approval required: ${approvalRequired}`);
    return getExecutiveActionById(db, id);
  });
  return transaction();
}

export function getExecutiveActionById(db: BetterSqliteDatabase, id: number) {
  return db.prepare("SELECT * FROM executive_actions WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
}

export function listExecutiveActions(
  db: BetterSqliteDatabase,
  options: { status?: string; targetSystem?: string; limit?: number } = {}
) {
  const conditions: string[] = [];
  const values: Array<string | number> = [];
  if (options.status) {
    conditions.push("status = ?");
    values.push(options.status);
  }
  if (options.targetSystem) {
    conditions.push("target_system = ?");
    values.push(options.targetSystem);
  }
  values.push(Math.min(Math.max(options.limit || 100, 1), 500));
  return db
    .prepare(
      `SELECT * FROM executive_actions
       ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
       ORDER BY CASE status WHEN 'awaiting_approval' THEN 0 WHEN 'failed' THEN 1 ELSE 2 END,
                created_at DESC, id DESC LIMIT ?`
    )
    .all(...values);
}

export function decideExecutiveAction(
  db: BetterSqliteDatabase,
  id: number,
  rawDecision: z.input<typeof decisionSchema>
) {
  const input = decisionSchema.parse(rawDecision);
  const transaction = db.transaction(() => {
    const current = getExecutiveActionById(db, id) as { status?: string } | undefined;
    if (!current) throw new Error("Action not found");
    if (current.status !== "awaiting_approval") {
      throw new Error(`Only awaiting_approval actions can be decided; current status is ${current.status}`);
    }
    const toStatus = input.decision === "approve" ? "approved" : "declined";
    db.prepare(
      `UPDATE executive_actions SET status = ?, updated_at = datetime('now'),
       approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE approved_at END
       WHERE id = ?`
    ).run(toStatus, toStatus, id);
    db.prepare(
      `INSERT INTO executive_action_audit
       (action_id, event_type, from_status, to_status, note, actor)
       VALUES (?, ?, 'awaiting_approval', ?, ?, 'brian')`
    ).run(id, input.decision, toStatus, input.note || null);
    return getExecutiveActionById(db, id);
  });
  return transaction();
}

export function beginExecutiveActionExecution(
  db: BetterSqliteDatabase,
  id: number,
  actor = "executor"
) {
  const transaction = db.transaction(() => {
    const current = getExecutiveActionById(db, id) as { status?: string } | undefined;
    if (!current) throw new Error("Action not found");
    if (current.status !== "approved") {
      throw new Error(`Only approved actions can execute; current status is ${current.status}`);
    }
    db.prepare(
      `UPDATE executive_actions SET status = 'executing', updated_at = datetime('now'),
       error_summary = NULL WHERE id = ?`
    ).run(id);
    db.prepare(
      `INSERT INTO executive_action_audit
       (action_id, event_type, from_status, to_status, note, actor)
       VALUES (?, 'execution_started', 'approved', 'executing', NULL, ?)`
    ).run(id, actor);
    return getExecutiveActionById(db, id);
  });
  return transaction();
}

export function completeExecutiveActionExecution(
  db: BetterSqliteDatabase,
  id: number,
  summary: string,
  actor = "executor"
) {
  const transaction = db.transaction(() => {
    const current = getExecutiveActionById(db, id) as { status?: string } | undefined;
    if (!current) throw new Error("Action not found");
    if (current.status !== "executing") {
      throw new Error(`Only executing actions can complete; current status is ${current.status}`);
    }
    db.prepare(
      `UPDATE executive_actions SET status = 'completed', result_summary = ?, error_summary = NULL,
       updated_at = datetime('now'), completed_at = datetime('now') WHERE id = ?`
    ).run(summary.slice(0, 4000), id);
    db.prepare(
      `INSERT INTO executive_action_audit
       (action_id, event_type, from_status, to_status, note, actor)
       VALUES (?, 'execution_completed', 'executing', 'completed', ?, ?)`
    ).run(id, summary.slice(0, 2000), actor);
    return getExecutiveActionById(db, id);
  });
  return transaction();
}

export function failExecutiveActionExecution(
  db: BetterSqliteDatabase,
  id: number,
  errorSummary: string,
  actor = "executor"
) {
  const transaction = db.transaction(() => {
    const current = getExecutiveActionById(db, id) as { status?: string } | undefined;
    if (!current) throw new Error("Action not found");
    if (current.status !== "executing") {
      throw new Error(`Only executing actions can fail; current status is ${current.status}`);
    }
    db.prepare(
      `UPDATE executive_actions SET status = 'failed', error_summary = ?,
       updated_at = datetime('now'), completed_at = datetime('now') WHERE id = ?`
    ).run(errorSummary.slice(0, 4000), id);
    db.prepare(
      `INSERT INTO executive_action_audit
       (action_id, event_type, from_status, to_status, note, actor)
       VALUES (?, 'execution_failed', 'executing', 'failed', ?, ?)`
    ).run(id, errorSummary.slice(0, 2000), actor);
    return getExecutiveActionById(db, id);
  });
  return transaction();
}

export function getExecutiveActionAudit(db: BetterSqliteDatabase, id: number) {
  return db
    .prepare("SELECT * FROM executive_action_audit WHERE action_id = ? ORDER BY id ASC")
    .all(id);
}
