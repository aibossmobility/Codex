import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { createExecutiveAction, ensureExecutiveActionQueueTables, getExecutiveActionAudit } from "./executive-action-queue-store";
import { createDesktopCommanderExecutor, createGmailReadExecutor, executeApprovedExecutiveAction } from "./executive-action-executor";

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
  "desktop_commander:local": async () => ({
    summary: "Mac status read successfully.",
    details: { hostname: "boss-mac", uptime_seconds: 42 },
  }),
});
assert.equal(completed?.status, "completed");
assert.match(String(completed?.result_summary), /successfully/i);
assert.match(String(completed?.result_summary), /boss-mac/i);
assert.equal(getExecutiveActionAudit(db, Number(action?.id)).length, 3);

const unsupported = createExecutiveAction(db, {
  action_type: "read",
  target_system: "gmail",
  requested_outcome: "Read the latest inbox state.",
  authority_level: "observe",
  estimated_external_ai_cost_micros: 0,
});
await assert.rejects(() => executeApprovedExecutiveAction(db, Number(unsupported?.id), {}), /No executor is registered/i);

const wrongRoute = createExecutiveAction(db, {
  action_type: "analyze",
  target_system: "files",
  target_ref: "file:/tmp/example.txt",
  requested_outcome: "Analyze a local file with a model.",
  authority_level: "observe",
  execution_route: "local_model",
  estimated_external_ai_cost_micros: 0,
});
await assert.rejects(
  () => executeApprovedExecutiveAction(db, Number(wrongRoute?.id)),
  /No executor is registered for target\/route: files\/local_model/i
);
assert.equal((db.prepare("SELECT status FROM executive_actions WHERE id = ?").get(wrongRoute?.id) as { status: string }).status, "approved");

console.log("✓ Approved actions use route-specific adapters and preserve returned results");

const originalDesktopEndpoint = process.env.AI_BOSS_DESKTOP_COMMANDER_ENDPOINT;
process.env.AI_BOSS_DESKTOP_COMMANDER_ENDPOINT = "http://127.0.0.1:9999/execute";
let desktopSignal: AbortSignal | null = null;
const desktopExecutor = createDesktopCommanderExecutor(async (_url, init) => {
  desktopSignal = init?.signal as AbortSignal;
  return new Response(JSON.stringify({ ok: true, hostname: "boss-mac" }), { status: 200 });
});
await desktopExecutor({
  id: 998, action_type: "read", target_system: "desktop_commander", target_ref: "mac:status",
  requested_outcome: "Read Mac status", authority_level: "observe",
  execution_route: "local", approval_required: 0, status: "executing",
});
assert.ok(desktopSignal, "Desktop Commander requests must carry an abort signal");
if (originalDesktopEndpoint === undefined) delete process.env.AI_BOSS_DESKTOP_COMMANDER_ENDPOINT; else process.env.AI_BOSS_DESKTOP_COMMANDER_ENDPOINT = originalDesktopEndpoint;
console.log("✓ Local bridge requests are bounded by an application timeout");

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
const gmailDone = await executeApprovedExecutiveAction(db, Number(gmailRead?.id), { "gmail:direct": gmailExecutor });
assert.equal(gmailDone?.status, "completed");
assert.equal(capturedAuth, "Bearer test-only-token");
assert.match(String(gmailDone?.result_summary), /messages/i);
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
