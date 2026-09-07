import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { ensureAiBossMobileTables, getAiBossMissionControl, recordAiBossNodeHeartbeat } from "./ai-boss-mobile-store";

const db = new Database(":memory:");
db.exec(`
  CREATE TABLE executive_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT,
    target_system TEXT,
    target_ref TEXT,
    requested_outcome TEXT,
    authority_level TEXT,
    execution_route TEXT,
    estimated_external_ai_cost_micros INTEGER DEFAULT 0,
    status TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE executive_conversation_briefs (channel TEXT, status TEXT);
  INSERT INTO executive_actions
    (action_type, target_system, target_ref, requested_outcome, authority_level, execution_route, status)
  VALUES
    ('send', 'gmail', 'thread-1', 'Reply to the latest message', 'act_external', 'direct', 'awaiting_approval'),
    ('execute', 'desktop_commander', 'local-task', 'Run a local Mac task', 'act_external', 'local', 'approved');
  ALTER TABLE executive_conversation_briefs ADD COLUMN session_ref TEXT;
  INSERT INTO executive_conversation_briefs VALUES
    ('other', 'active', 'mobile-1'),
    ('other', 'active', 'boss-mobile-2'),
    ('other', 'waiting', 'father-mobile-3'),
    ('other', 'active', 'web-4');
`);
ensureAiBossMobileTables(db);

const offlineMission = getAiBossMissionControl(db);
assert.equal(offlineMission.mac_online, false);
assert.equal(offlineMission.android_online, false);
assert.equal(offlineMission.active_companion, null);
assert.equal(offlineMission.queue.waiting_for_mac, 1);
assert.equal(offlineMission.pending_approvals.length, 1);
assert.equal(offlineMission.pending_approvals[0].target_system, "gmail");
assert.equal(offlineMission.pending_approvals[0].waits_for_mac, false);

recordAiBossNodeHeartbeat(db, {
  node_id: "brian-android-test",
  display_name: "Brian's Android phone",
  node_kind: "android",
  capabilities: ["mobile_capture", "approvals", "instruction_queue", "mission_control", "phone_primary_when_mac_offline"],
});
const androidMission = getAiBossMissionControl(db);
assert.equal(androidMission.mac_online, false);
assert.equal(androidMission.android_online, true);
assert.equal(androidMission.active_companion, "android");
assert.equal(androidMission.queue.waiting_for_mac, 1);

recordAiBossNodeHeartbeat(db, {
  node_id: "brian-mac-mini",
  display_name: "Brian's Mac mini",
  node_kind: "mac",
  capabilities: ["files", "desktop_commander", "gmail"],
});
const mission = getAiBossMissionControl(db);
assert.equal(mission.mac_online, true);
assert.equal(mission.android_online, true);
assert.equal(mission.active_companion, "android");
assert.equal(mission.queue.waiting_for_mac, 0);
assert.equal(mission.open_mobile_instructions, 3);
assert.equal(mission.nodes.some((node) => node.node_kind === "android" && node.online), true);
console.log("✓ Mobile mission control supports Android-primary status, approvals, and offline-Mac safety");
