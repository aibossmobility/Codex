import assert from "node:assert/strict";
import Database from "better-sqlite3";
import {
  approveAndroidSmsReply, claimApprovedAndroidSmsReply, completeAndroidSmsReply,
  ensureAndroidSmsRelayTables, ingestAndroidSms, listAndroidSms, queueAndroidSmsReply,
} from "./android-sms-relay-store";

const db = new Database(":memory:");
ensureAndroidSmsRelayTables(db);
const inbound = ingestAndroidSms(db, {
  device_id: "brian-phone", external_id: "sms-1", sender_address: "+15105550123",
  sender_label: "Test Dad", body: "Can we talk?", received_at: "2026-09-11T05:00:00.000Z",
}) as { id: number };
ingestAndroidSms(db, {
  device_id: "brian-phone", external_id: "sms-1", sender_address: "+15105550123",
  sender_label: "Test Dad", body: "Can we talk?", received_at: "2026-09-11T05:00:00.000Z",
});
assert.equal(listAndroidSms(db).length, 1, "sync is idempotent");
const reply = queueAndroidSmsReply(db, { message_id: inbound.id, destination: "+15105550123", body: "Yes." }) as { id: number; status: string };
assert.equal(reply.status, "awaiting_approval");
assert.equal(claimApprovedAndroidSmsReply(db, "brian-phone"), null, "unapproved replies never leave the server");
approveAndroidSmsReply(db, reply.id);
const claimed = claimApprovedAndroidSmsReply(db, "brian-phone") as { id: number; status: string };
assert.equal(claimed.status, "claimed");
const completed = completeAndroidSmsReply(db, claimed.id, true) as { status: string; delivery_route: string };
assert.equal(completed.status, "sent");
assert.equal(completed.delivery_route, "android");
console.log("✓ Android SMS relay requires explicit approval before a reply can be claimed");
