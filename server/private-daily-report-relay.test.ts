import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import Database from "better-sqlite3";
import { ensureDailyReportRelayColumns, listPendingDailyReports, acknowledgeDailyReport, registerDailyReportMacRelayRoutes } from "./private-daily-report-relay";

function fixture() {
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE papa_daily_work_reports (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     report_date TEXT NOT NULL, brand TEXT NOT NULL DEFAULT 'papa-life',
     markdown TEXT NOT NULL, created_by TEXT,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`);
  ensureDailyReportRelayColumns(db);
  db.prepare("INSERT INTO papa_daily_work_reports (report_date,brand,markdown,created_by) VALUES (?,?,?,?)")
    .run("2026-11-02", "papa-life", "Controlled Papa Life test submission", "owner");
  db.prepare("INSERT INTO papa_daily_work_reports (report_date,brand,markdown,created_by) VALUES (?,?,?,?)")
    .run("2026-11-02", "ai-boss-mobility", "Controlled AI Boss test submission", "owner");
  return db;
}
test("pending website reports stay separate by brand and acknowledgments are idempotent", () => {
  const db = fixture();
  try {
    const pending = listPendingDailyReports(db);
    assert.deepEqual(pending.map(x => x.brand), ["papa-life", "ai-boss-mobility"]);
    assert.throws(() => acknowledgeDailyReport(db, 1, "bad evidence"));
    assert.equal(acknowledgeDailyReport(db, 1, "Website daily report #1").status, "synced_mac");
    assert.equal(acknowledgeDailyReport(db, 1, "Website daily report #1").alreadySynced, true);
    assert.deepEqual(listPendingDailyReports(db).map(x => x.id), [2]);
  } finally { db.close(); }
});
test("relay disallows unauthenticated pulls and wrong tokens", async () => {
  const db = fixture();
  const app = express();
  app.use(express.json());
  registerDailyReportMacRelayRoutes(app, db);
  const key = "private-test-token-that-is-at-least-thirty-two-characters";
  const previous = process.env.PAPA_REPORT_MAC_RELAY_TOKEN;
  process.env.PAPA_REPORT_MAC_RELAY_TOKEN = key;
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");
    const url = `http://127.0.0.1:${address.port}/api/internal/mac-daily-reports/pull`;
    const wrong = await fetch(url, {method: "POST", headers: {authorization: "Bearer incorrect"}});
    assert.equal(wrong.status, 401);
    const ok = await fetch(url, {method:"POST",headers: {authorization:"Bearer " + key}});
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("cache-control"), "no-store");
    const payload = await ok.json() as {reports: unknown[]};
    assert.equal(payload.reports.length, 2);
    const invalidAck = await fetch(`http://127.0.0.1:${address.port}/api/internal/mac-daily-reports/1/ack`, {
      method: "POST", headers: {authorization: "Bearer "+key,"content-type":"application/json"},
      body: JSON.stringify({evidenceKey:"bad"})
    });
    assert.equal(invalidAck.status, 400);
  } finally {
    await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
    db.close();
    if(previous===undefined) delete process.env.PAPA_REPORT_MAC_RELAY_TOKEN;
    else process.env.PAPA_REPORT_MAC_RELAY_TOKEN=previous;
  }
});
