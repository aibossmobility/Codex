import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { resolveGhlCredentials, type GhlCredentials } from "./ghl-integration-store";

const GHL_BASE = (process.env.GHL_API_BASE_URL || "https://services.leadconnectorhq.com").replace(/\/$/, "");
const GHL_VERSION = process.env.GHL_API_VERSION?.trim() || "2021-07-28";

// Verified in the Papa Life GHL location on 2026-08-27.
const PAPA_FATHER_ENGAGEMENT_PIPELINE_ID =
  process.env.GHL_PAPA_FATHER_ENGAGEMENT_PIPELINE_ID?.trim() || "vPAlmSzBI5ufgmMgniOB";
const PAPA_BRIAN_REVIEW_STAGE_ID =
  process.env.GHL_PAPA_BRIAN_REVIEW_STAGE_ID?.trim() || "93609656-433c-4489-a4fd-f6ee6845f4b7";

const FIELD_IDS = {
  relationship_status: "JBXjAvQx9txLaI6ZwJQc",
  fathers_stated_hope: "K4aO0yWrSokcj1qStgQX",
  primary_concern: "glcIkE9CFPA7JKfWPB5D",
  preferred_next_step: "TI9r47A2Iwfl6Vyovqnh",
  brian_review_status: "VjXCs7vl9HhSDWKvEEZu",
  sensitive_or_personal_response: "57X1xM3MZGmwTGeGMM3s",
  brian_review_decision: "nfIWfbI29k3PTyUXfOPj",
} as const;

type Answers = Record<string, unknown>;

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    Version: GHL_VERSION,
  };
}

function value(answers: Answers, key: string): string {
  const raw = answers[key];
  return raw == null ? "" : String(raw).trim();
}

function normalizedCampaign(answers: Answers): string {
  return value(answers, "attribution_campaign").toUpperCase();
}

function normalizedSource(answers: Answers): string {
  const explicit = value(answers, "attribution_source").toLowerCase();
  const campaign = normalizedCampaign(answers);
  if (explicit) return explicit;
  return campaign === "PAPALIFECOACH" || campaign === "AIBOSSZIP" ? "zipshare" : "";
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

async function requestJson(
  path: string,
  method: string,
  body: Record<string, unknown>,
  creds: GhlCredentials
): Promise<Record<string, unknown>> {
  const response = await fetch(`${GHL_BASE}${path}`, {
    method,
    headers: headers(creds.token),
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!response.ok) {
    const message = String((data as { message?: unknown }).message || text || response.statusText);
    throw new Error(`GHL ${method} ${path} failed (${response.status}): ${message}`);
  }
  return data;
}

export async function syncPapaFatherEngagementToGhl(
  db: BetterSqliteDatabase,
  input: {
    first_name: string;
    email: string | null;
    phone: string | null;
    answers: Answers;
  }
): Promise<void> {
  const email = input.email?.trim().toLowerCase() || "";
  if (!email) return;

  const creds = resolveGhlCredentials(db);
  if (!creds?.token || !creds.locationId) {
    console.warn("[ghl] father engagement sync skipped: credentials/location not configured");
    return;
  }

  const campaign = normalizedCampaign(input.answers);
  const source = normalizedSource(input.answers);
  const [firstName, ...lastNameParts] = input.first_name.trim().split(/\s+/).filter(Boolean);
  const customFields = [
    { id: FIELD_IDS.relationship_status, fieldValue: value(input.answers, "relationship_status") },
    { id: FIELD_IDS.fathers_stated_hope, fieldValue: value(input.answers, "fathers_stated_hope") },
    { id: FIELD_IDS.primary_concern, fieldValue: value(input.answers, "primary_concern") },
    { id: FIELD_IDS.preferred_next_step, fieldValue: value(input.answers, "preferred_next_step") },
    { id: FIELD_IDS.brian_review_status, fieldValue: "Review Needed" },
    { id: FIELD_IDS.sensitive_or_personal_response, fieldValue: value(input.answers, "sensitive_or_personal_response") },
  ].filter((field) => Boolean(String(field.fieldValue || "").trim()));

  const contactSource = source === "zipshare" && campaign
    ? `ZIPShare — ${campaign}`
    : "PapaLifeCoach.com 2-Minute Fatherhood Check-In";

  const upsert = await requestJson(
    "/contacts/upsert",
    "POST",
    {
      locationId: creds.locationId,
      firstName: firstName || input.first_name.trim(),
      ...(lastNameParts.length ? { lastName: lastNameParts.join(" ") } : {}),
      email,
      ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
      source: contactSource,
      customFields,
    },
    creds
  );

  const contactId = contactIdFromPayload(upsert);
  if (!contactId) throw new Error("GHL contact upsert returned no contact id");

  const tags = ["Papa Life—Fatherhood Check-In"];
  if (source === "zipshare") tags.push("Source—ZIPShare");
  if (campaign) tags.push(`Campaign—${campaign}`);

  await requestJson(
    `/contacts/${encodeURIComponent(contactId)}/tags`,
    "POST",
    { tags },
    creds
  );

  await requestJson(
    "/opportunities/",
    "POST",
    {
      pipelineId: PAPA_FATHER_ENGAGEMENT_PIPELINE_ID,
      locationId: creds.locationId,
      name: `${input.first_name.trim()} — Fatherhood Check-In${campaign ? ` — ${campaign}` : ""}`,
      pipelineStageId: PAPA_BRIAN_REVIEW_STAGE_ID,
      status: "open",
      contactId,
    },
    creds
  );

  // HighLevel Contacts API: POST /contacts/:contactId/tasks.
  // This creates Brian's review reminder only; it does not send a message to the father.
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await requestJson(
    `/contacts/${encodeURIComponent(contactId)}/tasks`,
    "POST",
    {
      title: "Brian Review Needed",
      body: campaign
        ? `Review this Fatherhood Check-In before follow-up is sent. Attribution: ${source || "unknown"}/${campaign}.`
        : "Review this Fatherhood Check-In before any Papa Life follow-up is sent.",
      dueDate,
      completed: false,
    },
    creds
  );

  console.info(
    `[ghl] father engagement synced contact ${contactId} to Brian Review Needed${campaign ? ` (${source || "unknown"}/${campaign})` : ""}`
  );
}
