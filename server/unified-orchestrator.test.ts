import Database from "better-sqlite3";
import assert from "node:assert/strict";
import { ensureExecutiveActionQueueTables } from "./executive-action-queue-store";
import {
  enqueueUnifiedOrchestration,
  orchestrationDependenciesSatisfied,
  planUnifiedOrchestration,
} from "./unified-orchestrator";

function createDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = OFF");
  ensureExecutiveActionQueueTables(db);
  return db;
}

{
  const plan = planUnifiedOrchestration({
    goal: "Coordinate a Papa Life follow-up without bypassing Brian's authority rules.",
    project_key: "papa-life",
    steps: [
      {
        step_id: "find-replies",
        action_type: "search",
        target_system: "gmail",
        requested_outcome: "Find relevant Papa Life replies.",
        authority_level: "observe",
        estimated_external_ai_cost_micros: 0,
      },
      {
        step_id: "send-follow-up",
        depends_on: ["find-replies"],
        action_type: "send",
        target_system: "gmail",
        requested_outcome: "Send the approved follow-up.",
        authority_level: "act_external",
        estimated_external_ai_cost_micros: 0,
        action_payload: {
          mode: "send",
          to: "father@example.com",
          subject: "Papa Life follow-up",
          body: "Following up as discussed.",
        },
      },
    ],
  });

  assert.equal(plan.summary.total_steps, 2);
  assert.equal(plan.summary.automatic_steps, 1);
  assert.equal(plan.summary.approval_steps, 1);
  assert.equal(plan.steps[0].execution_route, "direct");
  assert.equal(plan.steps[1].approval_required, true);
}

{
  const db = createDb();
  const result = enqueueUnifiedOrchestration(db, {
    goal: "Read first, then send only after the read is complete and the send is approved.",
    project_key: "papa-life",
    steps: [
      {
        step_id: "send",
        depends_on: ["read"],
        action_type: "send",
        target_system: "gmail",
        requested_outcome: "Send an approved message.",
        authority_level: "act_external",
        estimated_external_ai_cost_micros: 0,
        action_payload: {
          mode: "send",
          to: "father@example.com",
          subject: "Follow-up",
          body: "Hello.",
        },
      },
      {
        step_id: "read",
        action_type: "read",
        target_system: "gmail",
        requested_outcome: "Read the source message.",
        authority_level: "observe",
        estimated_external_ai_cost_micros: 0,
      },
    ],
  });

  assert.deepEqual(result.actions.map((item) => item.step_id), ["read", "send"]);
  const readActionId = result.actions[0].action_id;
  const sendActionId = result.actions[1].action_id;

  assert.equal(orchestrationDependenciesSatisfied(db, readActionId), true);
  assert.equal(orchestrationDependenciesSatisfied(db, sendActionId), false);

  db.prepare("UPDATE executive_actions SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(readActionId);
  assert.equal(orchestrationDependenciesSatisfied(db, sendActionId), true);

  const sendRow = db.prepare("SELECT approval_required, status, action_payload_json FROM executive_actions WHERE id = ?").get(sendActionId) as any;
  assert.equal(sendRow.approval_required, 1);
  assert.equal(sendRow.status, "awaiting_approval");
  const payload = JSON.parse(sendRow.action_payload_json);
  assert.equal(payload._orchestrator.depends_on_action_ids[0], readActionId);
  db.close();
}

{
  assert.throws(
    () =>
      planUnifiedOrchestration({
        goal: "Reject cyclic workflows.",
        steps: [
          {
            step_id: "a",
            depends_on: ["b"],
            action_type: "read",
            target_system: "gmail",
            requested_outcome: "Read A",
            authority_level: "observe",
            estimated_external_ai_cost_micros: 0,
          },
          {
            step_id: "b",
            depends_on: ["a"],
            action_type: "read",
            target_system: "gmail",
            requested_outcome: "Read B",
            authority_level: "observe",
            estimated_external_ai_cost_micros: 0,
          },
        ],
      }),
    /dependency cycle/i
  );
}

console.log("Unified Orchestrator tests passed.");
