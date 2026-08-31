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

function executorRegistryKey(targetSystem: string, executionRoute: string) {
  return `${targetSystem}:${executionRoute}`;
}

function resolveExecutorTimeoutMs() {
  const configured = Number(process.env.AI_BOSS_EXECUTOR_TIMEOUT_MS || 15_000);
  if (!Number.isFinite(configured)) return 15_000;
  return Math.min(Math.max(Math.round(configured), 1_000), 120_000);
}

function resolveExecutorResultMaxBytes() {
  const configured = Number(process.env.AI_BOSS_EXECUTOR_RESULT_MAX_BYTES || 1_000_000);
  if (!Number.isFinite(configured)) return 1_000_000;
  return Math.min(Math.max(Math.round(configured), 1_000), 2_000_000);
}

async function readBoundedResponseText(response: Response) {
  const maxBytes = resolveExecutorResultMaxBytes();
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new Error(`Connector response exceeds the ${maxBytes}-byte limit.`);
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error(`Connector response exceeds the ${maxBytes}-byte limit.`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

function resolveDesktopCommanderEndpoint() {
  return String(process.env.AI_BOSS_DESKTOP_COMMANDER_ENDPOINT || "").trim();
}

function resolveDesktopCommanderToken() {
  return String(process.env.AI_BOSS_LOCAL_BRIDGE_TOKEN || "").trim();
}

export function createDesktopCommanderExecutor(fetchImpl: typeof fetch = fetch): ExecutiveActionExecutor {
  return async (action) => {
    if (action.execution_route !== "local") {
      throw new Error(`Desktop Commander executor only supports the local route; received ${action.execution_route}.`);
    }
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
      signal: AbortSignal.timeout(resolveExecutorTimeoutMs()),
    });
    const text = await readBoundedResponseText(response);
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
    if (action.execution_route !== "direct") {
      throw new Error(`Gmail connector executor only supports the direct route; received ${action.execution_route}.`);
    }
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
      signal: AbortSignal.timeout(resolveExecutorTimeoutMs()),
    });
    const text = await readBoundedResponseText(response);
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
    [executorRegistryKey("gmail", "direct")]: createGmailReadExecutor(),
    [executorRegistryKey("desktop_commander", "local")]: createDesktopCommanderExecutor(),
    [executorRegistryKey("files", "local")]: createDesktopCommanderExecutor(),
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
  const registryKey = executorRegistryKey(row.target_system, row.execution_route);
  const executor = registry[registryKey];
  if (!executor) {
    throw new Error(`No executor is registered for target/route: ${row.target_system}/${row.execution_route}`);
  }

  beginExecutiveActionExecution(db, id, "executor");
  try {
    const result = await executor({ ...row, status: "executing" });
    return completeExecutiveActionExecution(db, id, result.summary, "executor", result.details);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failExecutiveActionExecution(db, id, message, "executor");
    throw error;
  }
}
