/**
 * Owner-only Google Sheets bridge for authenticated daily work report submissions.
 * Credentials stay in server-side environment variables, never in browser code.
 * Not called by the publicly accessible Digital Twin.
 */
export type ReportBrand = "papa-life" | "ai-boss-mobility";
export type ReportFields = {
  outreach: string; contentCreation: string; scheduling: string;
  automation: string; coaching: string; pipeline: string;
  revenue: string; research: string; win: string;
};
export type SyncResult = { ok: boolean; status: "synced" | "not_configured" | "failed"; error?: string; range?: string };
const SHEET_TABS: Record<ReportBrand, string> = {
  "papa-life": "Papa Life Daily",
  "ai-boss-mobility": "AI Boss Mobility Daily",
};
const LIMIT = 6000;
export function reportBrand(value: unknown): ReportBrand {
  return value === "ai-boss-mobility" ? "ai-boss-mobility" : "papa-life";
}
export function safeCell(value: unknown): string {
  const s = String(value ?? "").trim().slice(0, LIMIT);
  // Avoid interpreting imported text as Google Sheets formulas.
  return /^[=+@\-\t\r]/.test(s) ? "'" + s : s;
}
export function buildGoogleReportRow(input: {
  id: number; brand: ReportBrand; date: string; fields: ReportFields;
  markdown: string; createdBy?: string | null;
}): string[] {
  const { id, brand, date, fields, markdown, createdBy } = input;
  return [
    safeCell(date),
    "Website Daily Report",
    safeCell(markdown),
    "Submitted (owner form; not independently verified)",
    "Papa Life OS report #" + id,
    safeCell(createdBy || "Authenticated owner"),
    safeCell(fields.win ? "Win: " + fields.win : "Review and verify reported activity"),
    new Date().toISOString(),
  ];
}
function settings(env: NodeJS.ProcessEnv) {
  const id = env.PAPA_REPORT_SHEETS_SPREADSHEET_ID?.trim();
  const client = env.PAPA_REPORT_GOOGLE_CLIENT_ID?.trim();
  const secret = env.PAPA_REPORT_GOOGLE_CLIENT_SECRET?.trim();
  const refresh = env.PAPA_REPORT_GOOGLE_REFRESH_TOKEN?.trim();
  if (!id || !client || !secret || !refresh) return null;
  if (!/^[\w-]{20,}$/.test(id)) return null;
  return { id, client, secret, refresh };
}
export async function syncDailyReportToGoogleSheets(
  input: Parameters<typeof buildGoogleReportRow>[0],
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<SyncResult> {
  const config = settings(env);
  if (!config) return { ok: false, status: "not_configured", error: "Google Sheets sync not configured" };
  try {
    const tokenBody = new URLSearchParams({
      client_id: config.client,
      client_secret: config.secret,
      refresh_token: config.refresh,
      grant_type: "refresh_token",
    });
    const tokenResponse = await fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: tokenBody, signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok) throw new Error("Google OAuth rejected refresh token");
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) throw new Error("Google OAuth access token absent");
    const tab = SHEET_TABS[input.brand];
    const range = "'" + tab + "'!A:H";
    const url = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(config.id)
      + "/values/" + encodeURIComponent(range) + ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS";
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { authorization: "Bearer " + tokenData.access_token, "content-type": "application/json" },
      body: JSON.stringify({ values: [buildGoogleReportRow(input)] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Sheets append rejected (" + response.status + ")");
    const result = await response.json() as { updates?: { updatedRange?: string; updatedRows?: number } };
    if (result.updates?.updatedRows !== 1 || !result.updates.updatedRange)
      throw new Error("Sheets append was not confirmed");
    // Verify persistence, not only the response from append.
    const verifyUrl = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(config.id)
      + "/values/" + encodeURIComponent(result.updates.updatedRange);
    const readback = await fetchImpl(verifyUrl, {
      headers: { authorization: "Bearer " + tokenData.access_token }, signal: AbortSignal.timeout(10000),
    });
    if (!readback.ok) throw new Error("Sheets readback failed (" + readback.status + ")");
    const readData = await readback.json() as { values?: unknown[][] };
    if (String(readData.values?.[0]?.[4] || "") !== "Papa Life OS report #" + input.id)
      throw new Error("Sheets readback does not match saved report");
    return { ok: true, status: "synced", range: result.updates.updatedRange };
  } catch (err) {
    // Never log tokens, refresh values, or Google response bodies.
    return { ok: false, status: "failed", error: err instanceof Error ? err.message : "Sync failed" };
  }
}

/** Authenticated administrator-facing summary. Not an ElevenLabs public tool. */
export async function readOwnerTwinBrief(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<SyncResult & { brief?: { date: string; ownerSummary: string; papa: string; aiBoss: string; attention: string } }> {
  const config = settings(env);
  if (!config) return { ok: false, status: "not_configured", error: "Google Sheets sync not configured" };
  try {
    const response = await fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.client, client_secret: config.secret,
        refresh_token: config.refresh, grant_type: "refresh_token",
      }), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Google OAuth rejected refresh token");
    const data = await response.json() as { access_token?: string };
    if (!data.access_token) throw new Error("Google OAuth access token absent");
    const range = "'Digital Twin Brief'!A2:G1000";
    const url = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(config.id)
      + "/values/" + encodeURIComponent(range);
    const r = await fetchImpl(url, {
      headers: { authorization: "Bearer " + data.access_token }, signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error("Google Sheets briefing read failed (" + r.status + ")");
    const values = (await r.json() as { values?: string[][] }).values || [];
    const last = values.filter(row => row[0]).at(-1);
    if (!last) return { ok: true, status: "synced", brief: { date: "", ownerSummary: "No brief available", papa: "", aiBoss: "", attention: "" } };
    return { ok: true, status: "synced", brief: {
      date: String(last[0]).slice(0, 20),
      ownerSummary: String(last[1] || "").slice(0, 2000),
      papa: String(last[2] || "").slice(0, 2000),
      aiBoss: String(last[3] || "").slice(0, 2000),
      attention: String(last[4] || "").slice(0, 2000),
    } };
  } catch (err) {
    return { ok: false, status: "failed", error: err instanceof Error ? err.message : "Brief read failed" };
  }
}
