import express from "express";
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { PAPALIFE_MCP_TOOL_DEFINITIONS, handlePapalifeTool } from "./server/mcp-handlers.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const MCP_PORT = parseInt(process.env.MCP_PORT || "3009", 10);
const MCP_BEARER_TOKEN = process.env.MCP_BEARER_TOKEN || "";
const MCP_BASE_URL = process.env.PUBLIC_MCP_BASE_URL || "https://bossmobilelifecoach.com";

const OAUTH_CODE_TTL_MS = 5 * 60 * 1000;
const OAUTH_ACCESS_TTL_SEC = 60 * 60;
const OAUTH_REFRESH_TTL_SEC = 30 * 24 * 60 * 60;

const oauthDb = new Database(path.resolve(process.cwd(), "leads.db"));
oauthDb.pragma("journal_mode = WAL");
oauthDb.exec(`
  CREATE TABLE IF NOT EXISTS oauth_clients (
    client_id TEXT PRIMARY KEY,
    client_name TEXT,
    redirect_uris TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS oauth_codes (
    code TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    code_challenge TEXT,
    code_challenge_method TEXT,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS oauth_access_tokens (
    token_hash TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    scope TEXT,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
    token_hash TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    scope TEXT,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires ON oauth_codes(expires_at);
  CREATE INDEX IF NOT EXISTS idx_oauth_access_expires ON oauth_access_tokens(expires_at);
  CREATE INDEX IF NOT EXISTS idx_oauth_refresh_expires ON oauth_refresh_tokens(expires_at);
`);

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

function saveClient(clientId: string, clientName: string, redirectUris: string[]) {
  oauthDb
    .prepare(
      "INSERT OR REPLACE INTO oauth_clients (client_id, client_name, redirect_uris, created_at) VALUES (?, ?, ?, ?)"
    )
    .run(clientId, clientName, JSON.stringify(redirectUris), Date.now());
}

function saveCode(
  code: string,
  clientId: string,
  redirectUri: string,
  challenge: string,
  method: string
) {
  oauthDb
    .prepare(
      "INSERT INTO oauth_codes (code, client_id, redirect_uri, code_challenge, code_challenge_method, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(code, clientId, redirectUri, challenge, method, Date.now() + OAUTH_CODE_TTL_MS);
}

type StoredCode = {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  expires_at: number;
};
function takeCode(code: string): StoredCode | null {
  purgeExpired();
  const row = oauthDb
    .prepare(
      "SELECT client_id, redirect_uri, code_challenge, code_challenge_method, expires_at FROM oauth_codes WHERE code = ?"
    )
    .get(code) as StoredCode | undefined;
  if (!row) return null;
  oauthDb.prepare("DELETE FROM oauth_codes WHERE code = ?").run(code);
  if (row.expires_at < Date.now()) return null;
  return row;
}

function issueAccessToken(clientId: string, scope: string): string {
  const raw = crypto.randomBytes(32).toString("base64url");
  oauthDb
    .prepare(
      "INSERT INTO oauth_access_tokens (token_hash, client_id, scope, expires_at) VALUES (?, ?, ?, ?)"
    )
    .run(sha256(raw), clientId, scope, Date.now() + OAUTH_ACCESS_TTL_SEC * 1000);
  return raw;
}

function issueRefreshToken(clientId: string, scope: string): string {
  const raw = crypto.randomBytes(32).toString("base64url");
  oauthDb
    .prepare(
      "INSERT INTO oauth_refresh_tokens (token_hash, client_id, scope, expires_at) VALUES (?, ?, ?, ?)"
    )
    .run(sha256(raw), clientId, scope, Date.now() + OAUTH_REFRESH_TTL_SEC * 1000);
  return raw;
}

type AccessRow = { client_id: string; expires_at: number };
function lookupAccessToken(raw: string): AccessRow | null {
  const row = oauthDb
    .prepare("SELECT client_id, expires_at FROM oauth_access_tokens WHERE token_hash = ?")
    .get(sha256(raw)) as AccessRow | undefined;
  return row ?? null;
}

function consumeRefreshToken(raw: string): { client_id: string; scope: string } | null {
  const h = sha256(raw);
  const row = oauthDb
    .prepare("SELECT client_id, scope, expires_at FROM oauth_refresh_tokens WHERE token_hash = ?")
    .get(h) as { client_id: string; scope: string; expires_at: number } | undefined;
  if (!row) return null;
  oauthDb.prepare("DELETE FROM oauth_refresh_tokens WHERE token_hash = ?").run(h);
  if (row.expires_at < Date.now()) return null;
  return { client_id: row.client_id, scope: row.scope };
}

function purgeExpired() {
  const now = Date.now();
  oauthDb.prepare("DELETE FROM oauth_codes WHERE expires_at < ?").run(now);
  oauthDb.prepare("DELETE FROM oauth_access_tokens WHERE expires_at < ?").run(now);
  oauthDb.prepare("DELETE FROM oauth_refresh_tokens WHERE expires_at < ?").run(now);
}

setInterval(purgeExpired, 10 * 60 * 1000).unref();

function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (method === "S256") {
    return crypto.createHash("sha256").update(verifier).digest("base64url") === challenge;
  }
  return verifier === challenge;
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cors = (_: express.Request, res: express.Response, next: express.NextFunction) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Mcp-Session-Id, mcp-session-id, Accept, Last-Event-ID, MCP-Protocol-Version, mcp-protocol-version",
    "Access-Control-Expose-Headers": "Mcp-Session-Id, WWW-Authenticate, MCP-Protocol-Version",
  });
  next();
};

function checkAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers["authorization"];
  if (!auth) {
    if (!MCP_BEARER_TOKEN) return next();
    res.set(
      "WWW-Authenticate",
      `Bearer realm="${MCP_BASE_URL}", resource_metadata="${MCP_BASE_URL}/.well-known/oauth-protected-resource"`
    );
    res.status(401).json({ error: "Unauthorized — Bearer token required" });
    return;
  }
  const token = auth.replace("Bearer ", "").trim();
  if (MCP_BEARER_TOKEN && token === MCP_BEARER_TOKEN) return next();
  const row = lookupAccessToken(token);
  if (row && row.expires_at >= Date.now()) return next();
  const errCode = row ? "invalid_token" : "invalid_token";
  const errDesc = row ? "The access token expired" : "The access token is invalid";
  res.set(
    "WWW-Authenticate",
    `Bearer realm="${MCP_BASE_URL}", resource_metadata="${MCP_BASE_URL}/.well-known/oauth-protected-resource", error="${errCode}", error_description="${errDesc}"`
  );
  res.status(401).json({ error: "Unauthorized — invalid or expired token" });
}

const sessions = new Map<string, { server: Server; transport: StreamableHTTPServerTransport }>();

function createSession() {
  const mcpServer = new Server(
    { name: "papalife-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: PAPALIFE_MCP_TOOL_DEFINITIONS,
  }));

  mcpServer.setRequestHandler(CallToolRequestSchema, async (req) => {
    try {
      const result = await handlePapalifeTool(
        req.params.name,
        (req.params.arguments || {}) as Record<string, unknown>
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e: unknown) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` },
        ],
        isError: true,
      };
    }
  });

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true,
  });
  return { server: mcpServer, transport };
}

app.options(/.*/, cors, (_, res) => res.sendStatus(204));

app.post("/mcp", cors, checkAuth, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId)!.transport.handleRequest(req, res, req.body);
    return;
  }
  const { server: mcpServer, transport } = createSession();
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
  const newId = transport.sessionId;
  if (newId) sessions.set(newId, { server: mcpServer, transport });
});

app.get("/mcp", cors, checkAuth, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId)!.transport.handleRequest(req, res);
    return;
  }
  res.status(400).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Bad Request: Mcp-Session-Id header is required" },
    id: null,
  });
});

app.delete("/mcp", cors, checkAuth, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    const s = sessions.get(sessionId)!;
    await s.transport.close();
    await s.server.close();
    sessions.delete(sessionId);
  }
  res.status(200).json({ ok: true });
});

app.get("/.well-known/oauth-authorization-server", cors, (_, res) => {
  res.json({
    issuer: MCP_BASE_URL,
    authorization_endpoint: `${MCP_BASE_URL}/authorize`,
    token_endpoint: `${MCP_BASE_URL}/token`,
    registration_endpoint: `${MCP_BASE_URL}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256", "plain"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
  });
});

app.get("/.well-known/oauth-protected-resource", cors, (_, res) => {
  res.json({
    resource: `${MCP_BASE_URL}/mcp`,
    authorization_servers: [MCP_BASE_URL],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
    resource_documentation: `${MCP_BASE_URL}/mcp`,
  });
});

app.get("/.well-known/oauth-protected-resource/mcp", cors, (_, res) => {
  res.json({
    resource: `${MCP_BASE_URL}/mcp`,
    authorization_servers: [MCP_BASE_URL],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
    resource_documentation: `${MCP_BASE_URL}/mcp`,
  });
});

