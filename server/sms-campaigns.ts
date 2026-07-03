import type { NextFunction, Request, Response } from "express";
import type { Express } from "express";
import type Database from "better-sqlite3";

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

export function twilioEnvConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  const ms = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  return !!(sid && token && (from || ms));
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

async function twilioSendSms(to: string, body: string): Promise<{ sid: string } | { error: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!sid || !token) return { error: "Twilio credentials missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)" };
  if (!messagingServiceSid && !fromNumber) {
    return { error: "Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER" };
  }
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const form = new URLSearchParams();
  form.set("To", to);
  if (messagingServiceSid) form.set("MessagingServiceSid", messagingServiceSid);
  else form.set("From", fromNumber!);
  form.set("Body", body.slice(0, 1600));
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const j = (await r.json()) as { sid?: string; message?: string; code?: number };
  if (!r.ok) return { error: j.message || `Twilio HTTP ${r.status}` };
  if (!j.sid) return { error: "Twilio returned no SID" };
  return { sid: j.sid };
}

type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;

export function registerSmsCampaignRoutes(
  app: Express,
  db: Database.Database,
  requireAuth: RequestHandler
) {
  ensureSmsCampaignTables(db);

  app.get("/api/sms/twilio-status", requireAuth, (_req, res) => {
    res.json({ configured: twilioEnvConfigured() });
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
    if (!twilioEnvConfigured()) {
      return res.status(503).json({
        ok: false,
        error:
          "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER on the server.",
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
        `SELECT id, phone_e164, personalized_body FROM sms_campaign_recipients
         WHERE campaign_id = ? AND send_status = 'pending'
         ORDER BY id ASC
         LIMIT ?`
      )
      .all(id, limit) as { id: number; phone_e164: string; personalized_body: string }[];

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
      const result = await twilioSendSms(row.phone_e164, row.personalized_body);
      if ("sid" in result) {
        updSent.run(result.sid, row.id);
        sent++;
      } else {
        updFail.run(result.error, row.id);
        failed++;
      }
      await new Promise((r) => setTimeout(r, 120));
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
