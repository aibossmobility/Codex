import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type RequestHandler } from "express";
import session from "express-session";
import Database from "better-sqlite3";
import { ensureExecutiveActionQueueTables } from "./executive-action-queue-store";
import { registerWorkerAssignmentEndpoint } from "./ai-boss-worker-assignment-endpoint";

// No external staging system, credentials, customer data, or production DB:
// this is the SAME HTTP route registration as production, on 127.0.0.1 only.
const db = new Database(":memory:");
db.pragma("foreign_keys=OFF");
ensureExecutiveActionQueueTables(db);
const app = express();
app.use(express.json({ limit: "10kb" }));
app.use(session({ secret: randomUUID(), resave: false, saveUninitialized: false }));
const requireAuth: RequestHandler = (req, res, next) => {
  if ((req.session as any).adminId) return next();
  res.status(401).json({ ok: false, error: "Unauthorized" });
};
// Staging harness only: this route is NOT registered in production.
app.post("/__staging_login", (req, res) => {
  (req.session as any).adminId = 1;
  res.status(204).end();
});
registerWorkerAssignmentEndpoint(app, db, requireAuth);

const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
try {
  const addr = server.address();
  if (!addr || typeof addr === "string") throw Error("Missing loopback port");
  const url = `http://127.0.0.1:${addr.port}`;
  const endpoint = url + "/api/admin/ai-boss/worker-assignments";
  const safe = {
    project: "ai-boss-mobility", role: "seo-website",
    instruction: "Check the AI Boss Mobility website homepage HTTP status",
    request_id: randomUUID(),
  };
  const post = (body: unknown, cookie = "") => fetch(endpoint, {
    method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
  assert.equal((await post(safe)).status, 401, "Unauthenticated request must be rejected");

  const login = await fetch(url + "/__staging_login", { method: "POST" });
  assert.equal(login.status, 204);
  const cookie = login.headers.get("set-cookie")?.split(";")[0] || "";
  assert.ok(cookie.startsWith("connect.sid="), "Staging session required");

  const blocked = [
    { ...safe, role: "ai-boss-mobility-director", instruction: "Restore the Google Workspace email alias" },
    { ...safe, role: "seo-website", instruction: "Check website homepage and deploy a production update" },
    { ...safe, role: "ghl-customer-service", instruction: "Review my GHL contacts and update a record" },
    { ...safe, role: "seo-website", instruction: "Grant owner credentials to website workers" },
  ];
  for (const item of blocked) {
    const response = await post({ ...item, request_id: randomUUID() }, cookie);
    const result = await response.json();
    assert.equal(response.status, 400);
    assert.match(result.error, /Not queued/);
  }
  assert.equal((db.prepare("select count(*) n from executive_actions").get() as any).n, 0);

  const valid = await post(safe, cookie);
  assert.equal(valid.status, 201);
  const accepted = await valid.json() as any;
  assert.equal(accepted.assignment.status, "awaiting_approval");
  assert.equal(accepted.external_ai_cost_micros, 0);
  assert.equal(accepted.assignment.reused, false);

  const duplicate = await post(safe, cookie);
  assert.equal(duplicate.status, 201);
  const duplicateJson = await duplicate.json() as any;
  assert.equal(duplicateJson.assignment.reused, true);
  assert.equal(duplicateJson.assignment.id, accepted.assignment.id);
  assert.equal((db.prepare("select count(*) n from executive_actions").get() as any).n, 1);
  const row = db.prepare("select approval_required,target_ref,action_type,estimated_external_ai_cost_micros,status from executive_actions").get() as any;
  assert.equal(row.approval_required, 1);
  assert.equal(row.target_ref, "agent-team-readonly");
  assert.equal(row.action_type, "search");
  assert.equal(row.estimated_external_ai_cost_micros, 0);
  assert.equal(row.status, "awaiting_approval");

  console.log(JSON.stringify({
    result: "PASS", environment: "isolated HTTP staging harness on 127.0.0.1",
    auth: "401 without session", rejected_unsupported: blocked.length,
    valid_http_status: 201, approved_automatically: false,
    idempotent: true, queued_rows: 1, external_cost_micros: 0,
    production_writes: 0,
  }));
} finally {
  await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  db.close();
}
