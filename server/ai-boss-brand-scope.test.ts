import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { ensureAiBossMobileTables, getAiBossMissionControl } from "./ai-boss-mobile-store";

const db = new Database(":memory:");
db.exec(
  "CREATE TABLE executive_actions (" +
  "id INTEGER PRIMARY KEY, action_type TEXT, target_system TEXT, target_ref TEXT, requested_outcome TEXT, " +
  "authority_level TEXT, execution_route TEXT, estimated_external_ai_cost_micros INTEGER DEFAULT 0, " +
  "status TEXT, created_at TEXT, updated_at TEXT, project_key TEXT, source_conversation_ref TEXT, " +
  "result_summary TEXT, result_json TEXT, error_summary TEXT, action_payload_json TEXT);" +
  "CREATE TABLE executive_conversation_briefs (channel TEXT, status TEXT, session_ref TEXT);"
);
db.prepare(
  "INSERT INTO executive_actions (id, action_type, target_system, target_ref, requested_outcome, authority_level, execution_route, status, created_at, updated_at, project_key, source_conversation_ref, action_payload_json) " +
  "VALUES (?, 'search', 'desktop_commander', 'agent-team-readonly', ?, 'observe', 'local', ?, datetime('now'), datetime('now'), ?, ?, ?)"
).run(1, "Papa Life website check", "awaiting_approval", "papa-life", "mobile-worker-papa-1", '{"role":"seo-website"}');
db.prepare(
  "INSERT INTO executive_actions (id, action_type, target_system, target_ref, requested_outcome, authority_level, execution_route, status, created_at, updated_at, project_key, source_conversation_ref, action_payload_json) " +
  "VALUES (?, 'search', 'desktop_commander', 'agent-team-readonly', ?, 'observe', 'local', ?, datetime('now'), datetime('now'), ?, ?, ?)"
).run(2, "AI Boss website check", "awaiting_approval", "ai-boss-mobility", "mobile-worker-boss-2", '{"role":"seo-website"}');
db.prepare(
  "INSERT INTO executive_conversation_briefs (channel, status, session_ref) VALUES ('other','active','father-mobile-one'), ('other','active','boss-mobile-two')"
).run();
ensureAiBossMobileTables(db);

const papa = getAiBossMissionControl(db, "papa-life");
const boss = getAiBossMissionControl(db, "ai-boss-mobility");
const shared = getAiBossMissionControl(db);

assert.equal(papa.queue.awaiting_approval, 1);
assert.equal(boss.queue.awaiting_approval, 1);
assert.equal(shared.queue.awaiting_approval, 2);
assert.deepEqual(papa.pending_approvals.map(a => a.id), [1]);
assert.deepEqual(boss.pending_approvals.map(a => a.id), [2]);
assert.deepEqual(papa.worker_receipts.map(a => a.id), [1]);
assert.deepEqual(boss.worker_receipts.map(a => a.id), [2]);
assert.equal(papa.open_mobile_instructions, 1);
assert.equal(boss.open_mobile_instructions, 1);
assert.equal(shared.open_mobile_instructions, 2);
console.log("Business-scoped mission control separates Papa Life and AI Boss queues, receipts and notes.");
db.close();
