import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { z } from "zod";
import { createExecutiveAction } from "./executive-action-queue-store";

export const workerRoles = [
  "financial-director", "marketing-revenue-director", "papa-life-director",
  "ai-boss-mobility-director", "outreach-followup", "content-distribution",
  "seo-website", "crm-sales", "ghl-customer-service", "finance-records",
  "scheduling-communications", "quality-compliance",
] as const;

export const workerAssignmentInput = z.object({
  project: z.enum(["papa-life", "ai-boss-mobility"]),
  role: z.enum(workerRoles),
  instruction: z.string().trim().min(12).max(2000),
  request_id: z.string().uuid(),
}).strict();

export function queueWorkerAssignment(db: BetterSqliteDatabase, body: unknown) {
  const input = workerAssignmentInput.parse(body);
  if (input.role === "papa-life-director" && input.project !== "papa-life" ||
      input.role === "ai-boss-mobility-director" && input.project !== "ai-boss-mobility") {
    throw new Error("Worker belongs to the other business");
  }
  // The local agent-team-v1 worker produces verifiable deliverables only for
  // read-only website HTTP audits. Other roles have no supported result contract.
  // Reject mismatched capabilities before creating an approval-queue item.
  const websiteAudit = input.role === "seo-website" &&
    /^(?:check|review|audit|inspect|verify|monitor|test)\b/i.test(input.instruction) &&
    /\b(?:websites?|homepages?|pages?|links?|seo|routes?|health|audit)\b/i.test(input.instruction);
  const requestsWrite = /\b(?:send|email|upload|publish|broadcast|stream|record|edit|change|delete|update|save|configure|fix|repair|post|invoice|charge|buy|pay|deploy|create|submit|restore|add|remove|move|write|grant|revoke|reset)\b/i.test(input.instruction);
  if (!websiteAudit || requestsWrite) {
    throw new Error("Not queued: this mobile worker can only verify read-only website HTTP checks. Administrative changes, CRM edits, publishing and other roles require a separately approved execution-capable tool and verifiable results.");
  }
  // Instruction text alone is never executable code or permission.
  return db.transaction(() => {
    const existing = db.prepare(
      "SELECT id, status, project_key, action_payload_json FROM executive_actions WHERE source_conversation_ref=? ORDER BY id DESC LIMIT 1"
    ).get("mobile-worker-" + input.request_id) as
      | { id: number; status: string; project_key: string; action_payload_json: string | null } | undefined;
    if (existing) {
      const original = JSON.parse(existing.action_payload_json || "{}");
      if (existing.project_key !== input.project || original.role !== input.role || original.instruction !== input.instruction) {
        throw new Error("This request identifier belongs to another assignment");
      }
      return { id: existing.id, status: existing.status, reused: true };
    }
    const result = createExecutiveAction(db, {
      action_type: "search", target_system: "desktop_commander",
      target_ref: "agent-team-readonly",
      requested_outcome: "Worker " + input.role + " — " + input.instruction,
      authority_level: "observe", execution_route: "local",
      approval_required: true, estimated_external_ai_cost_micros: 0,
      source_conversation_ref: "mobile-worker-" + input.request_id,
      project_key: input.project, work_kind: "task",
      action_payload: {
        worker: "agent-team-v1", role: input.role, project: input.project,
        instruction: input.instruction, mode: "read_only",
        no_writes: true, no_outreach: true, no_purchases: true,
        origin: "papa-life-os-mobile",
      },
    });
    return { id: result?.id, status: result?.status, reused: false };
  })();
}
