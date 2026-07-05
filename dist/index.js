// server/index.ts
import express from "express";
import { createServer } from "http";
import tls from "tls";
import fs3 from "fs";
import path3 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import Database from "better-sqlite3";
import session from "express-session";
import bcrypt from "bcryptjs";
import connectSqlite3 from "connect-sqlite3";
import multer from "multer";
import { nanoid } from "nanoid";
import dotenv from "dotenv";

// server/research-store.ts
function ensureResearchTables(db2) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS brand_research_dumps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      raw_notes TEXT NOT NULL,
      char_count INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      executive_summary TEXT,
      themes_json TEXT,
      analysis_status TEXT NOT NULL DEFAULT 'pending',
      analysis_error TEXT,
      analyzed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS brand_social_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dump_id INTEGER NOT NULL REFERENCES brand_research_dumps(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      headline TEXT,
      body TEXT NOT NULL,
      hashtags TEXT,
      cta TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_brand_social_dump ON brand_social_suggestions(dump_id);
  `);
}
function countWords(s) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}
function createResearchDump(db2, title, rawNotes) {
  const t = String(title || "").trim() || "Untitled research";
  const raw = String(rawNotes ?? "");
  const char_count = raw.length;
  const word_count = countWords(raw);
  const result = db2.prepare(
    `INSERT INTO brand_research_dumps (title, raw_notes, char_count, word_count, analysis_status, updated_at)
       VALUES (?, ?, ?, ?, 'pending', datetime('now'))`
  ).run(t, raw, char_count, word_count);
  return Number(result.lastInsertRowid);
}
function listResearchDumps(db2, limit) {
  const lim = Math.min(Math.max(limit, 1), 200);
  return db2.prepare(
    `SELECT id, title, char_count, word_count, analysis_status, analyzed_at, created_at, updated_at,
              substr(raw_notes, 1, 400) as preview_snippet
       FROM brand_research_dumps
       ORDER BY id DESC
       LIMIT ?`
  ).all(lim);
}
function getResearchDumpById(db2, id, includeRaw) {
  if (includeRaw) {
    return db2.prepare("SELECT * FROM brand_research_dumps WHERE id = ?").get(id);
  }
  return db2.prepare(
    `SELECT id, title, char_count, word_count, executive_summary, themes_json, analysis_status, analysis_error,
              analyzed_at, created_at, updated_at,
              substr(raw_notes, 1, 8000) as raw_preview
       FROM brand_research_dumps WHERE id = ?`
  ).get(id);
}
function setDumpAnalysis(db2, id, executiveSummary, themes, status, error) {
  db2.prepare(
    `UPDATE brand_research_dumps SET
      executive_summary = ?,
      themes_json = ?,
      analysis_status = ?,
      analysis_error = ?,
      analyzed_at = datetime('now'),
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(executiveSummary, JSON.stringify(themes), status, error, id);
}
function deleteSocialSuggestionsForDump(db2, dumpId) {
  db2.prepare("DELETE FROM brand_social_suggestions WHERE dump_id = ?").run(dumpId);
}
function insertSocialSuggestion(db2, row) {
  db2.prepare(
    `INSERT INTO brand_social_suggestions (dump_id, platform, headline, body, hashtags, cta, sort_order, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`
  ).run(
    row.dump_id,
    row.platform,
    row.headline,
    row.body,
    row.hashtags,
    row.cta,
    row.sort_order
  );
}
function listSocialSuggestions(db2, dumpId) {
  return db2.prepare(
    `SELECT * FROM brand_social_suggestions WHERE dump_id = ? ORDER BY sort_order ASC, id ASC`
  ).all(dumpId);
}
function updateSuggestionStatus(db2, suggestionId, status) {
  db2.prepare("UPDATE brand_social_suggestions SET status = ? WHERE id = ?").run(status, suggestionId);
}

// server/research-ai.ts
var PAPA_SNIPPET = "PAPA Life / Boss Mobile Life Coach: fathers of adult children, faith-informed, PAPA framework. 9th grade reading level.";
var MAX_INPUT_CHARS = 12e4;
function truncateForModel(text) {
  if (text.length <= MAX_INPUT_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_INPUT_CHARS) + "\n[truncated]", truncated: true };
}
function anthropicKey() {
  return process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim() || null;
}
async function claudeGenerate(system, userContent) {
  const key = anthropicKey();
  if (!key) return null;
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-20241022";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: userContent }]
    })
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Anthropic ${r.status}: ${err.slice(0, 400)}`);
  }
  const j = await r.json();
  const text = j.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("") ?? "";
  return text.trim() || null;
}
function heuristicThemes(raw) {
  const paras = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).slice(0, 12);
  const themes = [];
  for (const p of paras) {
    if (p.length > 40 && p.length < 500) themes.push(p.slice(0, 240));
    if (themes.length >= 5) break;
  }
  if (themes.length === 0 && raw.length > 0) themes.push(raw.slice(0, 280));
  return themes;
}
async function analyzeResearchNotes(rawNotes) {
  const { text, truncated } = truncateForModel(rawNotes);
  const wc = text.trim() ? text.trim().split(/\s+/).length : 0;
  const userBlock = "Large private marketing / research note dump. Reply ONLY valid JSON with keys executive_summary (string) and themes (array of strings). No markdown fences.\n---\n" + text;
  try {
    const rawJson = await claudeGenerate(
      "You output only valid JSON. " + PAPA_SNIPPET,
      userBlock
    );
    const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-20241022";
    if (rawJson) {
      const cleaned = rawJson.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      const executive_summary = String(parsed.executive_summary ?? "").trim();
      const themes2 = Array.isArray(parsed.themes) ? parsed.themes.map((t) => String(t).trim()).filter(Boolean) : [];
      if (executive_summary && themes2.length > 0) {
        return {
          executive_summary: truncated ? executive_summary + "\n(Context truncated.)" : executive_summary,
          themes: themes2,
          model: `anthropic:${model}`,
          truncated
        };
      }
    }
  } catch {
  }
  const themes = heuristicThemes(text);
  return {
    executive_summary: `Heuristic (${wc} words). Set ANTHROPIC_API_KEY or CLAUDE_API_KEY on the server for Claude analysis.
