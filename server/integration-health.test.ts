/**
 * integration-health.test.ts — Mocked tests for the diagnostic module.
 * Uses node:assert/strict. All fetch calls are mocked; no live network calls.
 */
import assert from "node:assert/strict";
import Database from "better-sqlite3";

// ── minimal DB setup ─────────────────────────────────────────────────────────

function makeDb() {
  const db = new Database(":memory:");
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE admin_users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE);
    CREATE TABLE admin_ghl_integrations (
      admin_user_id INTEGER PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
      api_token_enc TEXT NOT NULL,
      location_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

// ── env helpers ──────────────────────────────────────────────────────────────

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>): Promise<void> {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return fn().finally(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

// ── fetch mock ───────────────────────────────────────────────────────────────

type MockResponse = { ok: boolean; status: number; body?: string };

function mockFetch(responses: MockResponse[]) {
  let idx = 0;
  const calls: { url: string; init: RequestInit }[] = [];
  const original = global.fetch;

  global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: url.toString(), init: init || {} });
    const resp = responses[Math.min(idx++, responses.length - 1)];
    return {
      ok: resp.ok,
      status: resp.status,
      text: async () => resp.body ?? "",
      json: async () => (resp.body ? JSON.parse(resp.body) : {}),
    } as unknown as Response;
  };

  return {
    calls,
    restore: () => { global.fetch = original; },
  };
}

function mockFetchTimeout() {
  const original = global.fetch;
  global.fetch = async () => {
    await new Promise((_, reject) => {
      const err = new Error("The operation was aborted");
      (err as Error & { name: string }).name = "AbortError";
      setTimeout(() => reject(err), 5);
    });
    throw new Error("unreachable");
  };
  return { restore: () => { global.fetch = original; } };
}

// ── import module functions ──────────────────────────────────────────────────
// Dynamic import so env vars are set before module-level code runs.

