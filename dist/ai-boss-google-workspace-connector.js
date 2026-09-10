// server/ai-boss-google-workspace-connector.ts
import http from "node:http";
var DEFAULT_PORT = 8790;
var MAX_REQUEST_BYTES = 128e3;
function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
async function accessToken(fetchImpl) {
  const body = new URLSearchParams({
    client_id: requiredEnv("AI_BOSS_GOOGLE_CLIENT_ID"),
    client_secret: requiredEnv("AI_BOSS_GOOGLE_CLIENT_SECRET"),
    refresh_token: requiredEnv("AI_BOSS_GOOGLE_REFRESH_TOKEN"),
    grant_type: "refresh_token"
  });
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || `Google token refresh failed (${response.status}).`);
  }
  return data.access_token;
}
async function googleJson(fetchImpl, token, url) {
  const response = await fetchImpl(url, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Google API ${response.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : null;
}
async function executeWorkspaceAction(action, fetchImpl = fetch) {
  if (!["calendar", "drive"].includes(action.system)) throw new Error("Unsupported Google Workspace system.");
  if (!["read", "search"].includes(action.operation)) throw new Error("Workspace connector is read-only.");
  const token = await accessToken(fetchImpl);
  const target = String(action.target_ref || "").trim();
  if (action.system === "calendar") {
    if (action.operation === "read") {
      const eventId = target.replace(/^event:/, "");
      if (!eventId) throw new Error("Calendar read requires an event id.");
      return googleJson(
        fetchImpl,
        token,
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`
      );
    }
    const query2 = target.replace(/^query:/, "");
    const params2 = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
      timeMin: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (query2) params2.set("q", query2);
    return googleJson(
      fetchImpl,
      token,
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params2}`
    );
  }
  if (action.operation === "read") {
    const fileId = target.replace(/^file:/, "");
    if (!fileId) throw new Error("Drive read requires a file id.");
    return googleJson(
      fetchImpl,
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,modifiedTime,webViewLink,parents`
    );
  }
  const query = target.replace(/^query:/, "").replace(/'/g, "\\'");
  const params = new URLSearchParams({
    pageSize: "50",
    orderBy: "modifiedTime desc",
    fields: "files(id,name,mimeType,modifiedTime,webViewLink,parents)",
    q: query ? `name contains '${query}' and trashed = false` : "trashed = false"
  });
  return googleJson(fetchImpl, token, `https://www.googleapis.com/drive/v3/files?${params}`);
}
function connectorToken() {
  return requiredEnv("AI_BOSS_GOOGLE_WORKSPACE_CONNECTOR_TOKEN");
}
function createGoogleWorkspaceConnectorServer() {
  return http.createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.method === "GET" && req.url === "/health") {
      res.end(JSON.stringify({ ok: true, service: "ai-boss-google-workspace", mode: "read-only" }));
      return;
    }
    if (req.method !== "POST" || req.url !== "/workspace") {
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, error: "Not found" }));
      return;
    }
    let expected = "";
    try {
      expected = connectorToken();
    } catch {
      res.statusCode = 503;
      res.end(JSON.stringify({ ok: false, error: "Connector not configured" }));
      return;
    }
    if (req.headers.authorization !== `Bearer ${expected}`) {
      res.statusCode = 401;
      res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
      return;
    }
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) req.destroy(new Error("Request too large"));
      else chunks.push(chunk);
    });
    req.on("end", async () => {
      try {
        const action = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        res.end(JSON.stringify(await executeWorkspaceAction(action)));
      } catch (error) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      }
    });
  });
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.AI_BOSS_GOOGLE_WORKSPACE_CONNECTOR_PORT || DEFAULT_PORT);
  createGoogleWorkspaceConnectorServer().listen(port, "127.0.0.1", () => {
    console.log(`AI Boss Google Workspace connector listening on http://127.0.0.1:${port}/workspace`);
  });
}
export {
  createGoogleWorkspaceConnectorServer,
  executeWorkspaceAction
};
