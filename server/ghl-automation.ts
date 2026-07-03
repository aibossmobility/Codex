/**
 * GHL new-contact automation for Papa Life / Boss Mobile.
 * Used by Make.com Scenario 1 (webhook), Scenario 2 (claude-prompt), and papalife MCP tools.
 */
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { randomBytes } from "crypto";
import { resolveGhlCredentials } from "./ghl-integration-store";

export const PAPA_VOICE_SYSTEM = `You are Brian Keith Hill's Papa Life AI strategist — warm, direct, faith-informed, 9th-grade reading level.
Brand: Boss Mobile Life Coach / PAPA Life — fathers of adult children rebuilding connection.
Never sound corporate. Sound like Brian talking to one dad at a time.`;

const OUTREACH_NOTE_SYSTEM = `${PAPA_VOICE_SYSTEM}
Write exactly 3 sentences for a GoHighLevel contact note — a warm Papa Life outreach opener in Brian's voice.
No bullet points. No subject line. No sign-off block.`;

const VOICE_BRIEF_SYSTEM = `${PAPA_VOICE_SYSTEM}
The user (Brian) will HEAR this aloud in Claude voice mode. Write 2–4 short spoken sentences:
who just came in, why they matter, and one suggested next move. Conversational, present tense.`;

function anthropicKey(): string | null {
  return process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim() || null;
}

