import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import Database from "better-sqlite3";
import { ensureExecutiveActionQueueTables } from "./executive-action-queue-store";
import { papaTwinReviewIntakeRoute } from "./papa-twin-review-intake";

const db = new Database(":memory:");
db.pragma("foreign_keys=OFF");
ensureExecutiveActionQueueTables(db);
const app = express();
app.use(express.json({ limit: "2kb" }));
app.post("/api/papa-life/twin/review-request", papaTwinReviewIntakeRoute(db));
const server = createServer(app);
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address !== "string");
const endpoint = `http://127.0.0.1:${address.port}/api/papa-life/twin/review-request`;
const previousEnabled = process.env.PAPA_TWIN_REVIEW_INTAKE_ENABLED;
const previousToken = process.env.PAPA_TWIN_REVIEW_INTAKE_TOKEN;
const token = "dryrun-".repeat(10);
const request = async (body: unknown, auth?: string) =>
  fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...(auth ? { authorization: "Bearer " + auth } : {}) },
    body: JSON.stringify(body),
  });
try {
  process.env.PAPA_TWIN_REVIEW_INTAKE_ENABLED = "false";
  process.env.PAPA_TWIN_REVIEW_INTAKE_TOKEN = token;
  assert.equal((await request({task:"papa_public_website_audit"},token)).status,503);
  process.env.PAPA_TWIN_REVIEW_INTAKE_ENABLED = "true";
  assert.equal((await request({task:"papa_public_website_audit"})).status,401);
  assert.equal((await request({task:"papa_public_website_audit"},"invalid")).status,401);
  assert.equal((await request({task:"papa_public_website_audit",execute:true},token)).status,400);
  const response = await request({task:"papa_public_website_audit"},token);
  assert.equal(response.status,202);
  assert.equal((await response.json() as any).status,"awaiting_approval");
  const record = db.prepare("SELECT * FROM executive_actions").get() as any;
  assert.equal(record.approval_required,1);
  assert.equal(record.status,"awaiting_approval");
  assert.equal(record.project_key,"papa-life");
  assert.equal(record.estimated_external_ai_cost_micros,0);
  assert.equal((await request({task:"papa_public_website_audit"},token)).status,202);
  assert.equal((await request({task:"papa_public_website_audit"},token)).status,202);
  assert.equal((await request({task:"papa_public_website_audit"},token)).status,429);
  console.log("PASS: Local HTTP integration denies disabled/anonymous/wrong scope; only queues approval-only audits");
} finally {
  if(previousEnabled === undefined)delete process.env.PAPA_TWIN_REVIEW_INTAKE_ENABLED;
  else process.env.PAPA_TWIN_REVIEW_INTAKE_ENABLED=previousEnabled;
  if(previousToken === undefined)delete process.env.PAPA_TWIN_REVIEW_INTAKE_TOKEN;
  else process.env.PAPA_TWIN_REVIEW_INTAKE_TOKEN=previousToken;
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  db.close();
}
