import assert from "node:assert/strict";
import Database from "better-sqlite3";
import {
  actionRequiresApproval,
  createExecutiveAction,
  decideExecutiveAction,
  defaultExecutionRoute,
  ensureExecutiveActionQueueTables,
  getExecutiveActionAudit,
  listExecutiveActions,
} from "./executive-action-queue-store";

const db = new Database(":memory:");
db.exec("CREATE TABLE human_impact_observations (id INTEGER PRIMARY KEY)");
ensureExecutiveActionQueueTables(db);

assert.equal(defaultExecutionRoute({ action_type: "read", target_system: "gmail" }), "direct");
assert.equal(defaultExecutionRoute({ action_type: "read", target_system: "files" }), "local");
assert.equal(defaultExecutionRoute({ action_type: "analyze", target_system: "system" }), "local_model");
assert.equal(
  actionRequiresApproval({ action_type: "send", authority_level: "act_external", execution_route: "direct" }),
  true
);
assert.equal(
  actionRequiresApproval({ action_type: "update", authority_level: "observe", execution_route: "direct" }),
  true
);

const safe = createExecutiveAction(db, {
  action_type: "read",
  target_system: "github",
  requested_outcome: "Read the current pull request status.",
  authority_level: "observe",
  estimated_external_ai_cost_micros: 0,
});
assert.equal(safe?.status, "approved");
assert.equal(safe?.execution_route, "direct");
assert.equal(safe?.provider_id, null);

const send = createExecutiveAction(db, {
  action_type: "send",
  target_system: "gmail",
  target_ref: "thread:manus-restoration",
  requested_outcome: "Send the approved restoration reply.",
  authority_level: "act_external",
  estimated_external_ai_cost_micros: 0,
});
assert.equal(send?.status, "awaiting_approval");
const approved = decideExecutiveAction(db, Number(send?.id), { decision: "approve", note: "Approved by Brian." });
assert.equal(approved?.status, "approved");
assert.equal(getExecutiveActionAudit(db, Number(send?.id)).length, 2);

assert.throws(
  () =>
    createExecutiveAction(db, {
      action_type: "analyze",
      target_system: "system",
      requested_outcome: "Use a cloud model without naming it.",
      authority_level: "observe",
      execution_route: "cloud_model",
      estimated_external_ai_cost_micros: 100,
    }),
  /must name/i
);

assert.throws(
  () => createExecutiveAction(db, {
    action_type: "read",
    target_system: "human_impact",
    requested_outcome: "Read a missing human-impact observation.",
    authority_level: "observe",
    human_impact_observation_id: 999,
    estimated_external_ai_cost_micros: 0,
  }),
  /observation not found/i
);

assert.equal(listExecutiveActions(db).length, 2);
console.log("✓ Action queue defaults local/direct, gates consequential work, and audits decisions");
