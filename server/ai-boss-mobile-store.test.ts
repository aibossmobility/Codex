import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { ensureAiBossMobileTables, getAiBossMissionControl, recordAiBossNodeHeartbeat } from "./ai-boss-mobile-store";

const db = new Database(":memory:");
db.exec(`
  CREATE TABLE executive_actions (status TEXT, execution_route TEXT);
  CREATE TABLE executive_conversation_briefs (channel TEXT, status TEXT);
  INSERT INTO executive_actions VALUES ('awaiting_approval', 'direct'), ('approved', 'local');
  ALTER TABLE executive_conversation_briefs ADD COLUMN session_ref TEXT;
  INSERT INTO executive_conversation_briefs VALUES
    ('other', 'active', 'mobile-1'),
    ('other', 'active', 'boss-mobile-2'),
    ('other', 'waiting', 'father-mobile-3'),
    ('other', 'active', 'web-4');
`);
ensureAiBossMobileTables(db);
assert.equal(getAiBossMissionControl(db).queue.waiting_for_mac, 1);
recordAiBossNodeHeartbeat(db, {
  node_id: "brian-mac-mini",
  display_name: "Brian's Mac mini",
  node_kind: "mac",
  capabilities: ["files", "desktop_commander", "gmail"],
});
recordAiBossNodeHeartbeat(db, {
  node_id: "brian-android-test",
  display_name: "Brian\'s Android phone",
  node_kind: "android",
  capabilities: ["mobile_capture", "approvals", "instruction_queue"],
});
const mission = getAiBossMissionControl(db);
assert.equal(mission.mac_online, true);
assert.equal(mission.queue.waiting_for_mac, 0);
assert.equal(mission.open_mobile_instructions, 3);
assert.equal(mission.nodes.some((node) => node.node_kind === "android" && node.online), true);
console.log("✓ Mobile mission control tracks node presence, deferred local work, and all mobile capture types");
