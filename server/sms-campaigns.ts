import type { NextFunction, Request, Response } from "express";
import type { Express } from "express";
import type Database from "better-sqlite3";
import { resolveGhlCredentials } from "./ghl-integration-store";
import { ghlNurtureSmsSend, ghlUpsertContactWithTags } from "./ghl-api";

export function ensureSmsCampaignTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sms_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      body_template TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sms_campaign_recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      phone_e164 TEXT NOT NULL,
      personalized_body TEXT NOT NULL,
      send_status TEXT NOT NULL DEFAULT 'pending',
      twilio_sid TEXT,
      error TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(campaign_id, lead_id)
    );

    CREATE INDEX IF NOT EXISTS idx_sms_recipients_campaign_status
      ON sms_campaign_recipients(campaign_id, send_status);
  `);
}

export function ghlSmsConfigured(db: Database.Database): boolean {
  const creds = resolveGhlCredentials(db);
  return Boolean(creds?.token && creds?.locationId);
}

/** US-focused: 10 digits -> +1…; 11 starting with 1 -> +…; other E.164 if already + */
export function normalizeToE164(raw: string): string | null {
  const t = raw.trim();
  if (t.startsWith("+")) {
    const rest = t.slice(1).replace(/\D/g, "");
    if (rest.length >= 10 && rest.length <= 15) return `+${rest}`;
    return null;
  }
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}

function personalizeBody(
  template: string,
  row: { first_name: string; last_name: string; business_name: string | null }
) {
  return template
    .replace(/\{\{\s*first_name\s*\}\}/gi, row.first_name || "")
    .replace(/\{\{\s*last_name\s*\}\}/gi, row.last_name || "")
    .replace(/\{\{\s*business_name\s*\}\}/gi, row.business_name || "");
}

type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;

export function registerSmsCampaignRoutes(
  app: Express,
  db: Database.Database,
  requireAuth: RequestHandler
) {
  ensureSmsCampaignTables(db);

  app.get("/api/sms/provider-status", requireAuth, (_req, res) => {
    const creds = resolveGhlCredentials(db);
    res.json({
      configured: Boolean(creds?.token && creds?.locationId),
      provider: "gohighlevel",
      credential_source: creds?.source || null,
      location_configured: Boolean(creds?.locationId),
    });
  });

  app.get("/api/sms/campaigns", requireAuth, (_req, res) => {
    const rows = db
      .prepare(
        `SELECT c.*,
          (SELECT COUNT(*) FROM sms_campaign_recipients r WHERE r.campaign_id = c.id) AS recipient_count,
          (SELECT COUNT(*) FROM sms_campaign_recipients r WHERE r.campaign_id = c.id AND r.send_status = 'sent') AS sent_count,
          (SELECT COUNT(*) FROM sms_campaign_recipients r WHERE r.campaign_id = c.id AND r.send_status = 'failed') AS failed_count,
          (SELECT COUNT(*) FROM sms_campaign_recipients r WHERE r.campaign_id = c.id AND r.send_status = 'pending') AS pending_count
        FROM sms_campaigns c
        ORDER BY c.created_at DESC`
      )
      .all();
    res.json(rows);
  });

  app.post("/api/sms/campaigns", requireAuth, (req, res) => {
    const name = String(req.body?.name ?? "").trim();
    const body_template = String(req.body?.body_template ?? "").trim();
    if (!name || !body_template) {
      return res.status(400).json({ ok: false, error: "name and body_template required" });
    }
    const ins = db
      .prepare(
        `INSERT INTO sms_campaigns (name, body_template, status) VALUES (?, ?, 'draft')`
      )
      .run(name, body_template);
    res.json({ ok: true, id: ins.lastInsertRowid });
  });

  app.patch("/api/sms/campaigns/:id", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare("SELECT status FROM sms_campaigns WHERE id = ?").get(id) as { status: string } | undefined;
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    if (row.status !== "draft") {
      return res.status(400).json({ ok: false, error: "Only draft campaigns can be edited" });
    }
    const name = req.body?.name != null ? String(req.body.name).trim() : null;
    const body_template = req.body?.body_template != null ? String(req.body.body_template).trim() : null;
    if (!name && !body_template) return res.status(400).json({ ok: false, error: "Nothing to update" });
    const cur = db.prepare("SELECT name, body_template FROM sms_campaigns WHERE id = ?").get(id) as {
      name: string;
      body_template: string;
    };
    db.prepare(
      `UPDATE sms_campaigns SET name = ?, body_template = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(name || cur.name, body_template || cur.body_template, id);
    res.json({ ok: true });
  });

  app.delete("/api/sms/campaigns/:id", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const sent = (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM sms_campaign_recipients WHERE campaign_id = ? AND send_status = 'sent'`
        )
        .get(id) as { c: number }
    ).c;
    if (sent > 0) {
      return res.status(400).json({ ok: false, error: "Cannot delete a campaign that already has sends" });
    }
    db.prepare("DELETE FROM sms_campaigns WHERE id = ?").run(id);
    res.json({ ok: true });
  });

  app.get("/api/sms/campaigns/:id/recipients", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const rows = db
      .prepare(
        `SELECT r.*, l.first_name, l.last_name, l.business_email
         FROM sms_campaign_recipients r
         JOIN leads l ON l.id = r.lead_id
         WHERE r.campaign_id = ?
         ORDER BY r.id DESC
         LIMIT ?`
      )
      .all(id, limit);
    res.json(rows);
  });

  app.post("/api/sms/campaigns/:id/build-audience", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const camp = db.prepare("SELECT * FROM sms_campaigns WHERE id = ?").get(id) as
      | { id: number; body_template: string; status: string }
      | undefined;
    if (!camp) return res.status(404).json({ ok: false, error: "Campaign not found" });
    if (camp.status !== "draft" && camp.status !== "ready") {
      return res.status(400).json({ ok: false, error: "Audience can only be built for draft or ready campaigns" });
    }
    const sentCount = (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM sms_campaign_recipients WHERE campaign_id = ? AND send_status = 'sent'`
        )
        .get(id) as { c: number }
    ).c;
    if (sentCount > 0) {
      return res.status(400).json({ ok: false, error: "Campaign already has sent messages; create a new campaign" });
    }

    db.prepare("DELETE FROM sms_campaign_recipients WHERE campaign_id = ?").run(id);

    const leads = db
      .prepare(
        `SELECT id, first_name, last_name, business_name, mobile_phone
         FROM leads
         WHERE consent_marketing = 1`
      )
      .all() as {
      id: number;
      first_name: string;
      last_name: string;
      business_name: string | null;
      mobile_phone: string;
    }[];

    const ins = db.prepare(
      `INSERT INTO sms_campaign_recipients (campaign_id, lead_id, phone_e164, personalized_body, send_status)
       VALUES (?, ?, ?, ?, 'pending')`
    );
    let added = 0;
    let skipped = 0;
    for (const L of leads) {
      const phone = normalizeToE164(L.mobile_phone);
      if (!phone) {
        skipped++;
        continue;
      }
      const personalized_body = personalizeBody(camp.body_template, L);
      try {
        ins.run(id, L.id, phone, personalized_body);
        added++;
      } catch {
        skipped++;
      }
    }

    db.prepare(`UPDATE sms_campaigns SET status = 'ready', updated_at = datetime('now') WHERE id = ?`).run(id);
    res.json({ ok: true, added, skipped, total_leads_marketing: leads.length });
  });

  app.post("/api/sms/campaigns/:id/send-batch", requireAuth, async (req, res) => {
    const ghlCredentials = resolveGhlCredentials(db);
    if (!ghlCredentials?.token || !ghlCredentials.locationId) {
      return res.status(503).json({
        ok: false,
        error: "GoHighLevel SMS is not configured. Save the Private Integration token and Location ID under CRM → Settings.",
      });
    }
    const id = Number(req.params.id);
    const limit = Math.min(Math.max(Number(req.body?.limit) || 20, 1), 50);
    const camp = db.prepare("SELECT id, status FROM sms_campaigns WHERE id = ?").get(id) as
      | { id: number; status: string }
      | undefined;
    if (!camp) return res.status(404).json({ ok: false, error: "Campaign not found" });
    if (camp.status !== "ready" && camp.status !== "sending") {
      return res
        .status(400)
        .json({ ok: false, error: "Build audience first (campaign must be ready or sending)" });
    }

    const pending = db
      .prepare(
        `SELECT r.id, r.phone_e164, r.personalized_body,
                l.first_name, l.last_name, l.business_email
         FROM sms_campaign_recipients r
         JOIN leads l ON l.id = r.lead_id
         WHERE r.campaign_id = ? AND r.send_status = 'pending'
         ORDER BY r.id ASC
         LIMIT ?`
      )
      .all(id, limit) as {
        id: number;
        phone_e164: string;
        personalized_body: string;
        first_name: string;
        last_name: string;
        business_email: string;
      }[];

    if (pending.length === 0) {
      db.prepare(`UPDATE sms_campaigns SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(
        id
      );
      return res.json({ ok: true, sent: 0, failed: 0, remaining: 0, completed: true });
    }

    db.prepare(`UPDATE sms_campaigns SET status = 'sending', updated_at = datetime('now') WHERE id = ?`).run(id);

    const updSent = db.prepare(
      `UPDATE sms_campaign_recipients SET send_status = 'sent', twilio_sid = ?, sent_at = datetime('now') WHERE id = ?`
    );
    const updFail = db.prepare(
      `UPDATE sms_campaign_recipients SET send_status = 'failed', error = ? WHERE id = ?`
    );

    let sent = 0;
    let failed = 0;
    for (const row of pending) {
      const contactResult = await ghlUpsertContactWithTags(
        {
          firstName: row.first_name,
          lastName: row.last_name || undefined,
          email: row.business_email,
          phone: row.phone_e164,
          tags: ["ai_boss_sms_campaign"],
        },
        ghlCredentials
      );
      if (!contactResult.ok) {
        updFail.run(`GHL contact sync failed: ${contactResult.error}`, row.id);
        failed++;
        continue;
      }

      const contactId = String(contactResult.data.contact_id || "").trim();
      if (!contactId) {
        updFail.run("GHL contact sync returned no contact ID", row.id);
        failed++;
        continue;
      }

      const result = await ghlNurtureSmsSend(
        { ghl_contact_id: contactId, body: row.personalized_body },
        ghlCredentials
      );
      if (result.ok) {
        const providerId = String(
          (result.data.ghl as Record<string, unknown> | undefined)?.messageId ||
          (result.data.ghl as Record<string, unknown> | undefined)?.id ||
          contactId
        );
        updSent.run(providerId, row.id);
        sent++;
      } else {
        updFail.run(result.error, row.id);
        failed++;
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    const remaining = (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM sms_campaign_recipients WHERE campaign_id = ? AND send_status = 'pending'`
        )
        .get(id) as { c: number }
    ).c;
    if (remaining === 0) {
      db.prepare(`UPDATE sms_campaigns SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(
        id
      );
    }

    res.json({ ok: true, sent, failed, remaining, completed: remaining === 0 });
  });
}
