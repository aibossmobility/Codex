import type { Express, Request } from "express";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";

export const MEDIA_AI_CONSENT_VERSION = "2026-09-26-v1";

export function ensureMediaAiConsentTable(db: BetterSqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS media_ai_consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      project_or_purpose TEXT,
      allow_photo INTEGER NOT NULL DEFAULT 0,
      allow_video INTEGER NOT NULL DEFAULT 0,
      allow_voice INTEGER NOT NULL DEFAULT 0,
      allow_name_likeness INTEGER NOT NULL DEFAULT 0,
      allow_testimonial INTEGER NOT NULL DEFAULT 0,
      allow_website_social INTEGER NOT NULL DEFAULT 0,
      allow_education_training INTEGER NOT NULL DEFAULT 0,
      allow_marketing INTEGER NOT NULL DEFAULT 0,
      allow_ai_assisted_editing INTEGER NOT NULL DEFAULT 0,
      consent_all INTEGER NOT NULL DEFAULT 0,
      typed_signature TEXT NOT NULL,
      consent_version TEXT NOT NULL,
      consent_text TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_media_ai_consents_email
      ON media_ai_consents(email, created_at);
  `);
}

function clientIp(req: Request) {
  const forwarded = String(req.headers["x-forwarded-for"] || "");
  return (forwarded.split(",")[0] || req.socket.remoteAddress || "").trim().slice(0, 120);
}

export function registerMediaAiConsentRoutes(app: Express, db: BetterSqliteDatabase) {
  app.post("/api/media-ai-consent", (req, res) => {
    try {
      const body = req.body || {};
      const fullName = String(body.full_name || "").trim().slice(0, 160);
      const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
      const typedSignature = String(body.typed_signature || "").trim().slice(0, 160);
      const consentText = String(body.consent_text || "").trim().slice(0, 5000);
      if (!fullName || !email.includes("@") || !typedSignature || !consentText) {
        return res.status(400).json({ ok: false, error: "Name, valid email, signature, and consent are required." });
      }

      const flags = {
        allow_photo: Boolean(body.allow_photo),
        allow_video: Boolean(body.allow_video),
        allow_voice: Boolean(body.allow_voice),
        allow_name_likeness: Boolean(body.allow_name_likeness),
        allow_testimonial: Boolean(body.allow_testimonial),
        allow_website_social: Boolean(body.allow_website_social),
        allow_education_training: Boolean(body.allow_education_training),
        allow_marketing: Boolean(body.allow_marketing),
        allow_ai_assisted_editing: Boolean(body.allow_ai_assisted_editing),
        consent_all: Boolean(body.consent_all),
      };
      if (!(flags.consent_all || flags.allow_photo || flags.allow_video || flags.allow_voice || flags.allow_name_likeness || flags.allow_testimonial)) {
        return res.status(400).json({ ok: false, error: "Select at least one type of material you permit us to use." });
      }

      const result = db.prepare(`
        INSERT INTO media_ai_consents (
          full_name,email,project_or_purpose,allow_photo,allow_video,allow_voice,
          allow_name_likeness,allow_testimonial,allow_website_social,allow_education_training,
          allow_marketing,allow_ai_assisted_editing,consent_all,typed_signature,
          consent_version,consent_text,ip_address,user_agent
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        fullName,
        email,
        String(body.project_or_purpose || "").trim().slice(0, 500) || null,
        flags.allow_photo ? 1 : 0,
        flags.allow_video ? 1 : 0,
        flags.allow_voice ? 1 : 0,
        flags.allow_name_likeness ? 1 : 0,
        flags.allow_testimonial ? 1 : 0,
        flags.allow_website_social ? 1 : 0,
        flags.allow_education_training ? 1 : 0,
        flags.allow_marketing ? 1 : 0,
        flags.allow_ai_assisted_editing ? 1 : 0,
        flags.consent_all ? 1 : 0,
        typedSignature,
        MEDIA_AI_CONSENT_VERSION,
        consentText,
        clientIp(req),
        String(req.headers["user-agent"] || "").slice(0, 500)
      );

      return res.json({
        ok: true,
        id: Number(result.lastInsertRowid),
        consent_version: MEDIA_AI_CONSENT_VERSION,
        recorded_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[media-ai-consent] failed", error);
      return res.status(500).json({ ok: false, error: "Unable to record permission." });
    }
  });
}
