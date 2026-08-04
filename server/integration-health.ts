type JsonRecord = Record<string, unknown>;

export type IntegrationCheck = {
  name: string;
  ok: boolean;
  status: "ok" | "warning" | "error" | "not_configured";
  detail: string;
  http_status?: number;
};

const GHL_API_BASE = process.env.GHL_API_BASE_URL || "https://services.leadconnectorhq.com";
const GHL_API_VERSION = process.env.GHL_API_VERSION || "2021-07-28";

function configured(name: string): boolean {
  return Boolean((process.env[name] || "").trim());
}

function redact(value: string): string {
  if (!value) return "not configured";
  if (value.length <= 8) return "configured";
  return `${value.slice(0, 3)}…${value.slice(-3)}`;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function ghlHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_API_VERSION,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export function integrationConfigurationSummary(): JsonRecord {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN || process.env.GHL_API_KEY || "";
  const locationId = process.env.GHL_LOCATION_ID || "";
  const webhook = process.env.AUTOMATION_CLOUD_WEBHOOK_URL || "";

  return {
    ghl: {
      token_configured: Boolean(token),
      token_fingerprint: redact(token),
      location_id_configured: Boolean(locationId),
      location_id_fingerprint: redact(locationId),
      api_base: GHL_API_BASE,
      api_version: GHL_API_VERSION,
    },
    make: {
      webhook_configured: Boolean(webhook),
      webhook_host: webhook ? new URL(webhook).host : null,
    },
    claude: {
      anthropic_key_configured: configured("ANTHROPIC_API_KEY"),
    },
    mcp: {
      bearer_token_configured: configured("MCP_BEARER_TOKEN"),
      public_base_url: process.env.PUBLIC_MCP_BASE_URL || null,
    },
  };
}

export async function diagnoseGhlConnection(): Promise<JsonRecord> {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN || process.env.GHL_API_KEY || "";
  const locationId = process.env.GHL_LOCATION_ID || "";

  if (!token || !locationId) {
    return {
      ok: false,
      status: "not_configured",
      checks: [
        {
          name: "credentials",
          ok: false,
          status: "not_configured",
          detail: "GHL token or location ID is missing from server environment variables.",
        },
      ],
      configuration: integrationConfigurationSummary(),
    };
  }

  const checks: IntegrationCheck[] = [];

  try {
    const locationResponse = await fetchWithTimeout(`${GHL_API_BASE}/locations/${encodeURIComponent(locationId)}`, {
      headers: ghlHeaders(token),
    });
    checks.push({
      name: "location_access",
      ok: locationResponse.ok,
      status: locationResponse.ok ? "ok" : "error",
      detail: locationResponse.ok
        ? "HighLevel location is reachable with the configured private integration token."
        : `HighLevel rejected the location request (${locationResponse.status}). Check token, location ID, or scopes.`,
      http_status: locationResponse.status,
    });
  } catch (error) {
    checks.push({
      name: "location_access",
      ok: false,
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const contactResponse = await fetchWithTimeout(
      `${GHL_API_BASE}/contacts/?locationId=${encodeURIComponent(locationId)}&limit=1`,
      { headers: ghlHeaders(token) }
    );
    checks.push({
      name: "contacts_scope",
      ok: contactResponse.ok,
      status: contactResponse.ok ? "ok" : "warning",
      detail: contactResponse.ok
        ? "Contacts API scope is working."
        : `Contacts check returned ${contactResponse.status}; the token may lack contacts.readonly or contacts.write scope.`,
      http_status: contactResponse.status,
    });
  } catch (error) {
    checks.push({
      name: "contacts_scope",
      ok: false,
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  const ok = checks.every((check) => check.ok);
  return { ok, status: ok ? "ok" : "warning", checks, configuration: integrationConfigurationSummary() };
}

export async function diagnoseMakeWebhook(): Promise<JsonRecord> {
  const webhook = process.env.AUTOMATION_CLOUD_WEBHOOK_URL || "";
  if (!webhook) {
    return {
      ok: false,
      status: "not_configured",
      detail: "AUTOMATION_CLOUD_WEBHOOK_URL is not configured.",
      dry_run: true,
    };
  }

  const payload = {
    event: "papalife.integration.health_check",
    dry_run: true,
    source: "papalife-mcp",
    timestamp: new Date().toISOString(),
    instructions: "Diagnostic only. Do not create contacts, send messages, or mutate records.",
  };

  try {
    const response = await fetchWithTimeout(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PapaLife-Dry-Run": "true" },
      body: JSON.stringify(payload),
    });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.ok ? "ok" : "error",
      http_status: response.status,
      response_preview: body.slice(0, 500),
      dry_run: true,
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
      dry_run: true,
    };
  }
}

export async function orchestrationHealthCheck(): Promise<JsonRecord> {
  const [ghl, make] = await Promise.all([diagnoseGhlConnection(), diagnoseMakeWebhook()]);
  const configuration = integrationConfigurationSummary();
  return {
    ok: Boolean((ghl as JsonRecord).ok) && Boolean((make as JsonRecord).ok),
    checked_at: new Date().toISOString(),
    configuration,
    ghl,
    make,
    safety: {
      secrets_returned: false,
      messages_sent: false,
      records_mutated: false,
      dry_run: true,
    },
  };
}