` + themes.map((t, i) => `${i + 1}. ${t}`).join("\n"),
    themes: themes.length ? themes : ["Add ANTHROPIC_API_KEY or structure notes into clearer sections."],
    model: "heuristic",
    truncated
  };
}
var PLATFORMS = ["instagram", "linkedin", "facebook", "x", "youtube_shorts"];
async function generateSocialPack(rawNotes, executiveSummary, themes, platforms) {
  const want = (platforms?.length ? platforms : [...PLATFORMS]).map((p) => p.toLowerCase());
  const { text } = truncateForModel(rawNotes);
  const userBlock = "Output ONLY a JSON array (no markdown). Each object: platform, headline, body, hashtags, cta. Platforms needed: " + want.join(", ") + "\n\nExecutive summary:\n" + executiveSummary + "\n\nThemes: " + themes.join(" | ") + "\n\nNotes:\n" + text;
  try {
    const rawJson = await claudeGenerate(
      "You output only a JSON array. " + PAPA_SNIPPET,
      userBlock
    );
    if (rawJson) {
      const cleaned = rawJson.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const arr = JSON.parse(cleaned);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.filter((row) => row.body && row.platform).map((row) => ({
          platform: String(row.platform).toLowerCase(),
          headline: String(row.headline ?? "").trim(),
          body: String(row.body).trim(),
          hashtags: String(row.hashtags ?? "").trim(),
          cta: String(row.cta ?? "").trim()
        })).slice(0, 24);
      }
    }
  } catch {
  }
  const out = [];
  let n = 0;
  for (const p of want) {
    if (!PLATFORMS.includes(p)) continue;
    out.push({
      platform: p,
      headline: "Start here",
      body: p === "x" ? executiveSummary.slice(0, 220) + " #PAPALife" : executiveSummary.slice(0, 500) + "\n\nTurn long plans into weekly posts.",
      hashtags: "#PAPALife #Fatherhood",
      cta: "Comment one word for your season."
    });
    n++;
    if (n >= 6) break;
  }
  return out;
}

// server/research-access.ts
function parseResearchLabAdminAllowlist() {
  const raw = process.env.RESEARCH_LAB_ADMIN_USERNAMES || "";
  return new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
}
function isResearchLabWebUser(username) {
  const allow = parseResearchLabAdminAllowlist();
  if (allow.size === 0) return false;
  const u = String(username ?? "").trim().toLowerCase();
  return u.length > 0 && allow.has(u);
}

// server/site-ctas-store.ts
function ensureSiteCtasTable(db2) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS site_ctas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placement TEXT NOT NULL,
      headline TEXT,
      body TEXT,
      button_label TEXT,
      button_url TEXT,
      variant TEXT NOT NULL DEFAULT 'amber',
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_site_ctas_placement ON site_ctas(placement, active, sort_order);
  `);
}
function listSiteCtasPublic(db2, placements) {
  if (!placements.length) return [];
  const placeholders = placements.map(() => "?").join(",");
  return db2.prepare(
    `SELECT id, placement, headline, body, button_label, button_url, variant, sort_order
       FROM site_ctas
       WHERE active = 1 AND placement IN (${placeholders})
       ORDER BY placement ASC, sort_order ASC, id ASC`
  ).all(...placements);
}
function listSiteCtasAdmin(db2, placement) {
  if (placement) {
    return db2.prepare(
      `SELECT * FROM site_ctas WHERE placement = ? ORDER BY sort_order ASC, id ASC`
    ).all(placement);
  }
  return db2.prepare(`SELECT * FROM site_ctas ORDER BY placement ASC, sort_order ASC, id ASC`).all();
}
function upsertSiteCta(db2, row) {
  const placement = String(row.placement ?? "").trim();
  if (!placement) throw new Error("placement is required");
  if (row.id) {
    const existing = db2.prepare("SELECT * FROM site_ctas WHERE id = ?").get(row.id);
    if (!existing) throw new Error("CTA not found");
    const sortOrder2 = row.sort_order !== void 0 && Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : Number(existing.sort_order ?? 0);
    const variant2 = row.variant !== void 0 ? String(row.variant ?? "amber").trim() || "amber" : String(existing.variant ?? "amber");
    const active2 = row.active !== void 0 ? row.active === false ? 0 : 1 : Number(existing.active ?? 1);
    db2.prepare(
      `UPDATE site_ctas SET
        placement = ?, headline = ?, body = ?, button_label = ?, button_url = ?,
        variant = ?, active = ?, sort_order = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      placement,
      row.headline !== void 0 ? row.headline : existing.headline ?? null,
      row.body !== void 0 ? row.body : existing.body ?? null,
      row.button_label !== void 0 ? row.button_label : existing.button_label ?? null,
      row.button_url !== void 0 ? row.button_url : existing.button_url ?? null,
      variant2,
      active2,
      sortOrder2,
      row.id
    );
    return row.id;
  }
  const variant = String(row.variant ?? "amber").trim() || "amber";
  const active = row.active === false ? 0 : 1;
  const sortOrder = row.sort_order !== void 0 && Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0;
  const r = db2.prepare(
    `INSERT INTO site_ctas (placement, headline, body, button_label, button_url, variant, active, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(
    placement,
    row.headline ?? null,
    row.body ?? null,
    row.button_label ?? null,
    row.button_url ?? null,
    variant,
    active,
    sortOrder
  );
  return Number(r.lastInsertRowid);
}
function deleteSiteCta(db2, id) {
  db2.prepare("DELETE FROM site_ctas WHERE id = ?").run(id);
}

// server/site-media-store.ts
function ensureSiteMediaTable(db2) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS site_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placement TEXT NOT NULL UNIQUE,
      media_url TEXT NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'video',
      poster_url TEXT,
      alt_text TEXT,
      title TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_site_media_placement ON site_media(placement, active);
  `);
}
function getSiteMediaPublic(db2, placement) {
  return db2.prepare(
    `SELECT id, placement, media_url, media_type, poster_url, alt_text, title
       FROM site_media
       WHERE placement = ? AND active = 1
       LIMIT 1`
  ).get(placement);
}
function listSiteMediaAdmin(db2, placement) {
  if (placement) {
    return db2.prepare("SELECT * FROM site_media WHERE placement = ? ORDER BY id ASC").all(placement);
  }
  return db2.prepare("SELECT * FROM site_media ORDER BY placement ASC, id ASC").all();
}
function upsertSiteMedia(db2, row) {
  const placement = String(row.placement ?? "").trim();
  const mediaUrl = String(row.media_url ?? "").trim();
  if (!placement) throw new Error("placement is required");
  if (!mediaUrl) throw new Error("media_url is required");
  const mediaType = String(row.media_type ?? "video").trim() || "video";
  const active = row.active === false ? 0 : 1;
  const result = db2.prepare(
    `INSERT INTO site_media (
        placement, media_url, media_type, poster_url, alt_text, title, active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(placement) DO UPDATE SET
        media_url = excluded.media_url,
        media_type = excluded.media_type,
        poster_url = excluded.poster_url,
        alt_text = excluded.alt_text,
        title = excluded.title,
        active = excluded.active,
        updated_at = datetime('now')`
  ).run(
    placement,
    mediaUrl,
    mediaType,
    row.poster_url ?? null,
    row.alt_text ?? null,
    row.title ?? null,
    active
  );
  const existing = db2.prepare("SELECT id FROM site_media WHERE placement = ?").get(placement);
  return existing?.id ?? Number(result.lastInsertRowid);
}
function deleteSiteMedia(db2, placement) {
  db2.prepare("DELETE FROM site_media WHERE placement = ?").run(placement);
}

// server/pricing-store.ts
var DEFAULT_CHECKOUT_PAYMENT_LINK = "https://agent.bossmobility.net/payment-link/68d610ad67ee3bd205696444";
function defaults() {
  return {
    member_trial_hours: Number(process.env.MEMBER_TRIAL_HOURS || 24),
    member_price_usd_cents: Number(process.env.MEMBER_PRICE_USD_CENTS || 499),
    member_currency: (process.env.MEMBER_PRICE_CURRENCY || "usd").trim().toLowerCase(),
    member_product_name: (process.env.MEMBER_PRODUCT_NAME || "PAPA Life Member Access").trim(),
    member_stripe_price_id: (process.env.STRIPE_PRICE_ID || "").trim(),
    checkout_payment_link: (process.env.CHECKOUT_PAYMENT_LINK || DEFAULT_CHECKOUT_PAYMENT_LINK).trim()
  };
}
function asPositiveInt(input, fallback) {
  const n = Number(input);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
function normalizeCurrency(input, fallback) {
  const c = String(input ?? "").trim().toLowerCase();
  return c.length === 3 ? c : fallback;
}
function ensurePricingSettingsTable(db2) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS pricing_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const insert = db2.prepare(
    `INSERT INTO pricing_settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO NOTHING`
  );
  const d = defaults();
  insert.run("member_trial_hours", String(d.member_trial_hours));
  insert.run("member_price_usd_cents", String(d.member_price_usd_cents));
  insert.run("member_currency", d.member_currency);
  insert.run("member_product_name", d.member_product_name);
  insert.run("member_stripe_price_id", d.member_stripe_price_id);
  insert.run("checkout_payment_link", d.checkout_payment_link);
}
function getPricingSettings(db2) {
  const rows = db2.prepare("SELECT key, value FROM pricing_settings").all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const d = defaults();
  return {
    member_trial_hours: asPositiveInt(map.member_trial_hours, d.member_trial_hours),
    member_price_usd_cents: asPositiveInt(map.member_price_usd_cents, d.member_price_usd_cents),
    member_currency: normalizeCurrency(map.member_currency, d.member_currency),
    member_product_name: String(map.member_product_name || d.member_product_name).trim(),
    member_stripe_price_id: String(map.member_stripe_price_id || d.member_stripe_price_id).trim(),
    checkout_payment_link: String(map.checkout_payment_link || d.checkout_payment_link).trim()
  };
}

// server/sync-intake-to-crm.ts
var PAPA_FUNNEL_ISSUE_TAGS = [
  "communication",
  "dismissed",
  "disconnected",
  "dont_know",
  "ready_to_change"
];
function isPapaFunnelIssueTag(s) {
  return PAPA_FUNNEL_ISSUE_TAGS.includes(s);
}
var PAPA_FUNNEL_ISSUE_LABELS = {
  communication: "Communication keeps breaking down",
  dismissed: "I feel dismissed or shut out",
  disconnected: "We feel emotionally disconnected",
  dont_know: "I do not know what to say anymore",
  ready_to_change: "I am ready to change this"
};
function syncIntakeSubmissionToCrmLead(db2, input) {
  const rawName = input.first_name.trim();
  const parts = rawName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Unknown";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "\u2014";
  const businessEmail = input.email && input.email.trim() ? input.email.trim().toLowerCase() : `intake-${input.intakeId}@placeholder.bossmobile.local`;
  const mobilePhone = input.phone && input.phone.trim() ? input.phone.trim() : "\u2014";
  const invitedBy = input.invited_by ?? "strategist_intake";
  const sourceLabel = invitedBy === "papa_funnel_intake" ? "Papa Life homepage funnel" : `strategist intake (${input.source})`;
  const noteBody = [
    `Source: ${sourceLabel}`,
    `Intake submission id: ${input.intakeId}`,
    isPapaFunnelIssueTag(input.routed_pillar) ? `CRM tag: ${input.routed_pillar}` : `Primary pillar: ${input.routed_pillar}`,
    input.disconnected_pillar ? `Disconnected pillar: ${input.disconnected_pillar}` : null,
    "",
    "Situation:",
    input.situation,
    input.vision ? `
Vision:
${input.vision}` : ""
  ].filter((line) => line !== null).join("\n");
  const insertLead2 = db2.prepare(`
    INSERT INTO leads (
      invited_by, first_name, last_name, mobile_phone, business_email,
      business_name, website, street_address, address2, city, state, country,
      postal_code, consent_transactional, consent_marketing, checkout_status
    ) VALUES (
      @invited_by, @first_name, @last_name, @mobile_phone, @business_email,
      @business_name, @website, @street_address, @address2, @city, @state, @country,
      @postal_code, @consent_transactional, @consent_marketing, @checkout_status
    )
  `);
  const r = insertLead2.run({
    invited_by: invitedBy,
    first_name: firstName,
    last_name: lastName,
    mobile_phone: mobilePhone,
    business_email: businessEmail,
    business_name: null,
    website: null,
    street_address: null,
    address2: null,
    city: null,
    state: null,
    country: null,
    postal_code: null,
    consent_transactional: 0,
    consent_marketing: 0,
    checkout_status: "intake"
  });
  const leadId = Number(r.lastInsertRowid);
  db2.prepare("INSERT INTO lead_notes (lead_id, body) VALUES (?, ?)").run(leadId, noteBody);
  if (isPapaFunnelIssueTag(input.routed_pillar)) {
    db2.prepare("INSERT OR IGNORE INTO lead_tags (lead_id, tag_slug) VALUES (?, ?)").run(leadId, input.routed_pillar);
  }
  return { lead_id: leadId };
}
function backfillIntakeSubmissionsToCrmLeads(db2) {
  const intakes = db2.prepare(
    `SELECT id, first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision
       FROM intake_submissions ORDER BY id ASC`
  ).all();
  let created = 0;
  for (const row of intakes) {
    const marker = `Intake submission id: ${row.id}`;
    const exists = db2.prepare(`SELECT 1 FROM lead_notes WHERE instr(body, ?) > 0 LIMIT 1`).get(marker);
    if (exists) continue;
    syncIntakeSubmissionToCrmLead(db2, {
      intakeId: row.id,
      first_name: row.first_name,
      email: row.email,
      phone: row.phone,
      situation: row.situation,
      routed_pillar: row.routed_pillar,
      disconnected_pillar: row.disconnected_pillar,
      vision: row.vision,
      source: "web"
    });
    created += 1;
  }
  return { created };
}

// server/sms-campaigns.ts
function ensureSmsCampaignTables(db2) {
  db2.exec(`
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
function twilioEnvConfigured() {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  const ms = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  return !!(sid && token && (from || ms));
}
function normalizeToE164(raw) {
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
function personalizeBody(template, row) {
  return template.replace(/\{\{\s*first_name\s*\}\}/gi, row.first_name || "").replace(/\{\{\s*last_name\s*\}\}/gi, row.last_name || "").replace(/\{\{\s*business_name\s*\}\}/gi, row.business_name || "");
}
async function twilioSendSms(to, body) {
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
  else form.set("From", fromNumber);
  form.set("Body", body.slice(0, 1600));
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });
  const j = await r.json();
  if (!r.ok) return { error: j.message || `Twilio HTTP ${r.status}` };
  if (!j.sid) return { error: "Twilio returned no SID" };
  return { sid: j.sid };
}
function registerSmsCampaignRoutes(app, db2, requireAuth2) {
  ensureSmsCampaignTables(db2);
  app.get("/api/sms/twilio-status", requireAuth2, (_req, res) => {
    res.json({ configured: twilioEnvConfigured() });
  });
  app.get("/api/sms/campaigns", requireAuth2, (_req, res) => {
    const rows = db2.prepare(
      `SELECT c.*,
          (SELECT COUNT(*) FROM sms_campaign_recipients r WHERE r.campaign_id = c.id) AS recipient_count,
          (SELECT COUNT(*) FROM sms_campaign_recipients r WHERE r.campaign_id = c.id AND r.send_status = 'sent') AS sent_count,
          (SELECT COUNT(*) FROM sms_campaign_recipients r WHERE r.campaign_id = c.id AND r.send_status = 'failed') AS failed_count,
          (SELECT COUNT(*) FROM sms_campaign_recipients r WHERE r.campaign_id = c.id AND r.send_status = 'pending') AS pending_count
        FROM sms_campaigns c
        ORDER BY c.created_at DESC`
    ).all();
    res.json(rows);
  });
  app.post("/api/sms/campaigns", requireAuth2, (req, res) => {
    const name = String(req.body?.name ?? "").trim();
    const body_template = String(req.body?.body_template ?? "").trim();
    if (!name || !body_template) {
      return res.status(400).json({ ok: false, error: "name and body_template required" });
    }
    const ins = db2.prepare(
      `INSERT INTO sms_campaigns (name, body_template, status) VALUES (?, ?, 'draft')`
    ).run(name, body_template);
    res.json({ ok: true, id: ins.lastInsertRowid });
  });
  app.patch("/api/sms/campaigns/:id", requireAuth2, (req, res) => {
    const id = Number(req.params.id);
    const row = db2.prepare("SELECT status FROM sms_campaigns WHERE id = ?").get(id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    if (row.status !== "draft") {
      return res.status(400).json({ ok: false, error: "Only draft campaigns can be edited" });
    }
    const name = req.body?.name != null ? String(req.body.name).trim() : null;
    const body_template = req.body?.body_template != null ? String(req.body.body_template).trim() : null;
    if (!name && !body_template) return res.status(400).json({ ok: false, error: "Nothing to update" });
    const cur = db2.prepare("SELECT name, body_template FROM sms_campaigns WHERE id = ?").get(id);
    db2.prepare(
      `UPDATE sms_campaigns SET name = ?, body_template = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(name || cur.name, body_template || cur.body_template, id);
    res.json({ ok: true });
  });
  app.delete("/api/sms/campaigns/:id", requireAuth2, (req, res) => {
    const id = Number(req.params.id);
    const sent = db2.prepare(
      `SELECT COUNT(*) as c FROM sms_campaign_recipients WHERE campaign_id = ? AND send_status = 'sent'`
    ).get(id).c;
    if (sent > 0) {
      return res.status(400).json({ ok: false, error: "Cannot delete a campaign that already has sends" });
    }
    db2.prepare("DELETE FROM sms_campaigns WHERE id = ?").run(id);
    res.json({ ok: true });
  });
  app.get("/api/sms/campaigns/:id/recipients", requireAuth2, (req, res) => {
    const id = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const rows = db2.prepare(
      `SELECT r.*, l.first_name, l.last_name, l.business_email
         FROM sms_campaign_recipients r
         JOIN leads l ON l.id = r.lead_id
         WHERE r.campaign_id = ?
         ORDER BY r.id DESC
         LIMIT ?`
    ).all(id, limit);
    res.json(rows);
  });
  app.post("/api/sms/campaigns/:id/build-audience", requireAuth2, (req, res) => {
    const id = Number(req.params.id);
    const camp = db2.prepare("SELECT * FROM sms_campaigns WHERE id = ?").get(id);
    if (!camp) return res.status(404).json({ ok: false, error: "Campaign not found" });
    if (camp.status !== "draft" && camp.status !== "ready") {
      return res.status(400).json({ ok: false, error: "Audience can only be built for draft or ready campaigns" });
    }
    const sentCount = db2.prepare(
      `SELECT COUNT(*) as c FROM sms_campaign_recipients WHERE campaign_id = ? AND send_status = 'sent'`
    ).get(id).c;
    if (sentCount > 0) {
      return res.status(400).json({ ok: false, error: "Campaign already has sent messages; create a new campaign" });
    }
    db2.prepare("DELETE FROM sms_campaign_recipients WHERE campaign_id = ?").run(id);
    const leads = db2.prepare(
      `SELECT id, first_name, last_name, business_name, mobile_phone
         FROM leads
         WHERE consent_marketing = 1`
    ).all();
    const ins = db2.prepare(
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
    db2.prepare(`UPDATE sms_campaigns SET status = 'ready', updated_at = datetime('now') WHERE id = ?`).run(id);
    res.json({ ok: true, added, skipped, total_leads_marketing: leads.length });
  });
  app.post("/api/sms/campaigns/:id/send-batch", requireAuth2, async (req, res) => {
    if (!twilioEnvConfigured()) {
      return res.status(503).json({
        ok: false,
        error: "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER on the server."
      });
    }
    const id = Number(req.params.id);
    const limit = Math.min(Math.max(Number(req.body?.limit) || 20, 1), 50);
    const camp = db2.prepare("SELECT id, status FROM sms_campaigns WHERE id = ?").get(id);
    if (!camp) return res.status(404).json({ ok: false, error: "Campaign not found" });
    if (camp.status !== "ready" && camp.status !== "sending") {
      return res.status(400).json({ ok: false, error: "Build audience first (campaign must be ready or sending)" });
    }
    const pending = db2.prepare(
      `SELECT id, phone_e164, personalized_body FROM sms_campaign_recipients
         WHERE campaign_id = ? AND send_status = 'pending'
         ORDER BY id ASC
         LIMIT ?`
    ).all(id, limit);
    if (pending.length === 0) {
      db2.prepare(`UPDATE sms_campaigns SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(
        id
      );
      return res.json({ ok: true, sent: 0, failed: 0, remaining: 0, completed: true });
    }
    db2.prepare(`UPDATE sms_campaigns SET status = 'sending', updated_at = datetime('now') WHERE id = ?`).run(id);
    const updSent = db2.prepare(
      `UPDATE sms_campaign_recipients SET send_status = 'sent', twilio_sid = ?, sent_at = datetime('now') WHERE id = ?`
    );
    const updFail = db2.prepare(
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
    const remaining = db2.prepare(
      `SELECT COUNT(*) as c FROM sms_campaign_recipients WHERE campaign_id = ? AND send_status = 'pending'`
    ).get(id).c;
    if (remaining === 0) {
      db2.prepare(`UPDATE sms_campaigns SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(
        id
      );
    }
    res.json({ ok: true, sent, failed, remaining, completed: remaining === 0 });
  });
}

// server/ghl-integration-store.ts
import crypto from "crypto";
var ALGO = "aes-256-gcm";
function encryptionKey() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY?.trim() || process.env.SESSION_SECRET?.trim() || "papalife-integration-key-rotate-in-production";
  return crypto.createHash("sha256").update(raw).digest();
}
function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const key = encryptionKey();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}
function decrypt(blob) {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const key = encryptionKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
function maskToken(token) {
  const t = token.trim();
  if (t.length <= 8) return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
  return `${t.slice(0, 4)}\u2026${t.slice(-4)}`;
}
function envCredentials() {
  const token = process.env.GHL_API_TOKEN?.trim() || process.env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim() || "";
  if (!token) return null;
  const locationId = process.env.GHL_LOCATION_ID?.trim() || void 0;
  return { token, locationId, source: "env" };
}
function ensureGhlIntegrationTable(db2) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS admin_ghl_integrations (
      admin_user_id INTEGER PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
      api_token_enc TEXT NOT NULL,
      location_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
function getGhlIntegrationPublic(db2, adminUserId) {
  const env = envCredentials();
  if (env) {
    return {
      configured: true,
      token_preview: maskToken(env.token),
      location_id: env.locationId ?? null,
      updated_at: null,
      source: "env"
    };
  }
  const row = db2.prepare(
    `SELECT api_token_enc, location_id, updated_at
       FROM admin_ghl_integrations WHERE admin_user_id = ?`
  ).get(adminUserId);
  if (!row?.api_token_enc) {
    return {
      configured: false,
      token_preview: null,
      location_id: null,
      updated_at: null,
      source: null
    };
  }
  let preview = null;
  try {
    preview = maskToken(decrypt(row.api_token_enc));
  } catch {
    preview = "(stored \u2014 re-save if tools fail)";
  }
  return {
    configured: true,
    token_preview: preview,
    location_id: row.location_id?.trim() || null,
    updated_at: row.updated_at,
    source: "dashboard"
  };
}
function saveGhlIntegration(db2, adminUserId, apiToken, locationId) {
  const token = apiToken.trim();
  if (token.length < 16) {
    throw new Error("API token looks too short \u2014 paste the full Private Integration token from GHL");
  }
  const loc = locationId?.trim() || null;
  db2.prepare(
    `INSERT INTO admin_ghl_integrations (admin_user_id, api_token_enc, location_id, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(admin_user_id) DO UPDATE SET
       api_token_enc = excluded.api_token_enc,
       location_id = excluded.location_id,
       updated_at = datetime('now')`
  ).run(adminUserId, encrypt(token), loc);
  return getGhlIntegrationPublic(db2, adminUserId);
}
function clearGhlIntegration(db2, adminUserId) {
  db2.prepare("DELETE FROM admin_ghl_integrations WHERE admin_user_id = ?").run(adminUserId);
  return getGhlIntegrationPublic(db2, adminUserId);
}
function resolveGhlCredentials(db2, adminUserId) {
  const env = envCredentials();
  if (env) return env;
  let uid = adminUserId;
  if (uid == null) {
    const row = db2.prepare("SELECT id FROM admin_users ORDER BY id ASC LIMIT 1").get();
    uid = row?.id;
  }
  if (uid == null) return null;
  const stored = db2.prepare(
    `SELECT api_token_enc, location_id FROM admin_ghl_integrations WHERE admin_user_id = ?`
  ).get(uid);
  if (!stored?.api_token_enc) return null;
  try {
    const token = decrypt(stored.api_token_enc);
    return {
      token,
      locationId: stored.location_id?.trim() || void 0,
      source: "dashboard"
    };
  } catch {
    return null;
  }
}

// server/ghl-api.ts
var GHL_BASE = (process.env.GHL_API_BASE_URL || "https://services.leadconnectorhq.com").replace(/\/$/, "");
var GHL_VERSION = process.env.GHL_API_VERSION?.trim() || "2021-07-28";
function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    Version: GHL_VERSION
  };
}
function notConfiguredFix() {
  return "Open CRM \u2192 Settings on bossmobilelifecoach.com and paste your Go High Level Private Integration token. Or set GHL_API_TOKEN in server .env (optional override).";
}
function parseJsonResponse(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text.slice(0, 500) };
  }
}
function contactIdFromPayload(data) {
  const direct = data.id || data.contactId;
  if (direct) return String(direct);
  const contact = data.contact;
  if (contact && typeof contact === "object") {
    const id = contact.id || contact.contactId;
    if (id) return String(id);
  }
  return null;
}
async function ghlUpsertContactWithTags(args, creds) {
  if (!creds?.token) {
    return {
      ok: false,
      error: "Go High Level API token is not configured",
      action: "not_configured",
      fix: notConfiguredFix()
    };
  }
  const locationId = String(creds.locationId || "").trim();
  if (!locationId) {
    return {
      ok: false,
      error: "Go High Level location ID is not configured",
      action: "missing_location_id",
      fix: "Open CRM \u2192 Settings on bossmobilelifecoach.com and save the HighLevel Location ID."
    };
  }
  const email = String(args.email || "").trim().toLowerCase();
  const firstName = String(args.firstName || "").trim();
  if (!email) return { ok: false, error: "email is required" };
  if (!firstName) return { ok: false, error: "firstName is required" };
  const tags = Array.from(
    new Set((args.tags || []).map((tag) => String(tag).trim()).filter(Boolean))
  );
  const payload = {
    locationId,
    firstName,
    email,
    ...args.lastName ? { lastName: args.lastName } : {},
    ...args.phone ? { phone: args.phone } : {},
    ...args.source ? { source: args.source } : {},
    ...tags.length ? { tags } : {},
    ...args.customFields && Object.keys(args.customFields).length ? { customFields: args.customFields } : {}
  };
  const r = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: "POST",
    headers: headers(creds.token),
    body: JSON.stringify(payload)
  });
  const text = await r.text();
  const data = parseJsonResponse(text);
  if (!r.ok) {
    const msg = String(data.message || text || r.statusText);
    return { ok: false, error: msg, status: r.status };
  }
  return {
    ok: true,
    data: {
      contact_id: contactIdFromPayload(data),
      tags,
      credential_source: creds.source,
      ghl: data
    }
  };
}

// server/ghl-automation.ts
import { randomBytes } from "crypto";
var PAPA_VOICE_SYSTEM = `You are Brian Keith Hill's Papa Life AI strategist \u2014 warm, direct, faith-informed, 9th-grade reading level.
Brand: Boss Mobile Life Coach / PAPA Life \u2014 fathers of adult children rebuilding connection.
Never sound corporate. Sound like Brian talking to one dad at a time.`;
var OUTREACH_NOTE_SYSTEM = `${PAPA_VOICE_SYSTEM}
Write exactly 3 sentences for a GoHighLevel contact note \u2014 a warm Papa Life outreach opener in Brian's voice.
No bullet points. No subject line. No sign-off block.`;
var VOICE_BRIEF_SYSTEM = `${PAPA_VOICE_SYSTEM}
The user (Brian) will HEAR this aloud in Claude voice mode. Write 2\u20134 short spoken sentences:
who just came in, why they matter, and one suggested next move. Conversational, present tense.`;
function anthropicKey2() {
  return process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim() || null;
}
async function claudeGenerate2(system, userContent, maxTokens = 1024) {
  const key = anthropicKey2();
  if (!key) throw new Error("ANTHROPIC_API_KEY or CLAUDE_API_KEY is not set on the server");
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }]
    })
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Anthropic ${r.status}: ${err.slice(0, 400)}`);
  }
  const j = await r.json();
  const text = j.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("") ?? "";
  const out = text.trim();
  if (!out) throw new Error("Claude returned empty text");
  return out;
}
function ensureGhlAutomationTables(db2) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS ghl_contact_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ghl_contact_id TEXT,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      source TEXT,
      tags_json TEXT,
      outreach_note TEXT,
      voice_prompt TEXT NOT NULL,
      raw_payload_json TEXT,
      lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
      cloud_forwarded_at TEXT,
      cloud_forward_status TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ghl_alerts_unread ON ghl_contact_alerts(read_at, created_at);
    CREATE TABLE IF NOT EXISTS automation_webhook_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT NOT NULL,
      target_url TEXT,
      payload_json TEXT,
      response_status INTEGER,
      response_body TEXT,
      alert_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  try {
    db2.exec("ALTER TABLE ghl_contact_alerts ADD COLUMN cloud_forwarded_at TEXT");
  } catch {
  }
  try {
    db2.exec("ALTER TABLE ghl_contact_alerts ADD COLUMN cloud_forward_status TEXT");
  } catch {
  }
}
function cloudWebhookUrl() {
  const url = process.env.AUTOMATION_CLOUD_WEBHOOK_URL?.trim() || process.env.MAKE_SCENARIO2_WEBHOOK_URL?.trim() || process.env.MAKE_CLOUD_WEBHOOK_URL?.trim() || null;
  return url || null;
}
function siteAutomationBase() {
  return process.env.PUBLIC_SITE_URL?.trim() || "https://bossmobilelifecoach.com";
}
function parseClaudePromptBody(body) {
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) throw new Error('JSON body must include "prompt": "..."');
  const context = body.context != null ? String(body.context).trim() : void 0;
  return { prompt, context: context || void 0 };
}
function buildOutboundCloudPayload(input, result) {
  const base = siteAutomationBase();
  const displayName = [input.first_name, input.last_name].filter(Boolean).join(" ") || "New contact";
  const contactLines = [
    displayName,
    input.email ? `email ${input.email}` : null,
    input.phone ? `phone ${input.phone}` : null,
    input.source ? `source ${input.source}` : null,
    input.tags?.length ? `tags ${input.tags.join(", ")}` : null
  ].filter(Boolean).join(", ");
  const prompt = [
    `New Papa Life / Boss Mobile lead: ${contactLines}.`,
    "Use Brian Keith Hill's warm Papa Life voice (faith-informed, direct, 9th-grade reading level).",
    "Decide the best next step (GHL note tweak, SMS, call prep, or tag).",
    `Outreach note already on file: ${result.outreach_note}`,
    `Voice brief for Brian: ${result.voice_prompt}`,
    `To ask Claude on the server, POST JSON to ${base}/api/automation/claude-prompt with body {"prompt":"your question here"} and Bearer auth.`
  ].join(" ");
  return {
    event: "ghl_new_contact",
    prompt,
    contact: {
      ghl_contact_id: input.ghl_contact_id ?? null,
      first_name: input.first_name ?? null,
      last_name: input.last_name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      source: input.source ?? null,
      tags: input.tags ?? []
    },
    outreach_note: result.outreach_note,
    voice_prompt: result.voice_prompt,
    alert_id: result.alert_id,
    lead_id: result.lead_id,
    site_origin: base,
    inbound: {
      claude_prompt_url: `${base}/api/automation/claude-prompt`,
      claude_prompt_body: { prompt: "Your follow-up question about this lead" },
      claude_prompt_response: {
        ok: true,
        response: "(Claude Papa Life text)",
        model: process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001",
        prompt: "",
        voice: "papa_life"
      }
    }
  };
}
async function postJsonToCloudWebhook(db2, url, payload, alertId) {
  const secret = webhookSecret();
  const headers2 = { "Content-Type": "application/json" };
  if (secret) headers2.Authorization = `Bearer ${secret}`;
  const r = await fetch(url, {
    method: "POST",
    headers: headers2,
    body: JSON.stringify(payload)
  });
  const body = await r.text();
  db2.prepare(
    `INSERT INTO automation_webhook_log (direction, target_url, payload_json, response_status, response_body, alert_id)
     VALUES ('outbound', ?, ?, ?, ?, ?)`
  ).run(url, JSON.stringify(payload), r.status, body.slice(0, 8e3), alertId);
  db2.prepare(
    `UPDATE ghl_contact_alerts SET cloud_forwarded_at = datetime('now'), cloud_forward_status = ? WHERE id = ?`
  ).run(r.ok ? "ok" : `http_${r.status}`, alertId);
  return { ok: r.ok, status: r.status, body: body.slice(0, 2e3) };
}
async function forwardAlertToCloud(db2, alertId) {
  const url = cloudWebhookUrl();
  if (!url) return { forwarded: false, error: "AUTOMATION_CLOUD_WEBHOOK_URL not set" };
  const row = db2.prepare(
    `SELECT id, ghl_contact_id, first_name, last_name, email, phone, source, tags_json,
              outreach_note, voice_prompt, lead_id, cloud_forwarded_at
       FROM ghl_contact_alerts WHERE id = ?`
  ).get(alertId);
  if (!row) return { forwarded: false, error: "alert not found" };
  if (row.cloud_forwarded_at) return { forwarded: false, error: "already forwarded" };
  const input = {
    ghl_contact_id: row.ghl_contact_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    source: row.source,
    tags: row.tags_json ? JSON.parse(row.tags_json) : null
  };
  const payload = buildOutboundCloudPayload(input, {
    alert_id: row.id,
    lead_id: row.lead_id ?? 0,
    outreach_note: row.outreach_note ?? "",
    voice_prompt: row.voice_prompt,
    ghl_contact_id: row.ghl_contact_id
  });
  const sent = await postJsonToCloudWebhook(db2, url, payload, alertId);
  return {
    forwarded: sent.ok,
    cloud_url: url,
    status: sent.status,
    error: sent.ok ? void 0 : sent.body.slice(0, 300)
  };
}
function webhookSecret() {
  return process.env.GHL_WEBHOOK_SECRET?.trim() || process.env.MAKE_WEBHOOK_SECRET?.trim() || process.env.AUTOMATION_WEBHOOK_SECRET?.trim() || "";
}
function verifyAutomationAuth(authHeader) {
  const secret = webhookSecret();
  if (!secret) return true;
  const token = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  return token === secret;
}
function parseGhlContactPayload(body) {
  const contact = body.contact || body.data || body;
  const tagsRaw = contact.tags ?? body.tags;
  let tags = null;
  if (Array.isArray(tagsRaw)) {
    tags = tagsRaw.map((t) => {
      if (typeof t === "string") return t;
      if (t && typeof t === "object" && "name" in t) return String(t.name);
      return String(t);
    });
  } else if (typeof tagsRaw === "string" && tagsRaw.trim()) {
    tags = tagsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return {
    ghl_contact_id: String(contact.id ?? contact.contact_id ?? body.ghl_contact_id ?? "").trim() || null,
    first_name: String(contact.first_name ?? contact.firstName ?? body.first_name ?? "").trim() || null,
    last_name: String(contact.last_name ?? contact.lastName ?? body.last_name ?? "").trim() || null,
    email: String(contact.email ?? body.email ?? "").trim().toLowerCase() || null,
    phone: String(contact.phone ?? body.phone ?? "").trim() || null,
    source: String(contact.source ?? body.source ?? "").trim() || null,
    tags,
    outreach_note: String(contact.outreach_note ?? body.outreach_note ?? body.note ?? "").trim() || null,
    raw: body
  };
}
function syncGhlContactToLead(db2, input, outreachNote) {
  const fn = input.first_name || "New";
  const ln = input.last_name || "Contact";
  const email = input.email && input.email.includes("@") ? input.email : `ghl-${input.ghl_contact_id || randomBytes(4).toString("hex")}@placeholder.bossmobile.local`;
  const phone = input.phone || "\u2014";
  const marker = input.ghl_contact_id ? `GHL contact id: ${input.ghl_contact_id}` : null;
  if (marker) {
    const exists = db2.prepare(`SELECT lead_id FROM lead_notes WHERE instr(body, ?) > 0 LIMIT 1`).get(marker);
    if (exists?.lead_id) {
      db2.prepare("INSERT INTO lead_notes (lead_id, body) VALUES (?, ?)").run(
        exists.lead_id,
        `GHL update ${(/* @__PURE__ */ new Date()).toISOString()}
${outreachNote}`
      );
      return exists.lead_id;
    }
  }
  const r = db2.prepare(
    `INSERT INTO leads (
        invited_by, first_name, last_name, mobile_phone, business_email,
        consent_transactional, consent_marketing, checkout_status
      ) VALUES ('ghl_new_contact', ?, ?, ?, ?, 0, 0, 'ghl_intake')`
  ).run(fn, ln, phone, email);
  const leadId = Number(r.lastInsertRowid);
  const noteBody = [
    "Source: GoHighLevel new contact",
    marker,
    input.source ? `GHL source: ${input.source}` : null,
    input.tags?.length ? `Tags: ${input.tags.join(", ")}` : null,
    "",
    "AI outreach note:",
    outreachNote
  ].filter((line) => line !== null).join("\n");
  db2.prepare("INSERT INTO lead_notes (lead_id, body) VALUES (?, ?)").run(leadId, noteBody);
  return leadId;
}
async function processGhlNewContact(db2, input) {
  ensureGhlAutomationTables(db2);
  const displayName = [input.first_name, input.last_name].filter(Boolean).join(" ") || "New contact";
  const context = [
    `New GoHighLevel contact: ${displayName}`,
    input.email ? `Email: ${input.email}` : null,
    input.phone ? `Phone: ${input.phone}` : null,
    input.source ? `Source: ${input.source}` : null,
    input.tags?.length ? `Tags: ${input.tags.join(", ")}` : null
  ].filter(Boolean).join("\n");
  let outreach_note = input.outreach_note?.trim() || "";
  if (!outreach_note) {
    outreach_note = await claudeGenerate2(OUTREACH_NOTE_SYSTEM, context);
  }
  const voice_prompt = await claudeGenerate2(
    VOICE_BRIEF_SYSTEM,
    `${context}

Outreach note already drafted:
${outreach_note}`
  );
  const lead_id = syncGhlContactToLead(db2, input, outreach_note);
  const ins = db2.prepare(
    `INSERT INTO ghl_contact_alerts (
        ghl_contact_id, first_name, last_name, email, phone, source, tags_json,
        outreach_note, voice_prompt, raw_payload_json, lead_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.ghl_contact_id,
    input.first_name,
    input.last_name,
    input.email,
    input.phone,
    input.source,
    input.tags ? JSON.stringify(input.tags) : null,
    outreach_note,
    voice_prompt,
    input.raw ? JSON.stringify(input.raw) : null,
    lead_id
  );
  const alert_id = Number(ins.lastInsertRowid);
  const result = {
    alert_id,
    lead_id,
    outreach_note,
    voice_prompt,
    ghl_contact_id: input.ghl_contact_id ?? null
  };
  const cloudUrl = cloudWebhookUrl();
  if (cloudUrl) {
    try {
      const payload = buildOutboundCloudPayload(input, result);
      await postJsonToCloudWebhook(db2, cloudUrl, payload, alert_id);
    } catch (err) {
      console.error("[ghl-automation] cloud webhook forward failed:", err);
      db2.prepare(`UPDATE ghl_contact_alerts SET cloud_forward_status = ? WHERE id = ?`).run(
        "error",
        alert_id
      );
    }
  }
  return result;
}
async function claudePapaComplete(prompt, context) {
  const user = context?.trim() ? `${context.trim()}

---

${prompt}` : prompt;
  const response = await claudeGenerate2(PAPA_VOICE_SYSTEM, user, 2048);
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";
  return { ok: true, prompt, response, model, voice: "papa_life" };
}
function automationStatusPayload(db2) {
  const secret = webhookSecret();
  const base = siteAutomationBase();
  const cloudUrl = cloudWebhookUrl();
  const ghlCreds = db2 ? resolveGhlCredentials(db2) : null;
  const envGhl = Boolean(
    process.env.GHL_API_TOKEN?.trim() || process.env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim()
  );
  return {
    contract_json: `${base}/api/automation/contract.json`,
    scenarios: {
      scenario_1: {
        name: "GHL New Contact \u2192 Claude AI Analysis \u2192 GHL Note",
        make_scenario_id: "5259259",
        site_webhook: `${base}/api/webhooks/ghl-new-contact`,
        note: "Add a Make HTTP module after Claude that POSTs here with the outreach note, OR call this webhook instead of Claude in Make to run Claude on-server."
      },
      scenario_2: {
        name: "iShareHow MCP \u2192 Claude AI \u2192 Response",
        make_scenario_id: "5259335",
        claude_endpoint: `${base}/api/automation/claude-prompt`,
        cloud_outbound_webhook: cloudUrl || "(set AUTOMATION_CLOUD_WEBHOOK_URL \u2014 Make custom webhook URL)",
        inbound_json: { prompt: "string \u2014 required" },
        outbound_json: { event: "ghl_new_contact", prompt: "string", contact: "object", inbound: "object" },
        mcp_tool: "papalife_claude_complete",
        note: 'Cloud POSTs {"prompt":"..."} to claude_endpoint; response body has "response" in Papa Life voice. Server POSTs full outbound JSON to cloud when a contact hits the DB.'
      }
    },
    mcp: {
      streamable_url: `${process.env.PUBLIC_MCP_BASE_URL || base}/mcp`,
      tools_for_brian: [
        "papalife_list_ghl_contact_alerts",
        "papalife_process_ghl_new_contact",
        "papalife_ghl_move_opportunity_stage",
        "papalife_nurture_sms_send",
        "papalife_claude_complete",
        "papalife_automation_status"
      ]
    },
    voice_mode: "Brian's Claude: call papalife_list_ghl_contact_alerts and read voice_prompt aloud in voice chat.",
    webhook_auth: secret ? "Bearer token required (GHL_WEBHOOK_SECRET)" : "WARNING: no GHL_WEBHOOK_SECRET set \u2014 webhook is open",
    cloud_webhook_configured: Boolean(cloudUrl),
    anthropic_configured: Boolean(anthropicKey2()),
    ghl_api_configured: envGhl || Boolean(ghlCreds),
    ghl_token_via: envGhl ? "env" : ghlCreds?.source ?? null,
    ghl_settings_path: `${base}/crm-console (sidebar \u2192 Settings)`
  };
}

// server/papa-ai-engine.ts
import fs2 from "fs";
import path2 from "path";
import { fileURLToPath } from "url";

// server/papa-life-kb.ts
import fs from "fs";
import path from "path";
var cachedChunks = null;
var cachedSignature = "";
function configuredKbPaths() {
  return String(process.env.PAPA_LIFE_KB_PATHS || process.env.PAPA_LIFE_MASTER_KB_PATH || "").split(",").map((item) => item.trim()).filter(Boolean);
}
function defaultKbCandidates() {
  return [
    path.resolve(process.cwd(), "server", "papa-life-system-prompt.md"),
    path.resolve(process.cwd(), "data", "papa-life-master-kb.txt"),
    path.resolve(process.cwd(), "data", "Papa_Life_Master_Skill.md")
  ];
}
function chunkText(source, text) {
  const normalized = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const chunks = [];
  const targetSize = 1400;
  for (let start = 0, index = 0; start < normalized.length; index += 1) {
    let end = Math.min(normalized.length, start + targetSize);
    const nextBreak = normalized.indexOf("\n\n", end);
    if (nextBreak > end && nextBreak - start < targetSize + 700) end = nextBreak;
    const slice = normalized.slice(start, end).trim();
    if (slice.length > 120) chunks.push({ source, index, text: slice });
    start = end;
  }
  return chunks;
}
function loadChunks() {
  const paths = [...configuredKbPaths(), ...defaultKbCandidates()];
  const signature = paths.join("|");
  if (cachedChunks && cachedSignature === signature) return cachedChunks;
  const chunks = [];
  for (const rawPath of paths) {
    try {
      const filePath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
      if (!fs.existsSync(filePath)) continue;
      const stat = fs.statSync(filePath);
      if (!stat.isFile() || stat.size > 25e5) continue;
      const text = fs.readFileSync(filePath, "utf8");
      chunks.push(...chunkText(path.basename(filePath), text));
    } catch {
    }
  }
  cachedSignature = signature;
  cachedChunks = chunks;
  return chunks;
}
function keywords(input) {
  const stop = /* @__PURE__ */ new Set([
    "about",
    "after",
    "again",
    "because",
    "before",
    "father",
    "fathers",
    "from",
    "have",
    "with",
    "that",
    "this",
    "what",
    "when",
    "where",
    "will",
    "your"
  ]);
  return Array.from(
    new Set(
      input.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).map((word) => word.trim()).filter((word) => word.length > 3 && !stop.has(word))
    )
  ).slice(0, 24);
}
function getPapaLifeKbStatus() {
  const chunks = loadChunks();
  const configured = configuredKbPaths();
  return {
    enabled: chunks.length > 0,
    configured_paths: configured.length,
    chunks: chunks.length,
    sources: Array.from(new Set(chunks.map((chunk) => chunk.source))).slice(0, 12)
  };
}
function findPapaLifeKbContext(query, limit = 3) {
  const chunks = loadChunks();
  if (!chunks.length) return [];
  const terms = keywords(query);
  if (!terms.length) return [];
  return chunks.map((chunk) => {
    const lower = chunk.text.toLowerCase();
    const score = terms.reduce((sum, term) => {
      const exact = lower.includes(term) ? 2 : 0;
      const prefix = lower.includes(term.slice(0, 5)) ? 1 : 0;
      return sum + exact + prefix;
    }, 0);
    return { ...chunk, score };
  }).filter((chunk) => chunk.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(({ source, index, text }) => ({ source, index, text }));
}
function buildPapaLifeKbPromptContext(query) {
  const matches = findPapaLifeKbContext(query, 3);
  if (!matches.length) return "";
  return [
    "Relevant Papa Life knowledge base excerpts. Use these as grounding when they fit the visitor's question. Do not mention file names unless asked.",
    ...matches.map((match, idx) => `Excerpt ${idx + 1} (${match.source} #${match.index + 1}):
${match.text}`)
  ].join("\n\n");
}

// server/papa-ai-engine.ts
var PAPA_SYSTEM_PROMPT = `You are the Papa Life AI Coach, the digital extension of Brian Keith Hill's coaching ministry.

Mission: help fathers of adult children rebuild connection, restore trust, and lead with Purpose, Authority, Presence, and Alignment.

Voice: warm, authentic, biblical, direct, hopeful, masculine, encouraging, relationship-centered, and practical. Never shame fathers. Never manipulate pain. Never guarantee reconciliation. Never sound robotic. Listen first, ask thoughtful questions, offer biblical wisdom naturally, and give one clear next step.

Core framework:
- Purpose: who the father is becoming under God.
- Authority: leading wisely without controlling.
- Presence: showing up consistently and safely.
- Alignment: living what he says matters.

Safety: this is coaching and spiritual encouragement, not therapy, legal advice, medical advice, or crisis intervention. Encourage urgent local help when harm, abuse, self-harm, or immediate danger is present.`;
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var cachedSystemPrompt = null;
function loadPapaLifeSystemPrompt() {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  const configuredPath = process.env.PAPA_LIFE_SYSTEM_PROMPT_PATH?.trim();
  const candidates = [
    configuredPath,
    path2.resolve(process.cwd(), "server", "papa-life-system-prompt.md"),
    path2.resolve(__dirname, "..", "server", "papa-life-system-prompt.md")
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      if (fs2.existsSync(candidate)) {
        cachedSystemPrompt = fs2.readFileSync(candidate, "utf8").trim();
        return cachedSystemPrompt;
      }
    } catch {
    }
  }
  cachedSystemPrompt = PAPA_SYSTEM_PROMPT;
  return cachedSystemPrompt;
}
var papaAiResources = [
  {
    title: "The PAPA Framework Guide",
    type: "Worksheet",
    pillar: "General",
    description: "A practical map for Purpose, Authority, Presence, and Alignment.",
    path: "/papa-framework",
    keywords: ["framework", "papa", "purpose", "authority", "presence", "alignment", "start"]
  },
  {
    title: "Fatherhood Didn't End. It Changed.",
    type: "Course",
    pillar: "Presence",
    description: "Free first lesson for fathers learning the new role with adult children.",
    path: "/papa-first-lesson",
    keywords: ["adult child", "changed", "first lesson", "workshop", "course"]
  },
  {
    title: "Give. Listen. Love. Serve.",
    type: "Course",
    pillar: "Presence",
    description: "A Brian Keith Hill pathway for fathers who need to show up with presence, listen first, love as the foundation, and serve without control.",
    path: "https://givlistenlove-7uppzn73.manus.space/",
    keywords: [
      "give",
      "listen",
      "love",
      "serve",
      "presence",
      "daughter",
      "silence",
      "distance",
      "reconnect",
      "adult child",
      "email series",
      "brian"
    ]
  },
  {
    title: "Adult Daughter Relationship Path",
    type: "Article",
    pillar: "Presence",
    description: "Guidance for fathers who want to reconnect with an adult daughter without pressure.",
    path: "/adult-daughter-relationship",
    keywords: ["daughter", "reconnect", "distance", "listen", "presence"]
  },
  {
    title: "Adult Son Relationship Path",
    type: "Article",
    pillar: "Authority",
    description: "A fatherhood path for adult sons, respect, humility, and repaired trust.",
    path: "/adult-son-relationship",
    keywords: ["son", "respect", "authority", "trust", "conversation"]
  },
  {
    title: "Why Adult Children Pull Away",
    type: "Article",
    pillar: "Humility",
    description: "A clear look at distance, silence, and what fathers can do first.",
    path: "/why-adult-children-pull-away",
    keywords: ["pull away", "silence", "estrangement", "distance", "humility"]
  },
  {
    title: "Father-Child Estrangement",
    type: "Article",
    pillar: "Alignment",
    description: "A steady starting point when the relationship feels broken or guarded.",
    path: "/father-child-estrangement",
    keywords: ["estrangement", "broken", "repair", "apology", "trust"]
  },
  {
    title: "Free PAPA Self-Assessment",
    type: "Worksheet",
    pillar: "General",
    description: "Score your relationship across the PAPA pillars and find your starting point.",
    path: "/assessment",
    keywords: ["assessment", "score", "clarity", "purpose", "authority", "presence", "alignment"]
  },
  {
    title: "Papa Life Tuesday Live",
    type: "Video",
    pillar: "General",
    description: "Live coaching and teaching for fathers of adult children.",
    path: "/tuesday",
    keywords: ["tuesday", "live", "questions", "show", "episode", "coaching"]
  },
  {
    title: "Papa Life Membership",
    type: "Course",
    pillar: "General",
    description: "Guided lessons, reflection tools, community, and continued growth.",
    path: "/go/join",
    keywords: ["membership", "community", "pricing", "subscription", "join", "courses"]
  },
  {
    title: "About Brian Keith Hill",
    type: "Article",
    pillar: "General",
    description: "Learn the heart and voice behind Papa Life.",
    path: "/about-brian-keith-hill",
    keywords: ["brian", "founder", "coach", "ministry", "story"]
  }
];
var papaAssessmentQuestions = [
  ["purpose_1", "I know what kind of father I am becoming in this season.", "Purpose"],
  ["purpose_2", "I can name a clear hope for my relationship with my adult child.", "Purpose"],
  ["authority_1", "I lead through humility and consistency instead of pressure.", "Authority"],
  ["authority_2", "I can take responsibility for my part without becoming defensive.", "Authority"],
  ["presence_1", "I listen before correcting, teaching, or fixing.", "Presence"],
  ["presence_2", "I initiate connection without demanding a response.", "Presence"],
  ["alignment_1", "My actions match the faith and values I say matter.", "Alignment"],
  ["alignment_2", "I have made, or am willing to make, needed apologies.", "Alignment"],
  ["communication_1", "My adult child would likely experience my tone as safe.", "Communication"],
  ["communication_2", "I ask questions that invite honesty instead of control.", "Communication"],
  ["forgiveness_1", "I am willing to forgive without pretending nothing happened.", "Forgiveness"],
  ["forgiveness_2", "I can seek forgiveness without rushing the other person's healing.", "Forgiveness"],
  ["trust_1", "I understand trust is rebuilt through repeated small actions.", "Trust"],
  ["trust_2", "I keep my word in ways my family can see.", "Trust"],
  ["humility_1", "I can admit where age, authority, or pride made me hard to reach.", "Humility"],
  ["humility_2", "I am willing to change first even if my child is not ready.", "Humility"],
  ["listening_1", "I can hear pain without immediately defending myself.", "Listening"],
  ["listening_2", "I can reflect back what I heard before offering my view.", "Listening"],
  ["connection_1", "I make room for simple connection, not only serious talks.", "Connection"],
  ["connection_2", "I know one small, respectful next step I can take this week.", "Connection"]
];
function getPapaAiStatus() {
  const provider = resolveConfiguredProvider();
  const configuredDefault = normalizeProvider(process.env.DEFAULT_AI_PROVIDER);
  return {
    ok: true,
    live_ai_enabled: provider !== "local",
    provider,
    default_provider: configuredDefault === "local" && provider !== "local" ? provider : configuredDefault,
    selected_provider: provider,
    prompt_source: process.env.PAPA_LIFE_SYSTEM_PROMPT_PATH || "server/papa-life-system-prompt.md",
    knowledge_base: getPapaLifeKbStatus(),
    supported_providers: ["openai", "anthropic", "gemini"],
    inactive_message: provider === "local" ? "Live provider is not connected yet. Papa Life guided coaching mode is active." : "Live AI provider is connected."
  };
}
function buildRuntimeSystemPrompt(message) {
  const kbContext = buildPapaLifeKbPromptContext(message);
  if (!kbContext) return loadPapaLifeSystemPrompt();
  return `${loadPapaLifeSystemPrompt()}

---

${kbContext}`;
}
function buildPapaAiLocalReply(input) {
  const message = input.message.trim();
  const mode = input.mode || "coach";
  const lower = message.toLowerCase();
  const pillar = detectPillar(lower);
  const need = detectNeed(lower);
  const resources = findPapaResources(message, 3);
  if (isCrisisLike(lower)) {
    return {
      provider: "local",
      reply: "Father, I want to answer with care. If there is immediate danger, abuse, violence, or thoughts of self-harm, pause the coaching path and contact local emergency help or a trusted crisis resource right now. Papa Life can walk with fatherhood repair, but safety comes first.\n\nWhen things are stable, start with one grounded step: write down what happened, who may be at risk, and who can help you make the next wise call today.",
      resources: findPapaResources("safety trust support", 3)
    };
  }
  if (mode === "prayer") {
    return {
      provider: "local",
      reply: buildPrayer(message, pillar),
      resources
    };
  }
  if (mode === "bible-study") {
    return {
      provider: "local",
      reply: buildBibleStudy(message, pillar),
      resources
    };
  }
  if (mode === "resource") {
    return {
      provider: "local",
      reply: `Here is where I would start based on what you shared: ${resources[0]?.title || "The PAPA Framework Guide"}.

Look for the resource that helps you take one next faithful step, not the one that gives you the most information. The father changes first, and small consistent action rebuilds more trust than a large emotional speech.`,
      resources
    };
  }
  if (mode === "tuesday") {
    return {
      provider: "local",
      reply: "That is a strong Tuesday Live question. I would frame it this way for the show: what does a father do when he wants repair, but his adult child is not ready for the conversation?\n\nStart with humility, then move to one practical action. Ask the question before Tuesday, bring one real example, and the follow-up resource should point back to Presence and Alignment.",
      resources: findPapaResources(`${message} Tuesday live`, 3)
    };
  }
  if (mode === "membership") {
    return {
      provider: "local",
      reply: "Papa Life membership is for fathers who do not want a one-time emotional moment. They want a path. The value is guided lessons, reflection, brotherhood, and steady practice around Purpose, Authority, Presence, and Alignment.\n\nIf you are ready to work through this with structure, start with the free assessment, then move into the membership path when you want ongoing guidance.",
      resources: findPapaResources("membership courses community", 3)
    };
  }
  return {
    provider: "local",
    reply: buildCoachingReply(message, pillar, need),
    resources
  };
}
async function buildPapaAiReply(input) {
  const provider = resolveConfiguredProvider();
  if (provider === "openai") return completeWithOpenAI(input);
  if (provider === "anthropic") return completeWithAnthropic(input);
  if (provider === "gemini") return completeWithGemini(input);
  return buildPapaAiLocalReply(input);
}
function findPapaResources(query, limit = 6) {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  const scored = papaAiResources.map((resource) => {
    const haystack = [
      resource.title,
      resource.type,
      resource.pillar,
      resource.description,
      ...resource.keywords
    ].join(" ").toLowerCase();
    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    return { resource, score };
  });
  return scored.sort((a, b) => b.score - a.score || a.resource.title.localeCompare(b.resource.title)).slice(0, limit).map((item) => item.resource);
}
function buildAssessmentReport(answers) {
  const valid = answers.filter((answer) => Number.isFinite(answer.score)).map((answer) => ({
    ...answer,
    score: Math.max(1, Math.min(5, Math.round(answer.score)))
  }));
  const groups = /* @__PURE__ */ new Map();
  for (const answer of valid) {
    const current = groups.get(answer.pillar) || { total: 0, count: 0 };
    current.total += answer.score;
    current.count += 1;
    groups.set(answer.pillar, current);
  }
  const scores = Array.from(groups.entries()).map(([pillar, value]) => ({
    pillar,
    score: value.total,
    max: value.count * 5,
    percent: Math.round(value.total / (value.count * 5) * 100)
  }));
  const focus = [...scores].sort((a, b) => a.percent - b.percent)[0];
  const strength = [...scores].sort((a, b) => b.percent - a.percent)[0];
  const focusPillar = focus?.pillar || "Presence";
  const resources = findPapaResources(focusPillar, 4);
  return {
    summary: `Your first focus is ${focusPillar}. This is not a judgment. It is the clearest starting point for your next season of fatherhood.`,
    focus_pillar: focusPillar,
    strength_pillar: strength?.pillar || "Purpose",
    scores,
    next_steps: [
      "Pray before you plan the conversation.",
      "Write one sentence of ownership without explaining yourself.",
      "Choose one small act of presence this week.",
      "Use the free workshop or membership path for continued practice."
    ],
    report: `Father, your report points first to ${focusPillar}. Start there with humility and hope. Do not try to repair the whole relationship in one conversation. Ask God for a clean heart, take responsibility for your part, and practice one steady action your adult child can experience as safe.`,
    resources
  };
}
function resolveConfiguredProvider() {
  const preferred = normalizeProvider(process.env.DEFAULT_AI_PROVIDER);
  if (preferred === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (preferred === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (preferred === "gemini" && (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY)) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY) return "gemini";
  return "local";
}
function normalizeProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  if (provider === "openai" || provider === "anthropic" || provider === "gemini") return provider;
  return "local";
}
async function completeWithOpenAI(input) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: buildRuntimeSystemPrompt(input.message) },
        ...(input.history || []).slice(-8),
        { role: "user", content: input.message }
      ]
    })
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error?.message || "OpenAI request failed");
  return {
    provider: "openai",
    reply: String(json?.choices?.[0]?.message?.content || "").trim(),
    resources: findPapaResources(input.message, 3)
  };
}
async function completeWithAnthropic(input) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": String(process.env.ANTHROPIC_API_KEY),
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      max_tokens: 900,
      temperature: 0.7,
      system: buildRuntimeSystemPrompt(input.message),
      messages: [
        ...(input.history || []).filter((m) => m.role !== "system").slice(-8),
        { role: "user", content: input.message }
      ]
    })
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error?.message || "Anthropic request failed");
  return {
    provider: "anthropic",
    reply: String(json?.content?.[0]?.text || "").trim(),
    resources: findPapaResources(input.message, 3)
  };
}
async function completeWithGemini(input) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(String(key))}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildRuntimeSystemPrompt(input.message) }] },
        contents: [
          ...(input.history || []).filter((m) => m.role !== "system").slice(-8).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          { role: "user", parts: [{ text: input.message }] }
        ]
      })
    }
  );
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error?.message || "Gemini request failed");
  return {
    provider: "gemini",
    reply: String(json?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim(),
    resources: findPapaResources(input.message, 3)
  };
}
function detectPillar(text) {
  if (/(purpose|identity|legacy|meaning|calling)/.test(text)) return "Purpose";
  if (/(authority|respect|control|lead|anger|defensive)/.test(text)) return "Authority";
  if (/(presence|listen|silent|distance|daughter|son|available|show up)/.test(text)) return "Presence";
  if (/(alignment|apology|faith|values|integrity|consistent)/.test(text)) return "Alignment";
  return "Presence";
}
function detectNeed(text) {
  if (/(daughter)/.test(text)) return "daughter";
  if (/(son)/.test(text)) return "son";
  if (/(sorry|apolog|forgive)/.test(text)) return "apology";
  if (/(silent|won't talk|not talking|estranged|distance)/.test(text)) return "distance";
  if (/(membership|price|join|subscription)/.test(text)) return "membership";
  return "repair";
}
function isCrisisLike(text) {
  return /(suicide|self harm|kill myself|violence|abuse|danger|threat|weapon|emergency)/.test(text);
}
function buildCoachingReply(message, pillar, need) {
  const firstQuestion = need === "daughter" ? "What do you believe your daughter needs to feel safe enough to hear you again?" : need === "son" ? "What kind of respect are you trying to build: demanded respect, or earned trust?" : need === "apology" ? "What part can you own without adding an explanation after it?" : "What is the one part of this situation that is actually yours to change?";
  return `Father, start here: do not try to fix the whole relationship in one move.

What I hear is a ${pillar} issue. That means the next step is not pressure. It is a steadier way to show up.

${firstQuestion}

Here is the practical move for this week: write one short message that carries humility, not control. Something like, "I've been thinking about how I have shown up, and I want to listen better. No pressure to respond today. I just want you to know I love you and I am working on my part."

Scripture says to be quick to listen and slow to speak. That is not weakness. That is fatherhood with maturity.

Your next step: before you send anything, remove every sentence that tries to defend, explain, or force a response. Keep the love. Keep the ownership. Let Presence lead.`;
}
function buildPrayer(message, pillar) {
  return `Father God,

Give me a clean heart and a steady spirit. Help me lead with ${pillar}, not pride. Teach me to listen before I answer, to own what is mine, and to love without trying to control the outcome.

Where I have caused pain, give me humility. Where I have been silent, give me courage. Where I have pushed too hard, teach me patience. Let my adult child experience me as safe, honest, and consistent.

Lord, make me the kind of father whose words and actions line up. Help me walk in truth, grace, forgiveness, and love.

Amen.`;
}
function buildBibleStudy(message, pillar) {
  return `Bible Study: Fatherhood, ${pillar}, and Repair

Observation:
Read James 1:19 and notice the order: listening comes before speaking. The text does not tell a father to stop leading. It teaches him how mature leadership begins.

Interpretation:
In adult-child relationships, authority cannot depend on position alone. A father earns trust through humility, patience, and consistent love.

Application:
Before your next conversation, write down three things: what you heard, what you can own, and what you will do differently. Do not write what your child must change first.

Reflection:
Where have I been trying to be understood before I have made my adult child feel heard?

Prayer:
Lord, make me slow to speak, quick to listen, and faithful in the small actions that rebuild trust. Amen.`;
}

// server/index.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
var appRoot = path3.resolve(__dirname2, "..");
dotenv.config({ path: path3.resolve(__dirname2, "..", ".env") });
var mediaUploadRoot = path3.resolve(__dirname2, "..", "uploads", "media");
function trainingContentTypeFromMime(mimetype) {
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  if (mimetype === "application/pdf") return "pdf";
  return "document";
}
var mediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs3.mkdirSync(mediaUploadRoot, { recursive: true });
      cb(null, mediaUploadRoot);
    },
    filename: (_req, file, cb) => {
      const ext = path3.extname(file.originalname || "") || "";
      cb(null, `${nanoid(18)}${ext}`);
    }
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith("video/") || file.mimetype.startsWith("audio/") || file.mimetype === "application/pdf";
    if (ok) cb(null, true);
    else cb(new Error("Only video, audio, or PDF files are allowed"));
  }
});
var dbPath = path3.resolve(__dirname2, "..", "leads.db");
var db = new Database(dbPath);
var STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
var ISHAREPROPOSALS_STEP_3_VIDEO_URL = "/walkthrough/videos/P2P_Dojo_04_AI_Tools.mp4";
var ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID || "agent_7601kt209ptbe0qrd9b3e4gezyv6";
var ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
var ELEVENLABS_EXPECTED_AGENT_NAME = process.env.ELEVENLABS_AGENT_NAME || "Brian Keith Hill";
var ELEVENLABS_EXPECTED_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "Eo4ci7V2rQPrk0GndhOG";
var ELEVENLABS_EXPECTED_VOICE_NAME = process.env.ELEVENLABS_VOICE_NAME || "Brian Keith Hill";
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invited_by TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    mobile_phone TEXT NOT NULL,
    business_email TEXT NOT NULL,
    business_name TEXT,
    website TEXT,
    street_address TEXT,
    address2 TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    consent_transactional INTEGER NOT NULL DEFAULT 0,
    consent_marketing INTEGER NOT NULL DEFAULT 0,
    checkout_status TEXT NOT NULL DEFAULT 'form_submitted',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lead_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    due_date TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    payment_status TEXT NOT NULL DEFAULT 'paid',
    trial_started_at TEXT,
    trial_expires_at TEXT,
    paid_at TEXT,
    stripe_customer_id TEXT,
    stripe_checkout_session_id TEXT,
    enrolled_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    pillar TEXT NOT NULL DEFAULT 'General',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    content_url TEXT,
    content_type TEXT NOT NULL DEFAULT 'video',
    sort_order INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS member_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(member_id, lesson_id)
  );

  CREATE TABLE IF NOT EXISTS journal_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pillar TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    pillar TEXT NOT NULL,
    prompt TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS community_circles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    member_count INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    circle_id INTEGER NOT NULL REFERENCES community_circles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS member_circle_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    circle_id INTEGER NOT NULL REFERENCES community_circles(id) ON DELETE CASCADE,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(member_id, circle_id)
  );

  CREATE TABLE IF NOT EXISTS platform_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT NOT NULL,
    event_time TEXT,
    format TEXT NOT NULL DEFAULT 'zoom',
    location TEXT,
    zoom_link TEXT,
    is_free INTEGER NOT NULL DEFAULT 1,
    is_members_only INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS event_rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES platform_events(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(member_id, event_id)
  );

  CREATE TABLE IF NOT EXISTS resource_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    pillar TEXT NOT NULL DEFAULT 'General',
    file_url TEXT,
    type TEXT NOT NULL DEFAULT 'pdf',
    is_free INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_text TEXT NOT NULL,
    pillar TEXT NOT NULL DEFAULT 'General',
    scheduled_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS member_daily_reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    reflection_id INTEGER NOT NULL REFERENCES daily_reflections(id) ON DELETE CASCADE,
    marked_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(member_id, reflection_id)
  );

  CREATE TABLE IF NOT EXISTS intake_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    situation TEXT NOT NULL,
    routed_pillar TEXT NOT NULL,
    disconnected_pillar TEXT,
    vision TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS engagement_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS traffic_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doorway TEXT NOT NULL,
    destination TEXT NOT NULL,
    source TEXT,
    campaign TEXT,
    referrer TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS papa_daily_work_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date TEXT NOT NULL,
    title TEXT NOT NULL,
    outreach TEXT,
    content_creation TEXT,
    scheduling TEXT,
    automation TEXT,
    coaching TEXT,
    pipeline TEXT,
    revenue TEXT,
    research TEXT,
    outcomes TEXT NOT NULL DEFAULT '[]',
    win TEXT,
    markdown TEXT NOT NULL,
    ventures_saved INTEGER NOT NULL DEFAULT 0,
    ventures_error TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversion_pipeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    stage TEXT NOT NULL DEFAULT 'discovery',
    intake_completed INTEGER NOT NULL DEFAULT 0,
    content_interactions INTEGER NOT NULL DEFAULT 0,
    community_posts INTEGER NOT NULL DEFAULT 0,
    event_rsvps INTEGER NOT NULL DEFAULT 0,
    closer_eligible INTEGER NOT NULL DEFAULT 0,
    closer_sent_at TEXT,
    booked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS papa_ai_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    first_name TEXT,
    email TEXT,
    phone TEXT,
    source_page TEXT,
    user_message TEXT,
    assistant_reply TEXT,
    conversation_summary TEXT,
    provider TEXT NOT NULL DEFAULT 'local',
    assessment_result_json TEXT,
    report_json TEXT,
    recommended_resources_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS member_payment_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    provider TEXT NOT NULL DEFAULT 'external',
    transaction_id TEXT,
    email TEXT,
    amount_cents INTEGER,
    raw_payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notification_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    provider TEXT,
    recipient TEXT,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    response_status INTEGER,
    error TEXT,
    payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
try {
  db.exec("ALTER TABLE leads ADD COLUMN status TEXT NOT NULL DEFAULT 'New'");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN adult_children_count INTEGER DEFAULT 0");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN emotional_state TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN primary_pillar TEXT DEFAULT 'Purpose'");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN faith_tradition TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN daily_reminder INTEGER NOT NULL DEFAULT 0");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN brotherhood_notifications INTEGER NOT NULL DEFAULT 1");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN streak_days INTEGER NOT NULL DEFAULT 0");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN last_active_date TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'paid'");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN trial_started_at TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN trial_expires_at TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN paid_at TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN stripe_customer_id TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE members ADD COLUMN stripe_checkout_session_id TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE community_posts ADD COLUMN likes INTEGER NOT NULL DEFAULT 0");
} catch {
}
try {
  db.exec("ALTER TABLE platform_events ADD COLUMN max_attendees INTEGER");
} catch {
}
db.exec(`
  CREATE TABLE IF NOT EXISTS content_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    summary TEXT,
    snapshot_json TEXT NOT NULL,
    published_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS content_drip_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    release_days_after_enroll INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS content_sync_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL DEFAULT 'ghl',
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payload_json TEXT,
    response_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS form_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_key TEXT NOT NULL,
    question_key TEXT NOT NULL,
    label TEXT NOT NULL,
    help_text TEXT,
    input_type TEXT NOT NULL DEFAULT 'text',
    required INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    placeholder TEXT,
    options_json TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(form_key, question_key)
  );

  CREATE TABLE IF NOT EXISTS member_course_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    granted INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(member_id, course_id)
  );
`);
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      tag_slug TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(lead_id, tag_slug)
    );
    CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON lead_tags(lead_id);
  `);
} catch (e) {
  console.error("[crm] lead_tags table:", e);
}
try {
  db.exec("ALTER TABLE courses ADD COLUMN show_in_catalog INTEGER NOT NULL DEFAULT 1");
} catch {
}
try {
  db.exec("ALTER TABLE intake_submissions ADD COLUMN answers_json TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE intake_submissions ADD COLUMN phone TEXT");
} catch {
}
try {
  db.exec("CREATE INDEX IF NOT EXISTS idx_papa_ai_interactions_session ON papa_ai_interactions(session_id, created_at)");
} catch {
}
try {
  db.exec("CREATE INDEX IF NOT EXISTS idx_member_payment_events_member ON member_payment_events(member_id, created_at)");
} catch {
}
try {
  db.exec("CREATE INDEX IF NOT EXISTS idx_member_payment_events_email ON member_payment_events(email, created_at)");
} catch {
}
try {
  db.exec("CREATE INDEX IF NOT EXISTS idx_notification_events_created ON notification_events(created_at)");
} catch {
}
try {
  db.exec("ALTER TABLE papa_ai_interactions ADD COLUMN source_page TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE papa_ai_interactions ADD COLUMN conversation_summary TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE papa_ai_interactions ADD COLUMN assessment_result_json TEXT");
} catch {
}
try {
  const intakeCols = db.prepare("PRAGMA table_info(intake_submissions)").all();
  const emailCol = intakeCols.find((c) => c.name === "email");
  const emailIsNotNull = Number(emailCol?.notnull ?? 0) === 1;
  const hasPhone = intakeCols.some((c) => c.name === "phone");
  const hasAnswersJson = intakeCols.some((c) => c.name === "answers_json");
  if (emailIsNotNull) {
    const phoneSelect = hasPhone ? "phone" : "NULL as phone";
    const answersSelect = hasAnswersJson ? "answers_json" : "NULL as answers_json";
    db.exec("BEGIN");
    db.exec(`
      CREATE TABLE intake_submissions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        situation TEXT NOT NULL,
        routed_pillar TEXT NOT NULL,
        disconnected_pillar TEXT,
        vision TEXT,
        answers_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO intake_submissions_new
        (id, first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision, answers_json, created_at)
      SELECT
        id,
        first_name,
        email,
        ${phoneSelect},
        situation,
        routed_pillar,
        disconnected_pillar,
        vision,
        ${answersSelect},
        created_at
      FROM intake_submissions;

      DROP TABLE intake_submissions;
      ALTER TABLE intake_submissions_new RENAME TO intake_submissions;
    `);
    db.exec("COMMIT");
  }
} catch {
  try {
    db.exec("ROLLBACK");
  } catch {
  }
}
try {
  const pillarOpts = JSON.stringify(["Purpose", "Authority", "Presence", "Alignment"]);
  db.prepare(
    `UPDATE form_questions SET options_json = ?, updated_at = datetime('now')
     WHERE form_key = 'intake_submission' AND question_key IN ('routed_pillar','disconnected_pillar')
       AND (options_json IS NULL OR options_json = '' OR options_json = '[]')`
  ).run(pillarOpts);
} catch {
}
ensureResearchTables(db);
ensureSiteCtasTable(db);
ensureSiteMediaTable(db);
ensurePricingSettingsTable(db);
var intakeQuestionCount = db.prepare("SELECT COUNT(*) as c FROM form_questions WHERE form_key = 'intake_submission'").get().c;
if (intakeQuestionCount === 0) {
  const insertQ = db.prepare(
    "INSERT INTO form_questions (form_key, question_key, label, input_type, required, sort_order, placeholder) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  insertQ.run("intake_submission", "first_name", "First name", "text", 1, 1, "Your first name");
  insertQ.run("intake_submission", "email", "Email", "email", 0, 2, "you@example.com");
  insertQ.run("intake_submission", "phone", "Phone", "tel", 0, 3, "Your best phone number");
  insertQ.run("intake_submission", "situation", "Current situation", "textarea", 1, 4, "What is happening right now?");
  insertQ.run("intake_submission", "routed_pillar", "Primary pillar", "select", 1, 5, null);
  insertQ.run("intake_submission", "disconnected_pillar", "Disconnected pillar", "select", 0, 6, null);
  insertQ.run("intake_submission", "vision", "Future vision", "textarea", 0, 7, "What do you want life to look like?");
}
try {
  const hasPhoneQuestion = db.prepare(
    "SELECT COUNT(*) as c FROM form_questions WHERE form_key = 'intake_submission' AND question_key = 'phone'"
  ).get().c;
  if (hasPhoneQuestion === 0) {
    db.prepare(
      "INSERT INTO form_questions (form_key, question_key, label, input_type, required, sort_order, placeholder, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
    ).run("intake_submission", "phone", "Phone", "tel", 0, 3, "Your best phone number");
  }
  db.prepare(
    "UPDATE form_questions SET required = 0, updated_at = datetime('now') WHERE form_key = 'intake_submission' AND question_key IN ('email', 'phone')"
  ).run();
} catch {
}
var existingAdmin = db.prepare("SELECT id FROM admin_users WHERE username = ?").get("papalife");
if (!existingAdmin) {
  const hash = bcrypt.hashSync("PaPaLife123!@", 10);
  db.prepare("INSERT INTO admin_users (username, password_hash, display_name, email) VALUES (?, ?, ?, ?)").run("papalife", hash, "PAPA Life Admin", "brian@bossmobility.net");
}
db.prepare("UPDATE admin_users SET email = ? WHERE username = ? AND email != ?").run("brian@bossmobility.net", "papalife", "brian@bossmobility.net");
var promptCount = db.prepare("SELECT COUNT(*) as c FROM journal_prompts").get().c;
if (promptCount === 0) {
  const insertPrompt = db.prepare("INSERT INTO journal_prompts (pillar, prompt_text, sort_order) VALUES (?, ?, ?)");
  [
    ["Purpose", "What is your deepest motivation for being a father, beyond providing financially?", 1],
    ["Purpose", "Describe a moment when you felt completely aligned with your purpose as a dad. What made it powerful?", 2],
    ["Purpose", "What legacy do you want your adult children to carry forward from your relationship?", 3],
    ["Authority", "Reflect on a time you led your family with grace rather than force. What was the outcome?", 1],
    ["Authority", "Where do you struggle most between being too passive or too controlling as a father?", 2],
    ["Authority", "What does healthy authority look like in your relationship with your adult child?", 3],
    ["Presence", "When was the last time your adult child felt truly heard by you? What did that look like?", 1],
    ["Presence", "What distractions keep you from being emotionally present with your family?", 2],
    ["Presence", "Write about a specific moment this week where you showed up fully for your child.", 3],
    ["Alignment", "How well do your daily actions align with your stated values as a father?", 1],
    ["Alignment", "Where does tension exist between your faith, family, and business priorities?", 2],
    ["Alignment", "What one change would bring your life into greater alignment with who you want to be?", 3]
  ].forEach(([pillar, text, order]) => insertPrompt.run(pillar, text, order));
}
var circleCount = db.prepare("SELECT COUNT(*) as c FROM community_circles").get().c;
if (circleCount === 0) {
  const ic = db.prepare("INSERT INTO community_circles (name, description, category, sort_order) VALUES (?, ?, ?, ?)");
  ic.run("Purpose Pillar Circle", "Discover and live out your God-given purpose as a father.", "Purpose", 1);
  ic.run("Authority & Leadership", "Lead your family with strength, grace, and godly authority.", "Authority", 2);
  ic.run("Presence Brotherhood", "Show up fully for your children \u2014 emotionally and physically.", "Presence", 3);
  ic.run("Life Alignment Circle", "Align your faith, family, and business into one coherent whole.", "Alignment", 4);
}
var reflCount = db.prepare("SELECT COUNT(*) as c FROM daily_reflections").get().c;
if (reflCount === 0) {
  const ir = db.prepare("INSERT INTO daily_reflections (prompt_text, pillar) VALUES (?, ?)");
  ir.run("How did you show up as a father yesterday? What's one thing you'd do differently today?", "Presence");
  ir.run("What's one way your adult child needs you to lead differently this week?", "Authority");
  ir.run("Write down one area where your daily actions don't match your stated values.", "Alignment");
  ir.run("What does your legacy look like 10 years from now? Describe it in detail.", "Purpose");
  ir.run("When did you last tell your child you are proud of them? Plan to do it today.", "Presence");
  ir.run("What fear is holding you back from stepping fully into your father role?", "Authority");
  ir.run("Where does God want you to grow as a father this season?", "Purpose");
  ir.run("List three things your family needs from you that only YOU can give.", "Alignment");
}
var resourceLibraryFileUrls = [
  {
    title: "The PAPA Framework Guide",
    fileUrl: "/resources/library/papa-framework-guide.pdf",
    filename: "papa-framework-guide.pdf"
  },
  {
    title: "Purpose Discovery Worksheet",
    fileUrl: "/resources/library/purpose-discovery-worksheet.pdf",
    filename: "purpose-discovery-worksheet.pdf"
  },
  {
    title: "Authority Without Anger Workbook",
    fileUrl: "/api/member/library/3/download",
    filename: "authority-without-anger-workbook.pdf"
  },
  {
    title: "Presence Practices (30-Day Plan)",
    fileUrl: "/resources/library/presence-practices-30-day-plan.pdf",
    filename: "presence-practices-30-day-plan.pdf"
  },
  {
    title: "Life Alignment Assessment",
    fileUrl: "/resources/library/life-alignment-assessment.pdf",
    filename: "life-alignment-assessment.pdf"
  },
  {
    title: "Cosmic Insights: Lunar Journal Companion",
    fileUrl: "/api/member/library/6/download",
    filename: "cosmic-insights-lunar-journal-companion.pdf"
  }
];
var resourceLibCount = db.prepare("SELECT COUNT(*) as c FROM resource_library").get().c;
if (resourceLibCount === 0) {
  const irlib = db.prepare("INSERT INTO resource_library (title, description, pillar, file_url, type, is_free, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)");
  irlib.run("The PAPA Framework Guide", "Your complete roadmap to the 4 pillars of fatherhood mastery.", "General", "/resources/library/papa-framework-guide.pdf", "pdf", 1, 1);
  irlib.run("Purpose Discovery Worksheet", "A deep-dive exercise to uncover your God-given purpose as a dad.", "Purpose", "/resources/library/purpose-discovery-worksheet.pdf", "pdf", 1, 2);
  irlib.run("Authority Without Anger Workbook", "Learn to lead with strength and grace, not fear.", "Authority", "/api/member/library/3/download", "pdf", 0, 3);
  irlib.run("Presence Practices (30-Day Plan)", "Daily micro-habits to be more present with your adult children.", "Presence", "/resources/library/presence-practices-30-day-plan.pdf", "pdf", 1, 4);
  irlib.run("Life Alignment Assessment", "Score your alignment across faith, family, and business.", "Alignment", "/resources/library/life-alignment-assessment.pdf", "pdf", 1, 5);
  irlib.run("Cosmic Insights: Lunar Journal Companion", "Use moon cycles to guide your fatherhood reflections.", "General", "/api/member/library/6/download", "pdf", 0, 6);
}
var updateResourceLibraryFileUrl = db.prepare(
  "UPDATE resource_library SET file_url = ? WHERE title = ? AND (file_url IS NULL OR file_url = '' OR file_url LIKE '/resources/library/%' OR file_url LIKE '/api/member/library/%/download')"
);
for (const resource of resourceLibraryFileUrls) {
  updateResourceLibraryFileUrl.run(resource.fileUrl, resource.title);
}
var eventCount = db.prepare("SELECT COUNT(*) as c FROM platform_events").get().c;
if (eventCount === 0) {
  const iev = db.prepare("INSERT INTO platform_events (title, description, event_date, event_time, format, is_free, is_members_only, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  iev.run("Brotherhood Power Hour", "Weekly live call \u2014 share wins, get coaching, build brotherhood.", "2026-04-02", "7:00 PM EST", "zoom", 0, 1, 1);
  iev.run("Purpose Deep Dive Workshop", "3-hour intensive on discovering and living your fatherhood purpose.", "2026-04-12", "10:00 AM EST", "zoom", 0, 1, 2);
  iev.run("New Member Orientation", "Get oriented to the PAPA Life platform and community.", "2026-04-05", "6:00 PM EST", "zoom", 1, 0, 3);
  iev.run("Fathers & Sons Strategy Day", "In-person day of strategy, bonding, and breakthrough.", "2026-04-26", "9:00 AM EST", "in-person", 0, 1, 4);
}
var insertLead = db.prepare(`
  INSERT INTO leads (
    invited_by, first_name, last_name, mobile_phone, business_email,
    business_name, website, street_address, address2, city, state, country,
    postal_code, consent_transactional, consent_marketing, checkout_status
  ) VALUES (
    @invited_by, @first_name, @last_name, @mobile_phone, @business_email,
    @business_name, @website, @street_address, @address2, @city, @state, @country,
    @postal_code, @consent_transactional, @consent_marketing, @checkout_status
  )
`);
try {
  const { created } = backfillIntakeSubmissionsToCrmLeads(db);
  if (created > 0) console.log(`[crm] Backfilled ${created} strategist intake(s) into CRM leads`);
} catch (e) {
  console.error("[crm] intake backfill failed:", e);
}
try {
  ensureGhlAutomationTables(db);
} catch (e) {
  console.error("[ghl-automation] table init failed:", e);
}
try {
  ensureGhlIntegrationTable(db);
} catch (e) {
  console.error("[ghl-integration] table init failed:", e);
}
try {
  const result = db.prepare(
    `UPDATE lessons
       SET content_url = ?, content_type = 'video'
       WHERE id = 55
         AND course_id = 7
         AND (content_url IS NULL OR trim(content_url) = '')`
  ).run(ISHAREPROPOSALS_STEP_3_VIDEO_URL);
  if (result.changes > 0) {
    console.log("[courses] Added missing video URL for course 7 lesson 55");
  }
} catch (e) {
  console.error("[courses] lesson 55 video backfill failed:", e);
}
var SQLiteStore = connectSqlite3(session);
function requireAuth(req, res, next) {
  if (req.session.adminId) return next();
  res.status(401).json({ ok: false, error: "Unauthorized" });
}
function addHours(iso, hours) {
  const start = new Date(iso);
  return new Date(start.getTime() + hours * 60 * 60 * 1e3).toISOString();
}
function formatAmountDisplay(amountCents, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2
  }).format(amountCents / 100);
}
function normalizeReportDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function normalizeReportFields(value) {
  return {
    outreach: String(value?.outreach || "").trim(),
    contentCreation: String(value?.contentCreation || "").trim(),
    scheduling: String(value?.scheduling || "").trim(),
    automation: String(value?.automation || "").trim(),
    coaching: String(value?.coaching || "").trim(),
    pipeline: String(value?.pipeline || "").trim(),
    revenue: String(value?.revenue || "").trim(),
    research: String(value?.research || "").trim(),
    win: String(value?.win || "").trim()
  };
}
function normalizeOutcomes(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 30);
}
function textOrNoneForReport(value) {
  return value.trim() || "(none logged)";
}
function cleanPublicText(value, max = 4e3) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
function normalizePapaAiLead(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    first_name: cleanPublicText(source.first_name ?? source.firstName, 80),
    email: cleanPublicText(source.email, 160).toLowerCase(),
    phone: cleanPublicText(source.phone, 40)
  };
}
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function elevenLabsApiHeaders() {
  return {
    "xi-api-key": ELEVENLABS_API_KEY
  };
}
async function fetchElevenLabsJson(pathname) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is missing; Brian Keith Hill voice cannot be verified.");
  }
  const response = await fetch(`https://api.elevenlabs.io${pathname}`, {
    headers: elevenLabsApiHeaders()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.detail?.message || data?.detail || response.statusText;
    throw new Error(`ElevenLabs ${response.status}: ${message}`);
  }
  return data;
}
async function getElevenLabsVoiceConfig() {
  if (!ELEVENLABS_AGENT_ID) {
    throw new Error("ELEVENLABS_AGENT_ID is missing; Brian Keith Hill voice cannot be verified.");
  }
  if (!ELEVENLABS_EXPECTED_VOICE_ID) {
    throw new Error("ELEVENLABS_VOICE_ID is missing; refusing to use a fallback TTS voice.");
  }
  const agent = await fetchElevenLabsJson(`/v1/convai/agents/${encodeURIComponent(ELEVENLABS_AGENT_ID)}`);
  const voice = await fetchElevenLabsJson(`/v1/voices/${encodeURIComponent(ELEVENLABS_EXPECTED_VOICE_ID)}`);
  const actualVoiceId = String(agent?.conversation_config?.tts?.voice_id || "");
  const actualVoiceName = String(voice?.name || "");
  const voiceOverrideAllowed = Boolean(
    agent?.platform_settings?.overrides?.conversation_config_override?.tts?.voice_id
  );
  const config = {
    provider: "elevenlabs",
    agent_id: ELEVENLABS_AGENT_ID,
    agent_name: String(agent?.name || ""),
    tts_model_id: String(agent?.conversation_config?.tts?.model_id || ""),
    voice_id: actualVoiceId,
    voice_name: actualVoiceName,
    voice_override_allowed: voiceOverrideAllowed
  };
  if (config.agent_name !== ELEVENLABS_EXPECTED_AGENT_NAME) {
    throw new Error(
      `ElevenLabs agent mismatch: expected "${ELEVENLABS_EXPECTED_AGENT_NAME}", got "${config.agent_name}".`
    );
  }
  if (config.voice_id !== ELEVENLABS_EXPECTED_VOICE_ID) {
    throw new Error(
      `ElevenLabs TTS voice mismatch: expected Brian Keith Hill voice ${ELEVENLABS_EXPECTED_VOICE_ID}, got ${config.voice_id || "none"}.`
    );
  }
  if (config.voice_name !== ELEVENLABS_EXPECTED_VOICE_NAME) {
    throw new Error(
      `ElevenLabs voice name mismatch: expected "${ELEVENLABS_EXPECTED_VOICE_NAME}", got "${config.voice_name}".`
    );
  }
  if (config.voice_override_allowed) {
    throw new Error("ElevenLabs voice override is enabled; refusing to allow client-side TTS voice swaps.");
  }
  return config;
}
async function assertElevenLabsVoiceConfig(context) {
  const config = await getElevenLabsVoiceConfig();
  console.info("[elevenlabs] voice config verified", {
    context,
    provider: config.provider,
    agent_id: config.agent_id,
    agent_name: config.agent_name,
    tts_model_id: config.tts_model_id,
    voice_id: config.voice_id,
    voice_name: config.voice_name,
    voice_override_allowed: config.voice_override_allowed
  });
  return config;
}
async function getElevenLabsWidgetConfig(conversationSignature) {
  const data = await fetchElevenLabsJson(
    `/v1/convai/agents/${encodeURIComponent(ELEVENLABS_AGENT_ID)}/widget?conversation_signature=${encodeURIComponent(
      conversationSignature
    )}`
  );
  if (!data?.widget_config || typeof data.widget_config !== "object") {
    throw new Error("ElevenLabs widget config response is missing widget_config.");
  }
  return data.widget_config;
}
function publicVoiceWebSocketUrl(req, signedUrl) {
  const upstream = new URL(signedUrl);
  const forwardedProto = String(req.get("x-forwarded-proto") || req.protocol || "https").split(",")[0].trim();
  const host = req.get("host");
  if (!host) throw new Error("Missing host header");
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
  const protocol = isLocalHost && forwardedProto === "http" ? "ws" : "wss";
  const proxied = new URL(`${protocol}://${host}/api/ai/voice/ws`);
  upstream.searchParams.forEach((value, key) => {
    proxied.searchParams.append(key, value);
  });
  return proxied.toString();
}
function rejectVoiceSocket(socket, statusCode, statusText) {
  if (socket.destroyed) return;
  socket.write(
    `HTTP/1.1 ${statusCode} ${statusText}\r
Connection: close\r
Content-Type: text/plain; charset=utf-8\r
Content-Length: ${Buffer.byteLength(statusText)}\r
\r
` + statusText
  );
  socket.destroy();
}
function proxyElevenLabsVoiceWebSocket(req, socket, head) {
  let requestUrl;
  try {
    requestUrl = new URL(req.url || "", "http://localhost");
  } catch {
    rejectVoiceSocket(socket, 400, "Bad Request");
    return;
  }
  if (requestUrl.pathname !== "/api/ai/voice/ws") {
    rejectVoiceSocket(socket, 404, "Not Found");
    return;
  }
  const agentId = requestUrl.searchParams.get("agent_id") || "";
  const signature = requestUrl.searchParams.get("conversation_signature") || "";
  if (agentId !== ELEVENLABS_AGENT_ID || !signature.startsWith("cvtkn_")) {
    rejectVoiceSocket(socket, 403, "Forbidden");
    return;
  }
  const upstreamPath = `/v1/convai/conversation?${requestUrl.searchParams.toString()}`;
  const upstream = tls.connect({
    host: "api.elevenlabs.io",
    port: 443,
    servername: "api.elevenlabs.io"
  });
  const closeBoth = () => {
    if (!socket.destroyed) socket.destroy();
    if (!upstream.destroyed) upstream.destroy();
  };
  upstream.once("secureConnect", () => {
    const headers2 = [
      `GET ${upstreamPath} HTTP/1.1`,
      "Host: api.elevenlabs.io",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Key: ${req.headers["sec-websocket-key"] || ""}`,
      `Sec-WebSocket-Version: ${req.headers["sec-websocket-version"] || "13"}`,
      "Origin: https://bossmobilelifecoach.com"
    ];
    const protocol = req.headers["sec-websocket-protocol"];
    if (protocol) headers2.push(`Sec-WebSocket-Protocol: ${protocol}`);
    upstream.write(`${headers2.join("\r\n")}\r
\r
`);
    if (head.length > 0) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.once("error", () => rejectVoiceSocket(socket, 502, "Bad Gateway"));
  socket.once("error", closeBoth);
  socket.once("close", closeBoth);
  upstream.once("close", closeBoth);
}
function buildConversationSummary(message, reply = "") {
  const clean = `${message} ${reply}`.replace(/\s+/g, " ").trim();
  return clean.length > 360 ? `${clean.slice(0, 357)}...` : clean;
}
function ghlTagSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
}
async function syncPapaAiContactToGhl(input) {
  if (!input.email || !isValidEmail(input.email)) return null;
  const ghlCredentials = resolveGhlCredentials(db);
  if (!ghlCredentials) {
    console.warn("[ghl] Papa AI sync skipped: no GHL credentials configured");
    return null;
  }
  const [contactFirstName, ...contactLastNameParts] = (input.first_name || "Papa Life Visitor").split(/\s+/);
  const result = await ghlUpsertContactWithTags(
    {
      firstName: contactFirstName || "Papa",
      lastName: contactLastNameParts.join(" ") || void 0,
      email: input.email,
      phone: input.phone || void 0,
      source: input.source,
      tags: Array.from(new Set(input.tags.map(ghlTagSlug).filter(Boolean))),
      customFields: input.customFields
    },
    ghlCredentials
  );
  if (!result.ok) {
    console.error("[ghl] Papa AI contact sync failed:", result.error);
    return result;
  }
  return result;
}
function savePapaAiInteraction(input) {
  db.prepare(
    `INSERT INTO papa_ai_interactions (
      session_id, mode, first_name, email, phone, source_page, user_message, assistant_reply,
      conversation_summary, provider, assessment_result_json, report_json, recommended_resources_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.session_id,
    input.mode,
    input.first_name || null,
    input.email || null,
    input.phone || null,
    input.source_page || null,
    input.user_message || null,
    input.assistant_reply || null,
    input.conversation_summary || null,
    input.provider || "local",
    input.assessment_result ? JSON.stringify(input.assessment_result) : null,
    input.report ? JSON.stringify(input.report) : null,
    input.resources ? JSON.stringify(input.resources) : null
  );
}
function adminNotificationProvider() {
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (process.env.SENDGRID_API_KEY?.trim()) return "sendgrid";
  return null;
}
function adminNotificationFrom() {
  return process.env.ADMIN_NOTIFICATION_FROM?.trim() || "Papa Life <notifications@bossmobilelifecoach.com>";
}
function extractEmailAddress(value) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}
function adminNotificationStatus() {
  const provider = adminNotificationProvider();
  return {
    admin_notification_email_configured: Boolean(process.env.ADMIN_NOTIFICATION_EMAIL?.trim()),
    sender_configured: Boolean(provider),
    provider,
    from_configured: Boolean(process.env.ADMIN_NOTIFICATION_FROM?.trim())
  };
}
function recentNotificationEvents(limit = 8) {
  return db.prepare(
    `SELECT id, event_type, provider, recipient, subject, status, response_status, error, created_at
       FROM notification_events
       ORDER BY created_at DESC
       LIMIT ?`
  ).all(limit);
}
function logNotificationEvent(input) {
  db.prepare(
    `INSERT INTO notification_events
     (event_type, provider, recipient, subject, status, response_status, error, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.event_type,
    input.provider || null,
    input.recipient || null,
    input.subject,
    input.status,
    input.response_status ?? null,
    input.error || null,
    input.payload ? JSON.stringify(input.payload).slice(0, 2e4) : null
  );
}
async function sendAdminNotification(input) {
  const recipient = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "";
  const provider = adminNotificationProvider();
  if (!recipient || !provider) {
    logNotificationEvent({
      event_type: input.event_type,
      provider,
      recipient: recipient || null,
      subject: input.subject,
      status: "skipped",
      error: !recipient ? "ADMIN_NOTIFICATION_EMAIL is not configured" : "No supported email sender is configured",
      payload: input.payload
    });
    return { ok: false, skipped: true };
  }
  let timeout = null;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 8e3);
    let response;
    if (provider === "resend") {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY?.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: adminNotificationFrom(),
          to: [recipient],
          subject: input.subject,
          text: input.summary
        })
      });
    } else {
      response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY?.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipient }] }],
          from: { email: extractEmailAddress(adminNotificationFrom()) },
          subject: input.subject,
          content: [{ type: "text/plain", value: input.summary }]
        })
      });
    }
    if (timeout) clearTimeout(timeout);
    const responseText = await response.text().catch(() => "");
    logNotificationEvent({
      event_type: input.event_type,
      provider,
      recipient,
      subject: input.subject,
      status: response.ok ? "sent" : "error",
      response_status: response.status,
      error: response.ok ? null : responseText.slice(0, 1e3) || `HTTP ${response.status}`,
      payload: input.payload
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    if (timeout) clearTimeout(timeout);
    logNotificationEvent({
      event_type: input.event_type,
      provider,
      recipient,
      subject: input.subject,
      status: "error",
      error: error?.message || "Notification send failed",
      payload: input.payload
    });
    return { ok: false, error: error?.message || "Notification send failed" };
  }
}
function buildPapaDailyReportMarkdown(date, fields, outcomes) {
  return `## Papa Life Daily Work Report - ${date}

### 01. Outreach & Engagement
${textOrNoneForReport(fields.outreach)}

### 02. Content Creation
${textOrNoneForReport(fields.contentCreation)}

### 03. Content Scheduling & Publishing
${textOrNoneForReport(fields.scheduling)}

### 04. Automation & System Work
${textOrNoneForReport(fields.automation)}

### 05. Coaching & Curriculum Work
${textOrNoneForReport(fields.coaching)}

### 06. Pipeline & Revenue Activity
**Leads/Prospects:** ${textOrNoneForReport(fields.pipeline)}
**Revenue/Conversions:** ${textOrNoneForReport(fields.revenue)}

### 07. Research & Strategy
${textOrNoneForReport(fields.research)}

### Outcomes Completed
${outcomes.length > 0 ? outcomes.map((item) => `- ${item}`).join("\n") : "(none checked)"}

### Win of the Day
${textOrNoneForReport(fields.win)}`;
}
async function sendPapaDailyReportToVentures(date, markdown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8e3);
  try {
    const res = await fetch("https://ventures.isharehow.app/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        tool: "journey_journal_save",
        params: {
          title: `Papa Life Daily Work Report - ${date}`,
          content: markdown,
          book_title: "My Brain Book",
          chapter: date.slice(0, 7).replace("-", " "),
          entry_date: date,
          tags: ["daily-report", "papa-life", "work-log"]
        }
      })
    });
    if (!res.ok) {
      return { ok: false, error: `Ventures returned ${res.status}` };
    }
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e?.message || "Ventures save failed" };
  } finally {
    clearTimeout(timeout);
  }
}
function getMemberAccessState(member, pricing = getPricingSettings(db)) {
  const paymentStatus = String(member?.payment_status || "paid");
  const trialEndsAt = member?.trial_expires_at || null;
  const nowMs = Date.now();
  const trialEndsMs = trialEndsAt ? new Date(trialEndsAt).getTime() : null;
  if (member?.status !== "active") {
    return {
      hasPortalAccess: false,
      billingRequired: false,
      reason: "inactive",
      payment_status: paymentStatus,
      trial_expires_at: trialEndsAt,
      trial_hours: pricing.member_trial_hours,
      amount_cents: pricing.member_price_usd_cents
    };
  }
  if (paymentStatus === "paid") {
    return {
      hasPortalAccess: true,
      billingRequired: false,
      reason: "paid",
      payment_status: paymentStatus,
      trial_expires_at: trialEndsAt,
      trial_hours: pricing.member_trial_hours,
      amount_cents: pricing.member_price_usd_cents
    };
  }
  if (paymentStatus === "trial") {
    const trialActive = trialEndsMs != null && trialEndsMs > nowMs;
    return {
      hasPortalAccess: trialActive,
      billingRequired: !trialActive,
      reason: trialActive ? "trial_active" : "trial_expired",
      payment_status: paymentStatus,
      trial_expires_at: trialEndsAt,
      trial_hours: pricing.member_trial_hours,
      amount_cents: pricing.member_price_usd_cents
    };
  }
  return {
    hasPortalAccess: false,
    billingRequired: true,
    reason: "payment_required",
    payment_status: paymentStatus,
    trial_expires_at: trialEndsAt,
    trial_hours: pricing.member_trial_hours,
    amount_cents: pricing.member_price_usd_cents
  };
}
function memberSessionPayload(member) {
  return {
    id: member.id,
    email: member.email,
    first_name: member.first_name,
    last_name: member.last_name,
    payment_status: member.payment_status || "paid",
    trial_expires_at: member.trial_expires_at || null,
    trial_started_at: member.trial_started_at || null,
    paid_at: member.paid_at || null
  };
}
function loadMemberById(memberId) {
  return db.prepare(
    "SELECT id, first_name, last_name, email, status, payment_status, trial_started_at, trial_expires_at, paid_at, stripe_customer_id, stripe_checkout_session_id FROM members WHERE id = ?"
  ).get(memberId);
}
function requireMemberSession(req, res, next) {
  if (req.session.memberId) return next();
  res.status(401).json({ ok: false, error: "Unauthorized" });
}
function requireMemberAuth(req, res, next) {
  const memberId = Number(req.session.memberId);
  if (!memberId) return res.status(401).json({ ok: false, error: "Unauthorized" });
  const member = loadMemberById(memberId);
  if (!member || member.status !== "active") {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  req.session.memberUser = memberSessionPayload(member);
  const billing = getMemberAccessState(member);
  if (!billing.hasPortalAccess) {
    return res.status(402).json({
      ok: false,
      error: "Trial expired. Complete payment to continue.",
      billing_required: true,
      billing
    });
  }
  next();
}
function appBaseUrl(req) {
  const explicit = process.env.PUBLIC_APP_URL || process.env.APP_BASE_URL || process.env.PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const host = req.get("host");
  const forwardedProto = req.get("x-forwarded-proto");
  const proto = forwardedProto ? forwardedProto.split(",")[0].trim() : req.protocol;
  return `${proto}://${host}`;
}
function appendCheckoutTracking(url, member) {
  try {
    const target = new URL(url);
    target.searchParams.set("utm_source", "site");
    target.searchParams.set("utm_medium", "member_portal");
    target.searchParams.set("utm_campaign", "papa_life_paid_access");
    if (member.id) target.searchParams.set("member_id", String(member.id));
    if (member.email) target.searchParams.set("email", String(member.email));
    return target.toString();
  } catch {
    return url;
  }
}
function verifyPaymentWebhookAuth(req) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim() || "";
  if (!secret) return false;
  const auth = String(req.headers.authorization || "");
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = String(req.headers["x-payment-webhook-secret"] || "").trim();
  return bearer === secret || headerSecret === secret;
}
function loadMemberByEmail(email) {
  return db.prepare(
    "SELECT id, first_name, last_name, email, status, payment_status, trial_started_at, trial_expires_at, paid_at, stripe_customer_id, stripe_checkout_session_id FROM members WHERE email = ?"
  ).get(email.trim().toLowerCase());
}
function markMemberPaid(memberId, paidAt = (/* @__PURE__ */ new Date()).toISOString()) {
  const result = db.prepare(
    `UPDATE members
       SET payment_status = 'paid',
           paid_at = COALESCE(paid_at, ?),
           trial_expires_at = NULL,
           status = 'active'
       WHERE id = ?`
  ).run(paidAt, memberId);
  return result.changes > 0;
}
function recentMemberPaymentEvents(limit = 25) {
  return db.prepare(
    `SELECT e.id, e.member_id, e.provider, e.transaction_id, e.email, e.amount_cents, e.created_at,
              m.first_name, m.last_name, m.payment_status
       FROM member_payment_events e
       LEFT JOIN members m ON m.id = e.member_id
       ORDER BY e.created_at DESC
       LIMIT ?`
  ).all(limit);
}
function adminIntegrationStatusPayload() {
  const ai = getPapaAiStatus();
  const automation = automationStatusPayload(db);
  const ghlCredentials = resolveGhlCredentials(db);
  const pricing = getPricingSettings(db);
  const checkoutProvider = STRIPE_SECRET_KEY ? "stripe" : "fastpay";
  const email = adminNotificationStatus();
  return {
    ai,
    payment: {
      stripe_configured: Boolean(STRIPE_SECRET_KEY),
      checkout_provider: checkoutProvider,
      checkout_payment_link_configured: Boolean(pricing.checkout_payment_link?.trim()),
      payment_webhook_configured: Boolean(process.env.PAYMENT_WEBHOOK_SECRET?.trim()),
      manual_mark_paid_available: true
    },
    crm: {
      ghl_api_configured: Boolean(ghlCredentials?.token),
      ghl_token_via: ghlCredentials?.source || null,
      cloud_webhook_configured: Boolean(automation.cloud_webhook_configured),
      webhook_auth_configured: String(automation.webhook_auth || "").startsWith("Bearer token required")
    },
    email,
    recent_notifications: recentNotificationEvents(5)
  };
}
async function stripeCreateCheckoutSession(payload) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: payload.toString()
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || "Stripe checkout session creation failed");
  }
  return json;
}
async function stripeRetrieveCheckoutSession(sessionId) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  const url = `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`
    }
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || "Stripe session lookup failed");
  }
  return json;
}
function requireResearchLabAccess(req, res, next) {
  const u = req.session.adminUser;
  if (!isResearchLabWebUser(u?.username)) {
    return res.status(403).json({ ok: false, error: "Research Lab is restricted" });
  }
  next();
}
var allowedAiOrigins = /* @__PURE__ */ new Set([
  "https://bossmobilelifecoach.com",
  "https://www.bossmobilelifecoach.com",
  "https://papalifecoach.com",
  "https://www.papalifecoach.com",
  "http://localhost:3000",
  "http://localhost:4173"
]);
var contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://unpkg.com https://links.isharehow.app https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://api.elevenlabs.io https://api.us.elevenlabs.io wss://api.elevenlabs.io wss://api.us.elevenlabs.io https://links.isharehow.app https://cloudflareinsights.com",
  "media-src 'self' blob: data:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");
