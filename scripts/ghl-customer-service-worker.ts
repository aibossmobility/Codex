/**
 * GoHighLevel Customer Service Worker: no-cost, read-only case triage.
 * Works offline with existing owner-provided reference files; NEVER accesses
 * cookies, creates a subscription, sends messages, or writes to a CRM.
 * Live CRM changes require a separately audited, authorized executor.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type Business = "papa-life" | "ai-boss-mobility";
type Issue = "access" | "client-contact" | "estimates-agreements" | "pipeline" |
  "automations" | "messaging" | "appointments" | "payments" | "other";
const classify: Array<[Issue, RegExp]> = [
  ["access", /login|log in|connect|connection|credential|password|authorization|permission|token|api|integration|offline|error|bug|broken|unable|fail/i],
  ["estimates-agreements", /estimate|agreement|proposal|contract|sign|signature|quote|price/i],
  ["payments", /payment|invoice|charge|refund|stripe|paypal|subscription|billing/i],
  ["pipeline", /pipeline|opportunit|sales stage|deal|lead status/i],
  ["automations", /workflow|automation|trigger|sequence|campaign|funnel/i],
  ["messaging", /email|sms|message|reply|send|follow.up|communication/i],
  ["appointments", /calendar|appointment|booking|schedule|meet/i],
  ["client-contact", /client|customer|contact|lead|person|account|record/i],
];
const steps: Record<Issue, string[]> = {
  access: ["Review the reported error, affected account, and access scope without requesting passwords.",
    "Check whether the owner's existing GHL browser session works; use built-in GHL settings or help pages before integrations.",
    "Only if needed, propose a direct native GHL integration using existing credentials and permitted scopes; require approval before changing settings."],
  "client-contact": ["Identify the correct business and customer record, avoiding duplicate contacts and cross-business data access.",
    "Review existing notes, tags, consent, tasks, and next actions in an authorized GHL session.",
    "Prepare changes for explicit approval; do not message, enroll, delete, or modify a customer automatically."],
  "estimates-agreements": ["Verify agreed scope, deliverables, price, schedule, and correct business identity.",
    "Prepare an estimate or agreement draft using existing GHL tools or templates; require owner review and client signature.",
    "Do not send invoices, collect deposits, or record payment until the customer has signed the agreement."],
  pipeline: ["Verify the correct project, pipeline, opportunity, and current stage.",
    "Identify missing stage data and propose the exact stage change for owner approval.",
    "Do not move records or trigger automations automatically."],
  automations: ["Inventory the current native GoHighLevel workflows, triggers, and actions via an authorized no-cost route.",
    "Check draft/published status, duplicate triggers, unintended sends, and estimated provider costs.",
    "Prepare a safe change plan; do not activate, enroll, or send without explicit approval."],
  messaging: ["Identify customer, business sender, communication preference, and documented consent.",
    "Prepare a relevant draft or troubleshooting checklist in the correct business voice.",
    "Do not send messages, enroll campaigns, or purchase SMS/email credits without explicit approval."],
  appointments: ["Check the appropriate business calendar, Google Meet destination, and booking configuration.",
    "Identify schedule conflicts or broken links through existing no-cost tools.",
    "Do not create, cancel, or reschedule appointments without explicit approval."],
  payments: ["Inspect existing estimate, agreement-signature, and payment status using approved read-only access.",
    "Flag duplicate charges or inconsistent product categories for owner review.",
    "Do not create invoices, charge cards, issue refunds, edit billing, or subscribe to services automatically."],
  other: ["Determine the affected business, GHL area, account/record, observed symptom, and intended outcome.",
    "Use native GoHighLevel features and the existing authorized owner session first, rather than paid connectors.",
    "Prepare a scoped proposed fix with evidence, estimated cost $0, and approval for any customer-facing or account change."],
};
export function reviewGhlServiceRequest(input: {
  project: Business; instruction: string; root?: string;
}) {
  if (!["papa-life","ai-boss-mobility"].includes(input.project)) throw Error("Business isolation required");
  if (typeof input.instruction !== "string" || input.instruction.trim().length < 12 || input.instruction.length > 2000)
    throw Error("A specific, bounded customer-service request is required");
  const issue: Issue = classify.find(([,pattern])=>pattern.test(input.instruction))?.[0] || "other";
  const root = input.root || path.join(os.homedir(), ".ai-boss-os");
  const chrome3Profile = path.join(root, "ghl-automation-profile");
  const estimates = path.join(root, "research", "ai-boss-estimate-drafts-2026-10-17");
  const evidence: string[] = [];
  if (input.project === "ai-boss-mobility" && fs.existsSync(estimates)) {
    const templates = fs.readdirSync(estimates).filter(x=>/^estimate-.*\.md$/.test(x));
    evidence.push(`${templates.length} locally available AI Boss estimate reference drafts (not proof of active GHL templates)`);
  }
  if (fs.existsSync(chrome3Profile)) evidence.push("Local GHL browser profile exists (login and current permissions not verified)");
  const hasNativeAccess = Boolean(process.env.GHL_API_TOKEN || process.env.GHL_PRIVATE_INTEGRATION_TOKEN);
  const recommendations = steps[issue];
  return {
    role:"ghl-customer-service" as const, project:input.project, issue_type:issue,
    status:"review_complete_live_actions_not_enabled", read_only:true, no_external_ai_cost:true,
    native_browser_profile_found:fs.existsSync(chrome3Profile),
    local_ghl_api_credentials_found:hasNativeAccess,
    customer_record_verified:false,
    local_evidence:evidence,
    zero_cost_routes:[
      "Existing signed-in GoHighLevel browser session or built-in GHL tools (when verified)",
      "Existing native GoHighLevel API connection only when authorized and already available",
      "Local owner-provided records and screenshots for offline diagnosis",
    ],
    disabled_paid_routes:["Zapier paid tasks/upgrades","new middleware subscriptions","paid model calls","purchased SMS/email/voice credits"],
    recommended_steps:recommendations,
    next_step:"Use the existing GHL session to verify the specific record, then propose any necessary change for owner approval.",
    approval_required_for:["CRM/contact/pipeline modifications","estimates and agreements sent to customers","customer messages and workflows",
      "invoice, payment or refund actions","access/security changes","purchases or external API usage with a charge"],
    financial_policy:"$0 new spend. Estimate -> signed agreement -> invoice/deposit; never charge without explicit owner approval.",
  };
}
