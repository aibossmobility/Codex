/**
 * Minimal GHL API helpers for Papa Life MCP (Brian's location).
 * Token: dashboard Settings (encrypted DB) → optional .env override for ops.
 */

import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { type GhlCredentials, resolveGhlCredentials } from "./ghl-integration-store";

const GHL_BASE = (process.env.GHL_API_BASE_URL || "https://services.leadconnectorhq.com").replace(/\/$/, "");
const GHL_VERSION = process.env.GHL_API_VERSION?.trim() || "2021-07-28";

export type GhlApiResult<T = Record<string, unknown>> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number; action?: string; fix?: string };

type GhlContactInput = {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string | null;
  source?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
};

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    Version: GHL_VERSION,
  };
}

function smsScopeHint(message: string): string | null {
  if (/sms|scope|permission|not enabled|forbidden/i.test(message)) {
    return (
      "GHL SMS scope is not enabled on your private integration token. " +
      "In GoHighLevel → Settings → Private Integrations → enable SMS/Conversations, " +
      "then save the token again under CRM → Settings."
    );
  }
  return null;
}

function notConfiguredFix(): string {
  return (
    "Open CRM → Settings on bossmobilelifecoach.com and paste your Go High Level Private Integration token. " +
    "Or set GHL_API_TOKEN in server .env (optional override)."
  );
}

function parseJsonResponse(text: string): Record<string, unknown> {
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

function contactIdFromPayload(data: Record<string, unknown>): string | null {
  const direct = data.id || data.contactId;
  if (direct) return String(direct);
  const contact = data.contact;
  if (contact && typeof contact === "object") {
    const id = (contact as Record<string, unknown>).id || (contact as Record<string, unknown>).contactId;
    if (id) return String(id);
  }
  return null;
}

function normalizeOppBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  delete out.id;
  if (out.pipelineStageId && out.stageId) delete out.stageId;
  else if (!out.pipelineStageId && out.stageId) {
    out.pipelineStageId = out.stageId;
    delete out.stageId;
  }
  return out;
}

