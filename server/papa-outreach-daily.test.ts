import assert from "node:assert/strict";
import { once } from "node:events";
import Database from "better-sqlite3";
import express from "express";
import { ensurePapaConversations, savePapaConversation } from "./papa-conversations";
import { ensurePapaOutreachCapture, getPapaOutreachDaily, installPapaOutreachDailyRoutes } from "./papa-outreach-daily";

const db = new Database(":memory:");
db.exec(`CREATE TABLE papa_ai_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, mode TEXT,
  first_name TEXT, email TEXT, source_page TEXT, created_at TEXT
)`);
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
  assert.equal(getPapaOutreachDaily(db, 1, "2026-11-09").summary.ownerDictationNotes, 1);
  assert.equal(getPapaOutreachDaily(db, 2, "2026-11-09").summary.ownerDictationNotes, 0);
} finally {
  await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  db.close();
}
console.log("✓ Protected daily outreach reporting, Pacific date boundaries, privacy isolation and owner dictation");
