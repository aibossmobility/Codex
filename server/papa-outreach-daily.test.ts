import assert from "node:assert/strict";
import { once } from "node:events";
import { pacificToday } from "../shared/papa-conversations";
import Database from "better-sqlite3";
import express from "express";
import { ensurePapaConversations, savePapaConversation } from "./papa-conversations";
import { ensurePapaOutreachCapture, getPapaOutreachDaily, installPapaOutreachDailyRoutes } from "./papa-outreach-daily";

const db = new Database(":memory:");
db.exec(`CREATE TABLE papa_ai_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, mode TEXT,
  first_name TEXT, email TEXT, source_page TEXT, created_at TEXT
)`);
db.exec("CREATE TABLE admin_users (id INTEGER PRIMARY KEY, email TEXT)");
db.prepare("INSERT INTO admin_users(id,email) VALUES (?,?)").run(1, "brian@bossmobility.net");
ensurePapaConversations(db);
ensurePapaOutreachCapture(db);
const ownerRecord = {
  id: "7b85487d-1010-40a8-975a-f535c40d385f",
  person: "Example father", date: "2026-11-09", kind: "Father" as const,
  purpose: "Wanted a real conversation", certainty: "Stated interest" as const,
  questions: ["What was helpful?", "What can we try?"], stage: "Presence" as const,
  prompt: "Listen first", useful: "He felt listened to.", takeaways: ["Presence", ""],
  steps: "", missing: "", topic: "/", completed: true
};
savePapaConversation(db, 1, ownerRecord);
savePapaConversation(db, 2, { ...ownerRecord, person: "Other owner only" });
db.prepare("INSERT INTO papa_ai_interactions (session_id,mode,first_name,email,source_page,created_at) VALUES (?,?,?,?,?,?)")
  .run("visitor-1", "coach", "Pat", null, "https://papalifecoach.com/digital-twin", "2026-11-09 19:24:00");
db.prepare("INSERT INTO papa_ai_interactions (session_id,mode,first_name,email,source_page,created_at) VALUES (?,?,?,?,?,?)")
  .run("visitor-1", "coach", "Pat", null, "https://papalifecoach.com/digital-twin", "2026-11-09 19:25:00");
db.prepare("INSERT INTO papa_ai_interactions (session_id,mode,first_name,email,source_page,created_at) VALUES (?,?,?,?,?,?)")
  .run("visitor-2", "lead", "Jordan", "jordan@example.com", "https://papalifecoach.com/digital-twin", "2026-11-09 19:30:00");
db.prepare("INSERT INTO papa_ai_interactions (session_id,mode,first_name,email,source_page,created_at) VALUES (?,?,?,?,?,?)")
  .run("visitor-3", "coach", "Wrong day", null, "/", "2026-11-10 09:00:00");
const report = getPapaOutreachDaily(db, 1, "2026-11-09");
assert.equal(report.summary.websiteAiSessions, 1);
assert.equal(report.summary.websiteAiMessages, 2);
assert.equal(report.summary.submittedContactDetails, 1);
assert.equal(report.summary.completedOwnerReflections, 1);
assert.equal(report.ownerConversations.length, 1);
assert.equal(report.ownerConversations[0].person, "Example father");
assert.equal(getPapaOutreachDaily(db, 2, "2026-11-09").ownerConversations[0].person, "Other owner only");
assert.equal(getPapaOutreachDaily(db, 1, "2026-11-10").summary.websiteAiMessages, 1);
assert.throws(() => getPapaOutreachDaily(db, 1, "2026-02-30"));