export async function ghlMoveOpportunityStage(
  args: {
    opportunity_id?: string;
    id?: string;
    pipeline_stage_id?: string;
    pipelineStageId?: string;
    pipeline_id?: string;
    pipelineId?: string;
    status?: string;
  },
  creds: GhlCredentials | null
): Promise<GhlApiResult> {
  if (!creds?.token) {
    return {
      ok: false,
      error: "Go High Level API token is not configured",
      action: "not_configured",
      fix: notConfiguredFix(),
    };
  }

  const oppId = String(args.opportunity_id || args.id || "").trim();
  const stageId = String(args.pipeline_stage_id || args.pipelineStageId || "").trim();
  if (!oppId) {
    return { ok: false, error: "opportunity_id or id is required (GHL opportunity UUID in URL path)" };
  }
  if (!stageId && !args.status) {
    return { ok: false, error: "pipeline_stage_id or pipelineStageId (or status) is required" };
  }

  const body = normalizeOppBody({
    ...(stageId ? { pipelineStageId: stageId } : {}),
    ...(args.pipeline_id || args.pipelineId
      ? { pipelineId: String(args.pipeline_id || args.pipelineId).trim() }
      : {}),
    ...(args.status ? { status: String(args.status).trim() } : {}),
  });

  const r = await fetch(`${GHL_BASE}/opportunities/${encodeURIComponent(oppId)}`, {
    method: "PUT",
    headers: headers(creds.token),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!r.ok) {
    const msg = String((data as { message?: string }).message || text || r.statusText);
    return { ok: false, error: msg, status: r.status, fix: smsScopeHint(msg) || undefined };
  }
  return {
    ok: true,
    data: {
      opportunity_id: oppId,
      payload_sent: body,
      credential_source: creds.source,
      ghl: data,
    },
  };
}

export async function ghlUpsertContactWithTags(
  args: GhlContactInput,
  creds: GhlCredentials | null
): Promise<GhlApiResult> {
  if (!creds?.token) {
    return {
      ok: false,
      error: "Go High Level API token is not configured",
      action: "not_configured",
      fix: notConfiguredFix(),
    };
  }

  const locationId = String(creds.locationId || "").trim();
  if (!locationId) {
    return {
      ok: false,
      error: "Go High Level location ID is not configured",
      action: "missing_location_id",
      fix: "Open CRM → Settings on papalifecoach.com and save the HighLevel Location ID.",
    };
  }

  const email = String(args.email || "").trim().toLowerCase();
  const firstName = String(args.firstName || "").trim();
  if (!email) return { ok: false, error: "email is required" };
  if (!firstName) return { ok: false, error: "firstName is required" };

  const tags = Array.from(
    new Set((args.tags || []).map((tag) => String(tag).trim()).filter(Boolean))
  );
  const payload: Record<string, unknown> = {
    locationId,
    firstName,
    email,
    ...(args.lastName ? { lastName: args.lastName } : {}),
    ...(args.phone ? { phone: args.phone } : {}),
    ...(args.source ? { source: args.source } : {}),
    ...(tags.length ? { tags } : {}),
    ...(args.customFields && Object.keys(args.customFields).length
      ? { customFields: args.customFields }
      : {}),
  };

  const r = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: "POST",
    headers: headers(creds.token),
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  const data = parseJsonResponse(text);
  if (!r.ok) {
    const msg = String((data as { message?: string }).message || text || r.statusText);
    return { ok: false, error: msg, status: r.status };
  }

  return {
    ok: true,
    data: {
      contact_id: contactIdFromPayload(data),
      tags,
      credential_source: creds.source,
      ghl: data,
    },
  };
}

/**
 * Ensure a written-estimate inquiry appears in the dedicated AI Boss pipeline.
 * No estimate, contract, invoice, payment link or SMS is sent here.
 * Read existing opportunities first so webhook retries cannot create duplicates.
 */
export async function ghlEnsureAiBossEstimateOpportunity(
  args: { contactId: string; contactName: string },
  creds: GhlCredentials | null
): Promise<GhlApiResult> {
  if (!creds?.token || !creds.locationId) {
    return { ok: false, error: "GoHighLevel CRM credentials are incomplete" };
  }
  const contactId = String(args.contactId || "").trim();
  const contactName = String(args.contactName || "").trim().slice(0, 140);
  if (!contactId || !contactName) return { ok: false, error: "Contact ID and name are required" };
  const locationId = creds.locationId;
  const get = async (url: string, version = "v3") => {
    const response = await fetch(url, { headers: { ...headers(creds.token), Version: version } });
    const data = parseJsonResponse(await response.text());
    if (!response.ok) throw new Error(`GHL ${response.status}: ${String(data.message || "Request failed").slice(0, 180)}`);
    return data;
  };
  try {
    // Existing HighLevel installations accept the legacy version for list-pipelines.
    const pipelines = await get(`${GHL_BASE}/opportunities/pipelines?locationId=${encodeURIComponent(locationId)}`, "2021-07-28");
    const candidates = Array.isArray(pipelines.pipelines) ? pipelines.pipelines as Array<Record<string, unknown>> : [];
    const pipeline = candidates.find((item) => String(item.name || "").trim() === "AI Boss Mobility — Client Estimates & Agreements");
    const pipelineId = String(pipeline?.id || "").trim();
    const stages = Array.isArray(pipeline?.stages) ? pipeline.stages as Array<Record<string, unknown>> : [];
    const firstStage = stages.find((item) => String(item.name || "").trim() === "Estimate Being Prepared");
    const stageId = String(firstStage?.id || "").trim();
    if (!pipelineId || !stageId) return { ok: false, error: "AI Boss estimate pipeline or initial stage not found" };

    const qs = new URLSearchParams({ locationId, contactId, pipelineId, status: "all", limit: "100" });
    const search = await get(`${GHL_BASE}/opportunities/search?${qs.toString()}`);
    const existing = Array.isArray(search.opportunities) ? search.opportunities as Array<Record<string, unknown>> : [];
    if (existing.length) {
      return { ok: true, data: { opportunity_id: String(existing[0].id || ""), created: false } };
    }

    const response = await fetch(`${GHL_BASE}/opportunities/`, {
      method: "POST",
      headers: { ...headers(creds.token), Version: "v3" },
      body: JSON.stringify({
        locationId,
        pipelineId,
        pipelineStageId: stageId,
        contactId,
        name: `AI Boss estimate — ${contactName}`,
        status: "open",
        monetaryValue: 0,
      }),
    });
    const data = parseJsonResponse(await response.text());
    if (!response.ok) return {
      ok: false,
      error: `GHL ${response.status}: ${String(data.message || "Unable to create estimate opportunity").slice(0, 180)}`,
      status: response.status,
    };
    const opp = data.opportunity && typeof data.opportunity === "object" ? data.opportunity as Record<string, unknown> : {};
    const opportunityId = String(opp.id || "").trim();
    if (!opportunityId) return { ok: false, error: "CRM did not confirm the new estimate opportunity ID" };
    return { ok: true, data: { opportunity_id: opportunityId, created: true } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to prepare estimate opportunity" };
  }
}

export async function ghlAddContactToWorkflow(
  args: {
    contact_id: string;
    workflow_id: string;
    event_start_time?: string;
  },
  creds: GhlCredentials | null
): Promise<GhlApiResult> {
  if (!creds?.token) {
    return {
      ok: false,
      error: "Go High Level API token is not configured",
      action: "not_configured",
      fix: notConfiguredFix(),
    };
  }

  const contactId = String(args.contact_id || "").trim();
  const workflowId = String(args.workflow_id || "").trim();
  if (!contactId) return { ok: false, error: "contact_id is required" };
  if (!workflowId) return { ok: false, error: "workflow_id is required" };

  const eventStartTime = new Date(args.event_start_time || Date.now()).toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const payload = { eventStartTime };
  const r = await fetch(
    `${GHL_BASE}/contacts/${encodeURIComponent(contactId)}/workflow/${encodeURIComponent(workflowId)}`,
    {
      method: "POST",
      headers: headers(creds.token),
      body: JSON.stringify(payload),
    }
  );
  const text = await r.text();
  const data = parseJsonResponse(text);
  if (!r.ok) {
    const msg = String((data as { message?: string }).message || text || r.statusText);
    return { ok: false, error: msg, status: r.status };
  }
  return {
    ok: true,
    data: {
      contact_id: contactId,
      workflow_id: workflowId,
      event_start_time: payload.eventStartTime,
      credential_source: creds.source,
      ghl: data,
    },
  };
}

export async function ghlNurtureSmsSend(
  args: {
    ghl_contact_id?: string;
    contact_id?: string;
    body?: string;
    dry_run?: boolean;
  },
  creds: GhlCredentials | null
): Promise<GhlApiResult> {
  if (!creds?.token) {
    return {
      ok: false,
      error: "Go High Level API token is not configured",
      action: "not_configured",
      fix: notConfiguredFix(),
    };
  }

  const contactId = String(args.ghl_contact_id || args.contact_id || "").trim();
  const message = String(args.body || "").trim();
  if (!contactId) return { ok: false, error: "ghl_contact_id or contact_id is required" };
  if (!message) return { ok: false, error: "body is required" };

  if (args.dry_run) {
    return {
      ok: true,
      data: {
        dry_run: true,
        ghl_contact_id: contactId,
        body: message,
        type: "SMS",
        credential_source: creds.source,
      },
    };
  }

  const payload = { type: "SMS", contactId, message };
  const r = await fetch(`${GHL_BASE}/conversations/messages`, {
    method: "POST",
    headers: headers(creds.token),
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!r.ok) {
    const msg = String((data as { message?: string }).message || text || r.statusText);
    const fix = smsScopeHint(msg);
    return {
      ok: false,
      error: msg,
      status: r.status,
      action: fix ? "ghl_sms_scope_required" : undefined,
      fix: fix || undefined,
    };
  }
  return {
    ok: true,
    data: {
      ghl_contact_id: contactId,
      body: message,
      credential_source: creds.source,
      ghl: data,
    },
  };
}

/** Resolve credentials for MCP / routes (requires db). */
export function getGhlCredentialsForMcp(
  db: BetterSqliteDatabase,
  adminUserId?: number
): GhlCredentials | null {
  return resolveGhlCredentials(db, adminUserId);
}
