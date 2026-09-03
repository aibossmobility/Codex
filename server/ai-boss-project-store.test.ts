import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { ensureExecutiveActionQueueTables, createExecutiveAction } from "./executive-action-queue-store";
import { ensureAiBossProjectTables, getAiBossProjectWork, saveAiBossProject } from "./ai-boss-project-store";

const db = new Database(":memory:");
db.exec("CREATE TABLE human_impact_observations (id INTEGER PRIMARY KEY)");
ensureExecutiveActionQueueTables(db);
ensureAiBossProjectTables(db);

saveAiBossProject(db, {
  project_key: "papa_life.activation",
  title: "Papa Life activation",
  outcome: "Deploy and verify Mission Control without risking customer data.",
  status: "active",
  priority: "now",
  source_ref: "github-issue-34",
});
createExecutiveAction(db, {
  action_type: "read",
  target_system: "github",
  requested_outcome: "Verify the approved deployment commit.",
  authority_level: "observe",
  project_key: "papa_life.activation",
  work_kind: "task",
  due_at: "2026-09-03T20:00:00.000Z",
});
createExecutiveAction(db, {
  action_type: "read",
  target_system: "gmail",
  requested_outcome: "Follow up on the GoDaddy deployment response.",
  authority_level: "observe",
  project_key: "papa_life.activation",
  work_kind: "follow_up",
  waiting_on: "GoDaddy Managed Support",
});

const view = getAiBossProjectWork(db, "papa_life.activation");
assert.equal((view?.project as any).priority, "now");
assert.equal(view?.work.length, 2);
assert.equal((view?.work[1] as any).work_kind, "follow_up");
assert.equal(getAiBossProjectWork(db, "missing"), null);
console.log("✓ Projects reuse the authority queue for tasks and follow-ups");