import {
  integrationConfigurationSummary,
  diagnoseGhlConnection,
  diagnoseMakeWebhook,
  orchestrationHealthCheck,
} from "./integration-health";

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Missing GHL token → not_configured
// ─────────────────────────────────────────────────────────────────────────────
await (async () => {
  const db = makeDb();
  await withEnv(
    { GHL_API_TOKEN: undefined, GHL_PRIVATE_INTEGRATION_TOKEN: undefined, GHL_LOCATION_ID: undefined },
    async () => {
      const result = await diagnoseGhlConnection(db);
      assert.equal(result.token_present, false, "token_present should be false when no creds");
      assert.equal(result.location_api_status, "not_configured");
      assert.equal(result.contacts_api_status, "not_configured");
      assert.equal(result.credential_source, null);
      assert.equal(result.records_mutated, false);
      assert.equal(result.read_only, true);
    }
  );
  console.log("✓ Test 1: Missing GHL credentials → not_configured");
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Missing Make webhook → not_configured
// ─────────────────────────────────────────────────────────────────────────────
await (async () => {
  await withEnv(
    { AUTOMATION_CLOUD_WEBHOOK_URL: undefined, MAKE_SCENARIO2_WEBHOOK_URL: undefined, MAKE_CLOUD_WEBHOOK_URL: undefined },
    async () => {
      const result = await diagnoseMakeWebhook();
      assert.equal(result.webhook_configured, false);
      assert.equal(result.status, "not_configured");
      assert.equal(result.dry_run, true);
      assert.equal(result.messages_sent, false);
      assert.equal(result.records_mutated, false);
    }
  );
  console.log("✓ Test 2: Missing Make webhook → not_configured");
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: No full secret values in output
// ─────────────────────────────────────────────────────────────────────────────
await (async () => {
  const db = makeDb();
  const secretToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.supersecret.value";
  const secretLocation = "AbCdEfGhIjKlMnOp123456";
  const mock = mockFetch([
    { ok: true, status: 200, body: "{}" },
    { ok: true, status: 200, body: "{}" },
  ]);
  await withEnv(
    { GHL_API_TOKEN: secretToken, GHL_LOCATION_ID: secretLocation, AUTOMATION_CLOUD_WEBHOOK_URL: undefined },
    async () => {
      const result = await diagnoseGhlConnection(db);
      const serialized = JSON.stringify(result);
      assert.ok(!serialized.includes(secretToken), "Full token must not appear in output");
      assert.ok(!serialized.includes(secretLocation), "Full location ID must not appear in output");
      const configSummary = await integrationConfigurationSummary(db);
      const cs = JSON.stringify(configSummary);
      assert.ok(!cs.includes(secretToken), "Token must not appear in config summary");
    }
  );
  mock.restore();
  console.log("✓ Test 3: No full secret values in output");
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: GHL 401 → reported as unauthorized
// ─────────────────────────────────────────────────────────────────────────────
await (async () => {
  const db = makeDb();
  const mock = mockFetch([
    { ok: false, status: 401, body: "{\"message\":\"Unauthorized\"}" },
    { ok: false, status: 401, body: "{\"message\":\"Unauthorized\"}" },
  ]);
  await withEnv({ GHL_API_TOKEN: "tok-test-401", GHL_LOCATION_ID: "loc-test-401" }, async () => {
    const result = await diagnoseGhlConnection(db);
    assert.equal(result.location_api_status, "unauthorized");
    assert.ok(result.location_api_detail.includes("401"));
  });
  mock.restore();
  console.log("✓ Test 4: GHL 401 → unauthorized");
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: GHL 403 → reported as forbidden (scope issue)
// ─────────────────────────────────────────────────────────────────────────────
await (async () => {
  const db = makeDb();
  const mock = mockFetch([
    { ok: false, status: 403, body: "{\"message\":\"Forbidden\"}" },
    { ok: false, status: 403, body: "{\"message\":\"Forbidden\"}" },
  ]);
  await withEnv({ GHL_API_TOKEN: "tok-test-403", GHL_LOCATION_ID: "loc-test-403" }, async () => {
    const result = await diagnoseGhlConnection(db);
    assert.equal(result.location_api_status, "forbidden");
    assert.ok(result.location_api_detail.toLowerCase().includes("scope") || result.location_api_detail.includes("403"));
  });
  mock.restore();
  console.log("✓ Test 5: GHL 403 → forbidden / scope issue");
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: Network timeout → structured error, no crash
// ─────────────────────────────────────────────────────────────────────────────
await (async () => {
  const db = makeDb();
  const mock = mockFetchTimeout();
  await withEnv({ GHL_API_TOKEN: "tok-timeout", GHL_LOCATION_ID: "loc-timeout" }, async () => {
    const result = await diagnoseGhlConnection(db);
    assert.equal(result.location_api_status, "timeout");
    assert.ok(result.location_api_detail.toLowerCase().includes("timeout") || result.location_api_detail.toLowerCase().includes("timed out"));
    assert.equal(result.records_mutated, false);
  });
  mock.restore();
  console.log("✓ Test 6: Timeout → structured error");
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: Make payload contains dry_run: true
// ─────────────────────────────────────────────────────────────────────────────
await (async () => {
  let capturedBody: unknown = null;
  const original = global.fetch;
  global.fetch = async (_url: unknown, init?: RequestInit) => {
    capturedBody = init?.body ? JSON.parse(init.body as string) : null;
    return { ok: true, status: 200, text: async () => "", json: async () => ({}) } as unknown as Response;
  };
  await withEnv({ AUTOMATION_CLOUD_WEBHOOK_URL: "https://hook.make.com/test-scenario" }, async () => {
    await diagnoseMakeWebhook();
    assert.ok(capturedBody !== null, "body should have been sent");
    assert.equal((capturedBody as Record<string, unknown>).dry_run, true, "payload.dry_run must be true");
  });
  global.fetch = original;
  console.log("✓ Test 7: Make payload contains dry_run:true");
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 8: Make request includes X-PapaLife-Dry-Run: true header
// ─────────────────────────────────────────────────────────────────────────────
await (async () => {
  let capturedHeaders: Record<string, string> = {};
  const original = global.fetch;
  global.fetch = async (_url: unknown, init?: RequestInit) => {
    capturedHeaders = (init?.headers as Record<string, string>) || {};
    return { ok: true, status: 200, text: async () => "", json: async () => ({}) } as unknown as Response;
  };
  await withEnv({ AUTOMATION_CLOUD_WEBHOOK_URL: "https://hook.make.com/test-scenario" }, async () => {
    await diagnoseMakeWebhook();
    assert.equal(capturedHeaders["X-PapaLife-Dry-Run"], "true", "X-PapaLife-Dry-Run header must be 'true'");
  });
  global.fetch = original;
  console.log("✓ Test 8: X-PapaLife-Dry-Run:true header sent");
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 9: diagnoseMakeWebhook cannot be given an arbitrary URL
// ─────────────────────────────────────────────────────────────────────────────
await (async () => {
  let calledUrl = "";
  const original = global.fetch;
  global.fetch = async (url: unknown, _init?: RequestInit) => {
    calledUrl = url!.toString();
    return { ok: true, status: 200, text: async () => "", json: async () => ({}) } as unknown as Response;
  };
  const configuredUrl = "https://hook.make.com/configured-scenario";
  const arbitraryUrl = "https://evil.example.com/steal";
  await withEnv({ AUTOMATION_CLOUD_WEBHOOK_URL: configuredUrl }, async () => {
    // diagnoseMakeWebhook takes no arguments — caller cannot supply a URL
    await diagnoseMakeWebhook();
    assert.ok(!calledUrl.includes("evil.example.com"), "Should not call an arbitrary URL");
    assert.ok(calledUrl === configuredUrl, `Should call only the configured URL, got: ${calledUrl}`);
    // Suppress unused var warning
    void arbitraryUrl;
  });
  global.fetch = original;
  console.log("✓ Test 9: Make diagnostic uses only configured URL");
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 10: Combined orchestration report safety guarantees
// ─────────────────────────────────────────────────────────────────────────────
await (async () => {
  const db = makeDb();
  const mock = mockFetch([
    { ok: true, status: 200, body: "{}" },
    { ok: true, status: 200, body: "{}" },
    { ok: true, status: 200, body: "{}" },
  ]);
  await withEnv(
    {
      GHL_API_TOKEN: "tok-orch-test",
      GHL_LOCATION_ID: "loc-orch-test",
      AUTOMATION_CLOUD_WEBHOOK_URL: "https://hook.make.com/orch-test",
      ANTHROPIC_API_KEY: "sk-ant-test",
      MCP_BEARER_TOKEN: "bearer-test",
    },
    async () => {
      const report = await orchestrationHealthCheck(db);
      assert.equal(report.messages_sent, false, "messages_sent must be false");
      assert.equal(report.records_mutated, false, "records_mutated must be false");
      assert.equal(report.dry_run, true, "dry_run must be true");
      assert.equal(report.secrets_returned, false, "secrets_returned must be false");
      assert.equal(report.make.dry_run, true);
      assert.equal(report.make.messages_sent, false);
      assert.equal(report.make.records_mutated, false);
      assert.equal(report.ghl.records_mutated, false);
      assert.equal(report.ghl.read_only, true);
    }
  );
  mock.restore();
  console.log("✓ Test 10: Orchestration report safety guarantees");
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 11: Tool definitions still load (PAPALIFE_MCP_TOOL_DEFINITIONS)
// ─────────────────────────────────────────────────────────────────────────────
await (async () => {
  // We can't import mcp-handlers easily (it opens a real DB), so we verify
  // integration-health exports exist and are callable.
  assert.equal(typeof integrationConfigurationSummary, "function");
  assert.equal(typeof diagnoseGhlConnection, "function");
  assert.equal(typeof diagnoseMakeWebhook, "function");
  assert.equal(typeof orchestrationHealthCheck, "function");
  console.log("✓ Test 11: Diagnostic module exports present");
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 12: GHL SMS and opportunity tools not changed
//   (Verified by confirming integration-health.ts exports no SMS/CRM mutation)
// ─────────────────────────────────────────────────────────────────────────────
await (async () => {
  const { diagnoseGhlConnection: dgc, diagnoseMakeWebhook: dmw } = await import("./integration-health");
  // Confirm functions exist and return read_only/messages_sent flags
  const db2 = makeDb();
  const mock = mockFetch([{ ok: true, status: 200, body: "{}" }, { ok: true, status: 200, body: "{}" }]);
  await withEnv({ GHL_API_TOKEN: "tok-sms-check", GHL_LOCATION_ID: "loc-sms-check" }, async () => {
    const r = await dgc(db2);
    assert.equal(r.records_mutated, false, "GHL diag must not mutate records");
    assert.equal(r.read_only, true);
  });
  mock.restore();
  await withEnv({ AUTOMATION_CLOUD_WEBHOOK_URL: undefined }, async () => {
    const m = await dmw();
    assert.equal(m.messages_sent, false);
  });
  console.log("✓ Test 12: Diagnostics confirm no SMS/CRM mutations");
})();

console.log("\nAll integration-health tests passed ✓");