const app = express();
app.use(express.json());
installPapaOutreachDailyRoutes(app, db, (req, res, next) => {
  if (!req.get("x-test-owner")) { res.status(401).end(); return; }
  (req as any).session = { adminId: Number(req.get("x-test-owner")) };
  next();
});
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address() as {port:number};
const root = `http://127.0.0.1:${address.port}/api/admin/papa-outreach`;
const macRoot = `http://127.0.0.1:${address.port}/api/papa-life/mac-voice/outreach`;
const formerMacToken = process.env.PAPA_MAC_VOICE_RELAY_TOKEN;
const formerMacOwner = process.env.PAPA_MAC_OWNER_EMAIL;
delete process.env.PAPA_MAC_VOICE_RELAY_TOKEN;
delete process.env.PAPA_MAC_OWNER_EMAIL;
try {
  assert.equal((await fetch(root + "/daily?date=2026-11-09")).status, 401);
  assert.equal((await fetch(root + "/daily?date=bad", {headers: {"x-test-owner":"1"}})).status, 400);
  assert.equal((await fetch(root + "/quick-note", {
    method: "POST", headers: {"Content-Type":"application/json","x-test-owner":"1"},
    body: JSON.stringify({note: ""})
  })).status, 400);
  const saved = await fetch(root + "/quick-note", {
    method: "POST", headers: {"Content-Type":"application/json","x-test-owner":"1"},
    body: JSON.stringify({note: "Spoke to a pastor. Will follow up personally."})
  });
  assert.equal(saved.status, 200);
  assert.equal(getPapaOutreachDaily(db, 1, pacificToday()).summary.ownerDictationNotes, 1);
  assert.equal(getPapaOutreachDaily(db, 2, pacificToday()).summary.ownerDictationNotes, 0);

  const voiceStatus = await fetch(root + "/voice-status", { headers: { "x-test-owner": "1" } });
  assert.equal(voiceStatus.status, 200);
  const voiceBody = await voiceStatus.json() as any;
  assert.equal(voiceBody.primary, "mac-mini-desktop-commander");
  assert.equal(voiceBody.macRelayReady, false);
  assert.equal(voiceBody.elevenLabsAutoStart, false);
  assert.equal((await fetch(root + "/voice-status")).status, 401);

  const voicePayload = {
    source: "mac_desktop_commander",
    source_ref: "macvoice:7b85487d-1010-40a8-975a-f535c40d385f",
    authorized_to_store: true,
    note: "Mac voice recap with the owner's authorization for private storage."
  };
  const postVoice = (payload: unknown, bearer?: string) => fetch(macRoot, {
    method: "POST", headers: {
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: "Bearer " + bearer } : {}),
    }, body: JSON.stringify(payload)
  });
  assert.equal((await postVoice(voicePayload)).status, 503);
  process.env.PAPA_MAC_VOICE_RELAY_TOKEN = "a-long-private-mac-relay-test-key-20261109-no-reuse";
  process.env.PAPA_MAC_OWNER_EMAIL = "brian@bossmobility.net";
  assert.equal((await postVoice(voicePayload)).status, 401);
  assert.equal((await postVoice({ ...voicePayload, authorized_to_store: false }, process.env.PAPA_MAC_VOICE_RELAY_TOKEN)).status, 400);
  const first = await postVoice(voicePayload, process.env.PAPA_MAC_VOICE_RELAY_TOKEN);
  assert.equal(first.status, 200);
  assert.equal((await first.json() as any).accepted, true);
  const repeat = await postVoice(voicePayload, process.env.PAPA_MAC_VOICE_RELAY_TOKEN);
  assert.equal(repeat.status, 200);
  assert.equal((await repeat.json() as any).duplicate, true);
  assert.equal(getPapaOutreachDaily(db, 1, pacificToday()).summary.macVoiceNotes, 1);
  assert.equal(getPapaOutreachDaily(db, 2, pacificToday()).summary.macVoiceNotes, 0);

} finally {
  if (formerMacToken === undefined) delete process.env.PAPA_MAC_VOICE_RELAY_TOKEN;
  else process.env.PAPA_MAC_VOICE_RELAY_TOKEN = formerMacToken;
  if (formerMacOwner === undefined) delete process.env.PAPA_MAC_OWNER_EMAIL;
  else process.env.PAPA_MAC_OWNER_EMAIL = formerMacOwner;
  await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  db.close();
}
console.log("✓ Protected daily outreach reporting, Pacific date boundaries, privacy isolation and owner dictation");
