import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import {
  beginExecutiveActionExecution,
  completeExecutiveActionExecution,
  failExecutiveActionExecution,
  getExecutiveActionById,
} from "./executive-action-queue-store";

type ExecutiveActionRow = {
  id: number;
  action_type: string;
  target_system: string;
  target_ref: string | null;
  requested_outcome: string;
  authority_level: string;
  execution_route: string;
  approval_required: number;
  status: string;
};

export type ExecutorResult = {
  summary: string;
  details?: unknown;
};

export type ExecutiveActionExecutor = (action: ExecutiveActionRow) => Promise<ExecutorResult>;

export type ExecutorRegistry = Partial<Record<string, ExecutiveActionExecutor>>;

function resolveDesktopCommanderEndpoint() {
  return String(process.env.AI_BOSS_DESKTOP_COMMANDER_ENDPOINT || "").trim();
}

function resolveDesktopCommanderToken() {
  return String(process.env.AI_BOSS_LOCAL_BRIDGE_TOKEN || "").trim();
}

export function createDesktopCommanderExecutor(fetchImpl: typeof fetch = fetch): ExecutiveActionExecutor {
  return async (action) => {
    const endpoint = resolveDesktopCommanderEndpoint();
    if (!endpoint) {
      throw new Error("Desktop Commander executor is not configured on this runtime.");
    }
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(resolveDesktopCommanderToken() ? { authorization: `Bearer ${resolveDesktopCommanderToken()}` } : {}),
      },
      body: JSON.stringify({
        action_id: action.id,
        action_type: action.action_type,
        target_system: action.target_system,
        target_ref: action.target_ref,
        requested_outcome: action.requested_outcome,
        authority_level: action.authority_level,
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Desktop Commander bridge returned ${response.status}: ${text.slice(0, 500)}`);
    }
    let details: unknown = text;
    try {
      details = text ? JSON.parse(text) : null;
    } catch {
      // Keep plain-text bridge responses as-is.
    }
    return { summary: "Desktop Commander action completed through the configured local bridge.", details };
  };
}


function resolveGmailConnectorEndpoint() {
  return String(process.env.AI_BOSS_GMAIL_CONNECTOR_ENDPOINT || "").trim();
}

function resolveGmailConnectorToken() {
  return String(process.env.AI_BOSS_GMAIL_CONNECTOR_TOKEN || "").trim();
}

export function createGmailReadExecutor(fetchImpl: typeof fetch = fetch): ExecutiveActionExecutor {
  return async (action) => {
    if (!["read", "search"].includes(action.action_type)) {
      throw new Error(`Gmail executor only permits read/search actions; received ${action.action_type}.`);
    }
    const endpoint = resolveGmailConnectorEndpoint();
    if (!endpoint) {
      throw new Error("Gmail connector executor is not configured on this runtime.");
    }
    const token = resolveGmailConnectorToken();
    if (!token) {
      throw new Error("Gmail connector token is not configured on this runtime.");
    }
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action_id: action.id,
        operation: action.action_type,
        target_ref: action.target_ref,
        requested_outcome: action.requested_outcome,
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Gmail connector returned ${response.status}: ${text.slice(0, 500)}`);
    }
    let details: unknown = text;
    try {
      details = text ? JSON.parse(text) : null;
    } catch {
      // Keep plain-text connector responses as-is.
    }
    return { summary: "Gmail read/search action completed through the configured connector.", details };
  };
}

export function defaultExecutorRegistry(): ExecutorRegistry {
  return {
    gmail: createGmailReadExecutor(),
    desktop_commander: createDesktopCommanderExecutor(),
    files: createDesktopCommanderExecutor(),
  };
}

export async function executeApprovedExecutiveAction(
  db: BetterSqliteDatabase,
  id: number,
  registry: ExecutorRegistry = defaultExecutorRegistry()
) {
  const row = getExecutiveActionById(db, id) as ExecutiveActionRow | undefined;
  if (!row) throw new Error("Action not found");
  if (row.status !== "approved") {
    throw new Error(`Only approved actions can execute; current status is ${row.status}`);
  }
  const executor = registry[row.target_system];
  if (!executor) {
    throw new Error(`No executor is registered for target system: ${row.target_system}`);
  }

  beginExecutiveActionExecution(db, id, "executor");
  try {
    const result = await executor({ ...row, status: "executing" });
    return completeExecutiveActionExecution(db, id, result.summary, "executor");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failExecutiveActionExecution(db, id, message, "executor");
    throw error;
  }
}
