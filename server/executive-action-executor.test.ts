import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { createExecutiveAction, ensureExecutiveActionQueueTables, getExecutiveActionAudit } from "./executive-action-queue-store";
import { createGmailReadExecutor, executeApprovedExecutiveAction } from "./executive-action-executor";

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


const originalEndpoint = process.env.AI_BOSS_GMAIL_CONNECTOR_ENDPOINT;
const originalToken = process.env.AI_BOSS_GMAIL_CONNECTOR_TOKEN;
process.env.AI_BOSS_GMAIL_CONNECTOR_ENDPOINT = "http://127.0.0.1:9999/gmail";
process.env.AI_BOSS_GMAIL_CONNECTOR_TOKEN = "test-only-token";
let capturedAuth = "";
const gmailExecutor = createGmailReadExecutor(async (_url, init) => {
  capturedAuth = String((init?.headers as Record<string, string>)?.authorization || "");
  return new Response(JSON.stringify({ messages: [{ id: "m1", subject: "Test" }] }), { status: 200 });
});
const gmailRead = createExecutiveAction(db, {
  action_type: "search",
  target_system: "gmail",
  target_ref: "query:is:unread newer_than:7d",
  requested_outcome: "Find unread messages from the last week.",
  authority_level: "observe",
  estimated_external_ai_cost_micros: 0,
});
const gmailDone = await executeApprovedExecutiveAction(db, Number(gmailRead?.id), { gmail: gmailExecutor });
assert.equal(gmailDone?.status, "completed");
assert.equal(capturedAuth, "Bearer test-only-token");
await assert.rejects(
  () => createGmailReadExecutor(async () => new Response("ok"))({
    id: 999, action_type: "send", target_system: "gmail", target_ref: null,
    requested_outcome: "Send a message", authority_level: "act_external",
    execution_route: "direct", approval_required: 1, status: "approved",
  }),
  /only permits read\/search/i
);
if (originalEndpoint === undefined) delete process.env.AI_BOSS_GMAIL_CONNECTOR_ENDPOINT; else process.env.AI_BOSS_GMAIL_CONNECTOR_ENDPOINT = originalEndpoint;
if (originalToken === undefined) delete process.env.AI_BOSS_GMAIL_CONNECTOR_TOKEN; else process.env.AI_BOSS_GMAIL_CONNECTOR_TOKEN = originalToken;
console.log("✓ Gmail executor is read/search-only and requires connector credentials");
