/**
 * Per-admin Go High Level Private Integration Token (PIT) — stored encrypted in SQLite.
 * Brian saves his key in CRM → Settings; MCP + GHL tools read it without .env edits.
 */
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import crypto from "crypto";

const ALGO = "aes-256-gcm";

export type GhlIntegrationPublic = {
  configured: boolean;
  token_preview: string | null;
  location_id: string | null;
  updated_at: string | null;
  source: "dashboard" | "env" | null;
};

export type GhlCredentials = {
  token: string;
  locationId?: string;
  source: "dashboard" | "env";
};

function encryptionKey(): Buffer {
  const raw =
    process.env.INTEGRATION_ENCRYPTION_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "papalife-integration-key-rotate-in-production";
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const key = encryptionKey();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const key = encryptionKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

function maskToken(token: string): string {
  const t = token.trim();
  if (t.length <= 8) return "••••••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

function envCredentials(): GhlCredentials | null {
  const token =
    process.env.GHL_API_TOKEN?.trim() || process.env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim() || "";
  if (!token) return null;
  const locationId = process.env.GHL_LOCATION_ID?.trim() || undefined;
  return { token, locationId, source: "env" };
}

export function ensureGhlIntegrationTable(db: BetterSqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_ghl_integrations (
      admin_user_id INTEGER PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
      api_token_enc TEXT NOT NULL,
      location_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function getGhlIntegrationPublic(db: BetterSqliteDatabase, adminUserId: number): GhlIntegrationPublic {
  const env = envCredentials();
  if (env) {
    return {
      configured: true,
      token_preview: maskToken(env.token),
      location_id: env.locationId ?? null,
      updated_at: null,
      source: "env",
    };
  }

  const row = db
    .prepare(
      `SELECT api_token_enc, location_id, updated_at
       FROM admin_ghl_integrations WHERE admin_user_id = ?`
    )
    .get(adminUserId) as
    | { api_token_enc: string; location_id: string | null; updated_at: string }
    | undefined;

  if (!row?.api_token_enc) {
    return {
      configured: false,
      token_preview: null,
      location_id: null,
      updated_at: null,
      source: null,
    };
  }

  let preview: string | null = null;
  try {
    preview = maskToken(decrypt(row.api_token_enc));
  } catch {
    preview = "(stored — re-save if tools fail)";
  }

  return {
    configured: true,
    token_preview: preview,
    location_id: row.location_id?.trim() || null,
    updated_at: row.updated_at,
    source: "dashboard",
  };
}

export function saveGhlIntegration(
  db: BetterSqliteDatabase,
  adminUserId: number,
  apiToken: string,
  locationId?: string | null
): GhlIntegrationPublic {
  const token = apiToken.trim();
  if (token.length < 16) {
    throw new Error("API token looks too short — paste the full Private Integration token from GHL");
  }
  const loc = locationId?.trim() || null;
  db.prepare(
    `INSERT INTO admin_ghl_integrations (admin_user_id, api_token_enc, location_id, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(admin_user_id) DO UPDATE SET
       api_token_enc = excluded.api_token_enc,
       location_id = excluded.location_id,
       updated_at = datetime('now')`
  ).run(adminUserId, encrypt(token), loc);
  return getGhlIntegrationPublic(db, adminUserId);
}

export function clearGhlIntegration(db: BetterSqliteDatabase, adminUserId: number): GhlIntegrationPublic {
  db.prepare("DELETE FROM admin_ghl_integrations WHERE admin_user_id = ?").run(adminUserId);
  return getGhlIntegrationPublic(db, adminUserId);
}

export function resolveGhlCredentials(
  db: BetterSqliteDatabase,
  adminUserId?: number
): GhlCredentials | null {
  const env = envCredentials();
  if (env) return env;

  let uid = adminUserId;
  if (uid == null) {
    const row = db
      .prepare("SELECT id FROM admin_users ORDER BY id ASC LIMIT 1")
      .get() as { id: number } | undefined;
    uid = row?.id;
  }
  if (uid == null) return null;

  const stored = db
    .prepare(
      `SELECT api_token_enc, location_id FROM admin_ghl_integrations WHERE admin_user_id = ?`
    )
    .get(uid) as { api_token_enc: string; location_id: string | null } | undefined;

  if (!stored?.api_token_enc) return null;

  try {
    const token = decrypt(stored.api_token_enc);
    return {
      token,
      locationId: stored.location_id?.trim() || undefined,
      source: "dashboard",
    };
  } catch {
    return null;
  }
}