import type { Database } from "better-sqlite3";
import type { Express, RequestHandler } from "express";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { ensureAiBossMobileTables, getAiBossNodes } from "./ai-boss-mobile-store";

// Read-only daily reporting over records already persisted by Papa Life.
// No scraping private messages, inferred diagnoses, or automatic outreach.
function pacificBounds(day: string): [string, string] {
  const midnight = (isoDay: string) => {
    const candidate = Date.parse(isoDay + "T00:00:00.000Z");
    // The preceding Pacific afternoon has the offset active at local midnight, even on DST-change days.
    const precedingEvening = new Date(candidate);
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      timeZoneName: "shortOffset",
    }).formatToParts(precedingEvening).find(part => part.type === "timeZoneName")?.value || "GMT-8";
    const match = label.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
    const minutes = match ? (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] || 0)) : -480;
    return new Date(candidate - minutes * 60000).toISOString().replace("T", " ").slice(0, 19);
  };
  const following = new Date(Date.parse(day + "T12:00:00.000Z") + 86400000).toISOString().slice(0, 10);
  return [midnight(day), midnight(following)];
}

function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value;
}

export function ensurePapaOutreachCapture(db: Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS papa_owner_outreach_notes (
    id TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(owner_id, id)
  );
  CREATE INDEX IF NOT EXISTS idx_papa_owner_outreach_notes_day
    ON papa_owner_outreach_notes(owner_id, created_at);`);
  // Safe additive migration; preserve older browser-dictation records.
  try { db.exec("ALTER TABLE papa_owner_outreach_notes ADD COLUMN source TEXT NOT NULL DEFAULT 'owner_browser_dictation'"); } catch {}
  try { db.exec("ALTER TABLE papa_owner_outreach_notes ADD COLUMN source_ref TEXT"); } catch {}
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_papa_owner_outreach_source_ref ON papa_owner_outreach_notes(owner_id, source_ref) WHERE source_ref IS NOT NULL");
}

type Interaction = {
  id: number;
  session_id: string;
  mode: string;
  first_name: string | null;
  email: string | null;
  source_page: string | null;
  created_at: string;
};
type OwnerRecord = { id: string; data: string; updated_at: string };
type OwnerNote = { id: string; note: string; created_at: string; source: string; source_ref: string | null };

export function getPapaOutreachDaily(db: Database, ownerId: number, day: string) {
  if (!isDay(day)) throw new Error("Invalid report date");
  const [from, to] = pacificBounds(day);
  const interactions = db.prepare(`SELECT id,session_id,mode,first_name,email,source_page,created_at
    FROM papa_ai_interactions WHERE created_at >= ? AND created_at < ?
    ORDER BY created_at DESC LIMIT 1000`).all(from, to) as Interaction[];
  const ownerRecords = db.prepare(`SELECT id,data,updated_at FROM papa_owner_conversations
    WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 500`).all(ownerId) as OwnerRecord[];
  const notes = db.prepare(`SELECT id,note,created_at,source,source_ref FROM papa_owner_outreach_notes
    WHERE owner_id = ? AND created_at >= ? AND created_at < ?
    ORDER BY created_at DESC LIMIT 100`).all(ownerId, from, to) as OwnerNote[];

  const conversations = interactions.filter(r => !["lead", "assessment", "cta"].includes(r.mode));
  const dailySessions = new Set(conversations.map(r => r.session_id)).size;
  const twinMessages = conversations.filter(r => (r.source_page || "").includes("/digital-twin") ||
    (r.source_page || "").includes("/papa-life") || r.mode === "coach").length;
  const consentContactEntries = interactions.filter(r => r.mode === "lead");
  const contactEntries = new Map<string, { name: string; source: string; date: string }>();
  for (const r of consentContactEntries) {
    if (!r.email) continue;
    const email = r.email.toLowerCase().trim();
    if (!email || contactEntries.has(email)) continue;
    contactEntries.set(email, {
      name: r.first_name || "Contact details submitted",
      source: r.source_page || "Papa Life website",
      date: r.created_at,
    });
  }

  const relevantRecords = ownerRecords
    .map(row => {
      try {
        const data = JSON.parse(row.data);
        return { id: row.id, person: String(data.person || "Unknown"), date: String(data.date || ""),
          purpose: String(data.purpose || ""), useful: String(data.useful || ""),
          steps: String(data.steps || ""), kind: String(data.kind || "Explorer"),
          completed: Boolean(data.completed), updated_at: row.updated_at };
      } catch { return null; }
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  const recordsForDay = relevantRecords.filter(r => r.date === day);
  // A scheduled conversation is not evidence that a conversation was held.
  const completedForDay = recordsForDay.filter(r => r.completed);
  const reviewedNextSteps = relevantRecords.filter(r => Boolean(r.steps.trim()) && !r.completed).slice(0, 8);
  const sourcePages = new Map<string, number>();
  for (const r of conversations) {
    const name = r.source_page ? (() => {
      try { return new URL(r.source_page).pathname || "/"; } catch { return "Website AI"; }
    })() : "Website AI";
    sourcePages.set(name, (sourcePages.get(name) || 0) + 1);
  }
  return {
    ok: true,
    date: day,
    updatedAt: new Date().toISOString(),
    summary: {
      websiteAiSessions: dailySessions,
      websiteAiMessages: conversations.length,
      twinRelatedMessages: twinMessages,
      submittedContactDetails: contactEntries.size,
      completedOwnerReflections: completedForDay.length,
      scheduledOwnerRecords: recordsForDay.length,
      ownerDictationNotes: notes.length,
      macVoiceNotes: notes.filter(note => note.source === "mac_desktop_commander").length,
      pendingReviewItems: reviewedNextSteps.length,
    },
    sources: {
      websiteAi: "Connected: saved Papa Life AI interactions",
      privateWorkspace: "Connected: Brian's owner-only conversation records",
      ownerDictation: "Connected: private owner dictation and authenticated Mac voice recaps (when delivered)",
      macVoice: process.env.PAPA_REPORT_MAC_RELAY_TOKEN && process.env.PAPA_MAC_OWNER_EMAIL ? "Configured: authenticated Mac voice relay" : "Mac voice relay awaits connection and owner binding",
      email: "Not connected to this report",
      calendar: "Not connected to this report",
      phoneAndVoice: "Direct phone call recording is not connected",
      socialNetworks: "Not connected to this report",
      goHighLevel: "Not connected to this report",
    },
    websiteActivity: Array.from(sourcePages.entries()).map(([page, messages]) => ({ page, messages }))
      .sort((a, b) => b.messages - a.messages).slice(0, 10),
    submittedContacts: Array.from(contactEntries.values()).slice(0, 12),
    ownerConversations: recordsForDay.slice(0, 20),
    nextStepsForReview: reviewedNextSteps.map(r => ({ person: r.person, steps: r.steps, date: r.date })),
    dictatedNotes: notes,
    note: "Figures count saved website interactions and explicitly submitted private owner voice recaps. Email, calendar, phone calls, optional voice providers, social, and GoHighLevel are not inferred. Contact details do not authorize outreach.",
  };
}

export function installPapaOutreachDailyRoutes(app: Express, db: Database, requireAuth: RequestHandler): void {
  ensurePapaOutreachCapture(db);
  ensureAiBossMobileTables(db);
  app.get("/api/admin/papa-outreach/daily", requireAuth, (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const day = String(req.query.date || new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date()));
    if (!isDay(day)) { res.status(400).json({ ok: false, error: "Provide a valid YYYY-MM-DD date." }); return; }
    try {
      const owner = Number((req.session as any).adminId);
      res.json(getPapaOutreachDaily(db, owner, day));
    } catch {
      res.status(500).json({ ok: false, error: "Daily outreach report could not be loaded." });
    }
  });

  // This is the OWNER'S primary voice path: Mac mini/Desktop Commander and the already-selected
  // Brian Keith Hill voice identity, never ElevenLabs autoplay or unapproved remote speech synthesis.
  app.get("/api/admin/papa-outreach/voice-status", requireAuth, (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const mac = getAiBossNodes(db, 90).find(node => node.node_id === "brian-mac-mini" && node.node_kind === "mac");
      const tokenConfigured = String(process.env.PAPA_REPORT_MAC_RELAY_TOKEN || "").length >= 32;
      const ownerConfigured = Boolean(String(process.env.PAPA_MAC_OWNER_EMAIL || "").trim());
      res.json({
        ok: true,
        primary: "mac-mini-desktop-commander",
        macHeartbeatOnline: Boolean(mac?.online),
        macLastSeenAt: mac?.last_seen_at || null,
        macDisplayName: mac?.display_name || "Brian's Mac mini",
        macRelayReady: tokenConfigured && ownerConfigured,
        voiceIdentity: "Brian Keith Hill",
        selectedVoiceProvider: "HeyGen (owner-selected voice ID)",
        voiceIdConfigured: Boolean(process.env.PAPA_HEYGEN_VOICE_ID || process.env.BRIAN_HEYGEN_VOICE_ID),
        providerVoiceValidated: false,
        elevenLabsAutoStart: false,
        message: "Mac mini is the primary voice and data connector. A Mac heartbeat is not proof of microphone or Desktop Commander readiness. HeyGen speech rendering is a separate, explicitly invoked service."
      });
    } catch {
      res.status(500).json({ ok: false, error: "Mac voice status unavailable" });
    }
  });

  // Outbound-only Mac -> cloud submission of authorized speech-to-text summaries.
  // Never accepts audio, reads the microphone, runs tasks, or messages a father.
  app.post("/api/papa-life/mac-voice/outreach", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const secret = String(process.env.PAPA_REPORT_MAC_RELAY_TOKEN || "");
    const ownerEmail = String(process.env.PAPA_MAC_OWNER_EMAIL || "").trim();
    if (secret.length < 32 || !ownerEmail) {
      res.status(503).json({ ok: false, error: "Mac voice relay is not configured" });
      return;
    }
    const supplied = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    const expectedBytes = Buffer.from(secret, "utf8");
    const actualBytes = Buffer.from(supplied, "utf8");
    if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(expectedBytes, actualBytes)) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    const sourceRef = typeof req.body?.source_ref === "string" ? req.body.source_ref.trim() : "";
    if (req.body?.source !== "mac_desktop_commander" || req.body?.authorized_to_store !== true ||
        note.length < 2 || note.length > 6000 ||
        !/^[a-zA-Z0-9_.:-]{8,128}$/.test(sourceRef) ||
        Object.keys(req.body || {}).some(key => !["source", "source_ref", "note", "authorized_to_store"].includes(key))) {
      res.status(400).json({ ok: false, error: "Valid authorized Mac transcript summary required" });
      return;
    }
    try {
      const owners = db.prepare("SELECT id FROM admin_users WHERE lower(email) = lower(?) LIMIT 2").all(ownerEmail) as Array<{id:number}>;
      if (owners.length !== 1) {
        res.status(503).json({ ok: false, error: "Mac relay owner account has not been uniquely verified" });
        return;
      }
      const owner = owners[0].id;
      const result = db.prepare(`INSERT INTO papa_owner_outreach_notes
        (id,owner_id,note,source,source_ref) VALUES (?,?,?,?,?)
        ON CONFLICT(owner_id,source_ref) WHERE source_ref IS NOT NULL DO NOTHING`)
        .run(randomUUID(), owner, note, "mac_desktop_commander", sourceRef);
      res.json({
        ok: true, accepted: result.changes === 1, duplicate: result.changes === 0,
        message: "Mac voice recap filed in the owner's private outreach report. No outreach was sent."
      });
    } catch {
      res.status(500).json({ ok: false, error: "Mac voice recap could not be saved" });
    }
  });

  app.post("/api/admin/papa-outreach/quick-note", requireAuth, (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    if (note.length < 2 || note.length > 6000) {
      res.status(400).json({ ok: false, error: "Dictate a note between 2 and 6000 characters." }); return;
    }
    try {
      const id = randomUUID();
      const owner = Number((req.session as any).adminId);
      db.prepare("INSERT INTO papa_owner_outreach_notes (id,owner_id,note) VALUES (?,?,?)").run(id, owner, note);
      res.json({ ok: true, id, message: "Private note recorded. No messages or reminders were sent." });
    } catch {
      res.status(500).json({ ok: false, error: "Private note could not be saved. Keep the note open and retry." });
    }
  });
}
