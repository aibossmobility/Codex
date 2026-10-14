import type { GhlCredentials } from "./ghl-integration-store";

type EstimateRequest = {
  contactId: string; name: string; email: string;
  organization: string; need: string; submittedAt: string;
};

/** Keep complete customer needs in GHL for estimate preparation. No customer message or charge. */
export async function recordAiBossEstimateIntakeNote(
  args: EstimateRequest, creds: GhlCredentials
): Promise<{ ok: true; noteId: string } | { ok: false; error: string }> {
  const customerNeed = String(args.need).trim().slice(0, 3000);
  const tier = customerNeed.match(/Written estimate request:\s*Custom consulting\s*[—–-]\s*\$(750|1,250|2,000|2,500|3,500)\b/i);
  const reference = tier ? Number(tier[1].replace(",", "")) : null;
  const lines = [
    "INTERNAL ESTIMATE PREPARATION — NOT APPROVED OR SENT",
    "Do not send an agreement, invoice, payment link, SMS or start work from this note.",
    "Contact: " + String(args.name).slice(0, 160),
    "Email: " + String(args.email).slice(0, 254),
    "Organization: " + (String(args.organization).slice(0, 240) || "Not provided"),
    "Request received: " + String(args.submittedAt).slice(0, 36),
    "",
    "CUSTOMER REQUEST — FULL ORIGINAL INTAKE",
    customerNeed,
    "",
    "PREPARE THE FOLLOWING FOR APPROVAL",
    "Scope: Convert the request above to specific services and boundaries.",
    "Deliverables: Confirm measurable outputs and acceptance criteria.",
    "Schedule: Confirm start and completion dates.",
    reference === null
      ? "Price: Confirm approved project scope and total."
      : "Selected price bracket: $" + reference.toLocaleString("en-US") + " (NOT an approved quote).",
    reference === null
      ? "Payments: 50% after signature; 50% upon completion before delivery."
      : "Illustrative 50/50 split: $" + (reference / 2).toFixed(2) + " upfront and $" + (reference / 2).toFixed(2) + " final (subject to signed agreement).",
    "Customer terms: https://ai.bossmobilelifecoach.com/refund-policy",
    "SEQUENCE: Review and approve scope → customer signs estimate → request deposit → perform work → approve completion → request final payment → release deliverables when paid.",
    "STATUS: INTERNAL DRAFT ONLY. No customer financial obligation created.",
  ];
  if (!args.contactId || !customerNeed) return { ok: false, error: "Missing contact or customer request" };
  try {
    const base = (process.env.GHL_API_BASE_URL || "https://services.leadconnectorhq.com").replace(/\/$/, "");
    const response = await fetch(base + "/contacts/" + encodeURIComponent(args.contactId) + "/notes", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + creds.token,
        Accept: "application/json",
        "Content-Type": "application/json",
        Version: "v3",
      },
      body: JSON.stringify({ title: "AI Boss — Written Estimate Intake (Internal Draft)", body: lines.join("\n") }),
    });
    const data = await response.json() as { note?: { id?: string }; message?: string };
    if (!response.ok || !data.note?.id) return { ok: false, error: "GHL note " + response.status + ": " + String(data.message || "Save not confirmed").slice(0, 120) };
    return { ok: true, noteId: data.note.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "CRM note request failed" };
  }
}
