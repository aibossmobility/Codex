import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { createExecutiveAction, ensureExecutiveActionQueueTables, getExecutiveActionAudit } from "./executive-action-queue-store";
import { executeApprovedExecutiveAction } from "./executive-action-executor";

const db = new Database(":memory:");
db.exec("CREATE TABLE human_impact_observations (id INTEGER PRIMARY KEY)");
ensureExecutiveActionQueueTables(db);

const action = createExecutiveAction(db, {
  action_type: "read",
  target_system: "desktop_commander",
  target_ref: "mac:status",
  requested_outcome: "Read the current Mac status.",
  authority_level: "observe",
  estimated_external_ai_cost_micros: 0,
});
assert.equal(action?.status, "approved");

const completed = await executeApprovedExecutiveAction(db, Number(action?.id), {
  desktop_commander: async () => ({ summary: "Mac status read successfully." }),
});
assert.equal(completed?.status, "completed");
assert.match(String(completed?.result_summary), /successfully/i);
assert.equal(getExecutiveActionAudit(db, Number(action?.id)).length, 3);

const unsupported = createExecutiveAction(db, {
  action_type: "read",
  target_system: "gmail",
  requested_outcome: "Read the latest inbox state.",
  authority_level: "observe",
  estimated_external_ai_cost_micros: 0,
});
await assert.rejects(() => executeApprovedExecutiveAction(db, Number(unsupported?.id), {}), /No executor is registered/i);

console.log("✓ Approved actions execute through registered adapters and preserve audit history");
