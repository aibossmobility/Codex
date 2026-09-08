import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import {
  beginExecutiveActionExecution,
  completeExecutiveActionExecution,
  failExecutiveActionExecution,
  getExecutiveActionById,
} from "./executive-action-queue-store";
import { resolveExecutorResultMaxBytes } from "./executive-action-limits";

type ExecutiveActionRow = {
  id: number;
  action_type: string;
  target_system: string;
  target_ref: string | null;
  requested_outcome: string;
  authority_level: string;
  execution_route: string;
  approval_required: number;
  provider_id?: string | null;
  action_payload_json?: string | null;
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

async function readBoundedResponseText(response: Response) {
  const maxBytes = resolveExecutorResultMaxBytes();
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new Error(`Connector response exceeds the ${maxBytes}-byte result limit.`);
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
      throw new Error(`Connector response exceeds the ${maxBytes}-byte result limit.`);
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
    if (!["read", "search"].includes(action.action_type)) {
      throw new Error(`Desktop Commander executor only permits read/search actions; received ${action.action_type}.`);
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

function parseGmailSendPayload(action: ExecutiveActionRow) {
  if (action.approval_required !== 1 || !["act_external", "sensitive"].includes(action.authority_level)) {
    throw new Error("Gmail send actions require explicit external-action approval.");
  }
  let payload: any = null;
  try { payload = action.action_payload_json ? JSON.parse(action.action_payload_json) : null; } catch {
    throw new Error("Gmail send action payload is not valid JSON.");
  }
  if (!payload || !["send", "reply"].includes(payload.mode) || typeof payload.body !== "string" || !payload.body.trim()) {
    throw new Error("Gmail send actions require a structured send/reply payload with a non-empty body.");
  }
  if (payload.mode === "send") {
    if (typeof payload.to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.to)) {
      throw new Error("Gmail send payload requires a valid recipient email address.");
    }
    if (typeof payload.subject !== "string" || !payload.subject.trim()) {
      throw new Error("Gmail send payload requires a subject.");
    }
  }
  if (payload.mode === "reply" && (typeof payload.message_id !== "string" || !payload.message_id.trim())) {
    throw new Error("Gmail reply payload requires the original message ID.");
  }
  return payload;
}

export function createGmailExecutor(fetchImpl: typeof fetch = fetch): ExecutiveActionExecutor {
  return async (action) => {
    if (action.execution_route !== "direct") {
      throw new Error(`Gmail connector executor only supports the direct route; received ${action.execution_route}.`);
    }
    if (!["read", "search", "send"].includes(action.action_type)) {
      throw new Error(`Gmail executor only permits read/search/send actions; received ${action.action_type}.`);
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
      body: JSON.stringify(action.action_type === "send" ? {
        action_id: action.id,
        operation: "send",
        payload: parseGmailSendPayload(action),
      } : {
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
    return { summary: action.action_type === "send" ? "Approved Gmail send/reply completed through the configured connector." : "Gmail read/search action completed through the configured connector.", details };
  };
}

function parseCloudModelPayload(action: ExecutiveActionRow) {
  let payload: any = null;
  try {
    payload = action.action_payload_json ? JSON.parse(action.action_payload_json) : {};
  } catch {
    throw new Error("Cloud-model action payload is not valid JSON.");
  }
  const input = typeof payload?.input === "string" && payload.input.trim()
    ? payload.input.trim()
    : action.requested_outcome.trim();
  const instructions = typeof payload?.instructions === "string" ? payload.instructions.trim() : "";
  return { input, instructions };
}

function extractXaiResponseText(json: any) {
  if (typeof json?.output_text === "string" && json.output_text.trim()) return json.output_text.trim();
  const parts = Array.isArray(json?.output)
    ? json.output.flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    : [];
  const text = parts
    .map((part: any) => typeof part?.text === "string" ? part.text : "")
    .filter(Boolean)
    .join("\n")
    .trim();
  return text;
}

export function createCloudModelExecutor(fetchImpl: typeof fetch = fetch): ExecutiveActionExecutor {
  return async (action) => {
    if (action.execution_route !== "cloud_model") {
      throw new Error(`Cloud-model executor requires cloud_model route; received ${action.execution_route}.`);
    }
    const provider = String(action.provider_id || "").trim().toLowerCase();
    if (!["xai", "grok"].includes(provider)) {
      throw new Error(`Cloud-model provider is not registered in this executor: ${provider || "missing"}.`);
    }
    const key = String(process.env.XAI_API_KEY || "").trim();
    if (!key) throw new Error("xAI is not configured on this runtime. Set XAI_API_KEY server-side.");

    const { input, instructions } = parseCloudModelPayload(action);
    const baseUrl = String(process.env.XAI_BASE_URL || "https://api.x.ai/v1").replace(/\/$/, "");
    const response = await fetchImpl(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-4.6",
        input: instructions ? `${instructions}\n\n${input}` : input,
      }),
      signal: AbortSignal.timeout(resolveExecutorTimeoutMs()),
    });
    const text = await readBoundedResponseText(response);
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {
      throw new Error(`xAI returned a non-JSON response (${response.status}).`);
    }
    if (!response.ok) {
      throw new Error(json?.error?.message || `xAI request failed with status ${response.status}.`);
    }
    const output = extractXaiResponseText(json);
    if (!output) throw new Error("xAI returned no response text.");
    return {
      summary: "Unified OS cloud-model action completed through xAI Grok.",
      details: {
        provider: "xai",
        model: process.env.XAI_MODEL || "grok-4.6",
        output,
        response_id: json?.id || null,
        usage: json?.usage || null,
      },
    };
  };
}

export function defaultExecutorRegistry(): ExecutorRegistry {
  return {
    [executorRegistryKey("gmail", "direct")]: createGmailExecutor(),
    [executorRegistryKey("desktop_commander", "local")]: createDesktopCommanderExecutor(),
    [executorRegistryKey("files", "local")]: createDesktopCommanderExecutor(),
    [executorRegistryKey("system", "cloud_model")]: createCloudModelExecutor(),
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