app.post("/register", cors, (req, res) => {
  const clientName = req.body?.client_name || "mcp-client";
  const redirectUris: string[] = Array.isArray(req.body?.redirect_uris) ? req.body.redirect_uris : [];
  const clientId = `${clientName.replace(/[^a-zA-Z0-9_-]/g, "")}_${crypto.randomBytes(8).toString("hex")}`;
  saveClient(clientId, clientName, redirectUris);
  res.json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  });
});

app.get("/authorize", (req, res) => {
  const { response_type, client_id, redirect_uri, code_challenge, code_challenge_method, state } =
    req.query as Record<string, string>;
  if (response_type !== "code" || !redirect_uri) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html><html><head><title>Authorize — Papa Life MCP</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0}.card{background:#1e293b;border-radius:16px;padding:2.5rem;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.4);text-align:center}h2{color:#93c5fd;margin-top:0}.app{color:#a5b4fc;font-weight:600}button{padding:12px 32px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;margin:.5rem;font-weight:600}.approve{background:#2563eb;color:#fff}.deny{background:#334155;color:#94a3b8}</style>
</head><body><div class="card">
<h2>Papa Life MCP</h2>
<p><span class="app">${client_id || "MCP Client"}</span> wants to connect to Papa Life tools.</p>
<p>Approve to allow access to strategist intake and engagement tools.</p>
<form method="POST">
<input type="hidden" name="client_id" value="${client_id || ""}">
<input type="hidden" name="redirect_uri" value="${redirect_uri || ""}">
<input type="hidden" name="code_challenge" value="${code_challenge || ""}">
<input type="hidden" name="code_challenge_method" value="${code_challenge_method || "S256"}">
<input type="hidden" name="state" value="${state || ""}">
<button type="submit" name="action" value="approve" class="approve">Approve</button>
<button type="submit" name="action" value="deny" class="deny">Deny</button>
</form></div></body></html>`);
});

app.post("/authorize", (req, res) => {
  const { action, client_id, redirect_uri, code_challenge, code_challenge_method, state } = req.body;
  if (action === "deny" || !redirect_uri) {
    const sep = redirect_uri?.includes("?") ? "&" : "?";
    res.redirect(
      `${redirect_uri}${sep}error=access_denied${state ? `&state=${encodeURIComponent(state)}` : ""}`
    );
    return;
  }
  const code = crypto.randomBytes(32).toString("base64url");
  saveCode(code, client_id || "", redirect_uri, code_challenge || "", code_challenge_method || "S256");
  const sep = redirect_uri.includes("?") ? "&" : "?";
  res.redirect(
    `${redirect_uri}${sep}code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ""}`
  );
});

app.post("/token", cors, (req, res) => {
  const grantType = req.body?.grant_type;

  if (grantType === "authorization_code") {
    if (!req.body?.code) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    const stored = takeCode(req.body.code);
    if (!stored) {
      res.status(400).json({ error: "invalid_grant" });
      return;
    }
    if (stored.code_challenge) {
      if (
        !req.body.code_verifier ||
        !verifyPkce(req.body.code_verifier, stored.code_challenge, stored.code_challenge_method)
      ) {
        res.status(400).json({ error: "invalid_grant", error_description: "PKCE failed" });
        return;
      }
    }
    const scope = "mcp";
    const accessToken = issueAccessToken(stored.client_id, scope);
    const refreshToken = issueRefreshToken(stored.client_id, scope);
    res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: OAUTH_ACCESS_TTL_SEC,
      refresh_token: refreshToken,
      scope,
    });
    return;
  }

  if (grantType === "refresh_token") {
    if (!req.body?.refresh_token) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    const consumed = consumeRefreshToken(req.body.refresh_token);
    if (!consumed) {
      res.status(400).json({ error: "invalid_grant" });
      return;
    }
    const accessToken = issueAccessToken(consumed.client_id, consumed.scope);
    const refreshToken = issueRefreshToken(consumed.client_id, consumed.scope);
    res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: OAUTH_ACCESS_TTL_SEC,
      refresh_token: refreshToken,
      scope: consumed.scope,
    });
    return;
  }

  res.status(400).json({ error: "unsupported_grant_type" });
});

app.get("/health", (_, res) => {
  res.json({ ok: true, server: "papalife-mcp", tools: PAPALIFE_MCP_TOOL_DEFINITIONS.length });
});

app.listen(MCP_PORT, "0.0.0.0", () => {
  console.log(`Papalife MCP server running on port ${MCP_PORT}`);
  console.log(`Endpoint: ${MCP_BASE_URL}/mcp`);
});