async function claudeGenerate(system: string, userContent: string, maxTokens = 1024): Promise<string> {
  const key = anthropicKey();
  if (!key) throw new Error("ANTHROPIC_API_KEY or CLAUDE_API_KEY is not set on the server");
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Anthropic ${r.status}: ${err.slice(0, 400)}`);
  }
  const j = (await r.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = j.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("") ?? "";
  const out = text.trim();
  if (!out) throw new Error("Claude returned empty text");
  return out;
}

export function ensureGhlAutomationTables(db: BetterSqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ghl_contact_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ghl_contact_id TEXT,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      source TEXT,
      tags_json TEXT,
      outreach_note TEXT,
      voice_prompt TEXT NOT NULL,
      raw_payload_json TEXT,
      lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
      cloud_forwarded_at TEXT,
      cloud_forward_status TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ghl_alerts_unread ON ghl_contact_alerts(read_at, created_at);
    CREATE TABLE IF NOT EXISTS automation_webhook_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT NOT NULL,
      target_url TEXT,
      payload_json TEXT,
      response_status INTEGER,
      response_body TEXT,
      alert_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  try {
    db.exec("ALTER TABLE ghl_contact_alerts ADD COLUMN cloud_forwarded_at TEXT");
  } catch {
    /* exists */
  }
  try {
    db.exec("ALTER TABLE ghl_contact_alerts ADD COLUMN cloud_forward_status TEXT");
  } catch {
    /* exists */
  }
}

export function cloudWebhookUrl(): string | null {
  const url =
    process.env.AUTOMATION_CLOUD_WEBHOOK_URL?.trim() ||
    process.env.MAKE_SCENARIO2_WEBHOOK_URL?.trim() ||
    process.env.MAKE_CLOUD_WEBHOOK_URL?.trim() ||
    null;
  return url || null;
}

export function siteAutomationBase(): string {
  return process.env.PUBLIC_SITE_URL?.trim() || "https://bossmobilelifecoach.com";
}

/** Cloud → server: accept { prompt } or { prompt, context } */
export function parseClaudePromptBody(body: Record<string, unknown>): { prompt: string; context?: string } {
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) throw new Error('JSON body must include "prompt": "..."');
  const context = body.context != null ? String(body.context).trim() : undefined;
  return { prompt, context: context || undefined };
}

export type OutboundCloudPayload = {
  event: "ghl_new_contact";
  prompt: string;
  contact: {
    ghl_contact_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    source: string | null;
    tags: string[];
  };
  outreach_note: string;
  voice_prompt: string;
  alert_id: number;
  lead_id: number;
  site_origin: string;
  inbound: {
    claude_prompt_url: string;
    claude_prompt_body: { prompt: string; context?: string };
    claude_prompt_response: { ok: boolean; response: string; model: string; prompt: string; voice: string };
  };
};

export function buildOutboundCloudPayload(
  input: GhlContactInput,
  result: {
    alert_id: number;
    lead_id: number;
    outreach_note: string;
    voice_prompt: string;
    ghl_contact_id: string | null;
  }
): OutboundCloudPayload {
  const base = siteAutomationBase();
  const displayName = [input.first_name, input.last_name].filter(Boolean).join(" ") || "New contact";
  const contactLines = [
    displayName,
    input.email ? `email ${input.email}` : null,
    input.phone ? `phone ${input.phone}` : null,
    input.source ? `source ${input.source}` : null,
    input.tags?.length ? `tags ${input.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const prompt = [
    `New Papa Life / Boss Mobile lead: ${contactLines}.`,
    "Use Brian Keith Hill's warm Papa Life voice (faith-informed, direct, 9th-grade reading level).",
    "Decide the best next step (GHL note tweak, SMS, call prep, or tag).",
    `Outreach note already on file: ${result.outreach_note}`,
    `Voice brief for Brian: ${result.voice_prompt}`,
    `To ask Claude on the server, POST JSON to ${base}/api/automation/claude-prompt with body {"prompt":"your question here"} and Bearer auth.`,
  ].join(" ");

  return {
    event: "ghl_new_contact",
    prompt,
    contact: {
      ghl_contact_id: input.ghl_contact_id ?? null,
      first_name: input.first_name ?? null,
      last_name: input.last_name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      source: input.source ?? null,
      tags: input.tags ?? [],
    },
    outreach_note: result.outreach_note,
    voice_prompt: result.voice_prompt,
    alert_id: result.alert_id,
    lead_id: result.lead_id,
    site_origin: base,
    inbound: {
      claude_prompt_url: `${base}/api/automation/claude-prompt`,
      claude_prompt_body: { prompt: "Your follow-up question about this lead" },
      claude_prompt_response: {
        ok: true,
        response: "(Claude Papa Life text)",
        model: process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001",
        prompt: "",
        voice: "papa_life",
      },
    },
  };
}

export async function postJsonToCloudWebhook(
  db: BetterSqliteDatabase,
  url: string,
  payload: OutboundCloudPayload,
  alertId: number
): Promise<{ ok: boolean; status: number; body: string }> {
  const secret = webhookSecret();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers.Authorization = `Bearer ${secret}`;

  const r = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const body = await r.text();

  db.prepare(
    `INSERT INTO automation_webhook_log (direction, target_url, payload_json, response_status, response_body, alert_id)
     VALUES ('outbound', ?, ?, ?, ?, ?)`
  ).run(url, JSON.stringify(payload), r.status, body.slice(0, 8000), alertId);

  db.prepare(
    `UPDATE ghl_contact_alerts SET cloud_forwarded_at = datetime('now'), cloud_forward_status = ? WHERE id = ?`
  ).run(r.ok ? "ok" : `http_${r.status}`, alertId);

  return { ok: r.ok, status: r.status, body: body.slice(0, 2000) };
}

export async function forwardAlertToCloud(
  db: BetterSqliteDatabase,
  alertId: number
): Promise<{ forwarded: boolean; cloud_url?: string; status?: number; error?: string }> {
  const url = cloudWebhookUrl();
  if (!url) return { forwarded: false, error: "AUTOMATION_CLOUD_WEBHOOK_URL not set" };

  const row = db
    .prepare(
      `SELECT id, ghl_contact_id, first_name, last_name, email, phone, source, tags_json,
              outreach_note, voice_prompt, lead_id, cloud_forwarded_at
       FROM ghl_contact_alerts WHERE id = ?`
    )
    .get(alertId) as {
    id: number;
    ghl_contact_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    source: string | null;
    tags_json: string | null;
    outreach_note: string | null;
    voice_prompt: string;
    lead_id: number | null;
    cloud_forwarded_at: string | null;
  } | undefined;

  if (!row) return { forwarded: false, error: "alert not found" };
  if (row.cloud_forwarded_at) return { forwarded: false, error: "already forwarded" };

  const input: GhlContactInput = {
    ghl_contact_id: row.ghl_contact_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    source: row.source,
    tags: row.tags_json ? (JSON.parse(row.tags_json) as string[]) : null,
  };

  const payload = buildOutboundCloudPayload(input, {
    alert_id: row.id,
    lead_id: row.lead_id ?? 0,
    outreach_note: row.outreach_note ?? "",
    voice_prompt: row.voice_prompt,
    ghl_contact_id: row.ghl_contact_id,
  });

  const sent = await postJsonToCloudWebhook(db, url, payload, alertId);
  return {
    forwarded: sent.ok,
    cloud_url: url,
    status: sent.status,
    error: sent.ok ? undefined : sent.body.slice(0, 300),
  };
}

export function webhookSecret(): string {
  return (
    process.env.GHL_WEBHOOK_SECRET?.trim() ||
    process.env.MAKE_WEBHOOK_SECRET?.trim() ||
    process.env.AUTOMATION_WEBHOOK_SECRET?.trim() ||
    ""
  );
}

export function verifyAutomationAuth(authHeader: string | undefined): boolean {
  const secret = webhookSecret();
  if (!secret) return true;
  const token = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  return token === secret;
}

export type GhlContactInput = {
  ghl_contact_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  tags?: string[] | null;
  /** Pre-written note from Make Scenario 1 — skip regeneration if present */
  outreach_note?: string | null;
  raw?: Record<string, unknown>;
};

export function parseGhlContactPayload(body: Record<string, unknown>): GhlContactInput {
  const contact =
    (body.contact as Record<string, unknown> | undefined) ||
    (body.data as Record<string, unknown> | undefined) ||
    body;

  const tagsRaw = contact.tags ?? body.tags;
  let tags: string[] | null = null;
  if (Array.isArray(tagsRaw)) {
    tags = tagsRaw.map((t) => {
      if (typeof t === "string") return t;
      if (t && typeof t === "object" && "name" in t) return String((t as { name: string }).name);
      return String(t);
    });
  } else if (typeof tagsRaw === "string" && tagsRaw.trim()) {
    tags = tagsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  }

  return {
    ghl_contact_id: String(contact.id ?? contact.contact_id ?? body.ghl_contact_id ?? "").trim() || null,
    first_name: String(contact.first_name ?? contact.firstName ?? body.first_name ?? "").trim() || null,
    last_name: String(contact.last_name ?? contact.lastName ?? body.last_name ?? "").trim() || null,
    email: String(contact.email ?? body.email ?? "").trim().toLowerCase() || null,
    phone: String(contact.phone ?? body.phone ?? "").trim() || null,
    source: String(contact.source ?? body.source ?? "").trim() || null,
    tags,
    outreach_note: String(contact.outreach_note ?? body.outreach_note ?? body.note ?? "").trim() || null,
    raw: body,
  };
}

function syncGhlContactToLead(db: BetterSqliteDatabase, input: GhlContactInput, outreachNote: string): number {
  const fn = input.first_name || "New";
  const ln = input.last_name || "Contact";
  const email =
    input.email && input.email.includes("@")
      ? input.email
      : `ghl-${input.ghl_contact_id || randomBytes(4).toString("hex")}@placeholder.bossmobile.local`;
  const phone = input.phone || "—";

  const marker = input.ghl_contact_id ? `GHL contact id: ${input.ghl_contact_id}` : null;
  if (marker) {
    const exists = db
      .prepare(`SELECT lead_id FROM lead_notes WHERE instr(body, ?) > 0 LIMIT 1`)
      .get(marker) as { lead_id?: number } | undefined;
    if (exists?.lead_id) {
      db.prepare("INSERT INTO lead_notes (lead_id, body) VALUES (?, ?)").run(
        exists.lead_id,
        `GHL update ${new Date().toISOString()}\n${outreachNote}`
      );
      return exists.lead_id;
    }
  }

  const r = db
    .prepare(
      `INSERT INTO leads (
        invited_by, first_name, last_name, mobile_phone, business_email,
        consent_transactional, consent_marketing, checkout_status
      ) VALUES ('ghl_new_contact', ?, ?, ?, ?, 0, 0, 'ghl_intake')`
    )
    .run(fn, ln, phone, email);

  const leadId = Number(r.lastInsertRowid);
  const noteBody = [
    "Source: GoHighLevel new contact",
    marker,
    input.source ? `GHL source: ${input.source}` : null,
    input.tags?.length ? `Tags: ${input.tags.join(", ")}` : null,
    "",
    "AI outreach note:",
    outreachNote,
  ]
    .filter((line) => line !== null)
    .join("\n");

  db.prepare("INSERT INTO lead_notes (lead_id, body) VALUES (?, ?)").run(leadId, noteBody);
  return leadId;
}

export async function processGhlNewContact(
  db: BetterSqliteDatabase,
  input: GhlContactInput
): Promise<{
  alert_id: number;
  lead_id: number;
  outreach_note: string;
  voice_prompt: string;
  ghl_contact_id: string | null;
}> {
  ensureGhlAutomationTables(db);

  const displayName = [input.first_name, input.last_name].filter(Boolean).join(" ") || "New contact";
  const context = [
    `New GoHighLevel contact: ${displayName}`,
    input.email ? `Email: ${input.email}` : null,
    input.phone ? `Phone: ${input.phone}` : null,
    input.source ? `Source: ${input.source}` : null,
    input.tags?.length ? `Tags: ${input.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  let outreach_note = input.outreach_note?.trim() || "";
  if (!outreach_note) {
    outreach_note = await claudeGenerate(OUTREACH_NOTE_SYSTEM, context);
  }

  const voice_prompt = await claudeGenerate(
    VOICE_BRIEF_SYSTEM,
    `${context}\n\nOutreach note already drafted:\n${outreach_note}`
  );

  const lead_id = syncGhlContactToLead(db, input, outreach_note);

  const ins = db
    .prepare(
      `INSERT INTO ghl_contact_alerts (
        ghl_contact_id, first_name, last_name, email, phone, source, tags_json,
        outreach_note, voice_prompt, raw_payload_json, lead_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.ghl_contact_id,
      input.first_name,
      input.last_name,
      input.email,
      input.phone,
      input.source,
      input.tags ? JSON.stringify(input.tags) : null,
      outreach_note,
      voice_prompt,
      input.raw ? JSON.stringify(input.raw) : null,
      lead_id
    );

  const alert_id = Number(ins.lastInsertRowid);
  const result = {
    alert_id,
    lead_id,
    outreach_note,
    voice_prompt,
    ghl_contact_id: input.ghl_contact_id ?? null,
  };

  const cloudUrl = cloudWebhookUrl();
  if (cloudUrl) {
    try {
      const payload = buildOutboundCloudPayload(input, result);
      await postJsonToCloudWebhook(db, cloudUrl, payload, alert_id);
    } catch (err) {
      console.error("[ghl-automation] cloud webhook forward failed:", err);
      db.prepare(`UPDATE ghl_contact_alerts SET cloud_forward_status = ? WHERE id = ?`).run(
        "error",
        alert_id
      );
    }
  }

  return result;
}

export async function claudePapaComplete(
  prompt: string,
  context?: string
): Promise<{ ok: true; prompt: string; response: string; model: string; voice: "papa_life" }> {
  const user = context?.trim() ? `${context.trim()}\n\n---\n\n${prompt}` : prompt;
  const response = await claudeGenerate(PAPA_VOICE_SYSTEM, user, 2048);
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";
  return { ok: true, prompt, response, model, voice: "papa_life" };
}

export function listGhlContactAlerts(
  db: BetterSqliteDatabase,
  opts: { unread_only?: boolean; limit?: number } = {}
): Array<{
  id: number;
  ghl_contact_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  outreach_note: string | null;
  voice_prompt: string;
  lead_id: number | null;
  created_at: string;
  read_at: string | null;
}> {
  ensureGhlAutomationTables(db);
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const unread = opts.unread_only !== false;
  return db
    .prepare(
      `SELECT id, ghl_contact_id, first_name, last_name, email, phone, outreach_note, voice_prompt, lead_id, created_at, read_at
       FROM ghl_contact_alerts
       ${unread ? "WHERE read_at IS NULL" : ""}
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
    id: number;
    ghl_contact_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    outreach_note: string | null;
    voice_prompt: string;
    lead_id: number | null;
    created_at: string;
    read_at: string | null;
  }>;
}

export function markGhlAlertRead(db: BetterSqliteDatabase, alertId: number): boolean {
  ensureGhlAutomationTables(db);
  const r = db
    .prepare(`UPDATE ghl_contact_alerts SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL`)
    .run(alertId);
  return r.changes > 0;
}

export function automationStatusPayload(db?: BetterSqliteDatabase): Record<string, unknown> {
  const secret = webhookSecret();
  const base = siteAutomationBase();
  const cloudUrl = cloudWebhookUrl();
  const ghlCreds = db ? resolveGhlCredentials(db) : null;
  const envGhl = Boolean(
    process.env.GHL_API_TOKEN?.trim() || process.env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim()
  );
  return {
    contract_json: `${base}/api/automation/contract.json`,
    scenarios: {
      scenario_1: {
        name: "GHL New Contact → Claude AI Analysis → GHL Note",
        make_scenario_id: "5259259",
        site_webhook: `${base}/api/webhooks/ghl-new-contact`,
        note: "Add a Make HTTP module after Claude that POSTs here with the outreach note, OR call this webhook instead of Claude in Make to run Claude on-server.",
      },
      scenario_2: {
        name: "iShareHow MCP → Claude AI → Response",
        make_scenario_id: "5259335",
        claude_endpoint: `${base}/api/automation/claude-prompt`,
        cloud_outbound_webhook: cloudUrl || "(set AUTOMATION_CLOUD_WEBHOOK_URL — Make custom webhook URL)",
        inbound_json: { prompt: "string — required" },
        outbound_json: { event: "ghl_new_contact", prompt: "string", contact: "object", inbound: "object" },
        mcp_tool: "papalife_claude_complete",
        note: "Cloud POSTs {\"prompt\":\"...\"} to claude_endpoint; response body has \"response\" in Papa Life voice. Server POSTs full outbound JSON to cloud when a contact hits the DB.",
      },
    },
    mcp: {
      streamable_url: `${process.env.PUBLIC_MCP_BASE_URL || base}/mcp`,
      tools_for_brian: [
        "papalife_list_ghl_contact_alerts",
        "papalife_process_ghl_new_contact",
        "papalife_ghl_move_opportunity_stage",
        "papalife_nurture_sms_send",
        "papalife_claude_complete",
        "papalife_automation_status",
      ],
    },
    voice_mode: "Brian's Claude: call papalife_list_ghl_contact_alerts and read voice_prompt aloud in voice chat.",
    webhook_auth: secret ? "Bearer token required (GHL_WEBHOOK_SECRET)" : "WARNING: no GHL_WEBHOOK_SECRET set — webhook is open",
    cloud_webhook_configured: Boolean(cloudUrl),
    anthropic_configured: Boolean(anthropicKey()),
    ghl_api_configured: envGhl || Boolean(ghlCreds),
    ghl_token_via: envGhl ? "env" : ghlCreds?.source ?? null,
    ghl_settings_path: `${base}/crm-console (sidebar → Settings)`,
  };
}
