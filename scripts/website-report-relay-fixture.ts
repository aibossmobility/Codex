/** Test-only isolated relay with no production site, volume, or member data. */
import fs from "node:fs";
import express from "express";
import Database from "better-sqlite3";
import {registerDailyReportMacRelayRoutes, ensureDailyReportRelayColumns} from "../server/private-daily-report-relay";
const secretFile=process.env.PAPA_REPORT_MAC_TOKEN_FILE;
if (!secretFile) throw new Error("Missing temporary token file");
process.env.PAPA_REPORT_MAC_RELAY_TOKEN=fs.readFileSync(secretFile,"utf8").trim();
const db=new Database(":memory:");
db.exec(`CREATE TABLE papa_daily_work_reports (
 id INTEGER PRIMARY KEY, report_date TEXT NOT NULL, brand TEXT NOT NULL DEFAULT 'papa-life',
 markdown TEXT NOT NULL, created_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
ensureDailyReportRelayColumns(db);
const stmt=db.prepare("INSERT INTO papa_daily_work_reports(id,report_date,brand,markdown,created_by) VALUES(?,?,?,?,?)");
stmt.run(900000001,"2026-11-02","papa-life","CONTROLLED INTEGRATION TEST ONLY - no real Papa Life activity","owner");
stmt.run(900000002,"2026-11-02","ai-boss-mobility","CONTROLLED INTEGRATION TEST ONLY - no real AI Boss Mobility activity","owner");
const app=express();
app.use(express.json());
registerDailyReportMacRelayRoutes(app,db);
const server=app.listen(0,"127.0.0.1",()=>{
 const addr=server.address();
 if (!addr || typeof addr==="string") throw new Error("No test port");
 process.stdout.write("RELAY_TEST_PORT="+addr.port+"\n");
});
process.on("SIGTERM",()=>server.close(()=>db.close()));