function securityHeaders(_req, res, next) {
  res.setHeader("Content-Security-Policy", contentSecurityPolicy);
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
}
var aiRateBuckets = /* @__PURE__ */ new Map();
function aiClientId(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || req.ip || "unknown";
}
function papaAiCors(req, res, next) {
  const origin = req.get("origin");
  if (origin && allowedAiOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
}
function papaAiRateLimit(maxRequests = 30, windowMs = 10 * 60 * 1e3) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${aiClientId(req)}:${req.path}`;
    const bucket = aiRateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      aiRateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > maxRequests) {
      return res.status(429).json({
        ok: false,
        error: "Too many requests. Please pause for a few minutes and try again."
      });
    }
    next();
  };
}
var STATIC_SERVER_PAGES = {
  "/": {
    title: "Papa Life - A Practical Path for Fathers of Adult Children",
    description: "Papa Life helps fathers understand distance, tension, and changing roles with adult children and begin rebuilding connection with humility, faith, and practical next steps.",
    keywords: "fathers of adult children, fatherhood assessment, reconnect with adult child, PAPA Framework, Papa Life",
    eyebrow: "Boss Mobile Life Coach",
    headline: "Papa Life gives fathers a practical path back to connection.",
    intro: "For fathers whose adult sons or daughters feel distant, guarded, or silent, Papa Life offers assessment, guided lessons, AI coaching, and the PAPA Framework: Purpose, Authority, Presence, and Alignment.",
    sections: [
      {
        heading: "Start with clarity",
        body: "Take the free relationship assessment to name where things stand and identify the first honest step toward closing the gap."
      },
      {
        heading: "Learn the new role",
        body: "Use the free workshop and course library to move from pressure and control into listening, humility, consistency, and trust."
      },
      {
        heading: "Practice the path",
        body: "Papa Life combines practical coaching, reflection tools, membership resources, and support for fathers rebuilding adult-child relationships."
      }
    ],
    cta: { label: "Take the Assessment", href: "/assessment" }
  },
  "/ai-coach": {
    title: "Papa Life AI Coach | Biblical Fatherhood Coaching",
    description: "Ask the Papa Life AI Coach for practical guidance for fathers of adult children, including assessment, resources, prayer, Bible study, Tuesday Live support, and membership help.",
    eyebrow: "AI Coach",
    headline: "Ask for guidance when you need words, next steps, or perspective.",
    intro: "The Papa Life AI Coach helps fathers think through distance, tension, faith, repair, and practical next steps with adult children.",
    sections: [
      { heading: "Assessment help", body: "Use the coach to understand your PAPA scores and what they suggest about Purpose, Authority, Presence, and Alignment." },
      { heading: "Resource guidance", body: "Get pointed toward lessons, membership resources, Tuesday Live support, and practical exercises." }
    ],
    cta: { label: "Start the AI Coach", href: "/ai-coach" }
  },
  "/resources": {
    title: "Papa Life Resources | Boss Mobile Life Coach",
    description: "Free and member resources for fathers rebuilding connection with adult children through Papa Life.",
    eyebrow: "Resources",
    headline: "Find tools for reflection, repair, and relationship growth.",
    intro: "Papa Life resources include the free relationship assessment, the first workshop lesson, AI coaching, course previews, books, podcast material, and Tuesday Live support.",
    sections: [
      { heading: "Free starting points", body: "Begin with the assessment, Papa Life AI Coach, and the free workshop for fathers of adult children." },
      { heading: "Member path", body: "Members continue into guided lessons, reflection tools, and support organized around the PAPA Framework." }
    ],
    cta: { label: "View Courses", href: "/courses" }
  },
  "/books": {
    title: "Papa Life Books | Boss Mobile Life Coach",
    description: "Books and written resources from Brian Keith Hill for fathers navigating distance with adult children.",
    eyebrow: "Books",
    headline: "Written guidance for the fatherhood season no one prepared you for.",
    intro: "Brian Keith Hill's work speaks to fathers carrying silence, shame, hope, and the desire to rebuild trust with adult children.",
    sections: [
      { heading: "Core message", body: "As long as both of you are alive, repair is still possible one honest step at a time." },
      { heading: "What to do next", body: "Pair the written material with the free assessment and Papa Life course path for steady action." }
    ],
    cta: { label: "Start the Free Workshop", href: "/papa-first-lesson" }
  },
  "/podcast": {
    title: "Papa Life Podcast | Boss Mobile Life Coach",
    description: "Podcast resources for fathers learning to reconnect with adult children through humility, presence, and practical action.",
    eyebrow: "Podcast",
    headline: "Listen for language, perspective, and next steps.",
    intro: "Papa Life podcast material supports fathers who want a calmer, wiser way to handle distance, silence, and difficult conversations.",
    sections: [
      { heading: "For strained relationships", body: "Episodes focus on adult-child distance, fatherhood identity, repair, faith, and emotional maturity." },
      { heading: "Keep moving", body: "Use the podcast alongside the assessment, workshop, and membership lessons." }
    ],
    cta: { label: "Explore Papa Life", href: "/membership" }
  },
  "/membership": {
    title: "Papa Life Membership | Boss Mobile Life Coach",
    description: "Papa Life membership gives fathers structure, lessons, reflection tools, and support for rebuilding adult-child relationships.",
    eyebrow: "Membership",
    headline: "Build consistency instead of relying on one emotional moment.",
    intro: "Membership helps fathers keep practicing Purpose, Authority, Presence, and Alignment through guided lessons and reflection tools.",
    sections: [
      { heading: "Course structure", body: "Work through practical lessons built for fathers navigating relationships with adult children." },
      { heading: "Ongoing support", body: "Use AI coaching, resources, and community-oriented support to stay steady." }
    ],
    cta: { label: "Join Papa Life", href: "/go/join" }
  },
  "/contact": {
    title: "Contact Boss Mobile Life Coach",
    description: "Contact Brian Keith Hill and Boss Mobile Life Coach about Papa Life, fatherhood coaching, and support.",
    eyebrow: "Contact",
    headline: "Reach out when you are ready for support.",
    intro: "Boss Mobile Life Coach supports fathers, families, and leaders who want clearer next steps and stronger relationships.",
    sections: [
      { heading: "Start here", body: "If you are a father trying to reconnect with an adult child, the free assessment is the best first step." },
      { heading: "For broader support", body: "Use the AI Coach or membership path to get oriented around resources and next actions." }
    ],
    cta: { label: "Take the Assessment", href: "/assessment" }
  },
  "/papa-first-lesson": {
    title: "Free Papa Life Workshop | First Lesson",
    description: "A free first lesson for fathers learning the new role with adult children.",
    eyebrow: "Free Workshop",
    headline: "Learn why the old fatherhood role stops working with adult children.",
    intro: "This first lesson helps fathers understand distance, tension, and the shift from control to presence.",
    sections: [
      { heading: "What you will learn", body: "Why well-meaning fathers get stuck, how authority changes, and what one steady next step can look like." },
      { heading: "Continue the path", body: "After the workshop, members can continue through guided Papa Life courses and reflection tools." }
    ],
    cta: { label: "Watch the Free Lesson", href: "/papa-first-lesson" }
  },
  "/assessment": {
    title: "Free PAPA Fatherhood Assessment | Papa Life",
    description: "Score yourself across Purpose, Authority, Presence, and Alignment. A free five-minute assessment for fathers of adult children.",
    keywords: "father adult child relationship assessment, PAPA framework, fatherhood coaching",
    eyebrow: "Free Assessment",
    headline: "Your grown child stopped talking to you. It does not have to stay that way.",
    intro: "Take the free assessment to see where things stand with your adult son or daughter and identify a first step toward closing the gap.",
    sections: [
      { heading: "Purpose", body: "Know who you are now that fatherhood is no longer centered on daily provision and control." },
      { heading: "Authority", body: "Lead through character, humility, and consistency instead of pressure or position." },
      { heading: "Presence", body: "Listen before fixing and become safe enough for honest conversation." },
      { heading: "Alignment", body: "Close the gap between your values, words, and daily actions." }
    ],
    cta: { label: "Take the Assessment", href: "/assessment" }
  },
  "/relationship-assessment": {
    title: "Free Father-Adult Child Relationship Assessment | Boss Mobile Life Coach",
    description: "Take the free relationship assessment and see where things stand with your adult son or daughter.",
    eyebrow: "Relationship Assessment",
    headline: "Name the relationship clearly so your next move is intentional.",
    intro: "The assessment helps fathers stop guessing and start moving with honesty, humility, and practical direction.",
    sections: [
      { heading: "Built for fathers", body: "Questions focus on distance, trust, emotional safety, and the changing role with adult children." },
      { heading: "Practical result", body: "Your result points you toward the Papa Life resources that fit where you are now." }
    ],
    cta: { label: "Begin Assessment", href: "/relationship-assessment" }
  },
  "/marlee-assessment": {
    title: "Marlee Motivation Assessment | Papa Life",
    description: "Join Brian Keith Hill's Papa Life Marlee workspace and complete a motivational assessment for self-awareness, communication, leadership, and relationship growth.",
    eyebrow: "Marlee Assessment",
    headline: "Understand what motivates you and how your style affects relationships.",
    intro: "The Marlee assessment supports Papa Life fathers with self-awareness around communication, decision-making, and leadership.",
    sections: [
      { heading: "Better self-awareness", body: "Learn how your natural style may show up in family conversations and repair attempts." },
      { heading: "Use it with PAPA", body: "Pair Marlee insights with Purpose, Authority, Presence, and Alignment." }
    ],
    cta: { label: "Open Marlee Assessment", href: "/marlee-assessment" }
  },
  "/adult-son-relationship": {
    title: "Adult Son Relationship Help for Fathers | Boss Mobile Life Coach",
    description: "Guidance for fathers rebuilding connection with an adult son without control, lectures, or walking on eggshells.",
    keywords: "adult son relationship, father son estrangement, reconnect with adult son",
    eyebrow: "Adult Son Relationship",
    headline: "Your adult son does not need a boss. He needs a father who shows up differently.",
    intro: "When the relationship feels strained, distant, or silent, you can change how you lead without losing yourself.",
    sections: [
      { heading: "What fathers get wrong", body: "Fixing instead of listening, lecturing when he needed space, and treating conversations like performance reviews." },
      { heading: "A better path forward", body: "The PAPA Framework gives language and steps when emotions run high and words fail." }
    ],
    cta: { label: "Take the Assessment", href: "/assessment" }
  },
  "/adult-daughter-relationship": {
    title: "Adult Daughter Relationship Help for Fathers | Boss Mobile Life Coach",
    description: "Support for fathers who want a deeper, safer connection with an adult daughter after years of tension, silence, or misunderstanding.",
    keywords: "adult daughter relationship, father daughter estrangement, reconnect with adult daughter",
    eyebrow: "Adult Daughter Relationship",
    headline: "She is not little anymore, but she still needs to know she is seen.",
    intro: "Fathers of adult daughters often feel dismissed, shut out, or unsure what to say. Trust can be rebuilt without forcing it.",
    sections: [
      { heading: "Why daughters pull away", body: "Old hurts, unspoken expectations, and a lack of emotional safety can create distance." },
      { heading: "What changes", body: "Presence over performance, curiosity over control, and small steady contact over dramatic speeches." }
    ],
    cta: { label: "Take the Assessment", href: "/assessment" }
  },
  "/why-adult-children-pull-away": {
    title: "Why Adult Children Pull Away From Their Fathers | Boss Mobile Life Coach",
    description: "Understand why grown sons and daughters create distance and what fathers can do that actually helps.",
    keywords: "why adult children pull away, adult child distance, fatherhood transition",
    eyebrow: "Adult Child Distance",
    headline: "When they pull away, it is rarely because they stopped caring.",
    intro: "Distance is often a signal, not a verdict on your worth as a father.",
    sections: [
      { heading: "Common patterns", body: "Control disguised as care, criticism disguised as wisdom, and absence disguised as providing." },
      { heading: "What helps", body: "Stop demanding closeness on your timeline and start building safety in small moments." }
    ],
    cta: { label: "Start with the Assessment", href: "/assessment" }
  },
  "/father-child-estrangement": {
    title: "Father-Child Estrangement Help | Boss Mobile Life Coach",
    description: "Hope and practical steps for fathers in estrangement with an adult son or daughter from a coach who lived it.",
    keywords: "father child estrangement, estranged adult child, reconcile with adult child",
    eyebrow: "Estrangement Help",
    headline: "Estrangement hurts. It does not have to be the last chapter.",
    intro: "As long as you are both alive, repair is still possible one honest step at a time.",
    sections: [
      { heading: "What estrangement asks", body: "Not a performance of change, but real change. Not one letter that fixes years, but a new way of showing up." },
      { heading: "Start where you are", body: "Name the truth without drowning in blame and get support so you are not navigating this alone." }
    ],
    cta: { label: "Take the Assessment", href: "/assessment" }
  },
  "/papa-framework": {
    title: "The PAPA Framework for Fathers | Purpose, Authority, Presence, Alignment",
    description: "Learn the PAPA framework, four pillars that help fathers lead with clarity, character, presence, and integrity with adult children.",
    keywords: "PAPA framework, fatherhood framework, Purpose Authority Presence Alignment",
    eyebrow: "PAPA Framework",
    headline: "Four pillars. One mission: become the father your adult child can trust again.",
    intro: "Purpose, Authority, Presence, and Alignment give fathers a map when adult-child relationships feel harder than they should.",
    sections: [
      { heading: "Purpose", body: "Know why you were built for this role beyond paychecks and provider identity." },
      { heading: "Authority", body: "Lead without control and trade force for grounded character." },
      { heading: "Presence", body: "Show up without fixing everything and let your child feel seen, not managed." },
      { heading: "Alignment", body: "Close the gap between who you say you are and how you live." }
    ],
    cta: { label: "Take the Assessment", href: "/assessment" }
  },
  "/about-brian-keith-hill": {
    title: "About Brian Keith Hill | Founder, Boss Mobile Life Coach",
    description: "Meet Brian Keith Hill, fatherhood coach, PAPA framework creator, and founder of Boss Mobile Life Coach.",
    keywords: "Brian Keith Hill, Boss Mobile Life Coach, PAPA Life founder, fatherhood coach",
    eyebrow: "About Brian",
    headline: "Brian Keith Hill",
    intro: "Brian Keith Hill is the founder of Boss Mobile Life Coach and creator of the PAPA Framework for fathers of adult children.",
    sections: [
      { heading: "Why the work is personal", body: "Brian's own fatherhood story and reconciliation journey shape the practical, honest way Papa Life supports fathers." },
      { heading: "What he brings", body: "Faith-informed coaching, clear language, and frameworks that turn good intentions into daily practice." }
    ],
    cta: { label: "Explore Papa Life", href: "/" }
  },
  "/privacy": {
    title: "Privacy Policy | Boss Mobile Life Coach",
    description: "How Boss Mobile Life Coach and Papa Life handle visitor, lead, AI coach, and member information.",
    eyebrow: "Privacy",
    headline: "Privacy Policy",
    intro: "Boss Mobile Life Coach and Papa Life collect information needed to provide coaching resources, assessments, AI coach interactions, membership features, and follow-up support.",
    sections: [
      { heading: "Information use", body: "Information may be used to respond to requests, personalize resources, operate the site, and improve services." },
      { heading: "Your choices", body: "Visitors and members may contact Boss Mobile Life Coach about their information and communication preferences." }
    ]
  },
  "/terms": {
    title: "Terms of Use | Boss Mobile Life Coach",
    description: "Terms for using Boss Mobile Life Coach, Papa Life resources, AI coaching, assessments, and member features.",
    eyebrow: "Terms",
    headline: "Terms of Use",
    intro: "By using Boss Mobile Life Coach and Papa Life resources, visitors agree to use the site responsibly and understand that coaching resources do not replace professional medical, mental health, legal, or financial advice.",
    sections: [
      { heading: "Site use", body: "Resources, assessments, and AI coaching are provided for education, reflection, and coaching support." },
      { heading: "Membership", body: "Member features and paid access are governed by the purchase and access terms shown during signup." }
    ]
  },
  "/member-login": {
    title: "Member Login | Papa Life",
    description: "Sign in to the Papa Life member portal.",
    eyebrow: "Members",
    headline: "Sign in to continue your Papa Life path.",
    intro: "Members can access course lessons, progress tracking, journal prompts, and the Papa Life resource library.",
    sections: [{ heading: "Member portal", body: "Use your Papa Life account to continue lessons and track your progress." }],
    cta: { label: "Sign In", href: "/member-login" },
    noindex: true
  },
  "/member-register": {
    title: "Create Member Account | Papa Life",
    description: "Create a Papa Life member account.",
    eyebrow: "Members",
    headline: "Create your Papa Life member account.",
    intro: "Registration gives members access to the course portal, progress tools, and member resources.",
    sections: [{ heading: "Continue after signup", body: "After creating an account, members can sign in and continue the Papa Life course path." }],
    cta: { label: "Create Account", href: "/member-register" },
    noindex: true
  },
  "/member-billing": {
    title: "Papa Life Billing",
    description: "Complete billing for Papa Life membership.",
    eyebrow: "Billing",
    headline: "Complete membership access.",
    intro: "This page supports Papa Life membership billing and access.",
    sections: [{ heading: "Secure checkout", body: "Follow the on-page steps to complete membership access." }],
    noindex: true
  },
  "/portal": {
    title: "Papa Life Member Portal",
    description: "Member portal for Papa Life courses, progress, journal prompts, events, and resources.",
    eyebrow: "Member Portal",
    headline: "Continue your Papa Life lessons and reflection work.",
    intro: "The portal contains member course lessons, progress tracking, daily reflection, events, and resource library access.",
    sections: [{ heading: "Members only", body: "Sign in to view your lessons and track your progress." }],
    noindex: true
  },
  "/login": {
    title: "Admin Login | Boss Mobile Life Coach",
    description: "Admin login for Boss Mobile Life Coach.",
    eyebrow: "Admin",
    headline: "Admin login",
    intro: "This page is for authorized Boss Mobile Life Coach administrators.",
    sections: [{ heading: "Restricted access", body: "Sign in with an authorized account to manage site content and operations." }],
    noindex: true
  },
  "/crm": {
    title: "CRM Intake | Boss Mobile Life Coach",
    description: "CRM intake form for Boss Mobile Life Coach.",
    eyebrow: "CRM",
    headline: "CRM intake",
    intro: "This intake page collects lead and relationship context for follow-up.",
    sections: [{ heading: "Intake", body: "Submit the requested details so the team can route follow-up appropriately." }],
    noindex: true
  },
  "/crm-console": {
    title: "CRM Console | Boss Mobile Life Coach",
    description: "Admin CRM console for Boss Mobile Life Coach.",
    eyebrow: "Admin",
    headline: "CRM console",
    intro: "Authorized administrators can manage leads, courses, media, and site operations.",
    sections: [{ heading: "Restricted access", body: "Sign in with an authorized account to use the CRM console." }],
    noindex: true
  },
  "/dashboard": {
    title: "CRM Console | Boss Mobile Life Coach",
    description: "Dashboard route for Boss Mobile Life Coach administrators.",
    eyebrow: "Admin",
    headline: "Dashboard",
    intro: "This route redirects administrators to the CRM console in the browser app.",
    sections: [{ heading: "Restricted access", body: "Authorized users can continue to the CRM console." }],
    cta: { label: "Open CRM Console", href: "/crm-console" },
    noindex: true
  },
  "/papa-journey": {
    title: "Papa Journey | Boss Mobile Life Coach",
    description: "A guided Papa Life journey for fathers rebuilding connection with adult children.",
    eyebrow: "Papa Journey",
    headline: "Move from awareness into a guided fatherhood path.",
    intro: "The Papa Journey helps fathers work through relationship distance with structure, reflection, coaching, and next steps.",
    sections: [
      { heading: "PAPA pillars", body: "Purpose, Authority, Presence, and Alignment organize the path." },
      { heading: "Continue steadily", body: "Use the journey to build consistency and repair-oriented habits over time." }
    ],
    cta: { label: "Join Papa Life", href: "/go/join" }
  },
  "/papa-intro": {
    title: "Papa Life Intro Video",
    description: "Introductory video for the Papa Life fatherhood path.",
    eyebrow: "Intro Video",
    headline: "Start with the heart of Papa Life.",
    intro: "The intro video explains the Papa Life path for fathers of adult children.",
    sections: [{ heading: "Watch first", body: "Begin here to understand the mission, message, and next step." }],
    cta: { label: "Start the Free Workshop", href: "/papa-first-lesson" }
  },
  "/papa-journal": {
    title: "Papa Life Journal",
    description: "Journal prompts and reflection for fathers practicing the Papa Life path.",
    eyebrow: "Journal",
    headline: "Reflect before you react.",
    intro: "Papa Life journaling helps fathers process emotion, clarify intent, and practice a steadier way of showing up.",
    sections: [{ heading: "Reflection", body: "Use prompts to connect your values, words, and actions." }],
    noindex: true
  },
  "/papa-daily-work-report": {
    title: "Papa Life Daily Work Report",
    description: "Daily work report for Papa Life operations.",
    eyebrow: "Daily Report",
    headline: "Papa Life daily work report",
    intro: "This page supports internal tracking of outreach, content, scheduling, automation, coaching, and outcomes.",
    sections: [{ heading: "Internal operations", body: "Authorized users can record and review daily Papa Life work." }],
    noindex: true
  },
  "/strategist": {
    title: "Strategist | Boss Mobile Life Coach",
    description: "Strategic planning tools for Boss Mobile Life Coach.",
    eyebrow: "Strategist",
    headline: "Strategy tools for focused action.",
    intro: "This page supports strategy work and planning for Boss Mobile Life Coach operations.",
    sections: [{ heading: "Planning", body: "Use the strategist tools to clarify priorities and next moves." }],
    noindex: true
  },
  "/theme-matrix": {
    title: "Theme Matrix | Boss Mobile Life Coach",
    description: "Theme matrix planning page for Boss Mobile Life Coach.",
    eyebrow: "Theme Matrix",
    headline: "Organize themes and messages.",
    intro: "This page supports internal planning and content structure.",
    sections: [{ heading: "Planning", body: "Use the matrix to organize themes, messages, and content direction." }],
    noindex: true
  },
  "/operators": {
    title: "Operators | Boss Mobile Life Coach",
    description: "Operations page for Boss Mobile Life Coach.",
    eyebrow: "Operators",
    headline: "Operations workspace",
    intro: "This page supports operational planning and workflows.",
    sections: [{ heading: "Internal tools", body: "Authorized users can use this workspace to coordinate operational work." }],
    noindex: true
  },
  "/governance": {
    title: "Governance | Boss Mobile Life Coach",
    description: "Governance page for Boss Mobile Life Coach.",
    eyebrow: "Governance",
    headline: "Governance workspace",
    intro: "This page supports internal governance and operating principles.",
    sections: [{ heading: "Internal guidance", body: "Use this page to review structure, accountability, and decision guidance." }],
    noindex: true
  },
  "/booking": {
    title: "Booking | Boss Mobile Life Coach",
    description: "Booking page for Boss Mobile Life Coach.",
    eyebrow: "Booking",
    headline: "Book time with Boss Mobile Life Coach.",
    intro: "Use this page to move from interest into a scheduled conversation or next step.",
    sections: [{ heading: "Next step", body: "Choose an available path for booking or follow-up." }]
  },
  "/research-lab": {
    title: "Research Lab | Boss Mobile Life Coach",
    description: "Research lab workspace for Boss Mobile Life Coach.",
    eyebrow: "Research Lab",
    headline: "Research workspace",
    intro: "This page supports research collection, analysis, and content planning.",
    sections: [{ heading: "Restricted access", body: "Authorized users can use research tools after signing in." }],
    noindex: true
  }
};
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}
function normalizeAppPath(rawUrl) {
  let pathname = "/";
  try {
    pathname = new URL(rawUrl, "https://bossmobilelifecoach.com").pathname;
  } catch {
    pathname = rawUrl.split("?")[0] || "/";
  }
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");
  return pathname || "/";
}
function serverPageShell(page, extraHtml = "") {
  const sections = page.sections.map(
    (section) => `
        <section>
          <h2>${escapeHtml(section.heading)}</h2>
          <p>${escapeHtml(section.body)}</p>
        </section>`
  ).join("");
  const cta = page.cta ? `<p><a href="${escapeHtml(page.cta.href)}">${escapeHtml(page.cta.label)}</a></p>` : "";
  return `
    <main id="server-prerender" style="font-family: Inter, Arial, sans-serif; background: #050505; color: #f8fafc; min-height: 100vh; padding: 64px 20px;">
      <article style="max-width: 920px; margin: 0 auto;">
        <p style="color: #f6c74a; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;">${escapeHtml(page.eyebrow)}</p>
        <h1 style="font-size: clamp(2.25rem, 6vw, 4.75rem); line-height: 1.02; margin: 18px 0;">${escapeHtml(page.headline)}</h1>
        <p style="font-size: 1.2rem; line-height: 1.7; color: #d4d4d8; max-width: 760px;">${escapeHtml(page.intro)}</p>
        ${cta}
        <div style="display: grid; gap: 24px; margin-top: 42px;">
          ${sections}
          ${extraHtml}
        </div>
      </article>
    </main>`;
}
function notFoundServerPage() {
  return {
    status: 404,
    title: "404 Page Not Found | Boss Mobile Life Coach",
    description: "The requested Boss Mobile Life Coach page could not be found.",
    noindex: true,
    bodyHtml: serverPageShell({
      title: "404 Page Not Found | Boss Mobile Life Coach",
      description: "The requested Boss Mobile Life Coach page could not be found.",
      eyebrow: "404",
      headline: "Page not found.",
      intro: "Sorry, the page you are looking for does not exist. It may have been moved or deleted.",
      sections: [{ heading: "Return home", body: "Use the home page to find Papa Life resources, courses, assessments, and support." }],
      cta: { label: "Go Home", href: "/" },
      noindex: true
    })
  };
}
function staticServerPage(pathname) {
  const page = STATIC_SERVER_PAGES[pathname];
  if (!page) return null;
  return {
    status: 200,
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    bodyHtml: serverPageShell(page),
    noindex: page.noindex
  };
}
function coursesServerPage() {
  const courses = db.prepare(
    `SELECT c.id, c.title, c.description, c.pillar, COUNT(l.id) AS lesson_count
       FROM courses c
       LEFT JOIN lessons l ON l.course_id = c.id
       WHERE c.show_in_catalog = 1
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.created_at DESC`
  ).all();
  const courseHtml = courses.length > 0 ? `<section><h2>Course catalog</h2><ul>${courses.map(
    (course) => `<li><a href="/courses/${course.id}">${escapeHtml(course.title)}</a> - ${escapeHtml(course.pillar)} - ${Number(course.lesson_count)} lesson${Number(course.lesson_count) === 1 ? "" : "s"}${course.description ? `<br><span>${escapeHtml(course.description)}</span>` : ""}</li>`
  ).join("")}</ul></section>` : `<section><h2>Course catalog</h2><p>No courses are listed yet. Check back soon, or contact your coach.</p></section>`;
  const page = {
    title: "Papa Life Courses | Boss Mobile Life Coach",
    description: "Programs built for fathers navigating relationships with adult children. Preview Papa Life courses and sign in to watch lessons.",
    eyebrow: "Courses",
    headline: "Papa Life course catalog",
    intro: "Programs built for fathers navigating relationships with adult children. Members can sign in to watch lessons and track progress.",
    sections: [],
    cta: { label: "Member Portal", href: "/member-login" }
  };
  return {
    status: 200,
    title: page.title,
    description: page.description,
    bodyHtml: serverPageShell(page, courseHtml)
  };
}
function courseDetailServerPage(courseId) {
  const course = db.prepare(
    `SELECT c.id, c.title, c.description, c.pillar
       FROM courses c
       WHERE c.id = ? AND c.show_in_catalog = 1`
  ).get(courseId);
  if (!course) return notFoundServerPage();
  const lessons = db.prepare(
    `SELECT id, title, description, duration_minutes, content_type
       FROM lessons
       WHERE course_id = ?
       ORDER BY sort_order ASC, created_at ASC`
  ).all(courseId);
  const lessonHtml = `<section><h2>Lessons (${lessons.length})</h2>${lessons.length > 0 ? `<ol>${lessons.map(
    (lesson) => `<li><strong>${escapeHtml(lesson.title)}</strong>${lesson.duration_minutes ? ` (${Number(lesson.duration_minutes)} min)` : ""}${lesson.description ? `<br><span>${escapeHtml(lesson.description)}</span>` : ""}</li>`
  ).join("")}</ol>` : "<p>No lessons are listed for this course yet.</p>"}</section>`;
  const page = {
    title: `${course.title} | Papa Life Courses`,
    description: course.description || `Preview the ${course.title} Papa Life course and its lesson plan for fathers of adult children.`,
    eyebrow: course.pillar || "Course",
    headline: course.title,
    intro: course.description || "Lesson videos and materials are available after you sign in to the member portal. This page is a preview of the curriculum.",
    sections: [{ heading: "Member access", body: "Sign in to the member portal to watch lesson videos and track progress." }],
    cta: { label: "Sign in to watch", href: "/member-login" }
  };
  return {
    status: 200,
    title: page.title,
    description: page.description,
    bodyHtml: serverPageShell(page, lessonHtml)
  };
}
function renderServerPage(rawUrl) {
  const pathname = normalizeAppPath(rawUrl);
  if (pathname === "/404") return notFoundServerPage();
  if (pathname === "/courses") return coursesServerPage();
  const courseMatch = pathname.match(/^\/courses\/(\d+)$/);
  if (courseMatch) return courseDetailServerPage(Number(courseMatch[1]));
  return staticServerPage(pathname) || notFoundServerPage();
}
function renderHtmlDocument(template, page) {
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`).replace(
    /<meta name="description" content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(page.description)}" />`
  );
  if (page.keywords) {
    if (/<meta name="keywords" content="[^"]*"\s*\/?>/i.test(html)) {
      html = html.replace(
        /<meta name="keywords" content="[^"]*"\s*\/?>/i,
        `<meta name="keywords" content="${escapeHtml(page.keywords)}" />`
      );
    } else {
      html = html.replace("</head>", `    <meta name="keywords" content="${escapeHtml(page.keywords)}" />
  </head>`);
    }
  }
  if (page.noindex) {
    const robots = `<meta name="robots" content="noindex, follow" />`;
    if (/<meta name="robots"/i.test(html)) {
      html = html.replace(/<meta name="robots" content="[^"]*"\s*\/?>/i, robots);
    } else {
      html = html.replace("</head>", `    ${robots}
  </head>`);
    }
  }
  return html.replace('<div id="root"></div>', `<div id="root">${page.bodyHtml}</div>`);
}
function sendServerRenderedApp(req, res, staticPath) {
  const page = renderServerPage(req.originalUrl || req.url);
  const templatePath = path3.join(staticPath, "index.html");
  let template = "";
  try {
    template = fs3.readFileSync(templatePath, "utf8");
  } catch {
    res.status(500).type("text/plain").send("Site template missing");
    return;
  }
  res.status(page.status).type("html").send(renderHtmlDocument(template, page));
}
async function startServer() {
  const app = express();
  const server = createServer(app);
  server.on("upgrade", proxyElevenLabsVoiceWebSocket);
  app.use(securityHeaders);
  app.use(express.json({ limit: "12mb" }));
  app.use("/api/ai", papaAiCors, papaAiRateLimit());
  app.use("/api/health", papaAiCors);
  app.use(
    session({
      store: new SQLiteStore({ db: "sessions.db", dir: path3.resolve(__dirname2, "..") }),
      secret: "papalife-secret-2026",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1e3, httpOnly: true }
    })
  );
  app.get("/api/health", (_req, res) => {
    const ai = getPapaAiStatus();
    res.json({
      ok: true,
      service: "papa-life-website",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ai: {
        live_ai_enabled: ai.live_ai_enabled,
        provider: ai.provider,
        supported_providers: ai.supported_providers
      },
      database: "sqlite"
    });
  });
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const login = (username || "").trim();
    const user = login.includes("@") ? db.prepare("SELECT * FROM admin_users WHERE email = ?").get(login) : db.prepare("SELECT * FROM admin_users WHERE username = ?").get(login);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }
    req.session.adminId = user.id;
    req.session.adminUser = {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email
    };
    res.json({ ok: true, user: { id: user.id, username: user.username, display_name: user.display_name, email: user.email } });
  });
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });
  app.get("/api/auth/me", (req, res) => {
    const user = req.session.adminUser;
    if (!user) return res.status(401).json({ ok: false });
    res.json({
      ok: true,
      user: {
        ...user,
        researchLabAccess: isResearchLabWebUser(user.username)
      }
    });
  });
  app.get("/api/admin/ghl-integration", requireAuth, (req, res) => {
    const adminId = req.session.adminId;
    if (!adminId) return res.status(401).json({ ok: false, error: "Unauthorized" });
    try {
      res.json({ ok: true, integration: getGhlIntegrationPublic(db, adminId) });
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "Failed to load GHL settings" });
    }
  });
  app.put("/api/admin/ghl-integration", requireAuth, (req, res) => {
    const adminId = req.session.adminId;
    if (!adminId) return res.status(401).json({ ok: false, error: "Unauthorized" });
    const token = String(req.body?.api_token ?? req.body?.ghl_api_token ?? "").trim();
    if (!token) {
      return res.status(400).json({ ok: false, error: "api_token is required" });
    }
    try {
      const integration = saveGhlIntegration(
        db,
        adminId,
        token,
        req.body?.location_id ?? req.body?.ghl_location_id ?? null
      );
      res.json({ ok: true, integration, message: "Go High Level token saved securely." });
    } catch (e) {
      res.status(400).json({ ok: false, error: e?.message || "Failed to save GHL token" });
    }
  });
  app.delete("/api/admin/ghl-integration", requireAuth, (req, res) => {
    const adminId = req.session.adminId;
    if (!adminId) return res.status(401).json({ ok: false, error: "Unauthorized" });
    try {
      const integration = clearGhlIntegration(db, adminId);
      res.json({ ok: true, integration, message: "Go High Level token removed from dashboard storage." });
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "Failed to clear GHL token" });
    }
  });
  app.get("/api/admin/integrations/status", requireAuth, (_req, res) => {
    try {
      res.json({ ok: true, status: adminIntegrationStatusPayload() });
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "Failed to load integration status" });
    }
  });
  app.get("/api/admin/notification-events", requireAuth, (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    try {
      res.json({ ok: true, events: recentNotificationEvents(limit) });
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "Failed to load notification events" });
    }
  });
  app.post("/api/admin/notifications/test", requireAuth, async (req, res) => {
    const user = req.session.adminUser;
    const result = await sendAdminNotification({
      event_type: "admin_test",
      subject: "Papa Life notification test",
      summary: [
        "This is a test notification from Boss Mobile Life Coach.",
        "",
        `Requested by: ${user?.display_name || user?.username || "admin"}`,
        `Time: ${(/* @__PURE__ */ new Date()).toISOString()}`
      ].join("\n"),
      payload: { source: "crm_console_settings" }
    });
    res.json({ ok: true, result });
  });
  app.get("/api/admin/payment-events", requireAuth, (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100);
    try {
      res.json({ ok: true, events: recentMemberPaymentEvents(limit) });
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "Failed to load payment events" });
    }
  });
  app.post("/api/leads", async (req, res) => {
    try {
      const body = req.body;
      const isAiLead = body?.source === "papa_ai" || body?.source_page || body?.conversation_summary || body?.assessment_result || body?.first_name && body?.email && !body?.business_email;
      if (isAiLead) {
        const lead = normalizePapaAiLead(body);
        const sourcePage = cleanPublicText(body?.source_page || body?.sourcePage || req.get("referer"), 500);
        const conversationSummary = cleanPublicText(body?.conversation_summary || body?.conversationSummary, 1e3);
        const assessmentResult = body?.assessment_result || body?.assessmentResult || null;
        const offer = cleanPublicText(body?.offer, 160) || "Papa Life AI Coach";
        if (!lead.first_name || !lead.email || !isValidEmail(lead.email)) {
          return res.status(400).json({ ok: false, error: "Valid first name and email are required" });
        }
        const result2 = db.prepare(
          `INSERT INTO intake_submissions (first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision, answers_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          lead.first_name,
          lead.email,
          lead.phone || null,
          `AI lead requested: ${offer}`,
          "AI Coach",
          null,
          conversationSummary || "Visitor requested follow-up from the Papa Life AI experience.",
          JSON.stringify({
            source: "papa_ai",
            source_page: sourcePage,
            offer,
            assessment_result: assessmentResult,
            conversation_summary: conversationSummary,
            submitted_at: (/* @__PURE__ */ new Date()).toISOString()
          })
        );
        db.prepare(
          `INSERT INTO conversion_pipeline (email, first_name, stage, intake_completed)
           VALUES (?, ?, 'engagement', 1)
           ON CONFLICT(email) DO UPDATE SET
             first_name = COALESCE(excluded.first_name, conversion_pipeline.first_name),
             intake_completed = 1,
             updated_at = datetime('now')`
        ).run(lead.email, lead.first_name);
        savePapaAiInteraction({
          session_id: req.sessionID || "public",
          mode: "lead",
          first_name: lead.first_name,
          email: lead.email,
          phone: lead.phone,
          source_page: sourcePage,
          user_message: `Lead requested: ${offer}`,
          conversation_summary: conversationSummary,
          provider: "local",
          assessment_result: assessmentResult
        });
        await syncPapaAiContactToGhl({
          first_name: lead.first_name,
          email: lead.email,
          phone: lead.phone || null,
          source: "bossmobilelifecoach.com Papa Life AI lead",
          tags: [
            "papa_ai_lead",
            "papa_life_ai",
            offer ? `offer_${offer}` : ""
          ]
        });
        await sendAdminNotification({
          event_type: "papa_ai_lead",
          subject: `Papa Life AI lead: ${lead.first_name}`,
          summary: [
            "A visitor requested a Papa Life AI follow-up.",
            "",
            `Name: ${lead.first_name}`,
            `Email: ${lead.email}`,
            lead.phone ? `Phone: ${lead.phone}` : null,
            `Offer: ${offer}`,
            sourcePage ? `Source page: ${sourcePage}` : null,
            conversationSummary ? `Conversation: ${conversationSummary}` : null
          ].filter(Boolean).join("\n"),
          payload: {
            lead,
            offer,
            source_page: sourcePage,
            conversation_summary: conversationSummary,
            intake_id: Number(result2.lastInsertRowid)
          }
        });
        return res.json({ ok: true, id: result2.lastInsertRowid });
      }
      const result = insertLead.run({
        invited_by: body.invited_by || null,
        first_name: body.first_name,
        last_name: body.last_name,
        mobile_phone: body.mobile_phone,
        business_email: body.business_email,
        business_name: body.business_name || null,
        website: body.website || null,
        street_address: body.street_address || null,
        address2: body.address2 || null,
        city: body.city || null,
        state: body.state || null,
        country: body.country || null,
        postal_code: body.postal_code || null,
        consent_transactional: body.consent_transactional ? 1 : 0,
        consent_marketing: body.consent_marketing ? 1 : 0,
        checkout_status: "redirected_to_checkout"
      });
      res.json({ ok: true, id: result.lastInsertRowid });
    } catch (err) {
      console.error("Lead insert error:", err);
      res.status(500).json({ ok: false, error: "Failed to save lead" });
    }
  });
  app.get("/api/leads", requireAuth, (_req, res) => {
    const leads = db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
    res.json(leads);
  });
  app.delete("/api/leads/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM leads WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/leads/:id/notes", requireAuth, (req, res) => {
    const notes = db.prepare("SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(notes);
  });
  app.post("/api/leads/:id/notes", requireAuth, (req, res) => {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ ok: false, error: "Note body required" });
    const result = db.prepare("INSERT INTO lead_notes (lead_id, body) VALUES (?, ?)").run(req.params.id, body.trim());
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.delete("/api/notes/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM lead_notes WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/dashboard/stats", requireAuth, (_req, res) => {
    const total = db.prepare("SELECT COUNT(*) as c FROM leads").get().c;
    const checkedOut = db.prepare("SELECT COUNT(*) as c FROM leads WHERE checkout_status = 'redirected_to_checkout'").get().c;
    const deliveryRate = total > 0 ? Math.round(checkedOut / total * 100) : 0;
    const byDay = db.prepare(`SELECT date(created_at) as day, COUNT(*) as count FROM leads GROUP BY date(created_at) ORDER BY day DESC LIMIT 30`).all();
    const byConsent = db.prepare(`SELECT SUM(consent_transactional) as transactional, SUM(consent_marketing) as marketing FROM leads`).get();
    const trafficTotal = db.prepare("SELECT COUNT(*) as c FROM traffic_clicks").get().c;
    const trafficByDoorway = db.prepare(
      `SELECT doorway, COUNT(*) as count
       FROM traffic_clicks
       GROUP BY doorway
       ORDER BY count DESC`
    ).all();
    const trafficBySource = db.prepare(
      `SELECT COALESCE(source, 'unknown') as source, COUNT(*) as count
       FROM traffic_clicks
       GROUP BY COALESCE(source, 'unknown')
       ORDER BY count DESC
       LIMIT 12`
    ).all();
    const recentTraffic = db.prepare(
      `SELECT doorway, destination, source, campaign, referrer, created_at
       FROM traffic_clicks
       ORDER BY created_at DESC
       LIMIT 25`
    ).all();
    res.json({
      total,
      checkedOut,
      deliveryRate,
      byDay,
      byConsent,
      traffic: { total: trafficTotal, byDoorway: trafficByDoorway, bySource: trafficBySource, recent: recentTraffic }
    });
  });
  registerSmsCampaignRoutes(app, db, requireAuth);
  app.get("/api/admin/papa-daily-work-reports", requireAuth, (_req, res) => {
    const reports = db.prepare(
      `SELECT id, report_date, title, outcomes, win, ventures_saved, created_at
         FROM papa_daily_work_reports
         ORDER BY report_date DESC, created_at DESC
         LIMIT 30`
    ).all();
    res.json({ ok: true, reports });
  });
  app.post("/api/admin/papa-daily-work-reports", requireAuth, async (req, res) => {
    try {
      const date = normalizeReportDate(req.body?.reportDate);
      const fields = normalizeReportFields(req.body?.fields);
      const outcomes = normalizeOutcomes(req.body?.outcomes);
      const markdown = String(req.body?.markdown || "").trim() || buildPapaDailyReportMarkdown(date, fields, outcomes);
      const title = `Papa Life Daily Work Report - ${date}`;
      const ventures = await sendPapaDailyReportToVentures(date, markdown);
      const user = req.session.adminUser;
      const result = db.prepare(
        `INSERT INTO papa_daily_work_reports (
            report_date, title, outreach, content_creation, scheduling, automation,
            coaching, pipeline, revenue, research, outcomes, win, markdown,
            ventures_saved, ventures_error, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        date,
        title,
        fields.outreach || null,
        fields.contentCreation || null,
        fields.scheduling || null,
        fields.automation || null,
        fields.coaching || null,
        fields.pipeline || null,
        fields.revenue || null,
        fields.research || null,
        JSON.stringify(outcomes),
        fields.win || null,
        markdown,
        ventures.ok ? 1 : 0,
        ventures.error,
        user?.email || user?.username || null
      );
      res.json({
        ok: true,
        id: result.lastInsertRowid,
        venturesSaved: ventures.ok,
        venturesError: ventures.error
      });
    } catch (e) {
      console.error("[papa-daily-work-report] save failed:", e);
      res.status(500).json({ ok: false, error: e?.message || "Failed to save report" });
    }
  });
  app.get("/api/resources", requireAuth, (_req, res) => {
    const resources = db.prepare("SELECT * FROM resources ORDER BY sort_order ASC, created_at DESC").all();
    res.json(resources);
  });
  app.post("/api/resources", requireAuth, (req, res) => {
    const { title, description, url, category } = req.body;
    if (!title?.trim() || !url?.trim()) return res.status(400).json({ ok: false, error: "Title and URL required" });
    const result = db.prepare(
      "INSERT INTO resources (title, description, url, category) VALUES (?, ?, ?, ?)"
    ).run(title.trim(), description?.trim() || null, url.trim(), category?.trim() || "General");
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.put("/api/resources/:id", requireAuth, (req, res) => {
    const { title, description, url, category } = req.body;
    db.prepare("UPDATE resources SET title=?, description=?, url=?, category=? WHERE id=?").run(title, description || null, url, category || "General", req.params.id);
    res.json({ ok: true });
  });
  app.delete("/api/resources/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM resources WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });
  app.put("/api/leads/:id/status", requireAuth, (req, res) => {
    const { status } = req.body;
    const valid = ["New", "Contacted", "Qualified", "Enrolled", "Active", "Alumni"];
    if (!valid.includes(status)) return res.status(400).json({ ok: false, error: "Invalid status" });
    db.prepare("UPDATE leads SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/leads/:id/tasks", requireAuth, (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks WHERE lead_id = ? ORDER BY created_at ASC").all(req.params.id);
    res.json(tasks);
  });
  app.post("/api/leads/:id/tasks", requireAuth, (req, res) => {
    const { title, due_date } = req.body;
    if (!title?.trim()) return res.status(400).json({ ok: false, error: "Title required" });
    const result = db.prepare("INSERT INTO tasks (lead_id, title, due_date) VALUES (?, ?, ?)").run(req.params.id, title.trim(), due_date || null);
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.put("/api/tasks/:id", requireAuth, (req, res) => {
    const { title, due_date, completed } = req.body;
    db.prepare("UPDATE tasks SET title = COALESCE(?, title), due_date = COALESCE(?, due_date), completed = COALESCE(?, completed) WHERE id = ?").run(title ?? null, due_date ?? null, completed !== void 0 ? completed ? 1 : 0 : null, req.params.id);
    res.json({ ok: true });
  });
  app.delete("/api/tasks/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });
  app.post("/api/member/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const member = db.prepare("SELECT * FROM members WHERE email = ? AND status = 'active'").get(email);
    if (!member) return res.status(401).json({ ok: false, error: "Invalid email or password" });
    const valid = await bcrypt.compare(password, member.password_hash);
    if (!valid) return res.status(401).json({ ok: false, error: "Invalid email or password" });
    req.session.memberId = member.id;
    req.session.memberUser = memberSessionPayload(member);
    const billing = getMemberAccessState(member);
    res.json({
      ok: true,
      user: memberSessionPayload(member),
      billing,
      billing_required: !billing.hasPortalAccess
    });
  });
  app.post("/api/member/auth/register", async (req, res) => {
    const { first_name, last_name, email, password } = req.body || {};
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ ok: false, error: "First name, last name, email, and password are required" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = db.prepare("SELECT id FROM members WHERE email = ?").get(normalizedEmail);
    if (existing?.id) {
      return res.status(409).json({ ok: false, error: "An account with this email already exists" });
    }
    const hash = await bcrypt.hash(String(password), 10);
    const pricing = getPricingSettings(db);
    const trialStartedAt = (/* @__PURE__ */ new Date()).toISOString();
    const trialExpiresAt = addHours(trialStartedAt, pricing.member_trial_hours);
    const result = db.prepare(
      "INSERT INTO members (first_name, last_name, email, password_hash, status, payment_status, trial_started_at, trial_expires_at, enrolled_at) VALUES (?, ?, ?, ?, 'active', 'trial', ?, ?, ?)"
    ).run(
      String(first_name).trim(),
      String(last_name).trim(),
      normalizedEmail,
      hash,
      trialStartedAt,
      trialExpiresAt,
      trialStartedAt
    );
    const memberId = Number(result.lastInsertRowid);
    const member = loadMemberById(memberId);
    req.session.memberId = member.id;
    req.session.memberUser = memberSessionPayload(member);
    const billing = getMemberAccessState(member);
    res.status(201).json({
      ok: true,
      user: memberSessionPayload(member),
      billing,
      billing_required: !billing.hasPortalAccess
    });
  });
  app.post("/api/member/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });
  app.get("/api/member/auth/me", (req, res) => {
    const memberId = Number(req.session.memberId);
    if (!memberId) return res.status(401).json({ ok: false });
    const member = loadMemberById(memberId);
    if (!member || member.status !== "active") return res.status(401).json({ ok: false });
    const user = memberSessionPayload(member);
    req.session.memberUser = user;
    const billing = getMemberAccessState(member);
    if (!billing.hasPortalAccess) {
      return res.status(402).json({ ok: false, user, billing_required: true, billing });
    }
    res.json({ ok: true, user, billing });
  });
  app.get("/api/member/billing/status", requireMemberSession, (req, res) => {
    const memberId = Number(req.session.memberId);
    const member = loadMemberById(memberId);
    if (!member) return res.status(401).json({ ok: false, error: "Unauthorized" });
    const pricing = getPricingSettings(db);
    const billing = getMemberAccessState(member, pricing);
    return res.json({
      ok: true,
      user: memberSessionPayload(member),
      billing,
      amount_cents: pricing.member_price_usd_cents,
      amount_display: formatAmountDisplay(pricing.member_price_usd_cents, pricing.member_currency),
      currency: pricing.member_currency,
      product_name: pricing.member_product_name,
      checkout_provider: STRIPE_SECRET_KEY ? "stripe" : "fastpay",
      checkout_payment_link: appendCheckoutTracking(pricing.checkout_payment_link, member)
    });
  });
  app.post("/api/member/billing/create-checkout-session", requireMemberSession, async (req, res) => {
    try {
      const memberId = Number(req.session.memberId);
      const member = loadMemberById(memberId);
      if (!member) return res.status(401).json({ ok: false, error: "Unauthorized" });
      const pricing = getPricingSettings(db);
      const billing = getMemberAccessState(member, pricing);
      if (billing.payment_status === "paid") {
        return res.json({ ok: true, already_paid: true, checkout_url: null });
      }
      if (!STRIPE_SECRET_KEY) {
        return res.json({
          ok: true,
          provider: "fastpay",
          checkout_url: appendCheckoutTracking(pricing.checkout_payment_link, member),
          manual_reconciliation_required: true,
          message: "Stripe is not configured. Redirecting to the active Boss Mobility payment link."
        });
      }
      const baseUrl = appBaseUrl(req);
      const successUrl = `${baseUrl}/member-billing?success=1&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/member-billing?canceled=1`;
      const form = new URLSearchParams();
      form.set("mode", "payment");
      form.set("success_url", successUrl);
      form.set("cancel_url", cancelUrl);
      form.set("customer_email", member.email);
      form.set("client_reference_id", String(member.id));
      form.set("metadata[member_id]", String(member.id));
      if (pricing.member_stripe_price_id) {
        form.set("line_items[0][price]", pricing.member_stripe_price_id);
      } else {
        form.set("line_items[0][price_data][currency]", pricing.member_currency);
        form.set("line_items[0][price_data][unit_amount]", String(pricing.member_price_usd_cents));
        form.set("line_items[0][price_data][product_data][name]", pricing.member_product_name);
      }
      form.set("line_items[0][quantity]", "1");
      const sessionData = await stripeCreateCheckoutSession(form);
      db.prepare("UPDATE members SET stripe_checkout_session_id = ? WHERE id = ?").run(sessionData.id || null, member.id);
      return res.json({
        ok: true,
        checkout_url: sessionData.url,
        session_id: sessionData.id
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error?.message || "Unable to start checkout" });
    }
  });
  app.post("/api/member/billing/confirm", requireMemberSession, async (req, res) => {
    try {
      const memberId = Number(req.session.memberId);
      const member = loadMemberById(memberId);
      if (!member) return res.status(401).json({ ok: false, error: "Unauthorized" });
      const { session_id } = req.body || {};
      if (!session_id || typeof session_id !== "string") {
        return res.status(400).json({ ok: false, error: "session_id is required" });
      }
      const sessionData = await stripeRetrieveCheckoutSession(session_id);
      const paid = sessionData?.payment_status === "paid";
      const matchesMember = String(sessionData?.client_reference_id || "") === String(member.id) || String(sessionData?.metadata?.member_id || "") === String(member.id);
      if (!matchesMember) {
        return res.status(403).json({ ok: false, error: "Checkout session does not match this account" });
      }
      if (!paid) {
        return res.status(400).json({ ok: false, error: "Payment not completed yet" });
      }
      db.prepare(
        "UPDATE members SET payment_status = 'paid', paid_at = ?, stripe_checkout_session_id = ?, stripe_customer_id = ?, trial_expires_at = NULL WHERE id = ?"
      ).run(
        (/* @__PURE__ */ new Date()).toISOString(),
        sessionData.id || null,
        typeof sessionData.customer === "string" ? sessionData.customer : null,
        member.id
      );
      const updated = loadMemberById(member.id);
      req.session.memberUser = memberSessionPayload(updated);
      return res.json({ ok: true, user: memberSessionPayload(updated), billing: getMemberAccessState(updated) });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error?.message || "Unable to confirm payment" });
    }
  });
  app.post("/api/webhooks/member-paid", (req, res) => {
    if (!process.env.PAYMENT_WEBHOOK_SECRET?.trim()) {
      return res.status(503).json({
        ok: false,
        error: "PAYMENT_WEBHOOK_SECRET is not configured"
      });
    }
    if (!verifyPaymentWebhookAuth(req)) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    try {
      const body = req.body || {};
      const memberIdRaw = body.member_id ?? body.memberId ?? body.client_reference_id ?? body.metadata?.member_id ?? body.data?.object?.client_reference_id ?? body.data?.object?.metadata?.member_id;
      const memberId = Number(memberIdRaw);
      const email = cleanPublicText(
        body.email ?? body.customer_email ?? body.customer?.email ?? body.data?.object?.customer_email ?? body.data?.object?.customer_details?.email,
        160
      ).toLowerCase();
      if (!Number.isFinite(memberId) && !isValidEmail(email)) {
        return res.status(400).json({ ok: false, error: "member_id or valid email is required" });
      }
      let member = Number.isFinite(memberId) ? loadMemberById(memberId) : null;
      if (!member && isValidEmail(email)) member = loadMemberByEmail(email);
      if (!member) return res.status(404).json({ ok: false, error: "Member not found" });
      const provider = cleanPublicText(
        body.provider ?? body.source ?? body.type ?? body.data?.object?.object ?? "external",
        80
      ) || "external";
      const transactionId = cleanPublicText(
        body.transaction_id ?? body.transactionId ?? body.payment_id ?? body.paymentId ?? body.session_id ?? body.id ?? body.data?.object?.id,
        160
      ) || null;
      const amountCentsRaw = body.amount_cents ?? body.amountCents ?? body.amount_total ?? body.data?.object?.amount_total ?? null;
      const amountCents = Number.isFinite(Number(amountCentsRaw)) ? Number(amountCentsRaw) : null;
      const paidAt = (/* @__PURE__ */ new Date()).toISOString();
      markMemberPaid(member.id, paidAt);
      db.prepare(
        `INSERT INTO member_payment_events
         (member_id, provider, transaction_id, email, amount_cents, raw_payload_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        member.id,
        provider,
        transactionId,
        isValidEmail(email) ? email : member.email,
        amountCents,
        JSON.stringify(body).slice(0, 2e4)
      );
      const updated = loadMemberById(member.id);
      return res.json({
        ok: true,
        member_id: member.id,
        email: updated.email,
        payment_status: updated.payment_status,
        paid_at: updated.paid_at
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error?.message || "Unable to record payment" });
    }
  });
  app.get("/api/members", requireAuth, (_req, res) => {
    const members = db.prepare(
      `SELECT id, lead_id, first_name, last_name, email, status, payment_status,
              trial_started_at, trial_expires_at, paid_at, enrolled_at, created_at
       FROM members ORDER BY created_at DESC`
    ).all();
    res.json(members);
  });
  app.post("/api/members", requireAuth, async (req, res) => {
    const { first_name, last_name, email, password, lead_id, enrolled_at } = req.body;
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ ok: false, error: "Name, email, and password required" });
    }
    const hash = await bcrypt.hash(password, 10);
    try {
      const result = db.prepare(
        "INSERT INTO members (lead_id, first_name, last_name, email, password_hash, payment_status, paid_at, enrolled_at) VALUES (?, ?, ?, ?, ?, 'paid', ?, ?)"
      ).run(
        lead_id || null,
        first_name.trim(),
        last_name.trim(),
        email.trim().toLowerCase(),
        hash,
        (/* @__PURE__ */ new Date()).toISOString(),
        enrolled_at || null
      );
      res.json({ ok: true, id: result.lastInsertRowid });
    } catch {
      res.status(409).json({ ok: false, error: "Email already exists" });
    }
  });
  app.put("/api/members/:id", requireAuth, (req, res) => {
    const { first_name, last_name, email, status } = req.body;
    db.prepare("UPDATE members SET first_name = ?, last_name = ?, email = ?, status = ? WHERE id = ?").run(first_name, last_name, email, status, req.params.id);
    res.json({ ok: true });
  });
  app.put("/api/members/:id/password", requireAuth, async (req, res) => {
    const { password } = req.body;
    if (!password?.trim()) return res.status(400).json({ ok: false, error: "Password required" });
    const hash = await bcrypt.hash(password, 10);
    db.prepare("UPDATE members SET password_hash = ? WHERE id = ?").run(hash, req.params.id);
    res.json({ ok: true });
  });
  app.put("/api/members/:id/mark-paid", requireAuth, (req, res) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updated = markMemberPaid(Number(req.params.id), now);
    if (!updated) return res.status(404).json({ ok: false, error: "Member not found" });
    db.prepare(
      `INSERT INTO member_payment_events
       (member_id, provider, transaction_id, email, amount_cents, raw_payload_json)
       VALUES (?, 'admin', NULL, NULL, NULL, ?)`
    ).run(Number(req.params.id), JSON.stringify({ source: "admin_mark_paid" }));
    res.json({ ok: true, paid_at: now });
  });
  app.delete("/api/members/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM members WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/public/courses", (_req, res) => {
    const courses = db.prepare(
      `SELECT c.id, c.title, c.description, c.pillar, c.sort_order, COUNT(l.id) AS lesson_count
         FROM courses c
         LEFT JOIN lessons l ON l.course_id = c.id
         WHERE c.show_in_catalog = 1
         GROUP BY c.id
         ORDER BY c.sort_order ASC, c.created_at DESC`
    ).all();
    res.json(courses);
  });
  app.get("/api/public/courses/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });
    const course = db.prepare(
      `SELECT c.id, c.title, c.description, c.pillar, c.sort_order
         FROM courses c
         WHERE c.id = ? AND c.show_in_catalog = 1`
    ).get(id);
    if (!course) return res.status(404).json({ ok: false, error: "Not found" });
    const lessons = db.prepare(
      `SELECT id, title, description, duration_minutes, sort_order, content_type
         FROM lessons WHERE course_id = ? ORDER BY sort_order ASC, created_at ASC`
    ).all(id);
    res.json({ ...course, lessons });
  });
  app.get("/api/public/first-lesson", (_req, res) => {
    const row = db.prepare(
      `SELECT
           c.id AS course_id,
           c.title AS course_title,
           c.pillar AS course_pillar,
           l.id AS lesson_id,
           l.title AS lesson_title,
           l.description AS lesson_description,
           l.content_url AS content_url,
           l.content_type AS content_type,
           l.duration_minutes AS duration_minutes,
           l.sort_order AS lesson_sort_order
         FROM courses c
         INNER JOIN lessons l ON l.course_id = c.id
         WHERE c.show_in_catalog = 1
         ORDER BY c.sort_order ASC, c.id ASC, l.sort_order ASC, l.id ASC
         LIMIT 1`
    ).get();
    if (!row) {
      return res.json({ course: null, lesson: null });
    }
    res.json({
      course: {
        id: row.course_id,
        title: row.course_title,
        pillar: row.course_pillar
      },
      lesson: {
        id: row.lesson_id,
        title: row.lesson_title,
        description: row.lesson_description,
        content_url: row.content_url,
        content_type: row.content_type,
        duration_minutes: row.duration_minutes
      }
    });
  });
  app.get("/api/public/forms/:formKey", (req, res) => {
    const raw = String(req.params.formKey ?? "");
    if (!/^[a-z0-9_]+$/i.test(raw)) {
      return res.status(400).json({ ok: false, error: "Invalid form key" });
    }
    const rows = db.prepare(
      `SELECT question_key, label, help_text, input_type, required, sort_order, placeholder, options_json
         FROM form_questions
         WHERE form_key = ? AND active = 1
         ORDER BY sort_order ASC, question_key ASC`
    ).all(raw);
    const questions = rows.map((row) => ({
      question_key: row.question_key,
      label: row.label,
      help_text: row.help_text,
      input_type: row.input_type,
      required: Number(row.required) === 1,
      sort_order: row.sort_order,
      placeholder: row.placeholder,
      options: row.options_json ? JSON.parse(String(row.options_json)) : []
    }));
    res.json({ form_key: raw, questions });
  });
  app.get("/api/courses", requireAuth, (_req, res) => {
    const courses = db.prepare("SELECT c.*, COUNT(l.id) as lesson_count FROM courses c LEFT JOIN lessons l ON l.course_id = c.id GROUP BY c.id ORDER BY c.sort_order ASC, c.created_at DESC").all();
    res.json(courses);
  });
  app.post("/api/courses", requireAuth, (req, res) => {
    const { title, description, pillar, show_in_catalog } = req.body;
    if (!title?.trim()) return res.status(400).json({ ok: false, error: "Title required" });
    const catalog = show_in_catalog === false || show_in_catalog === 0 ? 0 : 1;
    const result = db.prepare("INSERT INTO courses (title, description, pillar, show_in_catalog) VALUES (?, ?, ?, ?)").run(title.trim(), description?.trim() || null, pillar || "General", catalog);
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.put("/api/courses/:id", requireAuth, (req, res) => {
    const { title, description, pillar, sort_order, show_in_catalog } = req.body;
    const catalog = show_in_catalog === void 0 ? db.prepare("SELECT show_in_catalog FROM courses WHERE id = ?").get(req.params.id)?.show_in_catalog ?? 1 : show_in_catalog === false || show_in_catalog === 0 ? 0 : 1;
    db.prepare("UPDATE courses SET title = ?, description = ?, pillar = ?, sort_order = ?, show_in_catalog = ? WHERE id = ?").run(title, description || null, pillar || "General", sort_order ?? 0, catalog, req.params.id);
    res.json({ ok: true });
  });
  app.delete("/api/courses/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM courses WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/courses/:id/lessons", requireAuth, (req, res) => {
    const lessons = db.prepare("SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC, created_at ASC").all(req.params.id);
    res.json(lessons);
  });
  app.post("/api/courses/:id/lessons", requireAuth, (req, res) => {
    const { title, description, content_url, content_type, duration_minutes } = req.body;
    if (!title?.trim()) return res.status(400).json({ ok: false, error: "Title required" });
    const result = db.prepare(
      "INSERT INTO lessons (course_id, title, description, content_url, content_type, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(req.params.id, title.trim(), description?.trim() || null, content_url?.trim() || null, content_type || "video", duration_minutes || null);
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.put("/api/lessons/:id", requireAuth, (req, res) => {
    const { title, description, content_url, content_type, duration_minutes, sort_order } = req.body;
    db.prepare("UPDATE lessons SET title = ?, description = ?, content_url = ?, content_type = ?, duration_minutes = ?, sort_order = ? WHERE id = ?").run(title, description || null, content_url || null, content_type || "video", duration_minutes || null, sort_order ?? 0, req.params.id);
    res.json({ ok: true });
  });
  app.delete("/api/lessons/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM lessons WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });
  app.post(
    "/api/admin/upload",
    requireAuth,
    (req, res, next) => {
      mediaUpload.single("file")(req, res, (err) => {
        if (err) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          return res.status(400).json({ ok: false, error: msg });
        }
        next();
      });
    },
    (req, res) => {
      const f = req.file;
      if (!f) return res.status(400).json({ ok: false, error: "No file" });
      const url = `/media/${f.filename}`;
      res.json({
        ok: true,
        url,
        content_type: trainingContentTypeFromMime(f.mimetype),
        mimetype: f.mimetype,
        size: f.size
      });
    }
  );
  app.get("/api/admin/content/versions/:course_id", requireAuth, (req, res) => {
    const rows = db.prepare(
      "SELECT id, course_id, summary, published_at, created_at FROM content_versions WHERE course_id = ? ORDER BY id DESC"
    ).all(req.params.course_id);
    res.json(rows);
  });
  app.post("/api/admin/content/publish/:course_id", requireAuth, (req, res) => {
    const courseId = Number(req.params.course_id);
    const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId);
    if (!course) return res.status(404).json({ ok: false, error: "Course not found" });
    const lessons = db.prepare("SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC, created_at ASC").all(courseId);
    const { summary } = req.body || {};
    const result = db.prepare(
      "INSERT INTO content_versions (course_id, summary, snapshot_json, published_at) VALUES (?, ?, ?, datetime('now'))"
    ).run(courseId, summary?.trim() || null, JSON.stringify({ course, lessons }));
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.put("/api/admin/content/drip-rules/:lesson_id", requireAuth, (req, res) => {
    const lessonId = Number(req.params.lesson_id);
    const releaseDays = Number(req.body?.release_days_after_enroll);
    if (!Number.isInteger(releaseDays) || releaseDays < 0) {
      return res.status(400).json({ ok: false, error: "release_days_after_enroll must be a non-negative integer" });
    }
    db.prepare(
      `INSERT INTO content_drip_rules (lesson_id, release_days_after_enroll, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(lesson_id) DO UPDATE SET
         release_days_after_enroll = excluded.release_days_after_enroll,
         updated_at = datetime('now')`
    ).run(lessonId, releaseDays);
    res.json({ ok: true });
  });
  app.get("/api/member/courses", requireMemberAuth, (_req, res) => {
    const memberId = _req.session.memberId;
    const member = loadMemberById(Number(memberId));
    const isPaidMember = String(member?.payment_status || "") === "paid";
    const courses = db.prepare(`
      SELECT c.*, COUNT(l.id) as lesson_count
      FROM courses c
      LEFT JOIN lessons l ON l.course_id = c.id
      WHERE
        ? = 1
        OR
        NOT EXISTS (SELECT 1 FROM member_course_access mca WHERE mca.member_id = ?)
        OR EXISTS (
          SELECT 1 FROM member_course_access mca2
          WHERE mca2.member_id = ? AND mca2.course_id = c.id AND mca2.granted = 1
        )
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.created_at DESC
    `).all(isPaidMember ? 1 : 0, memberId, memberId);
    res.json(courses);
  });
  app.get("/api/member/courses/:id", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const member = loadMemberById(Number(memberId));
    const isPaidMember = String(member?.payment_status || "") === "paid";
    const course = db.prepare(`
      SELECT c.*
      FROM courses c
      WHERE c.id = ?
        AND (
          ? = 1
          OR
          NOT EXISTS (SELECT 1 FROM member_course_access mca WHERE mca.member_id = ?)
          OR EXISTS (
            SELECT 1 FROM member_course_access mca2
            WHERE mca2.member_id = ? AND mca2.course_id = c.id AND mca2.granted = 1
          )
        )
    `).get(req.params.id, isPaidMember ? 1 : 0, memberId, memberId);
    if (!course) return res.status(404).json({ ok: false, error: "Not found" });
    const lessons = db.prepare("SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC, created_at ASC").all(req.params.id);
    res.json({ ...course, lessons });
  });
  app.get("/api/member/progress", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const progress = db.prepare("SELECT lesson_id, completed_at FROM member_progress WHERE member_id = ?").all(memberId);
    res.json(progress);
  });
  app.post("/api/member/progress", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const { lesson_id } = req.body;
    db.prepare("INSERT OR IGNORE INTO member_progress (member_id, lesson_id) VALUES (?, ?)").run(memberId, lesson_id);
    res.json({ ok: true });
  });
  app.delete("/api/member/progress/:lesson_id", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    db.prepare("DELETE FROM member_progress WHERE member_id = ? AND lesson_id = ?").run(memberId, req.params.lesson_id);
    res.json({ ok: true });
  });
  app.get("/api/journal-prompts", requireMemberAuth, (_req, res) => {
    const prompts = db.prepare("SELECT * FROM journal_prompts ORDER BY pillar ASC, sort_order ASC").all();
    res.json(prompts);
  });
  app.get("/api/admin/journal-prompts", requireAuth, (_req, res) => {
    const prompts = db.prepare("SELECT * FROM journal_prompts ORDER BY pillar ASC, sort_order ASC").all();
    res.json(prompts);
  });
  app.post("/api/admin/journal-prompts", requireAuth, (req, res) => {
    const { pillar, prompt_text } = req.body;
    if (!pillar?.trim() || !prompt_text?.trim()) return res.status(400).json({ ok: false, error: "Pillar and prompt text required" });
    const result = db.prepare("INSERT INTO journal_prompts (pillar, prompt_text) VALUES (?, ?)").run(pillar.trim(), prompt_text.trim());
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.put("/api/admin/journal-prompts/:id", requireAuth, (req, res) => {
    const { pillar, prompt_text, sort_order } = req.body;
    db.prepare("UPDATE journal_prompts SET pillar = ?, prompt_text = ?, sort_order = ? WHERE id = ?").run(pillar, prompt_text, sort_order ?? 0, req.params.id);
    res.json({ ok: true });
  });
  app.delete("/api/admin/journal-prompts/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM journal_prompts WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/member/journal", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const { pillar } = req.query;
    const entries = pillar ? db.prepare("SELECT * FROM journal_entries WHERE member_id = ? AND pillar = ? ORDER BY created_at DESC").all(memberId, pillar) : db.prepare("SELECT * FROM journal_entries WHERE member_id = ? ORDER BY created_at DESC").all(memberId);
    res.json(entries);
  });
  app.post("/api/member/journal", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const { pillar, prompt, body } = req.body;
    if (!pillar?.trim() || !body?.trim()) return res.status(400).json({ ok: false, error: "Pillar and body required" });
    const result = db.prepare("INSERT INTO journal_entries (member_id, pillar, prompt, body) VALUES (?, ?, ?, ?)").run(memberId, pillar.trim(), prompt?.trim() || "", body.trim());
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.delete("/api/member/journal/:id", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    db.prepare("DELETE FROM journal_entries WHERE id = ? AND member_id = ?").run(req.params.id, memberId);
    res.json({ ok: true });
  });
  app.get("/api/member/me", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const member = db.prepare("SELECT id, first_name, last_name, email, status, enrolled_at, created_at, adult_children_count, emotional_state, primary_pillar, faith_tradition, onboarding_completed, daily_reminder, brotherhood_notifications, streak_days, last_active_date FROM members WHERE id = ?").get(memberId);
    res.json(member);
  });
  app.put("/api/member/onboarding", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const { adult_children_count, emotional_state, primary_pillar, faith_tradition, daily_reminder, brotherhood_notifications } = req.body;
    db.prepare(`UPDATE members SET adult_children_count = ?, emotional_state = ?, primary_pillar = ?, faith_tradition = ?, daily_reminder = ?, brotherhood_notifications = ?, onboarding_completed = 1 WHERE id = ?`).run(adult_children_count ?? 0, emotional_state || null, primary_pillar || "Purpose", faith_tradition || null, daily_reminder ? 1 : 0, brotherhood_notifications !== false ? 1 : 0, memberId);
    res.json({ ok: true });
  });
  app.put("/api/member/preferences", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const { daily_reminder, brotherhood_notifications, primary_pillar } = req.body;
    db.prepare("UPDATE members SET daily_reminder = ?, brotherhood_notifications = ?, primary_pillar = ? WHERE id = ?").run(daily_reminder ? 1 : 0, brotherhood_notifications ? 1 : 0, primary_pillar || "Purpose", memberId);
    res.json({ ok: true });
  });
  app.get("/api/member/stats", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const completedLessons = db.prepare("SELECT COUNT(*) as c FROM member_progress WHERE member_id = ?").get(memberId).c;
    const journalEntries = db.prepare("SELECT COUNT(*) as c FROM journal_entries WHERE member_id = ?").get(memberId).c;
    const circlesJoined = db.prepare("SELECT COUNT(*) as c FROM member_circle_memberships WHERE member_id = ?").get(memberId).c;
    const eventsAttending = db.prepare("SELECT COUNT(*) as c FROM event_rsvps WHERE member_id = ?").get(memberId).c;
    const member = db.prepare("SELECT streak_days, last_active_date, primary_pillar FROM members WHERE id = ?").get(memberId);
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    if (member.last_active_date !== today) {
      const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0];
      const newStreak = member.last_active_date === yesterday ? (member.streak_days || 0) + 1 : 1;
      db.prepare("UPDATE members SET streak_days = ?, last_active_date = ? WHERE id = ?").run(newStreak, today, memberId);
      member.streak_days = newStreak;
    }
    res.json({ completedLessons, journalEntries, circlesJoined, eventsAttending, streak_days: member.streak_days, primary_pillar: member.primary_pillar });
  });
  app.get("/api/member/circles", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const circles = db.prepare(`
      SELECT c.*,
        CASE WHEN m.member_id IS NOT NULL THEN 1 ELSE 0 END as is_member,
        (SELECT COUNT(*) FROM member_circle_memberships WHERE circle_id = c.id) as member_count
      FROM community_circles c
      LEFT JOIN member_circle_memberships m ON m.circle_id = c.id AND m.member_id = ?
      ORDER BY c.sort_order ASC
    `).all(memberId);
    res.json(circles);
  });
  app.post("/api/member/circles/:id/join", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    db.prepare("INSERT OR IGNORE INTO member_circle_memberships (member_id, circle_id) VALUES (?, ?)").run(memberId, req.params.id);
    res.json({ ok: true });
  });
  app.delete("/api/member/circles/:id/leave", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    db.prepare("DELETE FROM member_circle_memberships WHERE member_id = ? AND circle_id = ?").run(memberId, req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/member/circles/:id/posts", requireMemberAuth, (req, res) => {
    const posts = db.prepare(`
      SELECT p.*, m.first_name, m.last_name
      FROM community_posts p
      JOIN members m ON m.id = p.member_id
      WHERE p.circle_id = ?
      ORDER BY p.created_at DESC
      LIMIT 50
    `).all(req.params.id);
    res.json(posts);
  });
  app.post("/api/member/circles/:id/posts", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ ok: false, error: "Post body required" });
    const result = db.prepare("INSERT INTO community_posts (member_id, circle_id, body) VALUES (?, ?, ?)").run(memberId, req.params.id, body.trim());
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.delete("/api/member/posts/:id", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    db.prepare("DELETE FROM community_posts WHERE id = ? AND member_id = ?").run(req.params.id, memberId);
    res.json({ ok: true });
  });
  app.get("/api/member/events", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const events = db.prepare(`
      SELECT e.*,
        CASE WHEN r.member_id IS NOT NULL THEN 1 ELSE 0 END as is_rsvped,
        (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id) as rsvp_count
      FROM platform_events e
      LEFT JOIN event_rsvps r ON r.event_id = e.id AND r.member_id = ?
      ORDER BY e.event_date ASC
    `).all(memberId);
    res.json(events);
  });
  app.post("/api/member/events/:id/rsvp", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    db.prepare("INSERT OR IGNORE INTO event_rsvps (member_id, event_id) VALUES (?, ?)").run(memberId, req.params.id);
    res.json({ ok: true });
  });
  app.delete("/api/member/events/:id/rsvp", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    db.prepare("DELETE FROM event_rsvps WHERE member_id = ? AND event_id = ?").run(memberId, req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/member/library", requireMemberAuth, (_req, res) => {
    const resources = db.prepare("SELECT * FROM resource_library ORDER BY sort_order ASC, created_at DESC").all();
    res.json(resources);
  });
  app.get("/api/member/library/:id/download", requireMemberAuth, (req, res) => {
    const resource = db.prepare("SELECT * FROM resource_library WHERE id = ?").get(req.params.id);
    if (!resource) return res.status(404).json({ ok: false, error: "Resource not found" });
    const memberId = Number(req.session.memberId);
    const member = loadMemberById(memberId);
    const isPaidMember = member?.payment_status === "paid";
    if (!resource.is_free && !isPaidMember) {
      return res.status(402).json({ ok: false, error: "Upgrade required" });
    }
    const resourceFile = resourceLibraryFileUrls.find((item) => item.title === resource.title);
    if (!resourceFile) return res.status(404).json({ ok: false, error: "Resource file not configured" });
    const folder = resource.is_free ? path3.join(appRoot, "dist", "public", "resources", "library") : path3.join(appRoot, "server", "private-resources", "library");
    const filePath = path3.join(folder, resourceFile.filename);
    if (!fs3.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: "Resource file missing" });
    }
    res.sendFile(filePath, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${resourceFile.filename}"`
      }
    });
  });
  app.get("/api/member/daily-reflection", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let reflection = db.prepare("SELECT * FROM daily_reflections WHERE scheduled_date = ?").get(today);
    if (!reflection) {
      const dayOfYear = Math.floor((Date.now() - new Date((/* @__PURE__ */ new Date()).getFullYear(), 0, 0).getTime()) / 864e5);
      const all = db.prepare("SELECT * FROM daily_reflections ORDER BY id ASC").all();
      reflection = all.length ? all[dayOfYear % all.length] : null;
    }
    if (!reflection) return res.json(null);
    const completed = !!db.prepare("SELECT id FROM member_daily_reflections WHERE member_id = ? AND reflection_id = ?").get(memberId, reflection.id);
    res.json({ ...reflection, completed });
  });
  app.post("/api/member/daily-reflection/:id/complete", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    db.prepare("INSERT OR IGNORE INTO member_daily_reflections (member_id, reflection_id) VALUES (?, ?)").run(memberId, req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/member/strategy-scan", requireMemberAuth, (req, res) => {
    const memberId = req.session.memberId;
    const member = db.prepare("SELECT * FROM members WHERE id = ?").get(memberId);
    const journalCount = db.prepare("SELECT COUNT(*) as c FROM journal_entries WHERE member_id = ?").get(memberId).c;
    const lessonCount = db.prepare("SELECT COUNT(*) as c FROM member_progress WHERE member_id = ?").get(memberId).c;
    const recentJournals = db.prepare("SELECT pillar, body, created_at FROM journal_entries WHERE member_id = ? ORDER BY created_at DESC LIMIT 5").all(memberId);
    const pillarCounts = { Purpose: 0, Authority: 0, Presence: 0, Alignment: 0 };
    recentJournals.forEach((j) => {
      if (pillarCounts[j.pillar] !== void 0) pillarCounts[j.pillar]++;
    });
    const weakestPillar = Object.entries(pillarCounts).sort((a, b) => a[1] - b[1])[0][0];
    const strongestPillar = Object.entries(pillarCounts).sort((a, b) => b[1] - a[1])[0][0];
    const insights = [
      { type: "strength", title: `${strongestPillar} Is Your Power Zone`, body: `Your recent journal entries show strong engagement in the ${strongestPillar} pillar. Keep building here \u2014 this is where your fatherhood confidence lives.` },
      { type: "growth", title: `${weakestPillar} Needs Your Attention`, body: `You haven't journaled much on ${weakestPillar} lately. This pillar often holds the key to your next breakthrough as a father.` },
      { type: "streak", title: journalCount >= 5 ? "Consistent Journaler" : "Build Your Journal Habit", body: journalCount >= 5 ? `With ${journalCount} journal entries, you're building serious self-awareness. Fathers who journal consistently see 3x faster growth.` : `You've written ${journalCount} journal entries so far. Aim for 3 entries per week \u2014 small steps create massive transformation.` },
      { type: "action", title: "Your Next Power Move", body: lessonCount === 0 ? "Start your first course lesson today. Knowledge + reflection = transformation." : `You've completed ${lessonCount} lessons. Your next step: apply what you've learned in a real conversation with your child this week.` }
    ];
    res.json({ insights, pillarCounts, streak_days: member.streak_days || 0, primary_pillar: member.primary_pillar || "Purpose" });
  });
  app.get("/api/admin/events", requireAuth, (_req, res) => {
    const events = db.prepare("SELECT e.*, (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id) as rsvp_count FROM platform_events e ORDER BY e.event_date ASC").all();
    res.json(events);
  });
  app.post("/api/admin/events", requireAuth, (req, res) => {
    const { title, description, event_date, event_time, format, location, zoom_link, is_free, is_members_only, max_attendees } = req.body;
    if (!title?.trim() || !event_date?.trim()) return res.status(400).json({ ok: false, error: "Title and date required" });
    const result = db.prepare(
      "INSERT INTO platform_events (title, description, event_date, event_time, format, location, zoom_link, is_free, is_members_only, max_attendees) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(title.trim(), description?.trim() || null, event_date.trim(), event_time?.trim() || null, format || "zoom", location?.trim() || null, zoom_link?.trim() || null, is_free ? 1 : 0, is_members_only ? 1 : 0, max_attendees || null);
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.put("/api/admin/events/:id", requireAuth, (req, res) => {
    const { title, description, event_date, event_time, format, location, zoom_link, is_free, is_members_only, max_attendees } = req.body;
    db.prepare("UPDATE platform_events SET title=?, description=?, event_date=?, event_time=?, format=?, location=?, zoom_link=?, is_free=?, is_members_only=?, max_attendees=? WHERE id=?").run(title, description || null, event_date, event_time || null, format || "zoom", location || null, zoom_link || null, is_free ? 1 : 0, is_members_only ? 1 : 0, max_attendees || null, req.params.id);
    res.json({ ok: true });
  });
  app.delete("/api/admin/events/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM platform_events WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/admin/library", requireAuth, (_req, res) => {
    const items = db.prepare("SELECT * FROM resource_library ORDER BY sort_order ASC, created_at DESC").all();
    res.json(items);
  });
  app.post("/api/admin/library", requireAuth, (req, res) => {
    const { title, description, pillar, file_url, type, is_free } = req.body;
    if (!title?.trim()) return res.status(400).json({ ok: false, error: "Title required" });
    const result = db.prepare("INSERT INTO resource_library (title, description, pillar, file_url, type, is_free) VALUES (?, ?, ?, ?, ?, ?)").run(title.trim(), description?.trim() || null, pillar || "General", file_url?.trim() || null, type || "pdf", is_free ? 1 : 0);
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.put("/api/admin/library/:id", requireAuth, (req, res) => {
    const { title, description, pillar, file_url, type, is_free } = req.body;
    db.prepare("UPDATE resource_library SET title=?, description=?, pillar=?, file_url=?, type=?, is_free=? WHERE id=?").run(title, description || null, pillar || "General", file_url || null, type || "pdf", is_free ? 1 : 0, req.params.id);
    res.json({ ok: true });
  });
  app.delete("/api/admin/library/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM resource_library WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/admin/circles", requireAuth, (_req, res) => {
    const circles = db.prepare("SELECT c.*, (SELECT COUNT(*) FROM member_circle_memberships WHERE circle_id = c.id) as member_count FROM community_circles c ORDER BY c.sort_order ASC").all();
    res.json(circles);
  });
  app.post("/api/admin/circles", requireAuth, (req, res) => {
    const { name, description, category } = req.body;
    if (!name?.trim()) return res.status(400).json({ ok: false, error: "Name required" });
    const result = db.prepare("INSERT INTO community_circles (name, description, category) VALUES (?, ?, ?)").run(name.trim(), description?.trim() || null, category || "General");
    res.json({ ok: true, id: result.lastInsertRowid });
  });
  app.delete("/api/admin/circles/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM community_circles WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/automation/status", (_req, res) => {
    res.json(automationStatusPayload(db));
  });
  app.get("/api/automation/contract.json", (_req, res) => {
    const contractPath = path3.resolve(__dirname2, "..", "automation-webhook-contract.json");
    if (fs3.existsSync(contractPath)) {
      res.type("application/json").send(fs3.readFileSync(contractPath, "utf8"));
      return;
    }
    res.status(404).json({ error: "contract file missing" });
  });
  app.post("/api/webhooks/ghl-new-contact", async (req, res) => {
    if (!verifyAutomationAuth(req.headers.authorization)) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    try {
      const body = req.body || {};
      const input = parseGhlContactPayload(body);
      if (!input.first_name && !input.email && !input.phone) {
        return res.status(400).json({ ok: false, error: "contact name or email/phone required" });
      }
      const result = await processGhlNewContact(db, input);
      console.log(`[ghl-automation] alert ${result.alert_id} lead ${result.lead_id}`);
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("[ghl-automation] webhook error:", err);
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
  app.post("/api/automation/claude-prompt", async (req, res) => {
    if (!verifyAutomationAuth(req.headers.authorization)) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    try {
      const { prompt, context } = parseClaudePromptBody(req.body || {});
      res.json(await claudePapaComplete(prompt, context));
    } catch (err) {
      console.error("[ghl-automation] claude-prompt error:", err);
      res.status(err instanceof Error && err.message.includes("prompt") ? 400 : 500).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  app.post("/api/automation/forward-alert/:id", async (req, res) => {
    if (!verifyAutomationAuth(req.headers.authorization)) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    const alertId = parseInt(String(req.params.id), 10);
    if (!Number.isInteger(alertId) || alertId <= 0) {
      return res.status(400).json({ ok: false, error: "invalid alert id" });
    }
    try {
      res.json({ ok: true, ...await forwardAlertToCloud(db, alertId) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
  app.post("/api/papa-intake", (req, res) => {
    try {
      const { first_name, email, issue_key } = req.body;
      const fn = typeof first_name === "string" ? first_name.trim() : "";
      const em = typeof email === "string" ? email.trim().toLowerCase() : "";
      const key = typeof issue_key === "string" ? issue_key.trim() : "";
      if (!fn || !em) {
        return res.status(400).json({ ok: false, error: "First name and email are required" });
      }
      if (!isPapaFunnelIssueTag(key)) {
        return res.status(400).json({ ok: false, error: "Choose the option that best describes where things stand" });
      }
      const situation = PAPA_FUNNEL_ISSUE_LABELS[key];
      const answersJson = JSON.stringify({
        funnel: "papa_homepage",
        issue_key: key,
        issue_label: situation
      });
      const result = db.prepare(
        `INSERT INTO intake_submissions (first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision, answers_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(fn, em, null, situation, key, null, null, answersJson);
      const existing = db.prepare("SELECT id FROM conversion_pipeline WHERE email = ?").get(em);
      if (existing) {
        db.prepare(
          "UPDATE conversion_pipeline SET intake_completed = 1, stage = CASE WHEN stage = 'discovery' THEN 'engagement' ELSE stage END, first_name = COALESCE(?, first_name), updated_at = datetime('now') WHERE id = ?"
        ).run(fn, existing.id);
      } else {
        db.prepare("INSERT INTO conversion_pipeline (email, first_name, stage, intake_completed) VALUES (?, ?, 'engagement', 1)").run(
          em,
          fn
        );
      }
      const intakeId = Number(result.lastInsertRowid);
      try {
        syncIntakeSubmissionToCrmLead(db, {
          intakeId,
          first_name: fn,
          email: em,
          phone: null,
          situation,
          routed_pillar: key,
          disconnected_pillar: null,
          vision: null,
          source: "web",
          invited_by: "papa_funnel_intake"
        });
      } catch (crmErr) {
        console.error("[crm] papa funnel sync failed:", crmErr);
      }
      res.json({ ok: true, id: intakeId, issue_key: key });
    } catch (err) {
      console.error("Papa intake error:", err);
      res.status(500).json({ ok: false, error: "Failed to save" });
    }
  });
  app.post("/api/papa-lead", async (req, res) => {
    try {
      const body = req.body;
      const answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? body.answers : body;
      const schemaRows = db.prepare(
        `SELECT question_key, label, required
           FROM form_questions
           WHERE form_key = 'papa_lead' AND active = 1
           ORDER BY sort_order ASC, id ASC`
      ).all();
      if (schemaRows.length === 0) {
        return res.status(503).json({ ok: false, error: "Assessment form is not configured" });
      }
      const get = (key) => {
        const v = answers[key];
        return typeof v === "string" ? v.trim() : v != null ? String(v).trim() : "";
      };
      for (const q of schemaRows) {
        if (q.required && !get(q.question_key)) {
          return res.status(400).json({ ok: false, error: `${q.label} is required` });
        }
      }
      const first_name = get("first_name");
      const email = get("email").toLowerCase();
      const phone = get("phone") || null;
      const age_range = get("age_range") || null;
      const child_type = get("child_type") || null;
      const relationship_status = get("relationship_status") || null;
      if (!first_name || !email) {
        return res.status(400).json({ ok: false, error: "First name and email are required" });
      }
      const situationParts = [
        relationship_status ? `Relationship: ${relationship_status}` : null,
        child_type ? `About: ${child_type}` : null,
        age_range ? `Age range: ${age_range}` : null
      ].filter(Boolean);
      const situation = situationParts.join(" \xB7 ") || "Relationship assessment lead";
      const answersJson = JSON.stringify({
        funnel: "relationship_assessment",
        form_key: "papa_lead",
        ...Object.fromEntries(schemaRows.map((q) => [q.question_key, get(q.question_key) || null]))
      });
      const result = db.prepare(
        `INSERT INTO intake_submissions (first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision, answers_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        first_name,
        email,
        phone,
        situation,
        relationship_status || "assessment",
        child_type,
        age_range,
        answersJson
      );
      const existing = db.prepare("SELECT id FROM conversion_pipeline WHERE email = ?").get(email);
      if (existing) {
        db.prepare(
          "UPDATE conversion_pipeline SET intake_completed = 1, stage = CASE WHEN stage = 'discovery' THEN 'engagement' ELSE stage END, first_name = COALESCE(?, first_name), updated_at = datetime('now') WHERE id = ?"
        ).run(first_name, existing.id);
      } else {
        db.prepare("INSERT INTO conversion_pipeline (email, first_name, stage, intake_completed) VALUES (?, ?, 'engagement', 1)").run(
          email,
          first_name
        );
      }
      const intakeId = Number(result.lastInsertRowid);
      try {
        syncIntakeSubmissionToCrmLead(db, {
          intakeId,
          first_name,
          email,
          phone,
          situation,
          routed_pillar: relationship_status || "assessment",
          disconnected_pillar: child_type,
          vision: age_range,
          source: "web",
          invited_by: "papa_lead_assessment"
        });
      } catch (crmErr) {
        console.error("[crm] papa_lead sync failed:", crmErr);
      }
      try {
        const ghlCredentials = resolveGhlCredentials(db);
        if (ghlCredentials) {
          const [contactFirstName, ...contactLastNameParts] = first_name.split(/\s+/);
          const tagValue = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
          const result2 = await ghlUpsertContactWithTags(
            {
              firstName: contactFirstName || first_name,
              lastName: contactLastNameParts.join(" ") || void 0,
              email,
              phone,
              source: "bossmobilelifecoach.com relationship assessment",
              tags: [
                "papa_lead_assessment",
                "relationship_assessment",
                relationship_status ? `relationship_${tagValue(relationship_status)}` : "",
                child_type ? `child_${tagValue(child_type)}` : ""
              ]
            },
            ghlCredentials
          );
          if (!result2.ok) {
            console.error("[ghl] papa_lead tag sync failed:", result2.error);
          }
        } else {
          console.warn("[ghl] papa_lead tag sync skipped: no GHL credentials configured");
        }
      } catch (ghlErr) {
        console.error("[ghl] papa_lead tag sync failed:", ghlErr);
      }
      res.json({ ok: true, id: intakeId });
    } catch (err) {
      console.error("Papa lead error:", err);
      res.status(500).json({ ok: false, error: "Failed to save assessment" });
    }
  });
  app.get(["/api/papa-ai/status", "/api/ai/status"], (_req, res) => {
    res.json(getPapaAiStatus());
  });
  app.get(["/api/papa-ai/assessment/questions", "/api/ai/assessment/questions"], (_req, res) => {
    res.json({
      ok: true,
      questions: papaAssessmentQuestions.map(([id, label, pillar]) => ({ id, label, pillar }))
    });
  });
  app.get(["/api/papa-ai/resources", "/api/ai/resources"], (req, res) => {
    const query = cleanPublicText(req.query.q, 240);
    const resources = findPapaResources(query || "papa life fatherhood", 8);
    res.json({ ok: true, resources });
  });
  app.get(["/api/papa-ai/voice/signed-url", "/api/ai/voice/signed-url"], async (req, res) => {
    if (!ELEVENLABS_API_KEY) {
      return res.status(503).json({
        ok: false,
        error: "Voice coach is not configured yet."
      });
    }
    try {
      const voiceConfig = await assertElevenLabsVoiceConfig("signed-url");
      const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url");
      url.searchParams.set("agent_id", ELEVENLABS_AGENT_ID);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY
        }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data?.signed_url !== "string") {
        console.error("[elevenlabs] signed URL failed", {
          status: response.status,
          message: data?.detail?.message || data?.detail || response.statusText
        });
        return res.status(502).json({
          ok: false,
          error: "Voice coach could not start right now."
        });
      }
      const upstreamSignedUrl = new URL(data.signed_url);
      const conversationSignature = upstreamSignedUrl.searchParams.get("conversation_signature");
      if (!conversationSignature) {
        throw new Error("ElevenLabs signed URL is missing conversation_signature.");
      }
      const widgetConfig = await getElevenLabsWidgetConfig(conversationSignature);
      res.json({
        ok: true,
        signed_url: publicVoiceWebSocketUrl(req, data.signed_url),
        agent_id: ELEVENLABS_AGENT_ID,
        widget_config: widgetConfig,
        tts: voiceConfig
      });
    } catch (error) {
      console.error("[elevenlabs] signed URL error", error);
      res.status(502).json({
        ok: false,
        error: error instanceof Error ? error.message : "Voice coach could not start right now."
      });
    }
  });
  app.post(["/api/papa-ai/chat", "/api/ai/chat"], async (req, res) => {
    try {
      const mode = cleanPublicText(req.body?.mode, 40) || "coach";
      const message = cleanPublicText(req.body?.message, 4e3);
      const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];
      const lead = normalizePapaAiLead(req.body?.lead);
      const sourcePage = cleanPublicText(req.body?.source_page || req.body?.sourcePage || req.get("referer"), 500);
      if (!message) {
        return res.status(400).json({ ok: false, error: "Message is required" });
      }
      const result = await buildPapaAiReply({ message, mode, history });
      savePapaAiInteraction({
        session_id: req.sessionID || "public",
        mode,
        first_name: lead.first_name,
        email: lead.email,
        phone: lead.phone,
        source_page: sourcePage,
        user_message: message,
        assistant_reply: result.reply,
        conversation_summary: buildConversationSummary(message, result.reply),
        provider: result.provider,
        resources: result.resources
      });
      if (lead.email) {
        db.prepare(
          `INSERT INTO conversion_pipeline (email, first_name, stage, content_interactions)
           VALUES (?, ?, 'engagement', 1)
           ON CONFLICT(email) DO UPDATE SET
             first_name = COALESCE(excluded.first_name, conversion_pipeline.first_name),
             content_interactions = content_interactions + 1,
             updated_at = datetime('now')`
        ).run(lead.email, lead.first_name || null);
      }
      res.json({
        ok: true,
        ...result,
        live_ai_enabled: result.provider !== "local",
        privacy_disclaimer: "Papa Life stores submitted contact details and conversation context only when you provide them for follow-up.",
        cta: "Start the Papa Life Assessment"
      });
    } catch (err) {
      console.error("[papa-ai] chat failed:", err);
      res.status(500).json({ ok: false, error: "Papa Life AI Coach could not respond right now" });
    }
  });
  app.post(["/api/papa-ai/assessment", "/api/ai/assessment"], async (req, res) => {
    try {
      const lead = normalizePapaAiLead(req.body?.lead);
      const sourcePage = cleanPublicText(req.body?.source_page || req.body?.sourcePage || req.get("referer"), 500);
      const rawAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];
      const answers = rawAnswers.map((answer) => ({
        id: cleanPublicText(answer?.id, 80),
        label: cleanPublicText(answer?.label, 240),
        pillar: cleanPublicText(answer?.pillar, 80),
        score: Number(answer?.score)
      }));
      if (answers.length < 10) {
        return res.status(400).json({ ok: false, error: "Please answer the assessment questions first" });
      }
      const report = buildAssessmentReport(answers);
      savePapaAiInteraction({
        session_id: req.sessionID || "public",
        mode: "assessment",
        first_name: lead.first_name,
        email: lead.email,
        phone: lead.phone,
        source_page: sourcePage,
        user_message: "AI Fatherhood Assessment submitted",
        assistant_reply: report.report,
        conversation_summary: report.summary,
        provider: "local",
        assessment_result: report,
        report,
        resources: report.resources
      });
      if (lead.first_name || lead.email || lead.phone) {
        const situation = `AI Fatherhood Assessment focus: ${report.focus_pillar}`;
        const result = db.prepare(
          `INSERT INTO intake_submissions (first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision, answers_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          lead.first_name || "Papa Life Visitor",
          lead.email || null,
          lead.phone || null,
          situation,
          report.focus_pillar,
          report.strength_pillar,
          "Requested Papa Life AI assessment report",
          JSON.stringify({ source: "papa_ai_assessment", answers, report })
        );
        if (lead.email) {
          db.prepare(
            `INSERT INTO conversion_pipeline (email, first_name, stage, intake_completed)
             VALUES (?, ?, 'engagement', 1)
             ON CONFLICT(email) DO UPDATE SET
               first_name = COALESCE(excluded.first_name, conversion_pipeline.first_name),
               intake_completed = 1,
               stage = CASE WHEN stage = 'discovery' THEN 'engagement' ELSE stage END,
               updated_at = datetime('now')`
          ).run(lead.email, lead.first_name || null);
        }
        try {
          syncIntakeSubmissionToCrmLead(db, {
            intakeId: Number(result.lastInsertRowid),
            first_name: lead.first_name || "Papa Life Visitor",
            email: lead.email || null,
            phone: lead.phone || null,
            situation,
            routed_pillar: report.focus_pillar,
            disconnected_pillar: report.strength_pillar,
            vision: "Requested Papa Life AI assessment report",
            source: "web",
            invited_by: "papa_ai_assessment"
          });
        } catch (crmErr) {
          console.error("[crm] papa_ai assessment sync failed:", crmErr);
        }
        if (lead.email) {
          await syncPapaAiContactToGhl({
            first_name: lead.first_name || "Papa Life Visitor",
            email: lead.email,
            phone: lead.phone || null,
            source: "bossmobilelifecoach.com Papa Life AI assessment",
            tags: [
              "papa_lead_assessment",
              "papa_ai_assessment",
              `focus_${report.focus_pillar}`,
              `strength_${report.strength_pillar}`
            ]
          });
        }
        await sendAdminNotification({
          event_type: "papa_ai_assessment",
          subject: `Papa Life AI assessment: ${lead.first_name || "Papa Life Visitor"}`,
          summary: [
            "A Papa Life AI assessment was submitted.",
            "",
            `Name: ${lead.first_name || "Papa Life Visitor"}`,
            lead.email ? `Email: ${lead.email}` : null,
            lead.phone ? `Phone: ${lead.phone}` : null,
            `Focus pillar: ${report.focus_pillar}`,
            `Strength pillar: ${report.strength_pillar}`,
            sourcePage ? `Source page: ${sourcePage}` : null,
            "",
            report.summary
          ].filter(Boolean).join("\n"),
          payload: {
            lead,
            source_page: sourcePage,
            focus_pillar: report.focus_pillar,
            strength_pillar: report.strength_pillar,
            intake_id: Number(result.lastInsertRowid)
          }
        });
      }
      res.json({
        ok: true,
        report,
        cta: report.focus_pillar === "Presence" ? "Join the next Tuesday Papa Life Live Show" : "Become a Papa Life Member"
      });
    } catch (err) {
      console.error("[papa-ai] assessment failed:", err);
      res.status(500).json({ ok: false, error: "Failed to generate assessment report" });
    }
  });
  app.post(["/api/papa-ai/lead", "/api/ai/leads"], async (req, res) => {
    try {
      const lead = normalizePapaAiLead(req.body);
      const offer = cleanPublicText(req.body?.offer, 120) || "Papa Life AI Coach";
      const sourcePage = cleanPublicText(req.body?.source_page || req.body?.sourcePage || req.get("referer"), 500);
      const conversationSummary = cleanPublicText(req.body?.conversation_summary || req.body?.conversationSummary, 1e3);
      const assessmentResult = req.body?.assessment_result || req.body?.assessmentResult || null;
      if (!lead.first_name || !lead.email) {
        return res.status(400).json({ ok: false, error: "First name and email are required" });
      }
      if (!isValidEmail(lead.email)) {
        return res.status(400).json({ ok: false, error: "A valid email is required" });
      }
      const result = db.prepare(
        `INSERT INTO intake_submissions (first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision, answers_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        lead.first_name,
        lead.email,
        lead.phone || null,
        `Lead requested: ${offer}`,
        "AI Coach",
        null,
        "Free assessment, Tuesday Live, newsletter, membership, or free chapter",
        JSON.stringify({
          source: "papa_ai_lead",
          source_page: sourcePage,
          offer,
          conversation_summary: conversationSummary,
          assessment_result: assessmentResult,
          submitted_at: (/* @__PURE__ */ new Date()).toISOString()
        })
      );
      db.prepare(
        `INSERT INTO conversion_pipeline (email, first_name, stage, intake_completed)
         VALUES (?, ?, 'engagement', 1)
         ON CONFLICT(email) DO UPDATE SET
           first_name = COALESCE(excluded.first_name, conversion_pipeline.first_name),
           intake_completed = 1,
           updated_at = datetime('now')`
      ).run(lead.email, lead.first_name);
      savePapaAiInteraction({
        session_id: req.sessionID || "public",
        mode: "lead",
        first_name: lead.first_name,
        email: lead.email,
        phone: lead.phone,
        source_page: sourcePage,
        user_message: `Lead requested: ${offer}`,
        conversation_summary: conversationSummary,
        provider: "local",
        assessment_result: assessmentResult
      });
      await syncPapaAiContactToGhl({
        first_name: lead.first_name,
        email: lead.email,
        phone: lead.phone || null,
        source: "bossmobilelifecoach.com Papa Life AI lead",
        tags: [
          "papa_ai_lead",
          "papa_life_ai",
          offer ? `offer_${offer}` : ""
        ]
      });
      await sendAdminNotification({
        event_type: "papa_ai_lead",
        subject: `Papa Life AI lead: ${lead.first_name}`,
        summary: [
          "A visitor requested a Papa Life AI follow-up.",
          "",
          `Name: ${lead.first_name}`,
          `Email: ${lead.email}`,
          lead.phone ? `Phone: ${lead.phone}` : null,
          `Offer: ${offer}`,
          sourcePage ? `Source page: ${sourcePage}` : null,
          conversationSummary ? `Conversation: ${conversationSummary}` : null
        ].filter(Boolean).join("\n"),
        payload: {
          lead,
          offer,
          source_page: sourcePage,
          conversation_summary: conversationSummary,
          intake_id: Number(result.lastInsertRowid)
        }
      });
      res.json({ ok: true, id: result.lastInsertRowid });
    } catch (err) {
      console.error("[papa-ai] lead failed:", err);
      res.status(500).json({ ok: false, error: "Failed to save lead" });
    }
  });
  app.get("/api/admin/papa-ai/interactions", requireAuth, (_req, res) => {
    const interactions = db.prepare(
      `SELECT id, session_id, mode, first_name, email, phone, user_message, assistant_reply,
                source_page, conversation_summary, provider, assessment_result_json, report_json,
                recommended_resources_json, created_at
         FROM papa_ai_interactions
         ORDER BY created_at DESC
         LIMIT 200`
    ).all();
    res.json({ ok: true, interactions });
  });
  app.post("/api/intake", (req, res) => {
    try {
      const body = req.body;
      const schemaRows = db.prepare(
        `SELECT question_key, label, input_type, required
           FROM form_questions
           WHERE form_key = 'intake_submission' AND active = 1
           ORDER BY sort_order ASC`
      ).all();
      const answers = {};
      if (body.answers && typeof body.answers === "object" && body.answers !== null) {
        for (const [k, v] of Object.entries(body.answers)) {
          answers[k] = v == null ? "" : String(v).trim();
        }
      } else {
        const keys = ["first_name", "email", "phone", "situation", "routed_pillar", "disconnected_pillar", "vision"];
        for (const k of keys) {
          const v = body[k];
          if (v != null) answers[k] = String(v).trim();
        }
      }
      for (const q of schemaRows) {
        if (Number(q.required) !== 1) continue;
        if (!answers[q.question_key]) {
          return res.status(400).json({ ok: false, error: `Required: ${q.label}` });
        }
      }
      const get = (k) => answers[k] ?? "";
      let first_name = get("first_name").trim();
      let email = get("email").trim().toLowerCase();
      let phone = get("phone").trim();
      let situation = get("situation").trim();
      if (!situation) {
        const ta = schemaRows.find((q) => q.input_type === "textarea" && q.question_key !== "vision");
        if (ta) situation = get(ta.question_key).trim();
      }
      if (!situation) {
        const parts = [];
        for (const q of schemaRows) {
          if (q.question_key === "first_name" || q.question_key === "email" || q.question_key === "phone") continue;
          const v = get(q.question_key);
          if (v) parts.push(`${q.label}: ${v}`);
        }
        situation = parts.join(" \u2014 ") || "\u2014";
      }
      const routed_pillar = get("routed_pillar").trim() || "General";
      const disconnected_pillar = get("disconnected_pillar").trim() || null;
      const vision = get("vision").trim() || null;
      if (!first_name || !situation || !routed_pillar) {
        return res.status(400).json({ ok: false, error: "Name, situation, and primary pillar are required" });
      }
      if (!email && !phone) {
        return res.status(400).json({ ok: false, error: "Please provide at least one contact method: email or phone" });
      }
      const answersJson = JSON.stringify(answers);
      const result = db.prepare(
        `INSERT INTO intake_submissions (first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision, answers_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(first_name, email || null, phone || null, situation, routed_pillar, disconnected_pillar, vision, answersJson);
      if (email) {
        const existing = db.prepare("SELECT id FROM conversion_pipeline WHERE email = ?").get(email);
        if (existing) {
          db.prepare(
            "UPDATE conversion_pipeline SET intake_completed = 1, stage = CASE WHEN stage = 'discovery' THEN 'engagement' ELSE stage END, first_name = COALESCE(?, first_name), updated_at = datetime('now') WHERE id = ?"
          ).run(first_name, existing.id);
        } else {
          db.prepare("INSERT INTO conversion_pipeline (email, first_name, stage, intake_completed) VALUES (?, ?, 'engagement', 1)").run(
            email,
            first_name
          );
        }
      }
      const intakeId = Number(result.lastInsertRowid);
      try {
        syncIntakeSubmissionToCrmLead(db, {
          intakeId,
          first_name,
          email: email || null,
          phone: phone || null,
          situation,
          routed_pillar,
          disconnected_pillar,
          vision,
          source: "web"
        });
      } catch (crmErr) {
        console.error("[crm] sync intake to lead failed:", crmErr);
      }
      res.json({ ok: true, id: result.lastInsertRowid, pillar: routed_pillar });
    } catch (err) {
      console.error("Intake error:", err);
      res.status(500).json({ ok: false, error: "Failed to save intake" });
    }
  });
  app.post("/api/engagement", (req, res) => {
    try {
      const { email, event_type, event_detail } = req.body;
      if (!email?.trim() || !event_type?.trim()) {
        return res.status(400).json({ ok: false, error: "Email and event_type required" });
      }
      db.prepare("INSERT INTO engagement_log (email, event_type, event_detail) VALUES (?, ?, ?)").run(email.trim().toLowerCase(), event_type.trim(), event_detail?.trim() || null);
      const pipeline = db.prepare("SELECT id, content_interactions, community_posts, event_rsvps FROM conversion_pipeline WHERE email = ?").get(email.trim().toLowerCase());
      if (pipeline) {
        if (event_type === "content_view" || event_type === "content_click") {
          db.prepare("UPDATE conversion_pipeline SET content_interactions = content_interactions + 1, updated_at = datetime('now') WHERE id = ?").run(pipeline.id);
        } else if (event_type === "community_post") {
          db.prepare("UPDATE conversion_pipeline SET community_posts = community_posts + 1, stage = CASE WHEN intake_completed = 1 THEN 'community' ELSE stage END, updated_at = datetime('now') WHERE id = ?").run(pipeline.id);
        } else if (event_type === "event_rsvp") {
          db.prepare("UPDATE conversion_pipeline SET event_rsvps = event_rsvps + 1, stage = CASE WHEN intake_completed = 1 THEN 'community' ELSE stage END, updated_at = datetime('now') WHERE id = ?").run(pipeline.id);
        }
        const updated = db.prepare("SELECT * FROM conversion_pipeline WHERE id = ?").get(pipeline.id);
        if (updated.intake_completed && updated.content_interactions >= 3 && (updated.community_posts >= 1 || updated.event_rsvps >= 1) && !updated.closer_eligible) {
          db.prepare("UPDATE conversion_pipeline SET closer_eligible = 1, stage = 'conversion', updated_at = datetime('now') WHERE id = ?").run(pipeline.id);
        }
      } else {
        db.prepare("INSERT INTO conversion_pipeline (email, stage, content_interactions) VALUES (?, 'discovery', CASE WHEN ? IN ('content_view', 'content_click') THEN 1 ELSE 0 END)").run(email.trim().toLowerCase(), event_type.trim());
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("Engagement log error:", err);
      res.status(500).json({ ok: false, error: "Failed to log engagement" });
    }
  });
  app.get("/api/conversion-status", (req, res) => {
    const { email } = req.query;
    if (!email || typeof email !== "string") return res.json({ stage: "discovery", eligible: false });
    const pipeline = db.prepare("SELECT stage, intake_completed, content_interactions, community_posts, event_rsvps, closer_eligible, closer_sent_at, booked_at FROM conversion_pipeline WHERE email = ?").get(email.trim().toLowerCase());
    if (!pipeline) return res.json({ stage: "discovery", eligible: false });
    res.json({
      stage: pipeline.stage,
      eligible: !!pipeline.closer_eligible,
      intake_completed: !!pipeline.intake_completed,
      content_interactions: pipeline.content_interactions,
      community_participation: pipeline.community_posts + pipeline.event_rsvps,
      booked: !!pipeline.booked_at
    });
  });
  app.post("/api/booking", (req, res) => {
    try {
      const { email } = req.body;
      if (!email?.trim()) return res.status(400).json({ ok: false, error: "Email required" });
      db.prepare("UPDATE conversion_pipeline SET booked_at = datetime('now'), updated_at = datetime('now') WHERE email = ?").run(email.trim().toLowerCase());
      db.prepare("INSERT INTO engagement_log (email, event_type, event_detail) VALUES (?, 'booking', 'PAPA Clarity Session booked via Calendly')").run(email.trim().toLowerCase());
      res.json({ ok: true });
    } catch (err) {
      console.error("Booking error:", err);
      res.status(500).json({ ok: false, error: "Failed to record booking" });
    }
  });
  app.get("/api/admin/pipeline", requireAuth, (_req, res) => {
    const pipeline = db.prepare("SELECT * FROM conversion_pipeline ORDER BY updated_at DESC").all();
    const stats = {
      total: pipeline.length,
      discovery: pipeline.filter((p) => p.stage === "discovery").length,
      engagement: pipeline.filter((p) => p.stage === "engagement").length,
      community: pipeline.filter((p) => p.stage === "community").length,
      conversion: pipeline.filter((p) => p.stage === "conversion").length,
      booked: pipeline.filter((p) => p.booked_at).length
    };
    res.json({ pipeline, stats });
  });
  app.get("/api/admin/intakes", requireAuth, (_req, res) => {
    const intakes = db.prepare("SELECT * FROM intake_submissions ORDER BY created_at DESC").all();
    res.json(intakes);
  });
  app.get("/api/admin/engagement-log", requireAuth, (req, res) => {
    const { email, limit: lim } = req.query;
    const limitNum = parseInt(String(lim || "100"), 10);
    if (email && typeof email === "string") {
      const logs2 = db.prepare("SELECT * FROM engagement_log WHERE email = ? ORDER BY created_at DESC LIMIT ?").all(email.toLowerCase(), limitNum);
      return res.json(logs2);
    }
    const logs = db.prepare("SELECT * FROM engagement_log ORDER BY created_at DESC LIMIT ?").all(limitNum);
    res.json(logs);
  });
  app.get("/api/admin/ctas", requireAuth, (req, res) => {
    try {
      const placement = req.query.placement ? String(req.query.placement).trim() : null;
      res.json({ ctas: listSiteCtasAdmin(db, placement) });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
  app.post("/api/admin/ctas", requireAuth, (req, res) => {
    try {
      const id = upsertSiteCta(db, {
        placement: req.body?.placement,
        headline: req.body?.headline ?? null,
        body: req.body?.body ?? null,
        button_label: req.body?.button_label ?? null,
        button_url: req.body?.button_url ?? null,
        variant: req.body?.variant,
        active: req.body?.active !== false,
        sort_order: req.body?.sort_order
      });
      res.json({ ok: true, id });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) });
    }
  });
  app.patch("/api/admin/ctas/:id", requireAuth, (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
      const existing = db.prepare("SELECT * FROM site_ctas WHERE id = ?").get(id);
      if (!existing) return res.status(404).json({ ok: false, error: "Not found" });
      upsertSiteCta(db, {
        id,
        placement: req.body?.placement ?? String(existing.placement ?? ""),
        headline: req.body?.headline !== void 0 ? req.body.headline : existing.headline,
        body: req.body?.body !== void 0 ? req.body.body : existing.body,
        button_label: req.body?.button_label !== void 0 ? req.body.button_label : existing.button_label,
        button_url: req.body?.button_url !== void 0 ? req.body.button_url : existing.button_url,
        variant: req.body?.variant ?? String(existing.variant ?? "amber"),
        active: req.body?.active !== void 0 ? req.body.active !== false : Number(existing.active) === 1,
        sort_order: req.body?.sort_order !== void 0 ? req.body.sort_order : Number(existing.sort_order ?? 0)
      });
      res.json({ ok: true, id });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) });
    }
  });
  app.delete("/api/admin/ctas/:id", requireAuth, (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
      deleteSiteCta(db, id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
  app.get("/api/admin/site-media", requireAuth, (req, res) => {
    try {
      const placement = req.query.placement ? String(req.query.placement).trim() : null;
      res.json({ media: listSiteMediaAdmin(db, placement) });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
  app.post("/api/admin/site-media", requireAuth, (req, res) => {
    try {
      const id = upsertSiteMedia(db, {
        placement: req.body?.placement,
        media_url: req.body?.media_url,
        media_type: req.body?.media_type,
        poster_url: req.body?.poster_url ?? null,
        alt_text: req.body?.alt_text ?? null,
        title: req.body?.title ?? null,
        active: req.body?.active !== false
      });
      res.json({ ok: true, id });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) });
    }
  });
  app.delete("/api/admin/site-media/:placement", requireAuth, (req, res) => {
    try {
      const placement = String(req.params.placement || "").trim();
      if (!placement) return res.status(400).json({ ok: false, error: "Invalid placement" });
      deleteSiteMedia(db, placement);
      res.json({ ok: true, placement });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
  app.get("/api/admin/research-dumps", requireAuth, requireResearchLabAccess, (_req, res) => {
    try {
      const rows = listResearchDumps(db, 100);
      res.json({ dumps: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
  app.post("/api/admin/research-dumps", requireAuth, requireResearchLabAccess, (req, res) => {
    try {
      const title = String(req.body?.title ?? "").trim() || "Untitled research";
      const raw_notes = String(req.body?.raw_notes ?? "");
      if (!raw_notes.trim()) {
        return res.status(400).json({ ok: false, error: "raw_notes is required" });
      }
      const id = createResearchDump(db, title, raw_notes);
      const row = getResearchDumpById(db, id, true);
      res.json({ ok: true, id, dump: row });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
  app.get("/api/admin/research-dumps/:id", requireAuth, requireResearchLabAccess, (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
      const includeRaw = req.query.raw === "1" || req.query.raw === "true";
      const dump = getResearchDumpById(db, id, includeRaw);
      if (!dump) return res.status(404).json({ ok: false, error: "Not found" });
      const suggestions = listSocialSuggestions(db, id);
      res.json({ dump, suggestions });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
  app.post("/api/admin/research-dumps/:id/analyze", requireAuth, requireResearchLabAccess, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
      const full = getResearchDumpById(db, id, true);
      if (!full || typeof full.raw_notes !== "string") {
        return res.status(404).json({ ok: false, error: "Not found" });
      }
      const out = await analyzeResearchNotes(full.raw_notes);
      setDumpAnalysis(db, id, out.executive_summary, out.themes, "ok", null);
      const dump = getResearchDumpById(db, id, false);
      res.json({
        ok: true,
        model: out.model,
        truncated: out.truncated,
        dump
      });
    } catch (e) {
      const id = parseInt(req.params.id, 10);
      if (id) {
        try {
          setDumpAnalysis(db, id, "", [], "error", String(e));
        } catch {
        }
      }
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
  app.post("/api/admin/research-dumps/:id/social-pack", requireAuth, requireResearchLabAccess, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
      const full = getResearchDumpById(db, id, true);
      if (!full || typeof full.raw_notes !== "string") {
        return res.status(404).json({ ok: false, error: "Not found" });
      }
      if (!full.executive_summary?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Run analyze first \u2014 no executive summary yet."
        });
      }
      const themes = full.themes_json ? JSON.parse(full.themes_json) : [];
      const platforms = Array.isArray(req.body?.platforms) ? req.body.platforms.map((p) => String(p)) : void 0;
      const replace = req.body?.replace === true;
      const pack = await generateSocialPack(full.raw_notes, full.executive_summary, themes, platforms);
      if (replace) deleteSocialSuggestionsForDump(db, id);
      let order = 0;
      for (const row of pack) {
        insertSocialSuggestion(db, {
          dump_id: id,
          platform: row.platform,
          headline: row.headline || null,
          body: row.body,
          hashtags: row.hashtags || null,
          cta: row.cta || null,
          sort_order: order++
        });
      }
      const suggestions = listSocialSuggestions(db, id);
      res.json({ ok: true, count: pack.length, suggestions });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
  app.patch("/api/admin/social-suggestions/:sid", requireAuth, requireResearchLabAccess, (req, res) => {
    try {
      const sid = parseInt(req.params.sid, 10);
      if (!sid) return res.status(400).json({ ok: false, error: "Invalid id" });
      const status = String(req.body?.status ?? "").trim();
      if (!["draft", "approved", "rejected", "posted"].includes(status)) {
        return res.status(400).json({ ok: false, error: "Invalid status" });
      }
      updateSuggestionStatus(db, sid, status);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
  app.get("/api/ctas", (req, res) => {
    try {
      const single = String(req.query.placement || "").trim();
      const multi = String(req.query.placements || "").trim();
      let placements = [];
      if (single) placements = [single];
      else if (multi) placements = multi.split(",").map((s) => s.trim()).filter(Boolean);
      else {
        return res.status(400).json({ error: "Query placement or placements (comma-separated) is required" });
      }
      const ctas = listSiteCtasPublic(db, placements);
      res.json({ ctas });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });
  app.get("/api/site-media", (req, res) => {
    try {
      const placement = String(req.query.placement || "").trim();
      if (!placement) return res.status(400).json({ error: "Query placement is required" });
      res.json({ media: getSiteMediaPublic(db, placement) ?? null });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });
  app.get("/api/public/pricing", (_req, res) => {
    const pricing = getPricingSettings(db);
    res.json({
      checkout_payment_link: pricing.checkout_payment_link,
      member_trial_hours: pricing.member_trial_hours,
      member_price_usd_cents: pricing.member_price_usd_cents,
      member_currency: pricing.member_currency,
      member_product_name: pricing.member_product_name,
      member_price_display: formatAmountDisplay(
        pricing.member_price_usd_cents,
        pricing.member_currency
      )
    });
  });
  app.get("/api/daily-theme", (_req, res) => {
    const themes = [
      { day: 0, name: "Weekly Reset", core: "Reflection & intention", direction: "Quiet, faith-rooted. Set the tone for the coming week. One intention. One anchor.", pillar: "Alignment" },
      { day: 1, name: "The Silent Phone", core: "Pain of distance", direction: "Speak to the dad whose adult kid has pulled away. Validate the hurt. Open the honest conversation.", pillar: "Presence" },
      { day: 2, name: "Provider vs. Parent", core: "Identity shift", direction: "Address the man who defined himself by what he provided. Who is he now?", pillar: "Purpose" },
      { day: 3, name: "PAPA Framework", core: "Teaching & reflection", direction: "Deep educational content on one of the four pillars. This is the anchor day.", pillar: "All" },
      { day: 4, name: "The Letter You Didn't Send", core: "Emotional honesty", direction: "Unspoken words. Unresolved moments. Prompt vulnerability and repair.", pillar: "Presence" },
      { day: 5, name: "Authority Reclaimed", core: "Confidence & character", direction: "What leading as a father of adults actually looks like. Practical and empowering.", pillar: "Authority" },
      { day: 6, name: "Success Story", core: "Proof & inspiration", direction: "Real dads. Real breakthroughs. Community wins. Social proof without hype.", pillar: "All" }
    ];
    const today = (/* @__PURE__ */ new Date()).getDay();
    res.json({ today: themes[today], all: themes });
  });
  function campaignRedirectUrl(base, source, campaign) {
    const url = new URL(base);
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", "bossmobile_site");
    url.searchParams.set("utm_campaign", campaign);
    return url.toString();
  }
  function logTrafficClick(req, doorway, destination, campaign) {
    const source = String(req.query.src || req.body?.source || "site").slice(0, 80);
    const referrer = String(req.get("referer") || req.body?.referrer || "").slice(0, 500) || null;
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim().slice(0, 80) || null;
    const userAgent = String(req.get("user-agent") || req.body?.user_agent || "").slice(0, 500) || null;
    db.prepare(
      `INSERT INTO traffic_clicks (doorway, destination, source, campaign, referrer, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(doorway, destination, source, campaign, referrer, ip, userAgent);
  }
  app.post("/api/traffic-click", (req, res) => {
    try {
      const doorway = String(req.body?.doorway || "").trim();
      const map = {
        stage: {
          destination: "https://fatherhood5-c3sirayz.manus.space/",
          campaign: "fatherhood_stage_tool"
        },
        "email-series": {
          destination: "https://papalifecoach.com/",
          campaign: "give_listen_love_serve_email_series"
        },
        join: {
          destination: "https://agent.bossmobility.net/payment-link/68d610ad67ee3bd205696444",
          campaign: "papa_life_paid_access"
        }
      };
      const item = map[doorway];
      if (!item) return res.status(400).json({ ok: false, error: "Unknown doorway" });
      logTrafficClick(req, doorway, item.destination, item.campaign);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
  app.get("/go/stage", (req, res) => {
    const destination = "https://fatherhood5-c3sirayz.manus.space/";
    const campaign = "fatherhood_stage_tool";
    logTrafficClick(req, "stage", destination, campaign);
    res.redirect(
      302,
      campaignRedirectUrl(
        destination,
        String(req.query.src || "site"),
        campaign
      )
    );
  });
  app.get("/go/email-series", (req, res) => {
    const destination = "https://papalifecoach.com/";
    const campaign = "give_listen_love_serve_email_series";
    logTrafficClick(req, "email-series", destination, campaign);
    res.redirect(
      302,
      campaignRedirectUrl(
        destination,
        String(req.query.src || "site"),
        campaign
      )
    );
  });
  app.get("/go/join", (req, res) => {
    const destination = "https://agent.bossmobility.net/payment-link/68d610ad67ee3bd205696444";
    const campaign = "papa_life_paid_access";
    logTrafficClick(req, "join", destination, campaign);
    res.redirect(
      302,
      campaignRedirectUrl(
        destination,
        String(req.query.src || "site"),
        campaign
      )
    );
  });
  app.use("/api", (_req, res) => {
    res.status(404).json({ ok: false, error: "Not found" });
  });
  fs3.mkdirSync(mediaUploadRoot, { recursive: true });
  app.use("/media", express.static(mediaUploadRoot));
  const staticPath = process.env.NODE_ENV === "production" ? path3.resolve(__dirname2, "public") : path3.resolve(__dirname2, "..", "dist", "public");
  const masterKnowledgeCenterPage = path3.join(staticPath, "papa-life-master-knowledge-center", "index.html");
  app.get(["/papa-life-master-knowledge-center", "/papa-life-master-knowledge-center/"], (_req, res) => {
    res.sendFile(masterKnowledgeCenterPage);
  });
  const tuesdayHostControlRoomPage = path3.join(staticPath, "tuesday-host-control-room", "index.html");
  app.get(["/tuesday-host-control-room", "/tuesday-host-control-room/", "/tuesday-host-control-room/index.html"], requireAuth, (_req, res) => {
    res.sendFile(tuesdayHostControlRoomPage);
  });
  app.use(express.static(staticPath));
  const papaAgentPage = path3.join(staticPath, "papa-agent.html");
  app.get("/papa", (_req, res) => {
    res.sendFile(papaAgentPage);
  });
  app.get("*", (req, res) => {
    sendServerRenderedApp(req, res, staticPath);
  });
  await assertElevenLabsVoiceConfig("startup");
  const port = process.env.PORT || 3e3;
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch((error) => {
  console.error("[startup] failed", error);
  process.exit(1);
});
