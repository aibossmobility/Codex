// server/ai-boss-gmail-connector.ts
import http from "node:http";
var DEFAULT_PORT = 8788;
var MAX_REQUEST_BYTES = 128e3;
function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
function base64Url(input) {
  return Buffer.from(input, "utf8").toString("base64url");
}
function headerValue(headers = [], name) {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || "";
}
async function getAccessToken(fetchImpl) {
  const body = new URLSearchParams({
    client_id: requiredEnv("AI_BOSS_GMAIL_CLIENT_ID"),
    client_secret: requiredEnv("AI_BOSS_GMAIL_CLIENT_SECRET"),
    refresh_token: requiredEnv("AI_BOSS_GMAIL_REFRESH_TOKEN"),
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
async function gmailFetch(fetchImpl, accessToken, path, init = {}) {
  const response = await fetchImpl(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    ...init,
    headers: {
      ...init.headers || {},
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Gmail API ${response.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : null;
}
function buildMessage(to, subject, body, replyHeaders) {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8"
  ];
  if (replyHeaders?.messageId) headers.push(`In-Reply-To: ${replyHeaders.messageId}`);
  if (replyHeaders?.references) headers.push(`References: ${replyHeaders.references}`);
  return base64Url(`${headers.join("\r\n")}\r
\r
${body}`);
}
async function executeGmailConnectorAction(action, fetchImpl = fetch) {
  if (!["read", "search", "send"].includes(String(action.operation))) {
    throw new Error(`Unsupported Gmail operation: ${String(action.operation)}`);
  }
  const accessToken = await getAccessToken(fetchImpl);
  if (action.operation === "search") {
    const query = String(action.target_ref || "").replace(/^query:/, "").trim();
    return gmailFetch(fetchImpl, accessToken, `messages?q=${encodeURIComponent(query)}&maxResults=50`);
  }
  if (action.operation === "read") {
    const id = String(action.target_ref || "").replace(/^message:/, "").trim();
    if (!id) throw new Error("Gmail read requires a message id.");
    return gmailFetch(fetchImpl, accessToken, `messages/${encodeURIComponent(id)}?format=full`);
  }
  const payload = action.action_payload || {};
  const body = String(payload.body || "");
  if (!body) throw new Error("Gmail send requires a body.");
  const replyMessageId = String(payload.message_id || "").trim();
  if (replyMessageId) {
    const original = await gmailFetch(
      fetchImpl,
      accessToken,
      `messages/${encodeURIComponent(replyMessageId)}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References&metadataHeaders=Subject&metadataHeaders=From`
    );
    const headers = original?.payload?.headers || [];
    const to2 = headerValue(headers, "From");
    const subjectRaw = headerValue(headers, "Subject") || "Reply";
    const subject2 = /^re:/i.test(subjectRaw) ? subjectRaw : `Re: ${subjectRaw}`;
    const messageId = headerValue(headers, "Message-ID");
    const references = [headerValue(headers, "References"), messageId].filter(Boolean).join(" ");
    const raw2 = buildMessage(to2, subject2, body, { messageId, references });
    return gmailFetch(fetchImpl, accessToken, "messages/send", {
      method: "POST",
      body: JSON.stringify({ raw: raw2, threadId: original.threadId })
    });
  }
  const to = String(payload.to || "").trim();
  const subject = String(payload.subject || "").trim();
  if (!to || !subject) throw new Error("Gmail send requires to, subject, and body.");
  const raw = buildMessage(to, subject, body);
  return gmailFetch(fetchImpl, accessToken, "messages/send", {
    method: "POST",
    body: JSON.stringify({ raw })
  });
}
function connectorToken() {
  return requiredEnv("AI_BOSS_GMAIL_CONNECTOR_TOKEN");
}
function createGmailConnectorServer() {
  return http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/gmail") {
      res.writeHead(404).end("Not found");
      return;
    }
    let expectedToken = "";
    try {
      expectedToken = connectorToken();
    } catch {
      res.writeHead(503).end("Connector not configured");
      return;
    }
    if (req.headers.authorization !== `Bearer ${expectedToken}`) {
      res.writeHead(401).end("Unauthorized");
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
        const result = await executeGmailConnectorAction(action);
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: message }));
      }
    });
  });
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.AI_BOSS_GMAIL_CONNECTOR_PORT || DEFAULT_PORT);
  createGmailConnectorServer().listen(port, "127.0.0.1", () => {
    console.log(`AI Boss Gmail connector listening on http://127.0.0.1:${port}/gmail`);
  });
}
export {
  createGmailConnectorServer,
  executeGmailConnectorAction
};
