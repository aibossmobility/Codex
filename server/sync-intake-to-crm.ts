import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { syncPapaFatherEngagementToGhl } from "./papa-father-engagement-ghl";

/** Papa Life homepage funnel intake options → CRM tag slugs */
export const PAPA_FUNNEL_ISSUE_TAGS = [
  "communication",
  "dismissed",
  "disconnected",
  "dont_know",
  "ready_to_change",
] as const;

export function isPapaFunnelIssueTag(s: string): boolean {
  return (PAPA_FUNNEL_ISSUE_TAGS as readonly string[]).includes(s);
}

export const PAPA_FUNNEL_ISSUE_LABELS: Record<(typeof PAPA_FUNNEL_ISSUE_TAGS)[number], string> = {
  communication: "Communication keeps breaking down",
  dismissed: "I feel dismissed or shut out",
  disconnected: "We feel emotionally disconnected",
  dont_know: "I do not know what to say anymore",
  ready_to_change: "I am ready to change this",
};

export type IntakeCrmSyncInput = {
  intakeId: number;
  first_name: string;
  email: string | null;
  phone: string | null;
  situation: string;
  routed_pillar: string;
  disconnected_pillar: string | null;
  vision: string | null;
  source: "mcp" | "web";
  /** When set, overrides default strategist_intake label on the lead row */
  invited_by?: string;
  /** Explicit marketing/follow-up consent from the originating form. */
  consent_marketing?: boolean;
};

/** CRM reads leads table; strategist intake rows live in intake_submissions. Keep them in sync. */
export function syncIntakeSubmissionToCrmLead(db: BetterSqliteDatabase, input: IntakeCrmSyncInput): { lead_id: number } {
  const rawName = input.first_name.trim();
  const parts = rawName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Unknown";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "—";

  const businessEmail =
    input.email && input.email.trim()
      ? input.email.trim().toLowerCase()
      : `intake-${input.intakeId}@placeholder.bossmobile.local`;

  const mobilePhone = input.phone && input.phone.trim() ? input.phone.trim() : "—";

  const invitedBy = input.invited_by ?? "strategist_intake";
  const sourceLabel =
    invitedBy === "papa_funnel_intake"
      ? "Papa Life homepage funnel"
      : invitedBy === "papa_life_action_coach"
        ? "Papa Life Action Coach"
        : invitedBy === "papa_lead_assessment"
          ? "Papa Life 2-Minute Fatherhood Check-In"
          : `strategist intake (${input.source})`;

  let submittedAnswers: Record<string, unknown> = {};
  try {
    const intake = db
      .prepare("SELECT answers_json FROM intake_submissions WHERE id = ?")
      .get(input.intakeId) as { answers_json?: string | null } | undefined;
    if (intake?.answers_json) submittedAnswers = JSON.parse(intake.answers_json) as Record<string, unknown>;
  } catch (e) {
    console.warn("[crm] could not parse intake answers_json:", e);
  }

  const answerText = (key: string): string => {
    const raw = submittedAnswers[key];
    return raw == null ? "" : String(raw).trim();
  };

  const fatherEngagementDetails =
    invitedBy === "papa_lead_assessment"
      ? [
          answerText("relationship_status") ? `Relationship Status: ${answerText("relationship_status")}` : null,
          answerText("fathers_stated_hope") ? `Father's Stated Hope: ${answerText("fathers_stated_hope")}` : null,
          answerText("primary_concern") ? `Primary Concern: ${answerText("primary_concern")}` : null,
          answerText("preferred_next_step") ? `Preferred Next Step: ${answerText("preferred_next_step")}` : null,
          "Brian Review Status: Review Needed",
        ].filter(Boolean)
      : [];

  const noteBody = [
    `Source: ${sourceLabel}`,
    `Intake submission id: ${input.intakeId}`,
    isPapaFunnelIssueTag(input.routed_pillar) ? `CRM tag: ${input.routed_pillar}` : `Primary pillar: ${input.routed_pillar}`,
    input.disconnected_pillar ? `Disconnected pillar: ${input.disconnected_pillar}` : null,
    ...fatherEngagementDetails,
    "",
    "Situation:",
    input.situation,
    input.vision ? `\nVision:\n${input.vision}` : "",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const insertLead = db.prepare(`
    INSERT INTO leads (
      invited_by, first_name, last_name, mobile_phone, business_email,
      business_name, website, street_address, address2, city, state, country,
      postal_code, consent_transactional, consent_marketing, checkout_status
    ) VALUES (
      @invited_by, @first_name, @last_name, @mobile_phone, @business_email,
      @business_name, @website, @street_address, @address2, @city, @state, @country,
      @postal_code, @consent_transactional, @consent_marketing, @checkout_status
    )
  `);

  const r = insertLead.run({
    invited_by: invitedBy,
    first_name: firstName,
    last_name: lastName,
    mobile_phone: mobilePhone,
    business_email: businessEmail,
    business_name: null,
    website: null,
    street_address: null,
    address2: null,
    city: null,
    state: null,
    country: null,
    postal_code: null,
    consent_transactional: 0,
    consent_marketing: input.consent_marketing ? 1 : 0,
    checkout_status: "intake",
  });

  const leadId = Number(r.lastInsertRowid);
  db.prepare("INSERT INTO lead_notes (lead_id, body) VALUES (?, ?)").run(leadId, noteBody);

  if (isPapaFunnelIssueTag(input.routed_pillar)) {
    db.prepare("INSERT OR IGNORE INTO lead_tags (lead_id, tag_slug) VALUES (?, ?)").run(leadId, input.routed_pillar);
  }

  if (invitedBy === "papa_lead_assessment") {
    void syncPapaFatherEngagementToGhl(db, {
      first_name: input.first_name,
      email: input.email,
      phone: input.phone,
      answers: submittedAnswers,
    }).catch((err) => console.error("[ghl] father engagement bridge failed:", err));
  }

  return { lead_id: leadId };
}

/** Backfill CRM rows for intakes created before sync existed (idempotent). */
export function backfillIntakeSubmissionsToCrmLeads(db: BetterSqliteDatabase): { created: number } {
  const intakes = db
    .prepare(
      `SELECT id, first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision
       FROM intake_submissions ORDER BY id ASC`
    )
    .all() as Array<{
      id: number;
      first_name: string;
      email: string | null;
      phone: string | null;
      situation: string;
      routed_pillar: string;
      disconnected_pillar: string | null;
      vision: string | null;
    }>;

  let created = 0;
  for (const row of intakes) {
    const marker = `Intake submission id: ${row.id}`;
    const exists = db
      .prepare(`SELECT 1 FROM lead_notes WHERE instr(body, ?) > 0 LIMIT 1`)
      .get(marker) as { 1?: number } | undefined;
    if (exists) continue;

    syncIntakeSubmissionToCrmLead(db, {
      intakeId: row.id,
      first_name: row.first_name,
      email: row.email,
      phone: row.phone,
      situation: row.situation,
      routed_pillar: row.routed_pillar,
      disconnected_pillar: row.disconnected_pillar,
      vision: row.vision,
      source: "web",
    });
    created += 1;
  }
  return { created };
}
