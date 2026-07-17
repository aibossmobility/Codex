// mcp-streamable.ts
import express from "express";
import dotenv from "dotenv";
import path2 from "path";
import crypto2 from "crypto";
import { randomUUID } from "crypto";
import Database2 from "better-sqlite3";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// server/mcp-handlers.ts
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

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
function assertResearchLabMcpEnabled() {
  if (process.env.RESEARCH_LAB_MCP_ENABLED !== "true") {
    throw new Error(
      "Research Lab MCP tools are disabled. Set RESEARCH_LAB_MCP_ENABLED=true on the server to enable (Brian-only automation)."
    );
  }
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
    member_trial_hours: Number(process.env.MEMBER_TRIAL_HOURS ?? 0),
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
function asNonNegativeInt(input, fallback) {
  const n = Number(input);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
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
  db2.prepare(
    `UPDATE pricing_settings
     SET value = '0', updated_at = datetime('now')
     WHERE key = 'member_trial_hours' AND value <> '0'`
  ).run();
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
    member_trial_hours: asNonNegativeInt(map.member_trial_hours, d.member_trial_hours),
    member_price_usd_cents: asPositiveInt(map.member_price_usd_cents, d.member_price_usd_cents),
    member_currency: normalizeCurrency(map.member_currency, d.member_currency),
    member_product_name: String(map.member_product_name || d.member_product_name).trim(),
    member_stripe_price_id: String(map.member_stripe_price_id || d.member_stripe_price_id).trim(),
    checkout_payment_link: String(map.checkout_payment_link || d.checkout_payment_link).trim()
  };
}
function updatePricingSettings(db2, patch) {
  const current = getPricingSettings(db2);
  const merged = {
    member_trial_hours: patch.member_trial_hours !== void 0 ? asNonNegativeInt(patch.member_trial_hours, current.member_trial_hours) : current.member_trial_hours,
    member_price_usd_cents: patch.member_price_usd_cents !== void 0 ? asPositiveInt(patch.member_price_usd_cents, current.member_price_usd_cents) : current.member_price_usd_cents,
    member_currency: patch.member_currency !== void 0 ? normalizeCurrency(patch.member_currency, current.member_currency) : current.member_currency,
    member_product_name: patch.member_product_name !== void 0 ? String(patch.member_product_name || "").trim() || current.member_product_name : current.member_product_name,
    member_stripe_price_id: patch.member_stripe_price_id !== void 0 ? String(patch.member_stripe_price_id || "").trim() : current.member_stripe_price_id,
    checkout_payment_link: patch.checkout_payment_link !== void 0 ? String(patch.checkout_payment_link || "").trim() || current.checkout_payment_link : current.checkout_payment_link
  };
  const upsert = db2.prepare(
    `INSERT INTO pricing_settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  );
  upsert.run("member_trial_hours", String(merged.member_trial_hours));
  upsert.run("member_price_usd_cents", String(merged.member_price_usd_cents));
  upsert.run("member_currency", merged.member_currency);
  upsert.run("member_product_name", merged.member_product_name);
  upsert.run("member_stripe_price_id", merged.member_stripe_price_id);
  upsert.run("checkout_payment_link", merged.checkout_payment_link);
  return merged;
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
  const insertLead = db2.prepare(`
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
  const r = insertLead.run({
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

// server/heygen-mcp.ts
var HEYGEN_API = "https://api.heygen.com";
var BRIAN_HEYGEN_VOICE_ID = process.env.BRIAN_HEYGEN_VOICE_ID?.trim() || "1d5b92d8097541f881d1be4a061b6559";
var BOSSMOBILE_VOICE = "Boss Mobile Life Coach / PAPA Life creates teaching content for men navigating fatherhood, purpose, and personal growth. Be warm, authoritative, and conversational \u2014 like a mentor coaching a friend. Speak from real-life experience.";
var BOSSMOBILE_HEYGEN_GUIDE_MARKDOWN = `## Boss Mobile x HeyGen \u2014 Teaching Content Video Pipeline (MCP tools)

Use these tools to turn your **lesson outlines, research dumps, course scripts, Google Drive docs, and agent session notes** into polished avatar videos for the PAPA Life curriculum.

### Content sources for video scripts

1. **Site pages** \u2014 fetch any page from bossmobilelifecoach.com with \`bossmobile_heygen_fetch_page\`.
2. **Course / lesson content** \u2014 call \`get_content_tree\` to see your curriculum, then reference lesson descriptions in your script prompt.
3. **Research dumps** \u2014 call \`get_brand_research_dump\` (with \`include_raw: true\`) to pull raw notes and executive summaries from the Research Lab.
4. **Google Drive docs** \u2014 paste the shareable link or exported text into \`bossmobile_heygen_script_from_text\` so the AI can turn it into spoken narration.
5. **Agent session notes** \u2014 copy conversation highlights or action items from agent chat sessions into \`bossmobile_heygen_script_from_text\` for video scripting.

### Your face (studio avatar, talking photo, or digital twin)

1. Train or upload in the HeyGen app (Instant Avatar, Photo Avatar, Digital Twin, etc.).
2. **bossmobile_heygen_list_avatars** \u2014 lists **avatars** (studio looks) and **talking_photos** (photo avatars). Use the IDs you need.
3. **bossmobile_heygen_video_agent** accepts \`avatar_id\` (studio look) or \`talking_photo_id\` (photo avatar).
4. Optional env defaults: **\`HEYGEN_DEFAULT_AVATAR_ID\`**, **\`HEYGEN_DEFAULT_TALKING_PHOTO_ID\`** so you can omit IDs on every call.

### Your voice (including voice clones)

1. **bossmobile_heygen_list_voices** \u2014 confirms available voices.
2. **bossmobile_heygen_video_agent** always sends the Brian Keith Hill voice ID. If another \`voice_id\` is passed, the request fails.

### Typical flow

#### Flow A: Site page \u2192 script \u2192 video
1. \`bossmobile_heygen_fetch_page\` \u2014 fetch page text (e.g. \`/\`, \`/courses\`).
2. \`bossmobile_heygen_script_from_pages\` \u2014 Claude writes narration from page copy.
3. \`bossmobile_heygen_video_agent\` \u2014 create the video.
4. \`bossmobile_heygen_video_status\` \u2014 poll until done.

#### Flow B: Paste text (Google Drive, session notes, outline) \u2192 script \u2192 video
1. \`bossmobile_heygen_script_from_text\` \u2014 paste any raw text (a Google Doc export, agent session notes, a lesson outline). Claude converts it to spoken narration.
2. \`bossmobile_heygen_video_agent\` \u2014 create the video.
3. \`bossmobile_heygen_video_status\` \u2014 poll until done.

#### Flow C: Research dump \u2192 script \u2192 video
1. \`get_brand_research_dump\` (include_raw: true) \u2014 pull existing research.
2. \`bossmobile_heygen_script_from_text\` \u2014 feed the raw_notes or executive_summary.
3. \`bossmobile_heygen_video_agent\` + \`bossmobile_heygen_video_status\`.

### Linking videos to courses

After a video is completed:
1. Download the \`video_url\` from \`bossmobile_heygen_video_status\`.
2. Use \`update_lesson\` with \`content_url\` set to the video URL and \`content_type: "video"\` so members see it in /portal.

### Environment

| Variable | Purpose |
|----------|---------|
| \`HEYGEN_API_KEY\` | Required for HeyGen calls |
| \`ANTHROPIC_API_KEY\` | Required for script generation (Claude) |
| \`PUBLIC_MCP_BASE_URL\` | Site origin for page fetch (default \`https://bossmobilelifecoach.com\`) |
| \`HEYGEN_CALLBACK_URL\` | Optional default webhook for Video Agent completions |
| \`HEYGEN_DEFAULT_AVATAR_ID\` | Optional default studio avatar_id |
| \`HEYGEN_DEFAULT_TALKING_PHOTO_ID\` | Optional default talking_photo_id |
| \`HEYGEN_DEFAULT_VOICE_ID\` | Brian Keith Hill voice_id |
| \`BRIAN_HEYGEN_VOICE_ID\` | Required Brian Keith Hill voice guard |

### Security

Never paste API keys into chat or commit them. Use server env only.
`;
function requireHeygenKey() {
  const key = process.env.HEYGEN_API_KEY?.trim();
  if (!key) throw new Error("HEYGEN_API_KEY is not configured");
  return key;
}
function heygenDefaultAvatarId() {
  return process.env.HEYGEN_DEFAULT_AVATAR_ID?.trim() || void 0;
}
function heygenDefaultTalkingPhotoId() {
  return process.env.HEYGEN_DEFAULT_TALKING_PHOTO_ID?.trim() || void 0;
}
function requireBrianHeygenVoiceId() {
  const configuredDefault = process.env.HEYGEN_DEFAULT_VOICE_ID?.trim() || BRIAN_HEYGEN_VOICE_ID;
  if (configuredDefault !== BRIAN_HEYGEN_VOICE_ID) {
    throw new Error(
      `HEYGEN_DEFAULT_VOICE_ID must match Brian Keith Hill voice ${BRIAN_HEYGEN_VOICE_ID}; got ${configuredDefault}.`
    );
  }
  return BRIAN_HEYGEN_VOICE_ID;
}
async function heygenJson(path3) {
  const key = requireHeygenKey();
  const res = await fetch(`${HEYGEN_API}${path3}`, {
    headers: { "x-api-key": key }
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = typeof json.error === "object" && json.error?.message ? json.error.message : typeof json.error === "string" ? json.error : res.statusText;
    throw new Error(`HeyGen ${res.status}: ${msg}`);
  }
  return json;
}
function requireAnthropicKey() {
  const key = process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured \u2014 needed for script generation");
  return key;
}
function anthropicModel() {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-20241022";
}
function siteBase() {
  const raw = process.env.PUBLIC_MCP_BASE_URL?.trim() || "https://bossmobilelifecoach.com";
  return raw.replace(/\/$/, "");
}
function stripHtml(html) {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#\d+;/g, " ").replace(/\s+/g, " ").trim();
}
async function chatText(system, user) {
  const key = requireAnthropicKey();
  const model = anthropicModel();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 2800,
      system,
      messages: [{ role: "user", content: user }]
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 400)}`);
  }
  const json = await res.json();
  return json.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim() || "";
}
function bossmobileHeygenGuide() {
  return {
    markdown: BOSSMOBILE_HEYGEN_GUIDE_MARKDOWN,
    tools: [
      "bossmobile_heygen_guide",
      "bossmobile_heygen_list_avatars",
      "bossmobile_heygen_list_voices",
      "bossmobile_heygen_fetch_page",
      "bossmobile_heygen_script_from_pages",
      "bossmobile_heygen_script_from_text",
      "bossmobile_heygen_video_agent",
      "bossmobile_heygen_video_status"
    ],
    env: {
      HEYGEN_API_KEY: "required for HeyGen API",
      ANTHROPIC_API_KEY: "required for script generation (Claude)",
      PUBLIC_MCP_BASE_URL: "optional site origin for page fetch",
      HEYGEN_CALLBACK_URL: "optional default callback_url",
      HEYGEN_DEFAULT_AVATAR_ID: "optional default studio avatar_id",
      HEYGEN_DEFAULT_TALKING_PHOTO_ID: "optional default talking_photo_id (photo avatar)",
      HEYGEN_DEFAULT_VOICE_ID: `Brian Keith Hill voice_id (${BRIAN_HEYGEN_VOICE_ID})`,
      BRIAN_HEYGEN_VOICE_ID: "required Brian Keith Hill voice guard"
    }
  };
}
async function bossmobileHeygenListAvatars() {
  const json = await heygenJson("/v2/avatars");
  const avatars = (json.data?.avatars ?? []).map((a) => ({
    avatar_id: a.avatar_id,
    avatar_name: a.avatar_name,
    gender: a.gender,
    premium: a.premium,
    default_voice_id: a.default_voice_id ?? null
  }));
  const talking_photos = (json.data?.talking_photos ?? []).map((t) => ({
    talking_photo_id: t.talking_photo_id,
    talking_photo_name: t.talking_photo_name
  }));
  return {
    hint: "Use avatar_id for studio looks. For photo avatar, pass talking_photo_id to bossmobile_heygen_video_agent (or set HEYGEN_DEFAULT_TALKING_PHOTO_ID).",
    avatar_count: avatars.length,
    talking_photo_count: talking_photos.length,
    avatars,
    talking_photos
  };
}
async function bossmobileHeygenListVoices(args) {
  const json = await heygenJson("/v2/voices");
  let voices = json.data?.voices ?? [];
  const needle = args?.name_contains?.trim().toLowerCase();
  if (needle) {
    voices = voices.filter((v) => (v.name || "").toLowerCase().includes(needle));
  }
  const max = Math.min(Math.max(args?.limit ?? 400, 1), 500);
  const total = voices.length;
  const truncated = voices.length > max;
  voices = voices.slice(0, max);
  return {
    hint: `Brian Keith Hill voice guard is ${BRIAN_HEYGEN_VOICE_ID}. Use this voice_id for Boss Mobile videos.`,
    total_before_limit: total,
    truncated,
    voices: voices.map((v) => ({
      voice_id: v.voice_id,
      name: v.name,
      language: v.language,
      gender: v.gender
    }))
  };
}
async function bossmobileHeygenFetchPage(pagePath) {
  const p = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  const url = `${siteBase()}${p}`;
  const res = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "BossMobile-MCP/1.0 (script-prep)"
    },
    redirect: "follow"
  });
  if (!res.ok) {
    throw new Error(`Fetch ${url} failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const text = stripHtml(html).slice(0, 6e4);
  return {
    url,
    status: res.status,
    text_length: text.length,
    text_excerpt: text.slice(0, 12e3)
  };
}
async function bossmobileHeygenScriptFromPages(args) {
  const paths = Array.isArray(args.paths) ? args.paths.filter(Boolean) : [];
  if (paths.length === 0) throw new Error("paths must be a non-empty array of paths like /about");
  const maxChars = Math.min(Math.max(args.max_chars ?? 4500, 500), 12e3);
  const chunks = [];
  for (const path3 of paths.slice(0, 12)) {
    const row = await bossmobileHeygenFetchPage(path3);
    chunks.push({
      path: path3.startsWith("/") ? path3 : `/${path3}`,
      excerpt: row.text_excerpt.slice(0, maxChars)
    });
  }
  const bundle = chunks.map((c) => `### ${c.path}
${c.excerpt}`).join("\n\n");
  const toneLine = args.tone || "warm, mentor-like, conversational, real";
  const system = `${BOSSMOBILE_VOICE}
You write spoken narration for a HeyGen avatar video. Output plain text only \u2014 no stage directions in brackets unless essential.
Rules:
- Stay faithful to the source excerpts; do not invent claims.
- Second person ("you") or inclusive "we" \u2014 like coaching a friend.
- No markdown headings in the script; optional short pauses as "..." if natural.
- Target length: about ${args.duration_seconds_hint ?? 45} seconds of speech (~130-150 words per minute).`;
  const user = `Goal: ${args.goal || "Teach or inspire men in the PAPA Life community."}
Tone: ${toneLine}
---
Source page excerpts (ground truth):
${bundle}`;
  const script = await chatText(system, user);
  return {
    model: anthropicModel(),
    paths_used: chunks.map((c) => c.path),
    script,
    char_count: script.length
  };
}
async function bossmobileHeygenScriptFromText(args) {
  const rawText = (args.text ?? "").trim();
  if (!rawText) throw new Error("text is required \u2014 paste Google Drive doc content, agent session notes, or a lesson outline");
  const truncated = rawText.length > 3e4;
  const inputText = rawText.slice(0, 3e4);
  const toneLine = args.tone || "warm, mentor-like, conversational, real";
  const system = `${BOSSMOBILE_VOICE}
You write spoken narration for a HeyGen avatar video. Output plain text only \u2014 no stage directions in brackets unless essential.
Rules:
- Stay faithful to the source text; do not invent claims.
- Second person ("you") or inclusive "we" \u2014 like coaching a friend.
- No markdown headings in the script; optional short pauses as "..." if natural.
- Target length: about ${args.duration_seconds_hint ?? 60} seconds of speech (~130-150 words per minute).`;
  const user = `Goal: ${args.goal || "Teach or inspire men in the PAPA Life community."}
Tone: ${toneLine}
Source: ${args.source_label || "pasted text"}
---
Source content:
${inputText}`;
  const script = await chatText(system, user);
  return {
    model: anthropicModel(),
    source_label: args.source_label || "pasted text",
    input_truncated: truncated,
    script,
    char_count: script.length
  };
}
async function bossmobileHeygenVideoAgent(args) {
  const key = requireHeygenKey();
  const prompt = args.prompt?.trim();
  if (!prompt || prompt.length < 1) throw new Error("prompt is required");
  const explicitAvatar = args.avatar_id?.trim() || null;
  const explicitTalking = args.talking_photo_id?.trim() || null;
  const defaultA = heygenDefaultAvatarId() ?? null;
  const defaultT = heygenDefaultTalkingPhotoId() ?? null;
  if (explicitAvatar && explicitTalking) {
    throw new Error("Pass only one of avatar_id or talking_photo_id (studio look vs photo avatar)");
  }
  const effectiveCharacter = explicitAvatar || explicitTalking || defaultA || defaultT || null;
  const voiceExplicit = args.voice_id?.trim() || null;
  const brianVoice = requireBrianHeygenVoiceId();
  if (voiceExplicit && voiceExplicit !== brianVoice) {
    throw new Error(`voice_id must be Brian Keith Hill voice ${brianVoice}; got ${voiceExplicit}.`);
  }
  const effectiveVoice = brianVoice;
  const body = {
    prompt: prompt.slice(0, 1e4),
    mode: args.mode || "generate"
  };
  if (effectiveCharacter) body.avatar_id = effectiveCharacter;
  if (effectiveVoice) body.voice_id = effectiveVoice;
  if (args.style_id) body.style_id = args.style_id;
  if (args.orientation) body.orientation = args.orientation;
  if (args.callback_url ?? process.env.HEYGEN_CALLBACK_URL) {
    body.callback_url = args.callback_url ?? process.env.HEYGEN_CALLBACK_URL?.trim();
  }
  if (args.callback_id) body.callback_id = args.callback_id;
  if (args.auto_proceed === true) body.auto_proceed = true;
  const res = await fetch(`${HEYGEN_API}/v3/video-agents`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json.error?.message || res.statusText || "HeyGen error";
    throw new Error(`HeyGen ${res.status}: ${msg}`);
  }
  const data = json.data;
  return {
    session_id: data?.session_id,
    status: data?.status,
    video_id: data?.video_id ?? null,
    created_at: data?.created_at,
    resolved: {
      avatar_id_sent: body.avatar_id ?? null,
      voice_id_sent: body.voice_id ?? null,
      voice_guard: "Brian Keith Hill",
      used_talking_photo_id: Boolean(
        explicitTalking || !explicitAvatar && !!defaultT && effectiveCharacter === defaultT
      )
    },
    poll_hint: data?.video_id ? `Call bossmobile_heygen_video_status with video_id "${data.video_id}"` : "No video_id yet; check HeyGen dashboard or retry with a shorter prompt",
    next_step: data?.video_id ? "After video completes, use update_lesson with content_url = video_url to attach it to a course lesson." : void 0
  };
}
async function bossmobileHeygenVideoStatus(video_id) {
  const key = requireHeygenKey();
  const id = video_id?.trim();
  if (!id) throw new Error("video_id is required");
  const res = await fetch(`${HEYGEN_API}/v3/videos/${encodeURIComponent(id)}`, {
    headers: { "x-api-key": key }
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`HeyGen ${res.status}: ${json.error?.message || res.statusText}`);
  }
  const d = json.data ?? json;
  return {
    ...d,
    next_step: d.status === "completed" && d.video_url ? "Video ready! Preferred path: call bossmobile_publish_video_playbook(heygen_video_id, lesson_id) \u2014 it returns the step-by-step playbook for uploading to YouTube via your own Composio connection and embedding into the lesson. Or skip to update_lesson directly if you already have a hosted video URL." : void 0
  };
}

// server/heygen-publish.ts
function safeSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "lesson-video";
}
function clamp(s, n) {
  return s.length > n ? s.slice(0, n).trim() : s;
}
async function bossmobilePublishVideoPlaybook(db2, args) {
  const heygenId = args.heygen_video_id?.trim();
  if (!heygenId) throw new Error("heygen_video_id is required");
  const lessonId = Number(args.lesson_id);
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    throw new Error("lesson_id must be a positive integer");
  }
  const lesson = db2.prepare(
    "SELECT id, title, description, content_url, content_type FROM lessons WHERE id = ?"
  ).get(lessonId);
  if (!lesson) throw new Error(`lesson ${lessonId} not found`);
  const status = await bossmobileHeygenVideoStatus(heygenId);
  const heygenStatus = typeof status.status === "string" ? status.status : "unknown";
  const videoUrl = typeof status.video_url === "string" ? status.video_url : null;
  const thumbnailUrl = typeof status.thumbnail_url === "string" ? status.thumbnail_url : null;
  const duration = typeof status.duration === "number" ? status.duration : null;
  const heygenSummary = {
    video_id: heygenId,
    status: heygenStatus,
    video_url: videoUrl,
    thumbnail_url: thumbnailUrl,
    duration_seconds: duration
  };
  const lessonSummary = {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    current_content_url: lesson.content_url,
    current_content_type: lesson.content_type
  };
  if (heygenStatus === "failed" || heygenStatus === "error") {
    return {
      state: "failed",
      heygen: heygenSummary,
      lesson: lessonSummary,
      next_step: "HeyGen reports the render failed. Inspect the HeyGen job, regenerate with bossmobile_heygen_video_agent, then retry this tool with the new video_id.",
      markdown: `### Publish pipeline \u2014 HeyGen render failed

- **HeyGen video:** \`${heygenId}\`
- **Lesson:** #${lesson.id} \u2014 ${lesson.title}

Regenerate with \`bossmobile_heygen_video_agent\` and retry.`
    };
  }
  if (heygenStatus !== "completed" || !videoUrl) {
    return {
      state: "rendering",
      heygen: heygenSummary,
      lesson: lessonSummary,
      next_step: "HeyGen is still rendering. Wait ~30s and call bossmobile_publish_video_playbook again with the same arguments. When status flips to 'completed', the response will include the upload + embed steps.",
      markdown: `### Publish pipeline \u2014 waiting on HeyGen

- **HeyGen video:** \`${heygenId}\` \u2014 status **${heygenStatus}**
- **Destination lesson:** #${lesson.id} \u2014 ${lesson.title}

Re-run this tool in ~30s.`
    };
  }
  const title = clamp(args.title?.trim() || lesson.title, 100);
  const description = clamp(
    args.description?.trim() || lesson.description || title,
    4500
  );
  const privacyStatus = args.privacy_status || "unlisted";
  const categoryId = args.category_id || "27";
  const tags = args.tags && args.tags.length ? args.tags : ["Papa Life", "fatherhood coaching", "Boss Mobile Life Coach"];
  const suggestedFilename = `${safeSlug(lesson.title)}.mp4`;
  const playbook = [
    {
      step: 1,
      title: "Stage the HeyGen MP4 in the Composio workbench",
      composio_tool: "COMPOSIO_REMOTE_WORKBENCH",
      rationale: "YOUTUBE_MULTIPART_UPLOAD_VIDEO needs an s3key-backed FileUploadable. Download the HeyGen URL in the workbench and keep the returned s3key for step 2.",
      input_hint: {
        download_url: videoUrl,
        suggested_filename: suggestedFilename,
        mimetype: "video/mp4"
      }
    },
    {
      step: 2,
      title: "Upload to Brian's YouTube channel",
      composio_tool: "YOUTUBE_MULTIPART_UPLOAD_VIDEO",
      rationale: "Uploads the staged MP4 with course metadata. Store the returned YouTube video id for step 3.",
      input: {
        title,
        description,
        categoryId,
        privacyStatus,
        tags,
        videoFile: {
          _replace_with: "{ name, mimetype: 'video/mp4', s3key } from step 1",
          suggested_name: suggestedFilename
        }
      }
    },
    {
      step: 3,
      title: "Embed the YouTube video into the lesson",
      papalife_tool: "bossmobile_lesson_set_content_url",
      rationale: "Smart setter \u2014 accepts any YouTube URL form (watch/short/embed/youtu.be) and normalizes to the canonical /embed/{id} format, then writes content_url + content_type onto the lesson row. Safer than update_lesson for attaching media because it guarantees the URL shape the LessonMediaPlayer expects.",
      input_template: {
        lesson_id: lesson.id,
        url: "https://www.youtube.com/watch?v={YOUTUBE_VIDEO_ID}"
      }
    }
  ];
  const markdown = [
    `### Publish pipeline \u2014 ready to upload`,
    ``,
    `- **HeyGen video:** \`${heygenId}\` (${duration ?? "?"}s, status: completed)`,
    `- **Source MP4:** ${videoUrl}`,
    `- **Destination lesson:** #${lesson.id} \u2014 ${lesson.title}`,
    `- **Privacy:** ${privacyStatus} \xB7 **Category:** ${categoryId} \xB7 **Tags:** ${tags.join(", ")}`,
    ``,
    `#### Step 1 \u2014 Stage the MP4 in Composio workbench`,
    `\`COMPOSIO_REMOTE_WORKBENCH\` \u2014 download \`${videoUrl}\` as \`${suggestedFilename}\` (mimetype \`video/mp4\`). Keep the returned \`s3key\`.`,
    ``,
    `#### Step 2 \u2014 Upload to YouTube`,
    `\`YOUTUBE_MULTIPART_UPLOAD_VIDEO\` with:`,
    `\`\`\`json`,
    JSON.stringify(
      {
        title,
        description,
        categoryId,
        privacyStatus,
        tags,
        videoFile: {
          name: suggestedFilename,
          mimetype: "video/mp4",
          s3key: "<s3key from step 1>"
        }
      },
      null,
      2
    ),
    `\`\`\``,
    ``,
    `#### Step 3 \u2014 Embed into the lesson`,
    `Call \`bossmobile_lesson_set_content_url\` (this MCP) with:`,
    `\`\`\`json`,
    JSON.stringify(
      {
        lesson_id: lesson.id,
        url: "https://www.youtube.com/watch?v=<YOUTUBE_VIDEO_ID>"
      },
      null,
      2
    ),
    `\`\`\``,
    ``,
    `The smart setter normalizes any YouTube/HeyGen/Drive URL to the canonical form the \`LessonMediaPlayer\` expects. You do not need to pre-format the URL.`
  ].join("\n");
  return {
    state: "ready_to_upload",
    heygen: heygenSummary,
    lesson: lessonSummary,
    youtube_upload: {
      composio_tool: "YOUTUBE_MULTIPART_UPLOAD_VIDEO",
      arguments: {
        title,
        description,
        categoryId,
        privacyStatus,
        tags,
        videoFile: {
          _instructions: "Replace with { name, mimetype: 'video/mp4', s3key } after staging via COMPOSIO_REMOTE_WORKBENCH.",
          source_url: videoUrl,
          suggested_name: suggestedFilename
        }
      }
    },
    embed_step: {
      papalife_tool: "bossmobile_lesson_set_content_url",
      arguments_template: {
        lesson_id: lesson.id,
        url: "https://www.youtube.com/watch?v={YOUTUBE_VIDEO_ID}"
      },
      note: "The setter auto-normalizes any YouTube form to /embed/{id}. You can pass the watch URL, a youtu.be short link, or the /embed/ URL \u2014 all produce the same canonical result."
    },
    playbook,
    next_step: `Execute the 3 steps in 'playbook'. 1) COMPOSIO_REMOTE_WORKBENCH to stage ${videoUrl}. 2) YOUTUBE_MULTIPART_UPLOAD_VIDEO with the args in 'youtube_upload.arguments' (replace videoFile with the staged s3key). 3) update_lesson with the returned YouTube video id as content_url.`,
    markdown
  };
}

// server/lesson-content-normalize.ts
function extractYoutubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return u.pathname.replace(/^\//, "").split("/")[0] || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const embedMatch = u.pathname.match(/\/embed\/([^\/?&]+)/);
      if (embedMatch) return embedMatch[1];
      const shortsMatch = u.pathname.match(/\/shorts\/([^\/?&]+)/);
      if (shortsMatch) return shortsMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}
function extractDriveFileId(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("drive.google.com")) return null;
    const fileMatch = u.pathname.match(/\/file\/d\/([^\/?#]+)/);
    if (fileMatch) return fileMatch[1];
    const idParam = u.searchParams.get("id");
    if (idParam) return idParam;
    return null;
  } catch {
    return null;
  }
}
function coerceContentType(hint, fallback) {
  const h = (hint || "").trim().toLowerCase();
  if (h === "audio" || h === "video" || h === "pdf" || h === "document") {
    return h;
  }
  return fallback;
}
function normalizeLessonContent(rawUrl, previousContentUrl, contentTypeHint) {
  const url = (rawUrl || "").trim();
  if (!url) throw new Error("url is required");
  const ytId = extractYoutubeId(url);
  if (ytId) {
    const content_url = `https://www.youtube.com/embed/${ytId}`;
    return {
      content_url,
      content_type: "video",
      kind: "youtube",
      changed: content_url !== previousContentUrl
    };
  }
  if (url.toLowerCase().includes("heygen.com/embeds")) {
    return {
      content_url: url,
      content_type: "video",
      kind: "heygen",
      changed: url !== previousContentUrl
    };
  }
  const driveId = extractDriveFileId(url);
  if (driveId) {
    const content_url = `https://drive.google.com/file/d/${driveId}/preview`;
    const content_type = coerceContentType(contentTypeHint, "video");
    return {
      content_url,
      content_type,
      kind: "drive",
      changed: content_url !== previousContentUrl
    };
  }
  const pathOnly = url.split("?")[0].toLowerCase();
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(pathOnly)) {
    return {
      content_url: url,
      content_type: "audio",
      kind: "direct_audio",
      changed: url !== previousContentUrl
    };
  }
  if (/\.(mp4|webm|mov|ogv)$/.test(pathOnly)) {
    return {
      content_url: url,
      content_type: "video",
      kind: "direct_video",
      changed: url !== previousContentUrl
    };
  }
  if (/\.pdf$/.test(pathOnly)) {
    return {
      content_url: url,
      content_type: "pdf",
      kind: "direct_pdf",
      changed: url !== previousContentUrl
    };
  }
  if (url.includes("/media/")) {
    return {
      content_url: url,
      content_type: coerceContentType(contentTypeHint, "video"),
      kind: "media_upload",
      changed: url !== previousContentUrl
    };
  }
  return {
    content_url: url,
    content_type: coerceContentType(contentTypeHint, "video"),
    kind: "passthrough",
    changed: url !== previousContentUrl
  };
}

// server/ghl-automation.ts
import { randomBytes } from "crypto";

// server/ghl-integration-store.ts
import crypto from "crypto";
var ALGO = "aes-256-gcm";
function encryptionKey() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY?.trim() || process.env.SESSION_SECRET?.trim() || "papalife-integration-key-rotate-in-production";
  return crypto.createHash("sha256").update(raw).digest();
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
function envCredentials() {
  const token = process.env.GHL_API_TOKEN?.trim() || process.env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim() || "";
  if (!token) return null;
  const locationId = process.env.GHL_LOCATION_ID?.trim() || void 0;
  return { token, locationId, source: "env" };
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

// server/ghl-automation.ts
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
function listGhlContactAlerts(db2, opts = {}) {
  ensureGhlAutomationTables(db2);
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const unread = opts.unread_only !== false;
  return db2.prepare(
    `SELECT id, ghl_contact_id, first_name, last_name, email, phone, outreach_note, voice_prompt, lead_id, created_at, read_at
       FROM ghl_contact_alerts
       ${unread ? "WHERE read_at IS NULL" : ""}
       ORDER BY created_at DESC
       LIMIT ?`
  ).all(limit);
}
function markGhlAlertRead(db2, alertId) {
  ensureGhlAutomationTables(db2);
  const r = db2.prepare(`UPDATE ghl_contact_alerts SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL`).run(alertId);
  return r.changes > 0;
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
function smsScopeHint(message) {
  if (/sms|scope|permission|not enabled|forbidden/i.test(message)) {
    return "GHL SMS scope is not enabled on your private integration token. In GoHighLevel \u2192 Settings \u2192 Private Integrations \u2192 enable SMS/Conversations, then save the token again under CRM \u2192 Settings.";
  }
  return null;
}
function notConfiguredFix() {
  return "Open CRM \u2192 Settings on bossmobilelifecoach.com and paste your Go High Level Private Integration token. Or set GHL_API_TOKEN in server .env (optional override).";
}
function normalizeOppBody(body) {
  const out = { ...body };
  delete out.id;
  if (out.pipelineStageId && out.stageId) delete out.stageId;
  else if (!out.pipelineStageId && out.stageId) {
    out.pipelineStageId = out.stageId;
    delete out.stageId;
  }
  return out;
}
async function ghlMoveOpportunityStage(args, creds) {
  if (!creds?.token) {
    return {
      ok: false,
      error: "Go High Level API token is not configured",
      action: "not_configured",
      fix: notConfiguredFix()
    };
  }
  const oppId = String(args.opportunity_id || args.id || "").trim();
  const stageId = String(args.pipeline_stage_id || args.pipelineStageId || "").trim();
  if (!oppId) {
    return { ok: false, error: "opportunity_id or id is required (GHL opportunity UUID in URL path)" };
  }
  if (!stageId && !args.status) {
    return { ok: false, error: "pipeline_stage_id or pipelineStageId (or status) is required" };
  }
  const body = normalizeOppBody({
    ...stageId ? { pipelineStageId: stageId } : {},
    ...args.pipeline_id || args.pipelineId ? { pipelineId: String(args.pipeline_id || args.pipelineId).trim() } : {},
    ...args.status ? { status: String(args.status).trim() } : {}
  });
  const r = await fetch(`${GHL_BASE}/opportunities/${encodeURIComponent(oppId)}`, {
    method: "PUT",
    headers: headers(creds.token),
    body: JSON.stringify(body)
  });
  const text = await r.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!r.ok) {
    const msg = String(data.message || text || r.statusText);
    return { ok: false, error: msg, status: r.status, fix: smsScopeHint(msg) || void 0 };
  }
  return {
    ok: true,
    data: {
      opportunity_id: oppId,
      payload_sent: body,
      credential_source: creds.source,
      ghl: data
    }
  };
}
async function ghlNurtureSmsSend(args, creds) {
  if (!creds?.token) {
    return {
      ok: false,
      error: "Go High Level API token is not configured",
      action: "not_configured",
      fix: notConfiguredFix()
    };
  }
  const contactId = String(args.ghl_contact_id || args.contact_id || "").trim();
  const message = String(args.body || "").trim();
  if (!contactId) return { ok: false, error: "ghl_contact_id or contact_id is required" };
  if (!message) return { ok: false, error: "body is required" };
  if (args.dry_run) {
    return {
      ok: true,
      data: {
        dry_run: true,
        ghl_contact_id: contactId,
        body: message,
        type: "SMS",
        credential_source: creds.source
      }
    };
  }
  const payload = { type: "SMS", contactId, message };
  const r = await fetch(`${GHL_BASE}/conversations/messages`, {
    method: "POST",
    headers: headers(creds.token),
    body: JSON.stringify(payload)
  });
  const text = await r.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!r.ok) {
    const msg = String(data.message || text || r.statusText);
    const fix = smsScopeHint(msg);
    return {
      ok: false,
      error: msg,
      status: r.status,
      action: fix ? "ghl_sms_scope_required" : void 0,
      fix: fix || void 0
    };
  }
  return {
    ok: true,
    data: {
      ghl_contact_id: contactId,
      body: message,
      credential_source: creds.source,
      ghl: data
    }
  };
}
function getGhlCredentialsForMcp(db2, adminUserId) {
  return resolveGhlCredentials(db2, adminUserId);
}

// server/mcp-handlers.ts
var dbPath = path.resolve(process.cwd(), "leads.db");
var db = new Database(dbPath);
ensureResearchTables(db);
ensureSiteCtasTable(db);
ensureSiteMediaTable(db);
ensurePricingSettingsTable(db);
function ensureIntakeSubmissionContactSchema() {
  const cols = db.prepare("PRAGMA table_info(intake_submissions)").all();
  if (!cols.length) return;
  const hasPhone = cols.some((c) => c.name === "phone");
  const hasAnswersJson = cols.some((c) => c.name === "answers_json");
  const emailCol = cols.find((c) => c.name === "email");
  const emailIsNotNull = Number(emailCol?.notnull ?? 0) === 1;
  if (hasPhone && !emailIsNotNull) return;
  if (!emailIsNotNull && !hasPhone) {
    db.exec("ALTER TABLE intake_submissions ADD COLUMN phone TEXT");
    return;
  }
  const answersSelect = hasAnswersJson ? "answers_json" : "NULL as answers_json";
  const phoneSelect = hasPhone ? "phone" : "NULL as phone";
  db.exec("BEGIN");
  try {
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
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
ensureIntakeSubmissionContactSchema();
ensureGhlAutomationTables(db);
var PAPALIFE_MCP_TOOL_DEFINITIONS = [
  {
    name: "get_site_endpoints",
    description: "Return public URLs for Papalife site and MCP endpoint.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "papalife_automation_status",
    description: "GHL + Make.com automation map for Brian: Scenario 5259259 (new contact \u2192 note), Scenario 5259335 (MCP \u2192 Claude), webhook URLs, and voice-mode instructions for Claude Desktop.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "papalife_claude_complete",
    description: 'Cloud round-trip inbound: same as POST /api/automation/claude-prompt with body {"prompt":"..."}. Returns { ok, prompt, response, model, voice: papa_life }.',
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Required \u2014 what Claude should process" },
        context: { type: "string", description: "Optional CRM/GHL context prepended" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "papalife_forward_alert_to_cloud",
    description: "POST outbound JSON webhook to AUTOMATION_CLOUD_WEBHOOK_URL (Make Scenario 5259335). Includes prompt + contact + inbound.claude_prompt_url for back-and-forth.",
    inputSchema: {
      type: "object",
      properties: {
        alert_id: { type: "number", description: "ghl_contact_alerts.id from papalife_process_ghl_new_contact" }
      },
      required: ["alert_id"]
    }
  },
  {
    name: "papalife_get_webhook_contract",
    description: `Return the JSON webhook contract (outbound + inbound {"prompt"} format) for Brian's cloud / Make setup.`,
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "papalife_process_ghl_new_contact",
    description: "Process a new GoHighLevel contact: sync to site CRM leads, generate outreach note + voice_prompt for Brian's Claude voice chat. Use when GHL fires or Make forwards contact JSON.",
    inputSchema: {
      type: "object",
      properties: {
        ghl_contact_id: { type: "string" },
        first_name: { type: "string" },
        last_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        source: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        outreach_note: { type: "string", description: "Skip regeneration if Make Scenario 1 already wrote the note" }
      }
    }
  },
  {
    name: "papalife_list_ghl_contact_alerts",
    description: "List unread GHL new-contact alerts with voice_prompt \u2014 Brian's Claude reads these in voice mode when a new lead lands.",
    inputSchema: {
      type: "object",
      properties: {
        unread_only: { type: "boolean", description: "Default true" },
        limit: { type: "number" },
        mark_read_ids: {
          type: "array",
          items: { type: "number" },
          description: "Optional alert ids to mark read after Brian reviews"
        }
      }
    }
  },
  {
    name: "papalife_ghl_move_opportunity_stage",
    description: "Move a GHL opportunity to a new pipeline stage (Brian's GHL token on this server). Pass id/opportunity_id + pipelineStageId/pipeline_stage_id.",
    inputSchema: {
      type: "object",
      properties: {
        opportunity_id: { type: "string" },
        id: { type: "string", description: "Alias for opportunity_id" },
        pipeline_stage_id: { type: "string" },
        pipelineStageId: { type: "string" },
        pipeline_id: { type: "string" },
        status: { type: "string", description: "open, won, lost, abandoned" }
      }
    }
  },
  {
    name: "papalife_nurture_sms_send",
    description: "Send nurture SMS via GHL conversations API (not Twilio). Uses the token Brian saves in CRM \u2192 Settings (SMS scope required on the PIT).",
    inputSchema: {
      type: "object",
      properties: {
        ghl_contact_id: { type: "string" },
        contact_id: { type: "string" },
        body: { type: "string" },
        dry_run: { type: "boolean" }
      },
      required: ["body"]
    }
  },
  {
    name: "bossmobile_research_workflow_brief",
    description: "IMPORTANT for Boss Mobile / PAPA Life: Read this first when the user pastes huge research notes. Explains the Research Lab workflow \u2014 do NOT ask the team to read raw note dumps; guide them to capture notes in the app, analyze, then generate social content.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "papalife_course_content_workflow_brief",
    description: "CRITICAL for PAPA Life curriculum / Vision Documents: Read this before suggesting any handoff. Tells agents to put learning materials into the on-site courses/lessons system (MCP) so members see them in /portal \u2014 NOT to email Google Doc Master KB update steps or ask humans to paste Vision docs into external docs as the delivery path.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "create_brand_research_dump",
    description: "Save a large research / planning note dump (Boss Mobile / PAPA Life). Replaces emailing walls of text. Then call analyze_brand_research_dump.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short label for this capture" },
        raw_notes: { type: "string", description: "Full pasted notes (can be very long)" }
      },
      required: ["raw_notes"]
    }
  },
  {
    name: "list_brand_research_dumps",
    description: "List recent research captures (title, size, analysis status).",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } }
    }
  },
  {
    name: "get_brand_research_dump",
    description: "Get one dump by id. Set include_raw true only when necessary (large payload).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        include_raw: { type: "boolean" }
      },
      required: ["id"]
    }
  },
  {
    name: "analyze_brand_research_dump",
    description: "Run AI summary + theme extraction on a dump (server uses ANTHROPIC_API_KEY / Claude). Produces executive summary for social generation.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"]
    }
  },
  {
    name: "generate_social_from_research_dump",
    description: "After analysis: generate draft social posts (Instagram, LinkedIn, Facebook, X, YouTube Shorts ideas). Optional replace=true clears prior drafts for that dump.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "e.g. instagram, linkedin, facebook, x, youtube_shorts"
        },
        replace: { type: "boolean" }
      },
      required: ["id"]
    }
  },
  {
    name: "list_social_suggestions_for_dump",
    description: "List generated social post drafts linked to a research dump.",
    inputSchema: {
      type: "object",
      properties: { dump_id: { type: "number" } },
      required: ["dump_id"]
    }
  },
  {
    name: "approve_social_suggestion",
    description: "Mark a draft as approved, rejected, or posted after human review.",
    inputSchema: {
      type: "object",
      properties: {
        suggestion_id: { type: "number" },
        status: { type: "string", description: "draft | approved | rejected | posted" }
      },
      required: ["suggestion_id", "status"]
    }
  },
  {
    name: "site_cta_placement_guide",
    description: "Lists placement keys for site_ctas \u2014 use with upsert_site_cta so CTAs appear on the public site and member learning areas.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "list_site_ctas",
    description: "List marketing CTAs (optional filter by placement).",
    inputSchema: {
      type: "object",
      properties: { placement: { type: "string", description: "Filter by single placement key" } }
    }
  },
  {
    name: "get_pricing_structure",
    description: "Get current pricing config used by public checkout and member trial/billing flows.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "update_pricing_structure",
    description: "Update pricing config so Boss can change it via MCP agents without dev changes.",
    inputSchema: {
      type: "object",
      properties: {
        member_trial_hours: { type: "number", description: "Trial duration in hours (e.g. 24)" },
        member_price_usd_cents: { type: "number", description: "Price in cents (e.g. 499 for $4.99)" },
        member_currency: { type: "string", description: "ISO currency code (e.g. usd)" },
        member_product_name: { type: "string", description: "Checkout product label" },
        member_stripe_price_id: {
          type: "string",
          description: "Stripe price id for Checkout (optional; leave blank to use inline amount)"
        },
        checkout_payment_link: {
          type: "string",
          description: "Public strategist checkout link shown in forms"
        }
      }
    }
  },
  {
    name: "upsert_site_cta",
    description: "Create or update a CTA block. Omit id to create. variant: amber | outline | minimal. active defaults true.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Set to update existing row" },
        placement: { type: "string" },
        headline: { type: "string" },
        body: { type: "string" },
        button_label: { type: "string" },
        button_url: { type: "string" },
        variant: { type: "string" },
        active: { type: "boolean" },
        sort_order: { type: "number" }
      },
      required: ["placement"]
    }
  },
  {
    name: "delete_site_cta",
    description: "Delete a site CTA by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"]
    }
  },
  {
    name: "site_media_placement_guide",
    description: "Lists MCP-managed site media slots. Use upsert_site_media to swap campaign video/image assets without code changes.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "list_site_media",
    description: "List MCP-managed site media slots (optional filter by placement).",
    inputSchema: {
      type: "object",
      properties: { placement: { type: "string", description: "Filter by single placement key" } }
    }
  },
  {
    name: "upsert_site_media",
    description: "Create or update a site media slot. Placements: home_plan_video, home_framework_image (image), papa_journey_video_top (funnel hero, before copy), papa_journey_video_assessment (above self-assessment CTA), papa_journey_video_membership (above $4.99 join CTA). Use direct video URL (/media/file.mp4, CDN mp4, HeyGen mp4) or embed URL with media_type 'embed'.",
    inputSchema: {
      type: "object",
      properties: {
        placement: { type: "string" },
        media_url: { type: "string", description: "Direct media URL. Use /media/... after admin upload for hosted files." },
        media_type: { type: "string", description: "video | image. Defaults to video." },
        poster_url: { type: "string", description: "Optional poster image shown before play." },
        alt_text: { type: "string", description: "Accessible label for the media." },
        title: { type: "string", description: "Internal campaign/media title." },
        active: { type: "boolean" }
      },
      required: ["placement", "media_url"]
    }
  },
  {
    name: "delete_site_media",
    description: "Delete a site media slot by placement.",
    inputSchema: {
      type: "object",
      properties: { placement: { type: "string" } },
      required: ["placement"]
    }
  },
  {
    name: "get_intake_submissions",
    description: "List recent strategist intake submissions.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" }
      }
    }
  },
  {
    name: "create_intake_submission",
    description: "Create a new intake submission from AI chat/call capture. Require at least one contact method: email or phone.",
    inputSchema: {
      type: "object",
      properties: {
        first_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        situation: { type: "string" },
        routed_pillar: { type: "string" },
        disconnected_pillar: { type: "string" },
        vision: { type: "string" }
      },
      required: ["first_name", "situation", "routed_pillar"]
    }
  },
  {
    name: "log_engagement_event",
    description: "Log an engagement event and keep conversion pipeline synced.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string" },
        event_type: { type: "string" },
        event_detail: { type: "string" }
      },
      required: ["email", "event_type"]
    }
  },
  {
    name: "get_content_tree",
    description: "Return courses with nested lessons and drip metadata. Call first when aligning Vision Documents or curriculum to existing site content.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "create_course",
    description: "Create a new learning course. Primary delivery path for program material (e.g. Papa Life Relationship Reset, Vision 1\u201316 series): members see it in /portal; public marketing list at /courses when show_in_catalog is true.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        pillar: { type: "string" },
        sort_order: { type: "number" },
        show_in_catalog: { type: "boolean", description: "If true (default), course appears on public /courses marketing catalog." }
      },
      required: ["title"]
    }
  },
  {
    name: "update_course",
    description: "Update an existing learning course.",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number" },
        title: { type: "string" },
        description: { type: "string" },
        pillar: { type: "string" },
        sort_order: { type: "number" },
        show_in_catalog: { type: "boolean" }
      },
      required: ["course_id"]
    }
  },
  {
    name: "create_lesson",
    description: "Create a lesson under a course. Map each Vision Document or module to a lesson; use description for text outline. Set content_url after uploading media via admin POST /api/admin/upload (see get_site_endpoints).",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number" },
        title: { type: "string" },
        description: { type: "string" },
        content_url: { type: "string" },
        content_type: { type: "string" },
        duration_minutes: { type: "number" },
        sort_order: { type: "number" }
      },
      required: ["course_id", "title"]
    }
  },
  {
    name: "update_lesson",
    description: "Update a lesson record (set content_url after uploading via POST /api/admin/upload).",
    inputSchema: {
      type: "object",
      properties: {
        lesson_id: { type: "number" },
        title: { type: "string" },
        description: { type: "string" },
        content_url: { type: "string" },
        content_type: { type: "string" },
        duration_minutes: { type: "number" },
        sort_order: { type: "number" }
      },
      required: ["lesson_id"]
    }
  },
  {
    name: "delete_lesson",
    description: "Delete a lesson by id.",
    inputSchema: {
      type: "object",
      properties: {
        lesson_id: { type: "number" }
      },
      required: ["lesson_id"]
    }
  },
  {
    name: "set_drip_rule",
    description: "Set or update drip-release rule for lesson.",
    inputSchema: {
      type: "object",
      properties: {
        lesson_id: { type: "number" },
        release_days_after_enroll: { type: "number" }
      },
      required: ["lesson_id", "release_days_after_enroll"]
    }
  },
  {
    name: "publish_content",
    description: "Snapshot current course/lesson structure as a published version.",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number" },
        summary: { type: "string" }
      },
      required: ["course_id"]
    }
  },
  {
    name: "get_member_progress",
    description: "Return member lesson completion and percent for each course.",
    inputSchema: {
      type: "object",
      properties: {
        member_id: { type: "number" }
      },
      required: ["member_id"]
    }
  },
  {
    name: "get_journal_prompts",
    description: "List journal prompts editable by admins.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "create_journal_prompt",
    description: "Create a new journal prompt.",
    inputSchema: {
      type: "object",
      properties: {
        pillar: { type: "string" },
        prompt_text: { type: "string" },
        sort_order: { type: "number" }
      },
      required: ["pillar", "prompt_text"]
    }
  },
  {
    name: "update_journal_prompt",
    description: "Update text/order for a journal prompt.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        pillar: { type: "string" },
        prompt_text: { type: "string" },
        sort_order: { type: "number" }
      },
      required: ["id"]
    }
  },
  {
    name: "delete_journal_prompt",
    description: "Delete a journal prompt.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" }
      },
      required: ["id"]
    }
  },
  {
    name: "get_form_schema",
    description: "Return editable form question schema for a form key.",
    inputSchema: {
      type: "object",
      properties: {
        form_key: { type: "string" }
      },
      required: ["form_key"]
    }
  },
  {
    name: "upsert_form_question",
    description: "Create or update a form question row.",
    inputSchema: {
      type: "object",
      properties: {
        form_key: { type: "string" },
        question_key: { type: "string" },
        label: { type: "string" },
        help_text: { type: "string" },
        input_type: { type: "string" },
        required: { type: "boolean" },
        sort_order: { type: "number" },
        placeholder: { type: "string" },
        options: { type: "array", items: { type: "string" } },
        active: { type: "boolean" }
      },
      required: ["form_key", "question_key", "label"]
    }
  },
  {
    name: "delete_form_question",
    description: "Delete a form question from a form schema.",
    inputSchema: {
      type: "object",
      properties: {
        form_key: { type: "string" },
        question_key: { type: "string" }
      },
      required: ["form_key", "question_key"]
    }
  },
  {
    name: "get_members",
    description: "List member accounts and portal status.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" }
      }
    }
  },
  {
    name: "set_member_portal_access",
    description: "Enable/disable member portal login access.",
    inputSchema: {
      type: "object",
      properties: {
        member_id: { type: "number" },
        active: { type: "boolean" }
      },
      required: ["member_id", "active"]
    }
  },
  {
    name: "get_member_course_access",
    description: "Get all courses and whether the member can access each one.",
    inputSchema: {
      type: "object",
      properties: {
        member_id: { type: "number" }
      },
      required: ["member_id"]
    }
  },
  {
    name: "set_member_course_access",
    description: "Grant or revoke member access to a specific course.",
    inputSchema: {
      type: "object",
      properties: {
        member_id: { type: "number" },
        course_id: { type: "number" },
        granted: { type: "boolean" }
      },
      required: ["member_id", "course_id", "granted"]
    }
  },
  // ── HeyGen Video Tools ──────────────────────────────────────────────────────
  {
    name: "bossmobile_heygen_guide",
    description: "IMPORTANT: Read this first before using HeyGen tools. Returns the full video pipeline guide \u2014 covers site pages, Google Drive docs, agent session notes, Research Lab dumps as script sources, plus avatar/voice setup.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "bossmobile_heygen_list_avatars",
    description: "List HeyGen studio avatars and talking photos (your trained faces). GET /v2/avatars.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "bossmobile_heygen_list_voices",
    description: "List HeyGen AI voices including clones. GET /v2/voices.",
    inputSchema: {
      type: "object",
      properties: {
        name_contains: { type: "string", description: "Filter voices by name (case-insensitive)" },
        limit: { type: "number", description: "Max results (1-500, default 400)" }
      }
    }
  },
  {
    name: "bossmobile_heygen_fetch_page",
    description: "Fetch a page from bossmobilelifecoach.com and strip HTML to plain text for script grounding.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Page path, e.g. / or /courses" }
      },
      required: ["path"]
    }
  },
  {
    name: "bossmobile_heygen_script_from_pages",
    description: "Generate spoken narration script from one or more site pages. Claude writes a HeyGen-ready script grounded in the page content. Requires ANTHROPIC_API_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        paths: { type: "array", items: { type: "string" }, description: 'Array of site paths like ["/", "/courses"]' },
        goal: { type: "string", description: "What the video should achieve" },
        duration_seconds_hint: { type: "number", description: "Target duration in seconds (default 45)" },
        tone: { type: "string", description: "Tone guidance (default: warm, mentor-like, conversational)" },
        max_chars: { type: "number", description: "Max chars per page excerpt (default 4500)" }
      },
      required: ["paths"]
    }
  },
  {
    name: "bossmobile_heygen_script_from_text",
    description: "Generate spoken narration script from raw text \u2014 paste Google Drive doc content, agent session notes, lesson outlines, or any text. Claude converts it to a HeyGen-ready spoken script. Requires ANTHROPIC_API_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Raw text to convert \u2014 Google Drive doc export, agent session notes, lesson outline, etc." },
        goal: { type: "string", description: "What the video should achieve" },
        duration_seconds_hint: { type: "number", description: "Target duration in seconds (default 60)" },
        tone: { type: "string", description: "Tone guidance (default: warm, mentor-like, conversational)" },
        source_label: { type: "string", description: "Label for the source (e.g. 'Vision Doc 3', 'Google Drive export', 'agent session')" }
      },
      required: ["text"]
    }
  },
  {
    name: "bossmobile_heygen_video_agent",
    description: "Create a video via HeyGen Video Agent v3. Pass the script as prompt. Uses the Brian Keith Hill voice guard; any non-Brian voice_id fails. Requires HEYGEN_API_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Script / prompt for the video (1-10000 chars)" },
        mode: { type: "string", description: "generate (default) or chat" },
        avatar_id: { type: "string", description: "Studio avatar ID (mutually exclusive with talking_photo_id)" },
        talking_photo_id: { type: "string", description: "Photo avatar ID (mutually exclusive with avatar_id)" },
        voice_id: { type: "string", description: "Must match the Brian Keith Hill voice ID if provided" },
        orientation: { type: "string", description: "landscape or portrait" },
        callback_url: { type: "string", description: "Webhook for completion" },
        callback_id: { type: "string", description: "Custom callback ID" },
        auto_proceed: { type: "boolean", description: "Auto-proceed without manual review" },
        style_id: { type: "string", description: "HeyGen style ID" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "bossmobile_heygen_video_status",
    description: "Poll HeyGen video generation status. GET /v3/videos/{video_id}. Returns video_url when completed.",
    inputSchema: {
      type: "object",
      properties: {
        video_id: { type: "string", description: "Video ID from bossmobile_heygen_video_agent" }
      },
      required: ["video_id"]
    }
  },
  {
    name: "bossmobile_lesson_set_content_url",
    description: "Smart setter \u2014 give it any lesson URL (YouTube watch/short/embed, HeyGen embed, Google Drive share/view, direct .mp4/.mp3/.pdf, or /media/ upload) and it normalizes to the canonical form the site's LessonMediaPlayer expects (YouTube \u2192 /embed/{id}, Drive \u2192 /file/d/{id}/preview, HeyGen embed \u2192 pass-through) and writes content_url + content_type onto the lesson. Prefer this over update_lesson when attaching new media \u2014 it guarantees the right format so the player renders correctly.",
    inputSchema: {
      type: "object",
      properties: {
        lesson_id: { type: "number", description: "Lesson id" },
        url: { type: "string", description: "Any lesson URL (YouTube, HeyGen, Drive, direct file, /media/ upload)" },
        content_type_hint: {
          type: "string",
          description: "Optional override: 'video', 'audio', 'pdf', or 'document'. Only used when the URL itself is ambiguous (e.g. Drive or /media/)."
        }
      },
      required: ["lesson_id", "url"]
    }
  },
  {
    name: "bossmobile_lessons_normalize_all",
    description: "Scan every lesson with a non-empty content_url and show what would change if normalized to the player's expected format. Dry-run by default (dry_run=true). Set dry_run=false to actually apply the updates. Use this to fix legacy YouTube watch URLs, Google Drive share URLs, etc., in one pass.",
    inputSchema: {
      type: "object",
      properties: {
        dry_run: { type: "boolean", description: "Default true \u2014 preview changes without writing" }
      }
    }
  },
  {
    name: "bossmobile_publish_video_playbook",
    description: "End-to-end publishing playbook: HeyGen \u2192 YouTube (via the caller's own Composio YouTube connection) \u2192 embed into a course lesson. Inspects HeyGen status + lesson row and returns the exact next-step playbook with all YouTube upload arguments pre-filled (title/description/tags/category/privacy). Re-call repeatedly while HeyGen renders \u2014 response state flips from 'rendering' to 'ready_to_upload' when the MP4 is ready. Brian's agent executes the upload with HIS OWN Composio YouTube connection (YOUTUBE_MULTIPART_UPLOAD_VIDEO). The papalife MCP never touches Composio credentials.",
    inputSchema: {
      type: "object",
      properties: {
        heygen_video_id: {
          type: "string",
          description: "HeyGen video id returned by bossmobile_heygen_video_agent"
        },
        lesson_id: {
          type: "number",
          description: "Destination lesson id \u2014 the YouTube embed URL will be written here via update_lesson in step 3"
        },
        title: {
          type: "string",
          description: "Override YouTube title (defaults to the lesson title, max 100 chars)"
        },
        description: {
          type: "string",
          description: "Override YouTube description (defaults to the lesson description)"
        },
        privacy_status: {
          type: "string",
          description: "'public', 'unlisted' (default), or 'private'"
        },
        category_id: {
          type: "string",
          description: "YouTube category id (default '27' Education)"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "YouTube tags (defaults to Papa Life / fatherhood coaching)"
        }
      },
      required: ["heygen_video_id", "lesson_id"]
    }
  }
];
function normEmail(v) {
  return String(v ?? "").trim().toLowerCase();
}
function asPositiveInt2(v, field) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${field} must be a positive integer`);
  return n;
}
async function handlePapalifeTool(name, args) {
  switch (name) {
    case "papalife_automation_status":
      return automationStatusPayload(db);
    case "papalife_claude_complete": {
      const prompt = String(args.prompt ?? "").trim();
      if (!prompt) throw new Error('prompt is required \u2014 use {"prompt":"..."}');
      const context = args.context != null ? String(args.context).trim() : void 0;
      return await claudePapaComplete(prompt, context);
    }
    case "papalife_forward_alert_to_cloud": {
      const alertId = Number(args.alert_id);
      if (!Number.isInteger(alertId) || alertId <= 0) throw new Error("alert_id must be a positive integer");
      if (!cloudWebhookUrl()) {
        throw new Error("Set AUTOMATION_CLOUD_WEBHOOK_URL in server .env to Brian's Make custom webhook URL");
      }
      return { ok: true, ...await forwardAlertToCloud(db, alertId) };
    }
    case "papalife_get_webhook_contract": {
      const base = process.env.PUBLIC_SITE_URL || "https://bossmobilelifecoach.com";
      const contractPath = path.resolve(process.cwd(), "automation-webhook-contract.json");
      const raw = fs.existsSync(contractPath) ? fs.readFileSync(contractPath, "utf8") : null;
      return {
        url: `${base}/api/automation/contract.json`,
        cloud_webhook_url_configured: Boolean(cloudWebhookUrl()),
        contract: raw ? JSON.parse(raw) : null,
        inbound_minimal: { prompt: "string" },
        inbound_response: { ok: true, prompt: "string", response: "string", model: "string", voice: "papa_life" }
      };
    }
    case "papalife_process_ghl_new_contact": {
      const input = parseGhlContactPayload({
        ghl_contact_id: args.ghl_contact_id,
        first_name: args.first_name,
        last_name: args.last_name,
        email: args.email,
        phone: args.phone,
        source: args.source,
        tags: args.tags,
        outreach_note: args.outreach_note
      });
      return { ok: true, ...await processGhlNewContact(db, input) };
    }
    case "papalife_list_ghl_contact_alerts": {
      const markIds = Array.isArray(args.mark_read_ids) ? args.mark_read_ids.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0) : [];
      for (const id of markIds) markGhlAlertRead(db, id);
      const alerts = listGhlContactAlerts(db, {
        unread_only: args.unread_only !== false,
        limit: args.limit != null ? Number(args.limit) : 20
      });
      return {
        ok: true,
        count: alerts.length,
        alerts,
        voice_instruction: alerts.length > 0 ? "Read the newest voice_prompt to Brian in voice mode, then offer to open GHL or draft a follow-up." : "No unread GHL alerts."
      };
    }
    case "papalife_ghl_move_opportunity_stage": {
      const creds = getGhlCredentialsForMcp(db);
      return await ghlMoveOpportunityStage(
        {
          opportunity_id: args.opportunity_id,
          id: args.id,
          pipeline_stage_id: args.pipeline_stage_id,
          pipelineStageId: args.pipelineStageId,
          pipeline_id: args.pipeline_id,
          pipelineId: args.pipelineId,
          status: args.status
        },
        creds
      );
    }
    case "papalife_nurture_sms_send": {
      const creds = getGhlCredentialsForMcp(db);
      return await ghlNurtureSmsSend(
        {
          ghl_contact_id: args.ghl_contact_id,
          contact_id: args.contact_id,
          body: args.body,
          dry_run: args.dry_run === true
        },
        creds
      );
    }
    case "get_site_endpoints": {
      const base = process.env.PUBLIC_SITE_URL || "https://bossmobilelifecoach.com";
      const mcpBase = process.env.PUBLIC_MCP_BASE_URL || base;
      return {
        publicSite: base,
        mcpBase,
        streamableMcpUrl: `${mcpBase.replace(/\/$/, "")}/mcp`,
        ghlAutomation: `${base}/api/automation/status`,
        webhookContract: `${base}/api/automation/contract.json`,
        ghlWebhook: `${base}/api/webhooks/ghl-new-contact`,
        claudePromptApi: `${base}/api/automation/claude-prompt`,
        claudePromptBody: { prompt: "required string" },
        trainingMediaUpload: "POST /api/admin/upload (session auth) stores files under /media/\u2026; use update_lesson with returned url.",
        notes: "Use create_intake_submission and log_engagement_event to persist strategist funnel conversations. GHL automation: papalife_automation_status, papalife_process_ghl_new_contact, papalife_list_ghl_contact_alerts (voice prompts), papalife_claude_complete. Research Lab MCP tools require RESEARCH_LAB_MCP_ENABLED=true; web UI requires RESEARCH_LAB_ADMIN_USERNAMES.",
        courseContentWorkflow: "When the user has Vision Documents, curriculum, or new learning modules: call papalife_course_content_workflow_brief first, then get_content_tree \u2192 create_course / create_lesson / update_lesson / set_member_course_access. Do NOT instruct the team to email Google Doc Master KB update checklists as the way clients receive materials.",
        researchLabPath: "/research-lab",
        siteCtas: "MCP: site_cta_placement_guide, list_site_ctas, upsert_site_cta, delete_site_cta. Public: GET /api/ctas?placement=KEY",
        siteMedia: "MCP: site_media_placement_guide, list_site_media, upsert_site_media, delete_site_media. Public: GET /api/site-media?placement=KEY. home_plan_video; home_framework_image (image); papa_journey_video_top | papa_journey_video_assessment | papa_journey_video_membership on /papa-journey.",
        pricing: "MCP: get_pricing_structure, update_pricing_structure to change trial hours, member price, Stripe price id, and checkout link without developer edits."
      };
    }
    case "bossmobile_research_workflow_brief": {
      assertResearchLabMcpEnabled();
      return {
        title: "Boss Mobile / PAPA Life \u2014 Research to social (stop sending raw note walls)",
        steps: [
          "1) Acknowledge: 'We have a large plan and a large note set \u2014 great. The team will not read pages of raw notes in chat.'",
          "2) Direct them to the Research Lab in the admin CRM (/research-lab) OR use MCP: create_brand_research_dump with title + full raw_notes.",
          "3) Run analyze_brand_research_dump \u2014 get executive summary + themes (server needs ANTHROPIC_API_KEY or CLAUDE_API_KEY for Claude).",
          "4) Run generate_social_from_research_dump \u2014 get platform-specific drafts.",
          "5) Review drafts with approve_social_suggestion (approved \u2192 posted when they publish).",
          "6) Encourage: 'Your research is fuel \u2014 now we turn it into content that moves the brand.'"
        ],
        agentInstructions: "Always steer the user away from dumping unstructured notes to people. Offer to create the dump for them via MCP, run analysis, then generate social content. Be proactive: suggest the next tool call.",
        tone: "Supportive, firm about process \u2014 the goal is consistent social output, not more unread documents."
      };
    }
    case "papalife_course_content_workflow_brief": {
      return {
        title: "PAPA Life \u2014 Vision / curriculum \u2192 site courses (stop email & Google Doc handoffs)",
        problem: "A common mistake is telling the team to paste Vision Documents into an external 'Master Knowledge Base' Google Doc, email version bumps, or attach Word files \u2014 that does not put learning materials where paying members consume them.",
        correctDelivery: "Client-facing learning lives in this app: SQLite courses + lessons, member playback at /portal, optional public catalog at /courses when show_in_catalog is true.",
        doNot: [
          "Do NOT output step-by-step instructions for the user to email someone to update Google Docs (e.g. 'SECTION: PAPA LIFE \u2014 16 VISION DOCUMENTS', 'update title to v18', 'confirm by email').",
          "Do NOT treat external KB versioning as the substitute for create_course / create_lesson.",
          "Do NOT assume the operator will manually sync docs \u2014 use MCP tools or Dashboard to persist structure."
        ],
        doInstead: [
          "Call get_content_tree to see existing courses and lessons.",
          "create_course (or update_course) for the program; set show_in_catalog if it should appear on /courses.",
          "For each Vision or module: create_lesson with title matching the Vision name; put summary or script in description; upload video/audio/PDF via POST /api/admin/upload (admin session) then update_lesson with content_url and content_type.",
          "Use set_member_course_access when specific members should (or should not) see a course.",
          "Optional: publish_content to snapshot a version; use upsert_site_cta (placement e.g. member_courses) to highlight the new program.",
          "Optional archival for long research: create_brand_research_dump is for Research Lab / social \u2014 not a replacement for lessons."
        ],
        agentInstructions: "When the user shares Vision Documents or curriculum text, your job is to land it in the course system. If you cannot call tools, give them exact MCP tool names and field mapping (Vision N \u2192 lesson title), not an email template to the team. Prefer get_site_endpoints for URLs and upload notes.",
        tone: "Decisive \u2014 the site is the source of truth for what members see."
      };
    }
    case "create_brand_research_dump": {
      assertResearchLabMcpEnabled();
      const raw_notes = String(args.raw_notes ?? "");
      if (!raw_notes.trim()) throw new Error("raw_notes is required");
      const title = String(args.title ?? "").trim() || "Untitled research";
      const id = createResearchDump(db, title, raw_notes);
      return {
        ok: true,
        id,
        message: "Captured. Next: analyze_brand_research_dump with this id, then generate_social_from_research_dump. Tell the user their notes are safely stored \u2014 no one needs the wall of text in email."
      };
    }
    case "list_brand_research_dumps": {
      assertResearchLabMcpEnabled();
      const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 200);
      return { dumps: listResearchDumps(db, limit) };
    }
    case "get_brand_research_dump": {
      assertResearchLabMcpEnabled();
      const id = asPositiveInt2(args.id, "id");
      const includeRaw = args.include_raw === true;
      const dump = getResearchDumpById(db, id, includeRaw);
      if (!dump) throw new Error("dump not found");
      const suggestions = listSocialSuggestions(db, id);
      return { dump, suggestions };
    }
    case "analyze_brand_research_dump": {
      assertResearchLabMcpEnabled();
      const id = asPositiveInt2(args.id, "id");
      const full = getResearchDumpById(db, id, true);
      if (!full || typeof full.raw_notes !== "string") throw new Error("dump not found");
      try {
        const out = await analyzeResearchNotes(full.raw_notes);
        setDumpAnalysis(db, id, out.executive_summary, out.themes, "ok", null);
        return {
          ok: true,
          model: out.model,
          truncated: out.truncated,
          executive_summary: out.executive_summary,
          themes: out.themes,
          nextStep: "generate_social_from_research_dump"
        };
      } catch (e) {
        setDumpAnalysis(db, id, "", [], "error", e instanceof Error ? e.message : String(e));
        throw e;
      }
    }
    case "generate_social_from_research_dump": {
      assertResearchLabMcpEnabled();
      const id = asPositiveInt2(args.id, "id");
      const full = getResearchDumpById(db, id, true);
      if (!full || typeof full.raw_notes !== "string") throw new Error("dump not found");
      if (!full.executive_summary?.trim()) {
        throw new Error("Run analyze_brand_research_dump first \u2014 no executive summary yet.");
      }
      const themes = full.themes_json ? JSON.parse(full.themes_json) : [];
      const platforms = Array.isArray(args.platforms) ? args.platforms.map((p) => String(p)) : void 0;
      const replace = args.replace === true;
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
      return {
        ok: true,
        count: pack.length,
        suggestions: listSocialSuggestions(db, id),
        coaching: "Give the user 1\u20133 concrete next actions (e.g. approve two posts, schedule one reel). Remind them: posting beats perfecting."
      };
    }
    case "list_social_suggestions_for_dump": {
      assertResearchLabMcpEnabled();
      const dump_id = asPositiveInt2(args.dump_id, "dump_id");
      return { suggestions: listSocialSuggestions(db, dump_id) };
    }
    case "approve_social_suggestion": {
      assertResearchLabMcpEnabled();
      const suggestion_id = asPositiveInt2(args.suggestion_id, "suggestion_id");
      const status = String(args.status ?? "").trim();
      if (!["draft", "approved", "rejected", "posted"].includes(status)) {
        throw new Error("status must be draft, approved, rejected, or posted");
      }
      updateSuggestionStatus(db, suggestion_id, status);
      return { ok: true, suggestion_id, status };
    }
    case "site_cta_placement_guide": {
      return {
        description: "Use upsert_site_cta with placement set to one of these keys. Multiple CTAs per placement are ordered by sort_order.",
        placements: [
          { key: "home_below_hero", where: "Public home \u2014 directly under hero section" },
          { key: "home_plan", where: "Public home \u2014 The Plan / North Star section area" },
          { key: "papa_journey", where: "Papa Journey funnel \u2014 after top nav" },
          { key: "strategist", where: "Strategist intake \u2014 under hero" },
          { key: "booking", where: "Clarity Session booking \u2014 under hero" },
          { key: "theme_matrix", where: "7-Day Theme Matrix \u2014 under hero" },
          { key: "operators", where: "Operators page \u2014 under hero" },
          { key: "member_home", where: "Member portal \u2014 My Journey home" },
          { key: "member_courses", where: "Member portal \u2014 Courses / lessons list" },
          { key: "member_lesson", where: "Member portal \u2014 under each lesson player" },
          { key: "member_journal", where: "Member portal \u2014 Journal tab" },
          { key: "member_brotherhood", where: "Member portal \u2014 Brotherhood tab" },
          { key: "member_events", where: "Member portal \u2014 Events tab" },
          { key: "member_library", where: "Member portal \u2014 Resource Library tab" }
        ],
        variants: ["amber", "outline", "minimal"],
        publicApi: "GET /api/ctas?placement=KEY (no auth)"
      };
    }
    case "list_site_ctas": {
      const placement = args.placement != null ? String(args.placement).trim() : null;
      return { ctas: listSiteCtasAdmin(db, placement || null) };
    }
    case "get_pricing_structure": {
      return getPricingSettings(db);
    }
    case "update_pricing_structure": {
      const updated = updatePricingSettings(db, {
        member_trial_hours: args.member_trial_hours !== void 0 ? Number(args.member_trial_hours) : void 0,
        member_price_usd_cents: args.member_price_usd_cents !== void 0 ? Number(args.member_price_usd_cents) : void 0,
        member_currency: args.member_currency !== void 0 ? String(args.member_currency) : void 0,
        member_product_name: args.member_product_name !== void 0 ? String(args.member_product_name) : void 0,
        member_stripe_price_id: args.member_stripe_price_id !== void 0 ? String(args.member_stripe_price_id) : void 0,
        checkout_payment_link: args.checkout_payment_link !== void 0 ? String(args.checkout_payment_link) : void 0
      });
      return { ok: true, pricing: updated };
    }
    case "upsert_site_cta": {
      const id = args.id != null && args.id !== "" ? asPositiveInt2(args.id, "id") : void 0;
      const newId = upsertSiteCta(db, {
        id,
        placement: String(args.placement ?? "").trim(),
        headline: "headline" in args ? args.headline == null ? null : String(args.headline) : void 0,
        body: "body" in args ? args.body == null ? null : String(args.body) : void 0,
        button_label: "button_label" in args ? args.button_label == null ? null : String(args.button_label) : void 0,
        button_url: "button_url" in args ? args.button_url == null ? null : String(args.button_url) : void 0,
        variant: "variant" in args ? String(args.variant ?? "amber").trim() || "amber" : void 0,
        active: "active" in args ? args.active === true : void 0,
        sort_order: "sort_order" in args && args.sort_order != null ? Number(args.sort_order) : void 0
      });
      return { ok: true, id: newId };
    }
    case "delete_site_cta": {
      const id = asPositiveInt2(args.id, "id");
      deleteSiteCta(db, id);
      return { ok: true, id };
    }
    case "site_media_placement_guide": {
      return {
        description: "Use upsert_site_media to control media slots without code deploys. Upload files through POST /api/admin/upload when you need a hosted /media/... URL, then set that URL here.",
        placements: [
          {
            key: "home_plan_video",
            where: "Public home \u2014 right-side media in The Plan / North Star section. Designed for Brian's current offer/campaign video.",
            media_type: "video"
          },
          {
            key: "home_framework_image",
            where: "Public home \u2014 The coaching framework (#framework): optional hero image above the four pillar cards. Use media_type 'image' and a direct URL (/media/... or CDN).",
            media_type: "image"
          },
          {
            key: "papa_journey_video_top",
            where: "Papa Journey funnel (/papa-journey) \u2014 first thing after nav, before any copy.",
            media_type: "video",
            heygen_video_id: "e38b4cf64a5d4cd28250ec23bb29f431"
          },
          {
            key: "papa_journey_video_assessment",
            where: "Papa Journey funnel \u2014 directly above the free Father Self-Assessment button (#free-resources).",
            media_type: "video",
            heygen_video_id: "74e4e09eaaf34f34b707fbdb32c6e1e3"
          },
          {
            key: "papa_journey_video_membership",
            where: "Papa Journey funnel \u2014 after free resources, above the $4.99/month Join CTA.",
            media_type: "video",
            heygen_video_id: "620433b6b8804cbab11508deafe30f45"
          }
        ],
        publicApi: "GET /api/site-media?placement=KEY (no auth)"
      };
    }
    case "list_site_media": {
      const placement = args.placement != null ? String(args.placement).trim() : null;
      return { media: listSiteMediaAdmin(db, placement || null) };
    }
    case "upsert_site_media": {
      const id = upsertSiteMedia(db, {
        placement: String(args.placement ?? "").trim(),
        media_url: String(args.media_url ?? "").trim(),
        media_type: "media_type" in args ? String(args.media_type ?? "video").trim() || "video" : void 0,
        poster_url: "poster_url" in args ? args.poster_url == null ? null : String(args.poster_url) : void 0,
        alt_text: "alt_text" in args ? args.alt_text == null ? null : String(args.alt_text) : void 0,
        title: "title" in args ? args.title == null ? null : String(args.title) : void 0,
        active: "active" in args ? args.active === true : void 0
      });
      return { ok: true, id };
    }
    case "delete_site_media": {
      const placement = String(args.placement ?? "").trim();
      if (!placement) throw new Error("placement is required");
      deleteSiteMedia(db, placement);
      return { ok: true, placement };
    }
    case "get_intake_submissions": {
      const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 200);
      return db.prepare(
        `SELECT id, first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision, created_at
           FROM intake_submissions
           ORDER BY id DESC
           LIMIT ?`
      ).all(limit);
    }
    case "create_intake_submission": {
      const first_name = String(args.first_name ?? "").trim();
      const email = normEmail(args.email);
      const phone = String(args.phone ?? "").trim();
      const situation = String(args.situation ?? "").trim();
      const routed_pillar = String(args.routed_pillar ?? "").trim();
      const disconnected_pillar = args.disconnected_pillar != null ? String(args.disconnected_pillar).trim() : null;
      const vision = args.vision != null ? String(args.vision).trim() : null;
      if (!first_name || !situation || !routed_pillar) {
        throw new Error("first_name, situation, and routed_pillar are required");
      }
      if (!email && !phone) {
        throw new Error("Provide at least one contact method: email or phone");
      }
      const result = db.prepare(
        "INSERT INTO intake_submissions (first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(first_name, email || null, phone || null, situation, routed_pillar, disconnected_pillar, vision);
      if (email) {
        const existing = db.prepare("SELECT id FROM conversion_pipeline WHERE email = ?").get(email);
        if (existing?.id) {
          db.prepare(
            "UPDATE conversion_pipeline SET intake_completed = 1, stage = CASE WHEN stage = 'discovery' THEN 'engagement' ELSE stage END, first_name = COALESCE(?, first_name), updated_at = datetime('now') WHERE id = ?"
          ).run(first_name, existing.id);
        } else {
          db.prepare(
            "INSERT INTO conversion_pipeline (email, first_name, stage, intake_completed) VALUES (?, ?, 'engagement', 1)"
          ).run(email, first_name);
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
          source: "mcp"
        });
      } catch (crmErr) {
        console.error("[crm] MCP sync intake to lead failed:", crmErr);
      }
      return { ok: true, id: result.lastInsertRowid, routed_pillar, crm: "synced_to_leads" };
    }
    case "log_engagement_event": {
      const email = normEmail(args.email);
      const event_type = String(args.event_type ?? "").trim();
      const event_detail = args.event_detail != null ? String(args.event_detail).trim() : null;
      if (!email || !event_type) throw new Error("email and event_type are required");
      db.prepare("INSERT INTO engagement_log (email, event_type, event_detail) VALUES (?, ?, ?)").run(
        email,
        event_type,
        event_detail
      );
      const pipeline = db.prepare("SELECT id FROM conversion_pipeline WHERE email = ?").get(email);
      if (!pipeline?.id) {
        db.prepare(
          "INSERT INTO conversion_pipeline (email, stage, content_interactions) VALUES (?, 'discovery', CASE WHEN ? IN ('content_view', 'content_click') THEN 1 ELSE 0 END)"
        ).run(email, event_type);
      } else {
        if (event_type === "content_view" || event_type === "content_click") {
          db.prepare(
            "UPDATE conversion_pipeline SET content_interactions = content_interactions + 1, updated_at = datetime('now') WHERE id = ?"
          ).run(pipeline.id);
        } else if (event_type === "community_post") {
          db.prepare(
            "UPDATE conversion_pipeline SET community_posts = community_posts + 1, stage = CASE WHEN intake_completed = 1 THEN 'community' ELSE stage END, updated_at = datetime('now') WHERE id = ?"
          ).run(pipeline.id);
        } else if (event_type === "event_rsvp") {
          db.prepare(
            "UPDATE conversion_pipeline SET event_rsvps = event_rsvps + 1, stage = CASE WHEN intake_completed = 1 THEN 'community' ELSE stage END, updated_at = datetime('now') WHERE id = ?"
          ).run(pipeline.id);
        }
      }
      return { ok: true };
    }
    case "get_content_tree": {
      const courses = db.prepare("SELECT * FROM courses ORDER BY sort_order ASC, created_at ASC").all();
      const lessons = db.prepare(
        `SELECT l.*, d.release_days_after_enroll
           FROM lessons l
           LEFT JOIN content_drip_rules d ON d.lesson_id = l.id
           ORDER BY l.course_id ASC, l.sort_order ASC, l.created_at ASC`
      ).all();
      const byCourse = /* @__PURE__ */ new Map();
      for (const lesson of lessons) {
        const courseId = Number(lesson.course_id);
        const arr = byCourse.get(courseId) ?? [];
        arr.push(lesson);
        byCourse.set(courseId, arr);
      }
      return courses.map((course) => ({
        ...course,
        lessons: byCourse.get(Number(course.id)) ?? []
      }));
    }
    case "create_course": {
      const title = String(args.title ?? "").trim();
      if (!title) throw new Error("title is required");
      const description = args.description != null ? String(args.description).trim() : null;
      const pillar = args.pillar != null ? String(args.pillar).trim() : "General";
      const sortOrder = Number.isFinite(Number(args.sort_order)) ? Number(args.sort_order) : 0;
      const catalog = args.show_in_catalog === false || args.show_in_catalog === 0 ? 0 : 1;
      const result = db.prepare("INSERT INTO courses (title, description, pillar, sort_order, show_in_catalog) VALUES (?, ?, ?, ?, ?)").run(title, description, pillar, sortOrder, catalog);
      return { ok: true, course_id: result.lastInsertRowid };
    }
    case "update_course": {
      const courseId = asPositiveInt2(args.course_id, "course_id");
      const existing = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId);
      if (!existing) throw new Error("course not found");
      const title = args.title != null ? String(args.title).trim() : String(existing.title ?? "");
      const description = args.description !== void 0 ? args.description != null ? String(args.description).trim() : null : existing.description;
      const pillar = args.pillar !== void 0 ? String(args.pillar ?? "").trim() || "General" : String(existing.pillar ?? "General");
      const sortOrder = args.sort_order !== void 0 ? Number(args.sort_order) : Number(existing.sort_order ?? 0);
      const catalog = args.show_in_catalog !== void 0 ? args.show_in_catalog === false || args.show_in_catalog === 0 ? 0 : 1 : Number(existing.show_in_catalog ?? 1);
      db.prepare("UPDATE courses SET title = ?, description = ?, pillar = ?, sort_order = ?, show_in_catalog = ? WHERE id = ?").run(
        title,
        description,
        pillar,
        sortOrder,
        catalog,
        courseId
      );
      return { ok: true, course_id: courseId };
    }
    case "create_lesson": {
      const courseId = asPositiveInt2(args.course_id, "course_id");
      const title = String(args.title ?? "").trim();
      if (!title) throw new Error("title is required");
      const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId);
      if (!course) throw new Error("course not found");
      const description = args.description != null ? String(args.description).trim() : null;
      const contentUrl = args.content_url != null ? String(args.content_url).trim() : null;
      const contentType = args.content_type != null ? String(args.content_type).trim() : "video";
      const durationMinutes = args.duration_minutes != null ? Number(args.duration_minutes) : null;
      const sortOrder = Number.isFinite(Number(args.sort_order)) ? Number(args.sort_order) : 0;
      const result = db.prepare(
        "INSERT INTO lessons (course_id, title, description, content_url, content_type, duration_minutes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(courseId, title, description, contentUrl, contentType, durationMinutes, sortOrder);
      return { ok: true, lesson_id: result.lastInsertRowid, course_id: courseId };
    }
    case "update_lesson": {
      const lessonId = asPositiveInt2(args.lesson_id, "lesson_id");
      const existing = db.prepare("SELECT * FROM lessons WHERE id = ?").get(lessonId);
      if (!existing) throw new Error("lesson not found");
      const title = args.title != null ? String(args.title).trim() : String(existing.title ?? "");
      const description = args.description !== void 0 ? args.description != null ? String(args.description).trim() : null : existing.description;
      const contentUrl = args.content_url !== void 0 ? args.content_url != null ? String(args.content_url).trim() : null : existing.content_url;
      const contentType = args.content_type !== void 0 ? String(args.content_type ?? "").trim() || "video" : String(existing.content_type ?? "video");
      const durationMinutes = args.duration_minutes !== void 0 ? Number(args.duration_minutes) : Number(existing.duration_minutes ?? 0);
      const sortOrder = args.sort_order !== void 0 ? Number(args.sort_order) : Number(existing.sort_order ?? 0);
      db.prepare(
        "UPDATE lessons SET title = ?, description = ?, content_url = ?, content_type = ?, duration_minutes = ?, sort_order = ? WHERE id = ?"
      ).run(title, description, contentUrl, contentType, durationMinutes, sortOrder, lessonId);
      return { ok: true, lesson_id: lessonId };
    }
    case "delete_lesson": {
      const lessonId = asPositiveInt2(args.lesson_id, "lesson_id");
      const existing = db.prepare("SELECT id FROM lessons WHERE id = ?").get(lessonId);
      if (!existing?.id) throw new Error("lesson not found");
      db.prepare("DELETE FROM lessons WHERE id = ?").run(lessonId);
      return { ok: true, lesson_id: lessonId };
    }
    case "set_drip_rule": {
      const lessonId = asPositiveInt2(args.lesson_id, "lesson_id");
      const releaseDays = Number(args.release_days_after_enroll);
      if (!Number.isInteger(releaseDays) || releaseDays < 0) {
        throw new Error("release_days_after_enroll must be a non-negative integer");
      }
      db.prepare(
        `INSERT INTO content_drip_rules (lesson_id, release_days_after_enroll, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(lesson_id) DO UPDATE SET
           release_days_after_enroll = excluded.release_days_after_enroll,
           updated_at = datetime('now')`
      ).run(lessonId, releaseDays);
      return { ok: true, lesson_id: lessonId, release_days_after_enroll: releaseDays };
    }
    case "publish_content": {
      const courseId = asPositiveInt2(args.course_id, "course_id");
      const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId);
      if (!course) throw new Error("course not found");
      const lessons = db.prepare("SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC, created_at ASC").all(courseId);
      const snapshot = JSON.stringify({ course, lessons });
      const summary = args.summary != null ? String(args.summary).trim() : null;
      const result = db.prepare(
        "INSERT INTO content_versions (course_id, summary, snapshot_json, published_at) VALUES (?, ?, ?, datetime('now'))"
      ).run(courseId, summary, snapshot);
      return { ok: true, version_id: result.lastInsertRowid, course_id: courseId };
    }
    case "get_member_progress": {
      const memberId = asPositiveInt2(args.member_id, "member_id");
      const rows = db.prepare(
        `SELECT
             c.id as course_id,
             c.title as course_title,
             COUNT(l.id) as total_lessons,
             SUM(CASE WHEN mp.lesson_id IS NOT NULL THEN 1 ELSE 0 END) as completed_lessons
           FROM courses c
           LEFT JOIN lessons l ON l.course_id = c.id
           LEFT JOIN member_progress mp ON mp.lesson_id = l.id AND mp.member_id = ?
           GROUP BY c.id
           ORDER BY c.sort_order ASC, c.created_at ASC`
      ).all(memberId);
      return rows.map((r) => ({
        ...r,
        percent_complete: r.total_lessons > 0 ? Math.round(r.completed_lessons / r.total_lessons * 100) : 0
      }));
    }
    case "get_journal_prompts": {
      return db.prepare("SELECT id, pillar, prompt_text, sort_order FROM journal_prompts ORDER BY pillar ASC, sort_order ASC, id ASC").all();
    }
    case "create_journal_prompt": {
      const pillar = String(args.pillar ?? "").trim();
      const promptText = String(args.prompt_text ?? "").trim();
      if (!pillar || !promptText) throw new Error("pillar and prompt_text are required");
      const sortOrder = Number.isFinite(Number(args.sort_order)) ? Number(args.sort_order) : 0;
      const result = db.prepare("INSERT INTO journal_prompts (pillar, prompt_text, sort_order) VALUES (?, ?, ?)").run(pillar, promptText, sortOrder);
      return { ok: true, id: result.lastInsertRowid };
    }
    case "update_journal_prompt": {
      const id = asPositiveInt2(args.id, "id");
      const existing = db.prepare("SELECT * FROM journal_prompts WHERE id = ?").get(id);
      if (!existing) throw new Error("journal prompt not found");
      const pillar = args.pillar != null ? String(args.pillar).trim() : String(existing.pillar ?? "");
      const promptText = args.prompt_text != null ? String(args.prompt_text).trim() : String(existing.prompt_text ?? "");
      const sortOrder = args.sort_order !== void 0 ? Number(args.sort_order) : Number(existing.sort_order ?? 0);
      db.prepare("UPDATE journal_prompts SET pillar = ?, prompt_text = ?, sort_order = ? WHERE id = ?").run(
        pillar,
        promptText,
        sortOrder,
        id
      );
      return { ok: true, id };
    }
    case "delete_journal_prompt": {
      const id = asPositiveInt2(args.id, "id");
      db.prepare("DELETE FROM journal_prompts WHERE id = ?").run(id);
      return { ok: true, id };
    }
    case "get_form_schema": {
      const formKey = String(args.form_key ?? "").trim();
      if (!formKey) throw new Error("form_key is required");
      const rows = db.prepare(
        `SELECT form_key, question_key, label, help_text, input_type, required, sort_order, placeholder, options_json, active
           FROM form_questions
           WHERE form_key = ?
           ORDER BY sort_order ASC, question_key ASC`
      ).all(formKey);
      return rows.map((row) => ({
        ...row,
        required: Number(row.required) === 1,
        active: Number(row.active) === 1,
        options: row.options_json ? JSON.parse(String(row.options_json)) : []
      }));
    }
    case "upsert_form_question": {
      const formKey = String(args.form_key ?? "").trim();
      const questionKey = String(args.question_key ?? "").trim();
      const label = String(args.label ?? "").trim();
      if (!formKey || !questionKey || !label) {
        throw new Error("form_key, question_key, and label are required");
      }
      const helpText = args.help_text != null ? String(args.help_text).trim() : null;
      const inputType = args.input_type != null ? String(args.input_type).trim() : "text";
      const isRequired = args.required === true ? 1 : 0;
      const sortOrder = Number.isFinite(Number(args.sort_order)) ? Number(args.sort_order) : 0;
      const placeholder = args.placeholder != null ? String(args.placeholder).trim() : null;
      const options = Array.isArray(args.options) ? args.options.map((v) => String(v)) : [];
      const active = args.active === false ? 0 : 1;
      db.prepare(
        `INSERT INTO form_questions (
           form_key, question_key, label, help_text, input_type, required, sort_order, placeholder, options_json, active, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(form_key, question_key) DO UPDATE SET
           label = excluded.label,
           help_text = excluded.help_text,
           input_type = excluded.input_type,
           required = excluded.required,
           sort_order = excluded.sort_order,
           placeholder = excluded.placeholder,
           options_json = excluded.options_json,
           active = excluded.active,
           updated_at = datetime('now')`
      ).run(formKey, questionKey, label, helpText, inputType, isRequired, sortOrder, placeholder, JSON.stringify(options), active);
      return { ok: true, form_key: formKey, question_key: questionKey };
    }
    case "delete_form_question": {
      const formKey = String(args.form_key ?? "").trim();
      const questionKey = String(args.question_key ?? "").trim();
      if (!formKey || !questionKey) throw new Error("form_key and question_key are required");
      db.prepare("DELETE FROM form_questions WHERE form_key = ? AND question_key = ?").run(formKey, questionKey);
      return { ok: true, form_key: formKey, question_key: questionKey };
    }
    case "get_members": {
      const limit = Math.min(Math.max(Number(args.limit) || 100, 1), 500);
      return db.prepare(
        `SELECT id, first_name, last_name, email, status, enrolled_at, created_at
           FROM members
           ORDER BY created_at DESC
           LIMIT ?`
      ).all(limit);
    }
    case "set_member_portal_access": {
      const memberId = asPositiveInt2(args.member_id, "member_id");
      const active = args.active === true;
      const existing = db.prepare("SELECT id FROM members WHERE id = ?").get(memberId);
      if (!existing) throw new Error("member not found");
      db.prepare("UPDATE members SET status = ? WHERE id = ?").run(active ? "active" : "inactive", memberId);
      return { ok: true, member_id: memberId, status: active ? "active" : "inactive" };
    }
    case "get_member_course_access": {
      const memberId = asPositiveInt2(args.member_id, "member_id");
      const member = db.prepare("SELECT id FROM members WHERE id = ?").get(memberId);
      if (!member) throw new Error("member not found");
      const rows = db.prepare(
        `SELECT
             c.id as course_id,
             c.title,
             c.pillar,
             CASE
               WHEN EXISTS (
                 SELECT 1 FROM member_course_access a
                 WHERE a.member_id = ? AND a.course_id = c.id AND a.granted = 1
               ) THEN 1
               WHEN NOT EXISTS (
                 SELECT 1 FROM member_course_access a2
                 WHERE a2.member_id = ?
               ) THEN 1
               ELSE 0
             END as granted
           FROM courses c
           ORDER BY c.sort_order ASC, c.created_at ASC`
      ).all(memberId, memberId);
      return rows.map((r) => ({ ...r, granted: Number(r.granted) === 1 }));
    }
    case "set_member_course_access": {
      const memberId = asPositiveInt2(args.member_id, "member_id");
      const courseId = asPositiveInt2(args.course_id, "course_id");
      const granted = args.granted === true ? 1 : 0;
      const member = db.prepare("SELECT id FROM members WHERE id = ?").get(memberId);
      if (!member) throw new Error("member not found");
      const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId);
      if (!course) throw new Error("course not found");
      db.prepare(
        `INSERT INTO member_course_access (member_id, course_id, granted, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(member_id, course_id) DO UPDATE SET
           granted = excluded.granted,
           updated_at = datetime('now')`
      ).run(memberId, courseId, granted);
      return { ok: true, member_id: memberId, course_id: courseId, granted: granted === 1 };
    }
    // ── HeyGen Video Tools ──────────────────────────────────────────────────
    case "bossmobile_heygen_guide":
      return bossmobileHeygenGuide();
    case "bossmobile_heygen_list_avatars":
      return await bossmobileHeygenListAvatars();
    case "bossmobile_heygen_list_voices":
      return await bossmobileHeygenListVoices({
        name_contains: args.name_contains,
        limit: args.limit
      });
    case "bossmobile_heygen_fetch_page":
      return await bossmobileHeygenFetchPage(String(args.path ?? ""));
    case "bossmobile_heygen_script_from_pages":
      return await bossmobileHeygenScriptFromPages({
        paths: args.paths,
        goal: args.goal,
        duration_seconds_hint: args.duration_seconds_hint,
        tone: args.tone,
        max_chars: args.max_chars
      });
    case "bossmobile_heygen_script_from_text":
      return await bossmobileHeygenScriptFromText({
        text: String(args.text ?? ""),
        goal: args.goal,
        duration_seconds_hint: args.duration_seconds_hint,
        tone: args.tone,
        source_label: args.source_label
      });
    case "bossmobile_heygen_video_agent":
      return await bossmobileHeygenVideoAgent({
        prompt: String(args.prompt ?? ""),
        mode: args.mode,
        avatar_id: args.avatar_id,
        talking_photo_id: args.talking_photo_id,
        voice_id: args.voice_id,
        orientation: args.orientation,
        callback_url: args.callback_url,
        callback_id: args.callback_id,
        auto_proceed: args.auto_proceed,
        style_id: args.style_id
      });
    case "bossmobile_heygen_video_status":
      return await bossmobileHeygenVideoStatus(String(args.video_id ?? ""));
    case "bossmobile_lesson_set_content_url": {
      const lessonId = asPositiveInt2(args.lesson_id, "lesson_id");
      const existing = db.prepare("SELECT id, title, content_url, content_type FROM lessons WHERE id = ?").get(lessonId);
      if (!existing) throw new Error("lesson not found");
      const normalized = normalizeLessonContent(
        String(args.url ?? ""),
        existing.content_url,
        args.content_type_hint ?? existing.content_type
      );
      db.prepare(
        "UPDATE lessons SET content_url = ?, content_type = ? WHERE id = ?"
      ).run(normalized.content_url, normalized.content_type, lessonId);
      return {
        ok: true,
        kind: normalized.kind,
        changed: normalized.changed,
        lesson: {
          id: existing.id,
          title: existing.title,
          before: {
            content_url: existing.content_url,
            content_type: existing.content_type
          },
          after: {
            content_url: normalized.content_url,
            content_type: normalized.content_type
          }
        }
      };
    }
    case "bossmobile_lessons_normalize_all": {
      const dryRun = args.dry_run === void 0 ? true : Boolean(args.dry_run);
      const rows = db.prepare(
        "SELECT id, title, content_url, content_type FROM lessons WHERE content_url IS NOT NULL AND TRIM(content_url) != '' ORDER BY id"
      ).all();
      const changes = [];
      const skipped = [];
      let applied = 0;
      for (const row of rows) {
        try {
          const norm = normalizeLessonContent(row.content_url, row.content_url, row.content_type);
          const typeChanged = (row.content_type ?? "video") !== norm.content_type;
          if (norm.changed || typeChanged) {
            changes.push({
              lesson_id: row.id,
              title: row.title,
              kind: norm.kind,
              before: { content_url: row.content_url, content_type: row.content_type },
              after: { content_url: norm.content_url, content_type: norm.content_type }
            });
            if (!dryRun) {
              db.prepare(
                "UPDATE lessons SET content_url = ?, content_type = ? WHERE id = ?"
              ).run(norm.content_url, norm.content_type, row.id);
              applied += 1;
            }
          }
        } catch (err) {
          skipped.push({ lesson_id: row.id, title: row.title, reason: String(err.message || err) });
        }
      }
      return {
        dry_run: dryRun,
        scanned: rows.length,
        would_change: changes.length,
        applied: dryRun ? 0 : applied,
        changes,
        skipped
      };
    }
    case "bossmobile_publish_video_playbook":
      return await bossmobilePublishVideoPlaybook(db, {
        heygen_video_id: String(args.heygen_video_id ?? ""),
        lesson_id: Number(args.lesson_id),
        title: args.title,
        description: args.description,
        privacy_status: args.privacy_status,
        category_id: args.category_id,
        tags: args.tags
      });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// mcp-streamable.ts
dotenv.config({ path: path2.resolve(process.cwd(), ".env") });
var MCP_PORT = parseInt(process.env.MCP_PORT || "3009", 10);
var MCP_BEARER_TOKEN = process.env.MCP_BEARER_TOKEN || "";
var MCP_BASE_URL = process.env.PUBLIC_MCP_BASE_URL || "https://bossmobilelifecoach.com";
var OAUTH_CODE_TTL_MS = 5 * 60 * 1e3;
var OAUTH_ACCESS_TTL_SEC = 60 * 60;
var OAUTH_REFRESH_TTL_SEC = 30 * 24 * 60 * 60;
var oauthDb = new Database2(path2.resolve(process.cwd(), "leads.db"));
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
var sha256 = (s) => crypto2.createHash("sha256").update(s).digest("hex");
function saveClient(clientId, clientName, redirectUris) {
  oauthDb.prepare(
    "INSERT OR REPLACE INTO oauth_clients (client_id, client_name, redirect_uris, created_at) VALUES (?, ?, ?, ?)"
  ).run(clientId, clientName, JSON.stringify(redirectUris), Date.now());
}
function saveCode(code, clientId, redirectUri, challenge, method) {
  oauthDb.prepare(
    "INSERT INTO oauth_codes (code, client_id, redirect_uri, code_challenge, code_challenge_method, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(code, clientId, redirectUri, challenge, method, Date.now() + OAUTH_CODE_TTL_MS);
}
function takeCode(code) {
  purgeExpired();
  const row = oauthDb.prepare(
    "SELECT client_id, redirect_uri, code_challenge, code_challenge_method, expires_at FROM oauth_codes WHERE code = ?"
  ).get(code);
  if (!row) return null;
  oauthDb.prepare("DELETE FROM oauth_codes WHERE code = ?").run(code);
  if (row.expires_at < Date.now()) return null;
  return row;
}
function issueAccessToken(clientId, scope) {
  const raw = crypto2.randomBytes(32).toString("base64url");
  oauthDb.prepare(
    "INSERT INTO oauth_access_tokens (token_hash, client_id, scope, expires_at) VALUES (?, ?, ?, ?)"
  ).run(sha256(raw), clientId, scope, Date.now() + OAUTH_ACCESS_TTL_SEC * 1e3);
  return raw;
}
function issueRefreshToken(clientId, scope) {
  const raw = crypto2.randomBytes(32).toString("base64url");
  oauthDb.prepare(
    "INSERT INTO oauth_refresh_tokens (token_hash, client_id, scope, expires_at) VALUES (?, ?, ?, ?)"
  ).run(sha256(raw), clientId, scope, Date.now() + OAUTH_REFRESH_TTL_SEC * 1e3);
  return raw;
}
function lookupAccessToken(raw) {
  const row = oauthDb.prepare("SELECT client_id, expires_at FROM oauth_access_tokens WHERE token_hash = ?").get(sha256(raw));
  return row ?? null;
}
function consumeRefreshToken(raw) {
  const h = sha256(raw);
  const row = oauthDb.prepare("SELECT client_id, scope, expires_at FROM oauth_refresh_tokens WHERE token_hash = ?").get(h);
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
setInterval(purgeExpired, 10 * 60 * 1e3).unref();
function verifyPkce(verifier, challenge, method) {
  if (method === "S256") {
    return crypto2.createHash("sha256").update(verifier).digest("base64url") === challenge;
  }
  return verifier === challenge;
}
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
var cors = (_, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, mcp-session-id, Accept, Last-Event-ID, MCP-Protocol-Version, mcp-protocol-version",
    "Access-Control-Expose-Headers": "Mcp-Session-Id, WWW-Authenticate, MCP-Protocol-Version"
  });
  next();
};
function checkAuth(req, res, next) {
  const auth = req.headers["authorization"];
  if (!auth) {
    if (!MCP_BEARER_TOKEN) return next();
    res.set(
      "WWW-Authenticate",
      `Bearer realm="${MCP_BASE_URL}", resource_metadata="${MCP_BASE_URL}/.well-known/oauth-protected-resource"`
    );
    res.status(401).json({ error: "Unauthorized \u2014 Bearer token required" });
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
  res.status(401).json({ error: "Unauthorized \u2014 invalid or expired token" });
}
var sessions = /* @__PURE__ */ new Map();
function createSession() {
  const mcpServer = new Server(
    { name: "papalife-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: PAPALIFE_MCP_TOOL_DEFINITIONS
  }));
  mcpServer.setRequestHandler(CallToolRequestSchema, async (req) => {
    try {
      const result = await handlePapalifeTool(
        req.params.name,
        req.params.arguments || {}
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return {
        content: [
          { type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }
        ],
        isError: true
      };
    }
  });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true
  });
  return { server: mcpServer, transport };
}
app.options(/.*/, cors, (_, res) => res.sendStatus(204));
app.post("/mcp", cors, checkAuth, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId).transport.handleRequest(req, res, req.body);
    return;
  }
  const { server: mcpServer, transport } = createSession();
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
  const newId = transport.sessionId;
  if (newId) sessions.set(newId, { server: mcpServer, transport });
});
app.get("/mcp", cors, checkAuth, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId).transport.handleRequest(req, res);
    return;
  }
  res.status(400).json({
    jsonrpc: "2.0",
    error: { code: -32e3, message: "Bad Request: Mcp-Session-Id header is required" },
    id: null
  });
});
app.delete("/mcp", cors, checkAuth, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (sessionId && sessions.has(sessionId)) {
    const s = sessions.get(sessionId);
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
    scopes_supported: ["mcp"]
  });
});
app.get("/.well-known/oauth-protected-resource", cors, (_, res) => {
  res.json({
    resource: `${MCP_BASE_URL}/mcp`,
    authorization_servers: [MCP_BASE_URL],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
    resource_documentation: `${MCP_BASE_URL}/mcp`
  });
});
app.get("/.well-known/oauth-protected-resource/mcp", cors, (_, res) => {
  res.json({
    resource: `${MCP_BASE_URL}/mcp`,
    authorization_servers: [MCP_BASE_URL],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
    resource_documentation: `${MCP_BASE_URL}/mcp`
  });
});
app.post("/register", cors, (req, res) => {
  const clientName = req.body?.client_name || "mcp-client";
  const redirectUris = Array.isArray(req.body?.redirect_uris) ? req.body.redirect_uris : [];
  const clientId = `${clientName.replace(/[^a-zA-Z0-9_-]/g, "")}_${crypto2.randomBytes(8).toString("hex")}`;
  saveClient(clientId, clientName, redirectUris);
  res.json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1e3),
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none"
  });
});
app.get("/authorize", (req, res) => {
  const { response_type, client_id, redirect_uri, code_challenge, code_challenge_method, state } = req.query;
  if (response_type !== "code" || !redirect_uri) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html><html><head><title>Authorize \u2014 Papa Life MCP</title>
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
    const sep2 = redirect_uri?.includes("?") ? "&" : "?";
    res.redirect(
      `${redirect_uri}${sep2}error=access_denied${state ? `&state=${encodeURIComponent(state)}` : ""}`
    );
    return;
  }
  const code = crypto2.randomBytes(32).toString("base64url");
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
      if (!req.body.code_verifier || !verifyPkce(req.body.code_verifier, stored.code_challenge, stored.code_challenge_method)) {
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
      scope
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
      scope: consumed.scope
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
