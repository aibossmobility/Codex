import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGoogleReportRow, readOwnerTwinBrief, reportBrand, safeCell, syncDailyReportToGoogleSheets } from "./private-daily-report-sync";

const env = {
  PAPA_REPORT_SHEETS_SPREADSHEET_ID: "YOUR_PRIVATE_GOOGLE_SHEET_ID",
  PAPA_REPORT_GOOGLE_CLIENT_ID: "test-client",
  PAPA_REPORT_GOOGLE_CLIENT_SECRET: "test-secret",
  PAPA_REPORT_GOOGLE_REFRESH_TOKEN: "test-refresh",
} as NodeJS.ProcessEnv;
const input = {
  id: 42, brand: "papa-life" as const, date: "2026-11-02",
  fields: { outreach: "", contentCreation: "", scheduling: "", automation: "", coaching: "", pipeline: "", revenue: "", research: "", win: "Verified setup" },
  markdown: "Owner submitted activity", createdBy: "owner",
};
test("brand names must stay in distinct tabs and cells are escaped", () => {
  assert.equal(reportBrand("ai-boss-mobility"), "ai-boss-mobility");
  assert.equal(reportBrand("unknown"), "papa-life");
  assert.equal(safeCell("=IMPORTXML(1)"), "'=IMPORTXML(1)");
  assert.equal(buildGoogleReportRow(input)[4], "Papa Life OS report #42");
});
test("missing Railway credentials never silently claim Google sync", async () => {
  const result = await syncDailyReportToGoogleSheets(input, {});
  assert.equal(result.status, "not_configured");
  assert.equal(result.ok, false);
});
test("Sheets append requires a matching readback", async () => {
  const urls: string[] = [];
  const fakeFetch = async (url: string | URL | Request) => {
    const u = String(url); urls.push(u);
    if (u.includes("oauth2.googleapis.com")) return Response.json({access_token: "mock-token"});
    if (u.includes(":append")) return Response.json({updates:{updatedRows:1, updatedRange:"'Papa Life Daily'!A2:H2"}});
    return Response.json({values:[["2026-11-02","","","","Papa Life OS report #42"]]});
  };
  const result = await syncDailyReportToGoogleSheets(input, env, fakeFetch as typeof fetch);
  assert.equal(result.status, "synced");
  assert.equal(urls.length, 3);
});
test("readback mismatch fails safely instead of marking synced", async () => {
  const fakeFetch = async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes("oauth2.googleapis.com")) return Response.json({access_token:"mock"});
    if (u.includes(":append")) return Response.json({updates:{updatedRows:1, updatedRange:"'Papa Life Daily'!A2:H2"}});
    return Response.json({values:[["","","","","another report"]]});
  };
  const result = await syncDailyReportToGoogleSheets(input, env, fakeFetch as typeof fetch);
  assert.equal(result.ok, false);
  assert.equal(result.status, "failed");
});
test("owner Twin brief reads the private tab without exposing credentials", async () => {
  const fakeFetch = async (url: string | URL | Request) => {
    if (String(url).includes("oauth2.googleapis.com")) return Response.json({access_token:"mock"});
    return Response.json({values:[["2026-11-02","Executive","Papa","AI","Attention","","Not connected to ElevenLabs"]]});
  };
  const result = await readOwnerTwinBrief(env, fakeFetch as typeof fetch);
  assert.equal(result.ok, true);
  assert.equal(result.brief?.ownerSummary, "Executive");
});
