import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import {
  ensureResearchTables,
  createResearchDump,
  listResearchDumps,
  getResearchDumpById,
  setDumpAnalysis,
  deleteSocialSuggestionsForDump,
  insertSocialSuggestion,
  listSocialSuggestions,
  updateSuggestionStatus,
} from "./research-store";
import { analyzeResearchNotes, generateSocialPack } from "./research-ai";
import { assertResearchLabMcpEnabled } from "./research-access";
import {
  ensureSiteCtasTable,
  listSiteCtasAdmin,
  upsertSiteCta,
  deleteSiteCta,
} from "./site-ctas-store";
import {
  ensureSiteMediaTable,
  listSiteMediaAdmin,
  upsertSiteMedia,
  deleteSiteMedia,
} from "./site-media-store";
import {
  ensurePricingSettingsTable,
  getPricingSettings,
  updatePricingSettings,
} from "./pricing-store";
import { syncIntakeSubmissionToCrmLead } from "./sync-intake-to-crm";
import {
  bossmobileHeygenGuide,
  bossmobileHeygenListAvatars,
  bossmobileHeygenListVoices,
  bossmobileHeygenFetchPage,
  bossmobileHeygenScriptFromPages,
  bossmobileHeygenScriptFromText,
  bossmobileHeygenVideoAgent,
  bossmobileHeygenVideoStatus,
} from "./heygen-mcp";
import { bossmobilePublishVideoPlaybook } from "./heygen-publish";
import { normalizeLessonContent } from "./lesson-content-normalize";
import {
  ensureGhlAutomationTables,
  parseGhlContactPayload,
  processGhlNewContact,
  claudePapaComplete,
  listGhlContactAlerts,
  markGhlAlertRead,
  automationStatusPayload,
  forwardAlertToCloud,
  cloudWebhookUrl,
} from "./ghl-automation";
import { ghlMoveOpportunityStage, ghlNurtureSmsSend, getGhlCredentialsForMcp } from "./ghl-api";

const dbPath = path.resolve(process.cwd(), "leads.db");
const db = new Database(dbPath);
ensureResearchTables(db);
ensureSiteCtasTable(db);
ensureSiteMediaTable(db);
ensurePricingSettingsTable(db);

type TableInfoRow = {
  name: string;
  notnull: number;
};

function ensureIntakeSubmissionContactSchema(): void {
  const cols = db.prepare("PRAGMA table_info(intake_submissions)").all() as TableInfoRow[];
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

export type PapalifeToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export const PAPALIFE_MCP_TOOL_DEFINITIONS: PapalifeToolDef[] = [
  {
    name: "get_site_endpoints",
    description: "Return public URLs for Papalife site and MCP endpoint.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "papalife_automation_status",
    description:
      "GHL + Make.com automation map for Brian: Scenario 5259259 (new contact → note), Scenario 5259335 (MCP → Claude), webhook URLs, and voice-mode instructions for Claude Desktop.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "papalife_claude_complete",
    description:
      "Cloud round-trip inbound: same as POST /api/automation/claude-prompt with body {\"prompt\":\"...\"}. Returns { ok, prompt, response, model, voice: papa_life }.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Required — what Claude should process" },
        context: { type: "string", description: "Optional CRM/GHL context prepended" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "papalife_forward_alert_to_cloud",
    description:
      "POST outbound JSON webhook to AUTOMATION_CLOUD_WEBHOOK_URL (Make Scenario 5259335). Includes prompt + contact + inbound.claude_prompt_url for back-and-forth.",
    inputSchema: {
      type: "object",
      properties: {
        alert_id: { type: "number", description: "ghl_contact_alerts.id from papalife_process_ghl_new_contact" },
      },
      required: ["alert_id"],
    },
  },
  {
    name: "papalife_get_webhook_contract",
    description: "Return the JSON webhook contract (outbound + inbound {\"prompt\"} format) for Brian's cloud / Make setup.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "papalife_process_ghl_new_contact",
    description:
      "Process a new GoHighLevel contact: sync to site CRM leads, generate outreach note + voice_prompt for Brian's Claude voice chat. Use when GHL fires or Make forwards contact JSON.",
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
        outreach_note: { type: "string", description: "Skip regeneration if Make Scenario 1 already wrote the note" },
      },
    },
  },
  {
    name: "papalife_list_ghl_contact_alerts",
    description:
      "List unread GHL new-contact alerts with voice_prompt — Brian's Claude reads these in voice mode when a new lead lands.",
    inputSchema: {
      type: "object",
      properties: {
        unread_only: { type: "boolean", description: "Default true" },
        limit: { type: "number" },
        mark_read_ids: {
          type: "array",
          items: { type: "number" },
          description: "Optional alert ids to mark read after Brian reviews",
        },
      },
    },
  },
  {
    name: "papalife_ghl_move_opportunity_stage",
    description:
      "Move a GHL opportunity to a new pipeline stage (Brian's GHL token on this server). Pass id/opportunity_id + pipelineStageId/pipeline_stage_id.",
    inputSchema: {
      type: "object",
      properties: {
        opportunity_id: { type: "string" },
        id: { type: "string", description: "Alias for opportunity_id" },
        pipeline_stage_id: { type: "string" },
        pipelineStageId: { type: "string" },
        pipeline_id: { type: "string" },
        status: { type: "string", description: "open, won, lost, abandoned" },
      },
    },
  },
  {
    name: "papalife_nurture_sms_send",
    description:
      "Send nurture SMS via GHL conversations API (not Twilio). Uses the token Brian saves in CRM → Settings (SMS scope required on the PIT).",
    inputSchema: {
      type: "object",
      properties: {
        ghl_contact_id: { type: "string" },
        contact_id: { type: "string" },
        body: { type: "string" },
        dry_run: { type: "boolean" },
      },
      required: ["body"],
    },
  },
  {
    name: "bossmobile_research_workflow_brief",
    description:
      "IMPORTANT for Boss Mobile / PAPA Life: Read this first when the user pastes huge research notes. Explains the Research Lab workflow — do NOT ask the team to read raw note dumps; guide them to capture notes in the app, analyze, then generate social content.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "papalife_course_content_workflow_brief",
    description:
      "CRITICAL for PAPA Life curriculum / Vision Documents: Read this before suggesting any handoff. Tells agents to put learning materials into the on-site courses/lessons system (MCP) so members see them in /portal — NOT to email Google Doc Master KB update steps or ask humans to paste Vision docs into external docs as the delivery path.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_brand_research_dump",
    description:
      "Save a large research / planning note dump (Boss Mobile / PAPA Life). Replaces emailing walls of text. Then call analyze_brand_research_dump.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short label for this capture" },
        raw_notes: { type: "string", description: "Full pasted notes (can be very long)" },
      },
      required: ["raw_notes"],
    },
  },
  {
    name: "list_brand_research_dumps",
    description: "List recent research captures (title, size, analysis status).",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "get_brand_research_dump",
    description: "Get one dump by id. Set include_raw true only when necessary (large payload).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        include_raw: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "analyze_brand_research_dump",
    description:
      "Run AI summary + theme extraction on a dump (server uses ANTHROPIC_API_KEY / Claude). Produces executive summary for social generation.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"],
    },
  },
  {
    name: "generate_social_from_research_dump",
    description:
      "After analysis: generate draft social posts (Instagram, LinkedIn, Facebook, X, YouTube Shorts ideas). Optional replace=true clears prior drafts for that dump.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "e.g. instagram, linkedin, facebook, x, youtube_shorts",
        },
        replace: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_social_suggestions_for_dump",
    description: "List generated social post drafts linked to a research dump.",
    inputSchema: {
      type: "object",
      properties: { dump_id: { type: "number" } },
      required: ["dump_id"],
    },
  },
  {
    name: "approve_social_suggestion",
    description: "Mark a draft as approved, rejected, or posted after human review.",
    inputSchema: {
      type: "object",
      properties: {
        suggestion_id: { type: "number" },
        status: { type: "string", description: "draft | approved | rejected | posted" },
      },
      required: ["suggestion_id", "status"],
    },
  },
  {
    name: "site_cta_placement_guide",
    description:
      "Lists placement keys for site_ctas — use with upsert_site_cta so CTAs appear on the public site and member learning areas.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_site_ctas",
    description: "List marketing CTAs (optional filter by placement).",
    inputSchema: {
      type: "object",
      properties: { placement: { type: "string", description: "Filter by single placement key" } },
    },
  },
  {
    name: "get_pricing_structure",
    description:
      "Get current pricing config used by public checkout and member trial/billing flows.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "update_pricing_structure",
    description:
      "Update pricing config so Boss can change it via MCP agents without dev changes.",
    inputSchema: {
      type: "object",
      properties: {
        member_trial_hours: { type: "number", description: "Trial duration in hours (e.g. 24)" },
        member_price_usd_cents: { type: "number", description: "Price in cents (e.g. 499 for $4.99)" },
        member_currency: { type: "string", description: "ISO currency code (e.g. usd)" },
        member_product_name: { type: "string", description: "Checkout product label" },
        member_stripe_price_id: {
          type: "string",
          description: "Stripe price id for Checkout (optional; leave blank to use inline amount)",
        },
        checkout_payment_link: {
          type: "string",
          description: "Public strategist checkout link shown in forms",
        },
      },
    },
  },
  {
    name: "upsert_site_cta",
    description:
      "Create or update a CTA block. Omit id to create. variant: amber | outline | minimal. active defaults true.",
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
        sort_order: { type: "number" },
      },
      required: ["placement"],
    },
  },
  {
    name: "delete_site_cta",
    description: "Delete a site CTA by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"],
    },
  },
  {
    name: "site_media_placement_guide",
    description:
      "Lists MCP-managed site media slots. Use upsert_site_media to swap campaign video/image assets without code changes.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_site_media",
    description: "List MCP-managed site media slots (optional filter by placement).",
    inputSchema: {
      type: "object",
      properties: { placement: { type: "string", description: "Filter by single placement key" } },
    },
  },
  {
    name: "upsert_site_media",
    description:
      "Create or update a site media slot. Placements: home_plan_video, home_framework_image (image), papa_journey_video_top (funnel hero, before copy), papa_journey_video_assessment (above self-assessment CTA), papa_journey_video_membership (above $4.99 join CTA). Use direct video URL (/media/file.mp4, CDN mp4, HeyGen mp4) or embed URL with media_type 'embed'.",
    inputSchema: {
      type: "object",
      properties: {
        placement: { type: "string" },
        media_url: { type: "string", description: "Direct media URL. Use /media/... after admin upload for hosted files." },
        media_type: { type: "string", description: "video | image. Defaults to video." },
        poster_url: { type: "string", description: "Optional poster image shown before play." },
        alt_text: { type: "string", description: "Accessible label for the media." },
        title: { type: "string", description: "Internal campaign/media title." },
        active: { type: "boolean" },
      },
      required: ["placement", "media_url"],
    },
  },
  {
    name: "delete_site_media",
    description: "Delete a site media slot by placement.",
    inputSchema: {
      type: "object",
      properties: { placement: { type: "string" } },
      required: ["placement"],
    },
  },
  {
    name: "get_intake_submissions",
    description: "List recent strategist intake submissions.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
    },
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
        vision: { type: "string" },
      },
      required: ["first_name", "situation", "routed_pillar"],
    },
  },
  {
    name: "log_engagement_event",
    description: "Log an engagement event and keep conversion pipeline synced.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string" },
        event_type: { type: "string" },
        event_detail: { type: "string" },
      },
      required: ["email", "event_type"],
    },
  },
  {
    name: "get_content_tree",
    description:
      "Return courses with nested lessons and drip metadata. Call first when aligning Vision Documents or curriculum to existing site content.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_course",
    description:
      "Create a new learning course. Primary delivery path for program material (e.g. Papa Life Relationship Reset, Vision 1–16 series): members see it in /portal; public marketing list at /courses when show_in_catalog is true.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        pillar: { type: "string" },
        sort_order: { type: "number" },
        show_in_catalog: { type: "boolean", description: "If true (default), course appears on public /courses marketing catalog." },
      },
      required: ["title"],
    },
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
        show_in_catalog: { type: "boolean" },
      },
      required: ["course_id"],
    },
  },
  {
    name: "create_lesson",
    description:
      "Create a lesson under a course. Map each Vision Document or module to a lesson; use description for text outline. Set content_url after uploading media via admin POST /api/admin/upload (see get_site_endpoints).",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number" },
        title: { type: "string" },
        description: { type: "string" },
        content_url: { type: "string" },
        content_type: { type: "string" },
        duration_minutes: { type: "number" },
        sort_order: { type: "number" },
      },
      required: ["course_id", "title"],
    },
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
        sort_order: { type: "number" },
      },
      required: ["lesson_id"],
    },
  },
  {
    name: "delete_lesson",
    description: "Delete a lesson by id.",
    inputSchema: {
      type: "object",
      properties: {
        lesson_id: { type: "number" },
      },
      required: ["lesson_id"],
    },
  },
  {
    name: "set_drip_rule",
    description: "Set or update drip-release rule for lesson.",
    inputSchema: {
      type: "object",
      properties: {
        lesson_id: { type: "number" },
        release_days_after_enroll: { type: "number" },
      },
      required: ["lesson_id", "release_days_after_enroll"],
    },
  },
  {
    name: "publish_content",
    description: "Snapshot current course/lesson structure as a published version.",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number" },
        summary: { type: "string" },
      },
      required: ["course_id"],
    },
  },
  {
    name: "get_member_progress",
    description: "Return member lesson completion and percent for each course.",
    inputSchema: {
      type: "object",
      properties: {
        member_id: { type: "number" },
      },
      required: ["member_id"],
    },
  },
  {
    name: "get_journal_prompts",
    description: "List journal prompts editable by admins.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_journal_prompt",
    description: "Create a new journal prompt.",
    inputSchema: {
      type: "object",
      properties: {
        pillar: { type: "string" },
        prompt_text: { type: "string" },
        sort_order: { type: "number" },
      },
      required: ["pillar", "prompt_text"],
    },
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
        sort_order: { type: "number" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_journal_prompt",
    description: "Delete a journal prompt.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
      },
      required: ["id"],
    },
  },
  {
    name: "get_form_schema",
    description: "Return editable form question schema for a form key.",
    inputSchema: {
      type: "object",
      properties: {
        form_key: { type: "string" },
      },
      required: ["form_key"],
    },
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
        active: { type: "boolean" },
      },
      required: ["form_key", "question_key", "label"],
    },
  },
  {
    name: "delete_form_question",
    description: "Delete a form question from a form schema.",
    inputSchema: {
      type: "object",
      properties: {
        form_key: { type: "string" },
        question_key: { type: "string" },
      },
      required: ["form_key", "question_key"],
    },
  },
  {
    name: "get_members",
    description: "List member accounts and portal status.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
    },
  },
  {
    name: "set_member_portal_access",
    description: "Enable/disable member portal login access.",
    inputSchema: {
      type: "object",
      properties: {
        member_id: { type: "number" },
        active: { type: "boolean" },
      },
      required: ["member_id", "active"],
    },
  },
  {
    name: "get_member_course_access",
    description: "Get all courses and whether the member can access each one.",
    inputSchema: {
      type: "object",
      properties: {
        member_id: { type: "number" },
      },
      required: ["member_id"],
    },
  },
  {
    name: "set_member_course_access",
    description: "Grant or revoke member access to a specific course.",
    inputSchema: {
      type: "object",
      properties: {
        member_id: { type: "number" },
        course_id: { type: "number" },
        granted: { type: "boolean" },
      },
      required: ["member_id", "course_id", "granted"],
    },
  },

  // ── HeyGen Video Tools ──────────────────────────────────────────────────────
  {
    name: "bossmobile_heygen_guide",
    description:
      "IMPORTANT: Read this first before using HeyGen tools. Returns the full video pipeline guide — covers site pages, Google Drive docs, agent session notes, Research Lab dumps as script sources, plus avatar/voice setup.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "bossmobile_heygen_list_avatars",
    description: "List HeyGen studio avatars and talking photos (your trained faces). GET /v2/avatars.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "bossmobile_heygen_list_voices",
    description: "List HeyGen AI voices including clones. GET /v2/voices.",
    inputSchema: {
      type: "object",
      properties: {
        name_contains: { type: "string", description: "Filter voices by name (case-insensitive)" },
        limit: { type: "number", description: "Max results (1-500, default 400)" },
      },
    },
  },
  {
    name: "bossmobile_heygen_fetch_page",
    description: "Fetch a page from bossmobilelifecoach.com and strip HTML to plain text for script grounding.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Page path, e.g. / or /courses" },
      },
      required: ["path"],
    },
  },
  {
    name: "bossmobile_heygen_script_from_pages",
    description:
      "Generate spoken narration script from one or more site pages. Claude writes a HeyGen-ready script grounded in the page content. Requires ANTHROPIC_API_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        paths: { type: "array", items: { type: "string" }, description: "Array of site paths like [\"/\", \"/courses\"]" },
        goal: { type: "string", description: "What the video should achieve" },
        duration_seconds_hint: { type: "number", description: "Target duration in seconds (default 45)" },
        tone: { type: "string", description: "Tone guidance (default: warm, mentor-like, conversational)" },
        max_chars: { type: "number", description: "Max chars per page excerpt (default 4500)" },
      },
      required: ["paths"],
    },
  },
  {
    name: "bossmobile_heygen_script_from_text",
    description:
      "Generate spoken narration script from raw text — paste Google Drive doc content, agent session notes, lesson outlines, or any text. Claude converts it to a HeyGen-ready spoken script. Requires ANTHROPIC_API_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Raw text to convert — Google Drive doc export, agent session notes, lesson outline, etc." },
        goal: { type: "string", description: "What the video should achieve" },
        duration_seconds_hint: { type: "number", description: "Target duration in seconds (default 60)" },
        tone: { type: "string", description: "Tone guidance (default: warm, mentor-like, conversational)" },
        source_label: { type: "string", description: "Label for the source (e.g. 'Vision Doc 3', 'Google Drive export', 'agent session')" },
      },
      required: ["text"],
    },
  },
  {
    name: "bossmobile_heygen_video_agent",
    description:
      "Create a video via HeyGen Video Agent v3. Pass the script as prompt. Uses the Brian Keith Hill voice guard; any non-Brian voice_id fails. Requires HEYGEN_API_KEY.",
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
        style_id: { type: "string", description: "HeyGen style ID" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "bossmobile_heygen_video_status",
    description: "Poll HeyGen video generation status. GET /v3/videos/{video_id}. Returns video_url when completed.",
    inputSchema: {
      type: "object",
      properties: {
        video_id: { type: "string", description: "Video ID from bossmobile_heygen_video_agent" },
      },
      required: ["video_id"],
    },
  },
  {
    name: "bossmobile_lesson_set_content_url",
    description:
      "Smart setter — give it any lesson URL (YouTube watch/short/embed, HeyGen embed, Google Drive share/view, direct .mp4/.mp3/.pdf, or /media/ upload) and it normalizes to the canonical form the site's LessonMediaPlayer expects (YouTube → /embed/{id}, Drive → /file/d/{id}/preview, HeyGen embed → pass-through) and writes content_url + content_type onto the lesson. Prefer this over update_lesson when attaching new media — it guarantees the right format so the player renders correctly.",
    inputSchema: {
      type: "object",
      properties: {
        lesson_id: { type: "number", description: "Lesson id" },
        url: { type: "string", description: "Any lesson URL (YouTube, HeyGen, Drive, direct file, /media/ upload)" },
        content_type_hint: {
          type: "string",
          description: "Optional override: 'video', 'audio', 'pdf', or 'document'. Only used when the URL itself is ambiguous (e.g. Drive or /media/).",
        },
      },
      required: ["lesson_id", "url"],
    },
  },
  {
    name: "bossmobile_lessons_normalize_all",
    description:
      "Scan every lesson with a non-empty content_url and show what would change if normalized to the player's expected format. Dry-run by default (dry_run=true). Set dry_run=false to actually apply the updates. Use this to fix legacy YouTube watch URLs, Google Drive share URLs, etc., in one pass.",
    inputSchema: {
      type: "object",
      properties: {
        dry_run: { type: "boolean", description: "Default true — preview changes without writing" },
      },
    },
  },
  {
    name: "bossmobile_publish_video_playbook",
    description:
      "End-to-end publishing playbook: HeyGen → YouTube (via the caller's own Composio YouTube connection) → embed into a course lesson. Inspects HeyGen status + lesson row and returns the exact next-step playbook with all YouTube upload arguments pre-filled (title/description/tags/category/privacy). Re-call repeatedly while HeyGen renders — response state flips from 'rendering' to 'ready_to_upload' when the MP4 is ready. Brian's agent executes the upload with HIS OWN Composio YouTube connection (YOUTUBE_MULTIPART_UPLOAD_VIDEO). The papalife MCP never touches Composio credentials.",
    inputSchema: {
      type: "object",
      properties: {
        heygen_video_id: {
          type: "string",
          description: "HeyGen video id returned by bossmobile_heygen_video_agent",
        },
        lesson_id: {
          type: "number",
          description: "Destination lesson id — the YouTube embed URL will be written here via update_lesson in step 3",
        },
        title: {
          type: "string",
          description: "Override YouTube title (defaults to the lesson title, max 100 chars)",
        },
        description: {
          type: "string",
          description: "Override YouTube description (defaults to the lesson description)",
        },
        privacy_status: {
          type: "string",
          description: "'public', 'unlisted' (default), or 'private'",
        },
        category_id: {
          type: "string",
          description: "YouTube category id (default '27' Education)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "YouTube tags (defaults to Papa Life / fatherhood coaching)",
        },
      },
      required: ["heygen_video_id", "lesson_id"],
    },
  },
];

function normEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function asPositiveInt(v: unknown, field: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${field} must be a positive integer`);
  return n;
}

export async function handlePapalifeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "papalife_automation_status":
      return automationStatusPayload(db);

    case "papalife_claude_complete": {
      const prompt = String(args.prompt ?? "").trim();
      if (!prompt) throw new Error('prompt is required — use {"prompt":"..."}');
      const context = args.context != null ? String(args.context).trim() : undefined;
      return await claudePapaComplete(prompt, context);
    }

    case "papalife_forward_alert_to_cloud": {
      const alertId = Number(args.alert_id);
      if (!Number.isInteger(alertId) || alertId <= 0) throw new Error("alert_id must be a positive integer");
      if (!cloudWebhookUrl()) {
        throw new Error("Set AUTOMATION_CLOUD_WEBHOOK_URL in server .env to Brian's Make custom webhook URL");
      }
      return { ok: true, ...(await forwardAlertToCloud(db, alertId)) };
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
        inbound_response: { ok: true, prompt: "string", response: "string", model: "string", voice: "papa_life" },
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
        outreach_note: args.outreach_note,
      });
      return { ok: true, ...(await processGhlNewContact(db, input)) };
    }

    case "papalife_list_ghl_contact_alerts": {
      const markIds = Array.isArray(args.mark_read_ids)
        ? (args.mark_read_ids as unknown[]).map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
        : [];
      for (const id of markIds) markGhlAlertRead(db, id);
      const alerts = listGhlContactAlerts(db, {
        unread_only: args.unread_only !== false,
        limit: args.limit != null ? Number(args.limit) : 20,
      });
      return {
        ok: true,
        count: alerts.length,
        alerts,
        voice_instruction:
          alerts.length > 0
            ? "Read the newest voice_prompt to Brian in voice mode, then offer to open GHL or draft a follow-up."
            : "No unread GHL alerts.",
      };
    }

    case "papalife_ghl_move_opportunity_stage": {
      const creds = getGhlCredentialsForMcp(db);
      return await ghlMoveOpportunityStage(
        {
          opportunity_id: args.opportunity_id as string | undefined,
          id: args.id as string | undefined,
          pipeline_stage_id: args.pipeline_stage_id as string | undefined,
          pipelineStageId: args.pipelineStageId as string | undefined,
          pipeline_id: args.pipeline_id as string | undefined,
          pipelineId: args.pipelineId as string | undefined,
          status: args.status as string | undefined,
        },
        creds
      );
    }

    case "papalife_nurture_sms_send": {
      const creds = getGhlCredentialsForMcp(db);
      return await ghlNurtureSmsSend(
        {
          ghl_contact_id: args.ghl_contact_id as string | undefined,
          contact_id: args.contact_id as string | undefined,
          body: args.body as string | undefined,
          dry_run: args.dry_run === true,
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
        trainingMediaUpload: "POST /api/admin/upload (session auth) stores files under /media/…; use update_lesson with returned url.",
        notes:
          "Use create_intake_submission and log_engagement_event to persist strategist funnel conversations. GHL automation: papalife_automation_status, papalife_process_ghl_new_contact, papalife_list_ghl_contact_alerts (voice prompts), papalife_claude_complete. Research Lab MCP tools require RESEARCH_LAB_MCP_ENABLED=true; web UI requires RESEARCH_LAB_ADMIN_USERNAMES.",
        courseContentWorkflow:
          "When the user has Vision Documents, curriculum, or new learning modules: call papalife_course_content_workflow_brief first, then get_content_tree → create_course / create_lesson / update_lesson / set_member_course_access. Do NOT instruct the team to email Google Doc Master KB update checklists as the way clients receive materials.",
        researchLabPath: "/research-lab",
        siteCtas:
          "MCP: site_cta_placement_guide, list_site_ctas, upsert_site_cta, delete_site_cta. Public: GET /api/ctas?placement=KEY",
        siteMedia:
          "MCP: site_media_placement_guide, list_site_media, upsert_site_media, delete_site_media. Public: GET /api/site-media?placement=KEY. home_plan_video; home_framework_image (image); papa_journey_video_top | papa_journey_video_assessment | papa_journey_video_membership on /papa-journey.",
        pricing:
          "MCP: get_pricing_structure, update_pricing_structure to change trial hours, member price, Stripe price id, and checkout link without developer edits.",
      };
    }

    case "bossmobile_research_workflow_brief": {
      assertResearchLabMcpEnabled();
      return {
        title: "Boss Mobile / PAPA Life — Research to social (stop sending raw note walls)",
        steps: [
          "1) Acknowledge: 'We have a large plan and a large note set — great. The team will not read pages of raw notes in chat.'",
          "2) Direct them to the Research Lab in the admin CRM (/research-lab) OR use MCP: create_brand_research_dump with title + full raw_notes.",
          "3) Run analyze_brand_research_dump — get executive summary + themes (server needs ANTHROPIC_API_KEY or CLAUDE_API_KEY for Claude).",
          "4) Run generate_social_from_research_dump — get platform-specific drafts.",
          "5) Review drafts with approve_social_suggestion (approved → posted when they publish).",
          "6) Encourage: 'Your research is fuel — now we turn it into content that moves the brand.'",
        ],
        agentInstructions:
          "Always steer the user away from dumping unstructured notes to people. Offer to create the dump for them via MCP, run analysis, then generate social content. Be proactive: suggest the next tool call.",
        tone: "Supportive, firm about process — the goal is consistent social output, not more unread documents.",
      };
    }

    case "papalife_course_content_workflow_brief": {
      return {
        title: "PAPA Life — Vision / curriculum → site courses (stop email & Google Doc handoffs)",
        problem:
          "A common mistake is telling the team to paste Vision Documents into an external 'Master Knowledge Base' Google Doc, email version bumps, or attach Word files — that does not put learning materials where paying members consume them.",
        correctDelivery:
          "Client-facing learning lives in this app: SQLite courses + lessons, member playback at /portal, optional public catalog at /courses when show_in_catalog is true.",
        doNot: [
          "Do NOT output step-by-step instructions for the user to email someone to update Google Docs (e.g. 'SECTION: PAPA LIFE — 16 VISION DOCUMENTS', 'update title to v18', 'confirm by email').",
          "Do NOT treat external KB versioning as the substitute for create_course / create_lesson.",
          "Do NOT assume the operator will manually sync docs — use MCP tools or Dashboard to persist structure.",
        ],
        doInstead: [
          "Call get_content_tree to see existing courses and lessons.",
          "create_course (or update_course) for the program; set show_in_catalog if it should appear on /courses.",
          "For each Vision or module: create_lesson with title matching the Vision name; put summary or script in description; upload video/audio/PDF via POST /api/admin/upload (admin session) then update_lesson with content_url and content_type.",
          "Use set_member_course_access when specific members should (or should not) see a course.",
          "Optional: publish_content to snapshot a version; use upsert_site_cta (placement e.g. member_courses) to highlight the new program.",
          "Optional archival for long research: create_brand_research_dump is for Research Lab / social — not a replacement for lessons.",
        ],
        agentInstructions:
          "When the user shares Vision Documents or curriculum text, your job is to land it in the course system. If you cannot call tools, give them exact MCP tool names and field mapping (Vision N → lesson title), not an email template to the team. Prefer get_site_endpoints for URLs and upload notes.",
        tone: "Decisive — the site is the source of truth for what members see.",
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
        message:
          "Captured. Next: analyze_brand_research_dump with this id, then generate_social_from_research_dump. Tell the user their notes are safely stored — no one needs the wall of text in email.",
      };
    }

    case "list_brand_research_dumps": {
      assertResearchLabMcpEnabled();
      const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 200);
      return { dumps: listResearchDumps(db, limit) };
    }

    case "get_brand_research_dump": {
      assertResearchLabMcpEnabled();
      const id = asPositiveInt(args.id, "id");
      const includeRaw = args.include_raw === true;
      const dump = getResearchDumpById(db, id, includeRaw);
      if (!dump) throw new Error("dump not found");
      const suggestions = listSocialSuggestions(db, id);
      return { dump, suggestions };
    }

    case "analyze_brand_research_dump": {
      assertResearchLabMcpEnabled();
      const id = asPositiveInt(args.id, "id");
      const full = getResearchDumpById(db, id, true) as { raw_notes?: string } | undefined;
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
          nextStep: "generate_social_from_research_dump",
        };
      } catch (e) {
        setDumpAnalysis(db, id, "", [], "error", e instanceof Error ? e.message : String(e));
        throw e;
      }
    }

    case "generate_social_from_research_dump": {
      assertResearchLabMcpEnabled();
      const id = asPositiveInt(args.id, "id");
      const full = getResearchDumpById(db, id, true) as {
        raw_notes?: string;
        executive_summary?: string | null;
        themes_json?: string | null;
      } | undefined;
      if (!full || typeof full.raw_notes !== "string") throw new Error("dump not found");
      if (!full.executive_summary?.trim()) {
        throw new Error("Run analyze_brand_research_dump first — no executive summary yet.");
      }
      const themes = full.themes_json ? (JSON.parse(full.themes_json) as string[]) : [];
      const platforms = Array.isArray(args.platforms)
        ? (args.platforms as unknown[]).map((p) => String(p))
        : undefined;
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
          sort_order: order++,
        });
      }
      return {
        ok: true,
        count: pack.length,
        suggestions: listSocialSuggestions(db, id),
        coaching:
          "Give the user 1–3 concrete next actions (e.g. approve two posts, schedule one reel). Remind them: posting beats perfecting.",
      };
    }

    case "list_social_suggestions_for_dump": {
      assertResearchLabMcpEnabled();
      const dump_id = asPositiveInt(args.dump_id, "dump_id");
      return { suggestions: listSocialSuggestions(db, dump_id) };
    }

    case "approve_social_suggestion": {
      assertResearchLabMcpEnabled();
      const suggestion_id = asPositiveInt(args.suggestion_id, "suggestion_id");
      const status = String(args.status ?? "").trim();
      if (!["draft", "approved", "rejected", "posted"].includes(status)) {
        throw new Error("status must be draft, approved, rejected, or posted");
      }
      updateSuggestionStatus(db, suggestion_id, status);
      return { ok: true, suggestion_id, status };
    }

    case "site_cta_placement_guide": {
      return {
        description:
          "Use upsert_site_cta with placement set to one of these keys. Multiple CTAs per placement are ordered by sort_order.",
        placements: [
          { key: "home_below_hero", where: "Public home — directly under hero section" },
          { key: "home_plan", where: "Public home — The Plan / North Star section area" },
          { key: "papa_journey", where: "Papa Journey funnel — after top nav" },
          { key: "strategist", where: "Strategist intake — under hero" },
          { key: "booking", where: "Clarity Session booking — under hero" },
          { key: "theme_matrix", where: "7-Day Theme Matrix — under hero" },
          { key: "operators", where: "Operators page — under hero" },
          { key: "member_home", where: "Member portal — My Journey home" },
          { key: "member_courses", where: "Member portal — Courses / lessons list" },
          { key: "member_lesson", where: "Member portal — under each lesson player" },
          { key: "member_journal", where: "Member portal — Journal tab" },
          { key: "member_brotherhood", where: "Member portal — Brotherhood tab" },
          { key: "member_events", where: "Member portal — Events tab" },
          { key: "member_library", where: "Member portal — Resource Library tab" },
        ],
        variants: ["amber", "outline", "minimal"],
        publicApi: "GET /api/ctas?placement=KEY (no auth)",
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
        member_trial_hours:
          args.member_trial_hours !== undefined ? Number(args.member_trial_hours) : undefined,
        member_price_usd_cents:
          args.member_price_usd_cents !== undefined
            ? Number(args.member_price_usd_cents)
            : undefined,
        member_currency:
          args.member_currency !== undefined ? String(args.member_currency) : undefined,
        member_product_name:
          args.member_product_name !== undefined ? String(args.member_product_name) : undefined,
        member_stripe_price_id:
          args.member_stripe_price_id !== undefined
            ? String(args.member_stripe_price_id)
            : undefined,
        checkout_payment_link:
          args.checkout_payment_link !== undefined
            ? String(args.checkout_payment_link)
            : undefined,
      });
      return { ok: true, pricing: updated };
    }

    case "upsert_site_cta": {
      const id =
        args.id != null && args.id !== ""
          ? asPositiveInt(args.id, "id")
          : undefined;
      const newId = upsertSiteCta(db, {
        id,
        placement: String(args.placement ?? "").trim(),
        headline: "headline" in args ? (args.headline == null ? null : String(args.headline)) : undefined,
        body: "body" in args ? (args.body == null ? null : String(args.body)) : undefined,
        button_label:
          "button_label" in args ? (args.button_label == null ? null : String(args.button_label)) : undefined,
        button_url: "button_url" in args ? (args.button_url == null ? null : String(args.button_url)) : undefined,
        variant: "variant" in args ? String(args.variant ?? "amber").trim() || "amber" : undefined,
        active: "active" in args ? args.active === true : undefined,
        sort_order: "sort_order" in args && args.sort_order != null ? Number(args.sort_order) : undefined,
      });
      return { ok: true, id: newId };
    }

    case "delete_site_cta": {
      const id = asPositiveInt(args.id, "id");
      deleteSiteCta(db, id);
      return { ok: true, id };
    }

    case "site_media_placement_guide": {
      return {
        description:
          "Use upsert_site_media to control media slots without code deploys. Upload files through POST /api/admin/upload when you need a hosted /media/... URL, then set that URL here.",
        placements: [
          {
            key: "home_plan_video",
            where:
              "Public home — right-side media in The Plan / North Star section. Designed for Brian's current offer/campaign video.",
            media_type: "video",
          },
          {
            key: "home_framework_image",
            where:
              "Public home — The coaching framework (#framework): optional hero image above the four pillar cards. Use media_type 'image' and a direct URL (/media/... or CDN).",
            media_type: "image",
          },
          {
            key: "papa_journey_video_top",
            where: "Papa Journey funnel (/papa-journey) — first thing after nav, before any copy.",
            media_type: "video",
            heygen_video_id: "e38b4cf64a5d4cd28250ec23bb29f431",
          },
          {
            key: "papa_journey_video_assessment",
            where: "Papa Journey funnel — directly above the free Father Self-Assessment button (#free-resources).",
            media_type: "video",
            heygen_video_id: "74e4e09eaaf34f34b707fbdb32c6e1e3",
          },
          {
            key: "papa_journey_video_membership",
            where: "Papa Journey funnel — after free resources, above the $4.99/month Join CTA.",
            media_type: "video",
            heygen_video_id: "620433b6b8804cbab11508deafe30f45",
          },
        ],
        publicApi: "GET /api/site-media?placement=KEY (no auth)",
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
        media_type: "media_type" in args ? String(args.media_type ?? "video").trim() || "video" : undefined,
        poster_url: "poster_url" in args ? (args.poster_url == null ? null : String(args.poster_url)) : undefined,
        alt_text: "alt_text" in args ? (args.alt_text == null ? null : String(args.alt_text)) : undefined,
        title: "title" in args ? (args.title == null ? null : String(args.title)) : undefined,
        active: "active" in args ? args.active === true : undefined,
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
      return db
        .prepare(
          `SELECT id, first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision, created_at
           FROM intake_submissions
           ORDER BY id DESC
           LIMIT ?`
        )
        .all(limit);
    }

    case "create_intake_submission": {
      const first_name = String(args.first_name ?? "").trim();
      const email = normEmail(args.email);
      const phone = String(args.phone ?? "").trim();
      const situation = String(args.situation ?? "").trim();
      const routed_pillar = String(args.routed_pillar ?? "").trim();
      const disconnected_pillar =
        args.disconnected_pillar != null ? String(args.disconnected_pillar).trim() : null;
      const vision = args.vision != null ? String(args.vision).trim() : null;

      if (!first_name || !situation || !routed_pillar) {
        throw new Error("first_name, situation, and routed_pillar are required");
      }
      if (!email && !phone) {
        throw new Error("Provide at least one contact method: email or phone");
      }

      const result = db
        .prepare(
          "INSERT INTO intake_submissions (first_name, email, phone, situation, routed_pillar, disconnected_pillar, vision) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run(first_name, email || null, phone || null, situation, routed_pillar, disconnected_pillar, vision);

      if (email) {
        const existing = db
          .prepare("SELECT id FROM conversion_pipeline WHERE email = ?")
          .get(email) as { id?: number } | undefined;

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
          source: "mcp",
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

      const pipeline = db
        .prepare("SELECT id FROM conversion_pipeline WHERE email = ?")
        .get(email) as { id?: number } | undefined;

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
      const courses = db
        .prepare("SELECT * FROM courses ORDER BY sort_order ASC, created_at ASC")
        .all() as Array<Record<string, unknown>>;
      const lessons = db
        .prepare(
          `SELECT l.*, d.release_days_after_enroll
           FROM lessons l
           LEFT JOIN content_drip_rules d ON d.lesson_id = l.id
           ORDER BY l.course_id ASC, l.sort_order ASC, l.created_at ASC`
        )
        .all() as Array<Record<string, unknown>>;

      const byCourse = new Map<number, Array<Record<string, unknown>>>();
      for (const lesson of lessons) {
        const courseId = Number(lesson.course_id);
        const arr = byCourse.get(courseId) ?? [];
        arr.push(lesson);
        byCourse.set(courseId, arr);
      }

      return courses.map((course) => ({
        ...course,
        lessons: byCourse.get(Number(course.id)) ?? [],
      }));
    }

    case "create_course": {
      const title = String(args.title ?? "").trim();
      if (!title) throw new Error("title is required");
      const description = args.description != null ? String(args.description).trim() : null;
      const pillar = args.pillar != null ? String(args.pillar).trim() : "General";
      const sortOrder = Number.isFinite(Number(args.sort_order)) ? Number(args.sort_order) : 0;
      const catalog =
        args.show_in_catalog === false || args.show_in_catalog === 0 ? 0 : 1;
      const result = db
        .prepare("INSERT INTO courses (title, description, pillar, sort_order, show_in_catalog) VALUES (?, ?, ?, ?, ?)")
        .run(title, description, pillar, sortOrder, catalog);
      return { ok: true, course_id: result.lastInsertRowid };
    }

    case "update_course": {
      const courseId = asPositiveInt(args.course_id, "course_id");
      const existing = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId) as
        | Record<string, unknown>
        | undefined;
      if (!existing) throw new Error("course not found");
      const title = args.title != null ? String(args.title).trim() : String(existing.title ?? "");
      const description =
        args.description !== undefined
          ? args.description != null
            ? String(args.description).trim()
            : null
          : (existing.description as string | null);
      const pillar =
        args.pillar !== undefined ? String(args.pillar ?? "").trim() || "General" : String(existing.pillar ?? "General");
      const sortOrder =
        args.sort_order !== undefined ? Number(args.sort_order) : Number(existing.sort_order ?? 0);
      const catalog =
        args.show_in_catalog !== undefined
          ? args.show_in_catalog === false || args.show_in_catalog === 0
            ? 0
            : 1
          : Number((existing as { show_in_catalog?: number }).show_in_catalog ?? 1);
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
      const courseId = asPositiveInt(args.course_id, "course_id");
      const title = String(args.title ?? "").trim();
      if (!title) throw new Error("title is required");
      const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId);
      if (!course) throw new Error("course not found");
      const description = args.description != null ? String(args.description).trim() : null;
      const contentUrl = args.content_url != null ? String(args.content_url).trim() : null;
      const contentType = args.content_type != null ? String(args.content_type).trim() : "video";
      const durationMinutes = args.duration_minutes != null ? Number(args.duration_minutes) : null;
      const sortOrder = Number.isFinite(Number(args.sort_order)) ? Number(args.sort_order) : 0;
      const result = db
        .prepare(
          "INSERT INTO lessons (course_id, title, description, content_url, content_type, duration_minutes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run(courseId, title, description, contentUrl, contentType, durationMinutes, sortOrder);
      return { ok: true, lesson_id: result.lastInsertRowid, course_id: courseId };
    }

    case "update_lesson": {
      const lessonId = asPositiveInt(args.lesson_id, "lesson_id");
      const existing = db.prepare("SELECT * FROM lessons WHERE id = ?").get(lessonId) as
        | Record<string, unknown>
        | undefined;
      if (!existing) throw new Error("lesson not found");
      const title = args.title != null ? String(args.title).trim() : String(existing.title ?? "");
      const description =
        args.description !== undefined
          ? args.description != null
            ? String(args.description).trim()
            : null
          : (existing.description as string | null);
      const contentUrl =
        args.content_url !== undefined
          ? args.content_url != null
            ? String(args.content_url).trim()
            : null
          : (existing.content_url as string | null);
      const contentType =
        args.content_type !== undefined ? String(args.content_type ?? "").trim() || "video" : String(existing.content_type ?? "video");
      const durationMinutes =
        args.duration_minutes !== undefined ? Number(args.duration_minutes) : Number(existing.duration_minutes ?? 0);
      const sortOrder =
        args.sort_order !== undefined ? Number(args.sort_order) : Number(existing.sort_order ?? 0);
      db.prepare(
        "UPDATE lessons SET title = ?, description = ?, content_url = ?, content_type = ?, duration_minutes = ?, sort_order = ? WHERE id = ?"
      ).run(title, description, contentUrl, contentType, durationMinutes, sortOrder, lessonId);
      return { ok: true, lesson_id: lessonId };
    }

    case "delete_lesson": {
      const lessonId = asPositiveInt(args.lesson_id, "lesson_id");
      const existing = db.prepare("SELECT id FROM lessons WHERE id = ?").get(lessonId) as { id?: number } | undefined;
      if (!existing?.id) throw new Error("lesson not found");
      db.prepare("DELETE FROM lessons WHERE id = ?").run(lessonId);
      return { ok: true, lesson_id: lessonId };
    }

    case "set_drip_rule": {
      const lessonId = asPositiveInt(args.lesson_id, "lesson_id");
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
      const courseId = asPositiveInt(args.course_id, "course_id");
      const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId) as
        | Record<string, unknown>
        | undefined;
      if (!course) throw new Error("course not found");
      const lessons = db
        .prepare("SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC, created_at ASC")
        .all(courseId);
      const snapshot = JSON.stringify({ course, lessons });
      const summary = args.summary != null ? String(args.summary).trim() : null;
      const result = db
        .prepare(
          "INSERT INTO content_versions (course_id, summary, snapshot_json, published_at) VALUES (?, ?, ?, datetime('now'))"
        )
        .run(courseId, summary, snapshot);
      return { ok: true, version_id: result.lastInsertRowid, course_id: courseId };
    }

    case "get_member_progress": {
      const memberId = asPositiveInt(args.member_id, "member_id");
      const rows = db
        .prepare(
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
        )
        .all(memberId) as Array<{
        course_id: number;
        course_title: string;
        total_lessons: number;
        completed_lessons: number;
      }>;
      return rows.map((r) => ({
        ...r,
        percent_complete: r.total_lessons > 0 ? Math.round((r.completed_lessons / r.total_lessons) * 100) : 0,
      }));
    }

    case "get_journal_prompts": {
      return db
        .prepare("SELECT id, pillar, prompt_text, sort_order FROM journal_prompts ORDER BY pillar ASC, sort_order ASC, id ASC")
        .all();
    }

    case "create_journal_prompt": {
      const pillar = String(args.pillar ?? "").trim();
      const promptText = String(args.prompt_text ?? "").trim();
      if (!pillar || !promptText) throw new Error("pillar and prompt_text are required");
      const sortOrder = Number.isFinite(Number(args.sort_order)) ? Number(args.sort_order) : 0;
      const result = db
        .prepare("INSERT INTO journal_prompts (pillar, prompt_text, sort_order) VALUES (?, ?, ?)")
        .run(pillar, promptText, sortOrder);
      return { ok: true, id: result.lastInsertRowid };
    }

    case "update_journal_prompt": {
      const id = asPositiveInt(args.id, "id");
      const existing = db.prepare("SELECT * FROM journal_prompts WHERE id = ?").get(id) as
        | Record<string, unknown>
        | undefined;
      if (!existing) throw new Error("journal prompt not found");
      const pillar = args.pillar != null ? String(args.pillar).trim() : String(existing.pillar ?? "");
      const promptText =
        args.prompt_text != null ? String(args.prompt_text).trim() : String(existing.prompt_text ?? "");
      const sortOrder =
        args.sort_order !== undefined ? Number(args.sort_order) : Number(existing.sort_order ?? 0);
      db.prepare("UPDATE journal_prompts SET pillar = ?, prompt_text = ?, sort_order = ? WHERE id = ?").run(
        pillar,
        promptText,
        sortOrder,
        id
      );
      return { ok: true, id };
    }

    case "delete_journal_prompt": {
      const id = asPositiveInt(args.id, "id");
      db.prepare("DELETE FROM journal_prompts WHERE id = ?").run(id);
      return { ok: true, id };
    }

    case "get_form_schema": {
      const formKey = String(args.form_key ?? "").trim();
      if (!formKey) throw new Error("form_key is required");
      const rows = db
        .prepare(
          `SELECT form_key, question_key, label, help_text, input_type, required, sort_order, placeholder, options_json, active
           FROM form_questions
           WHERE form_key = ?
           ORDER BY sort_order ASC, question_key ASC`
        )
        .all(formKey) as Array<Record<string, unknown>>;
      return rows.map((row) => ({
        ...row,
        required: Number(row.required) === 1,
        active: Number(row.active) === 1,
        options: row.options_json ? JSON.parse(String(row.options_json)) : [],
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
      return db
        .prepare(
          `SELECT id, first_name, last_name, email, status, enrolled_at, created_at
           FROM members
           ORDER BY created_at DESC
           LIMIT ?`
        )
        .all(limit);
    }

    case "set_member_portal_access": {
      const memberId = asPositiveInt(args.member_id, "member_id");
      const active = args.active === true;
      const existing = db.prepare("SELECT id FROM members WHERE id = ?").get(memberId);
      if (!existing) throw new Error("member not found");
      db.prepare("UPDATE members SET status = ? WHERE id = ?").run(active ? "active" : "inactive", memberId);
      return { ok: true, member_id: memberId, status: active ? "active" : "inactive" };
    }

    case "get_member_course_access": {
      const memberId = asPositiveInt(args.member_id, "member_id");
      const member = db.prepare("SELECT id FROM members WHERE id = ?").get(memberId);
      if (!member) throw new Error("member not found");
      const rows = db
        .prepare(
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
        )
        .all(memberId, memberId) as Array<Record<string, unknown>>;
      return rows.map((r) => ({ ...r, granted: Number(r.granted) === 1 }));
    }

    case "set_member_course_access": {
      const memberId = asPositiveInt(args.member_id, "member_id");
      const courseId = asPositiveInt(args.course_id, "course_id");
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
        name_contains: args.name_contains as string | undefined,
        limit: args.limit as number | undefined,
      });

    case "bossmobile_heygen_fetch_page":
      return await bossmobileHeygenFetchPage(String(args.path ?? ""));

    case "bossmobile_heygen_script_from_pages":
      return await bossmobileHeygenScriptFromPages({
        paths: args.paths as string[],
        goal: args.goal as string | undefined,
        duration_seconds_hint: args.duration_seconds_hint as number | undefined,
        tone: args.tone as string | undefined,
        max_chars: args.max_chars as number | undefined,
      });

    case "bossmobile_heygen_script_from_text":
      return await bossmobileHeygenScriptFromText({
        text: String(args.text ?? ""),
        goal: args.goal as string | undefined,
        duration_seconds_hint: args.duration_seconds_hint as number | undefined,
        tone: args.tone as string | undefined,
        source_label: args.source_label as string | undefined,
      });

    case "bossmobile_heygen_video_agent":
      return await bossmobileHeygenVideoAgent({
        prompt: String(args.prompt ?? ""),
        mode: args.mode as "generate" | "chat" | undefined,
        avatar_id: args.avatar_id as string | undefined,
        talking_photo_id: args.talking_photo_id as string | undefined,
        voice_id: args.voice_id as string | undefined,
        orientation: args.orientation as "landscape" | "portrait" | undefined,
        callback_url: args.callback_url as string | undefined,
        callback_id: args.callback_id as string | undefined,
        auto_proceed: args.auto_proceed as boolean | undefined,
        style_id: args.style_id as string | undefined,
      });

    case "bossmobile_heygen_video_status":
      return await bossmobileHeygenVideoStatus(String(args.video_id ?? ""));

    case "bossmobile_lesson_set_content_url": {
      const lessonId = asPositiveInt(args.lesson_id, "lesson_id");
      const existing = db
        .prepare("SELECT id, title, content_url, content_type FROM lessons WHERE id = ?")
        .get(lessonId) as
        | { id: number; title: string; content_url: string | null; content_type: string | null }
        | undefined;
      if (!existing) throw new Error("lesson not found");
      const normalized = normalizeLessonContent(
        String(args.url ?? ""),
        existing.content_url,
        (args.content_type_hint as string | undefined) ?? existing.content_type,
      );
      db.prepare(
        "UPDATE lessons SET content_url = ?, content_type = ? WHERE id = ?",
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
            content_type: existing.content_type,
          },
          after: {
            content_url: normalized.content_url,
            content_type: normalized.content_type,
          },
        },
      };
    }

    case "bossmobile_lessons_normalize_all": {
      const dryRun = args.dry_run === undefined ? true : Boolean(args.dry_run);
      const rows = db
        .prepare(
          "SELECT id, title, content_url, content_type FROM lessons WHERE content_url IS NOT NULL AND TRIM(content_url) != '' ORDER BY id",
        )
        .all() as Array<{
        id: number;
        title: string;
        content_url: string;
        content_type: string | null;
      }>;
      const changes: Array<Record<string, unknown>> = [];
      const skipped: Array<Record<string, unknown>> = [];
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
              after: { content_url: norm.content_url, content_type: norm.content_type },
            });
            if (!dryRun) {
              db.prepare(
                "UPDATE lessons SET content_url = ?, content_type = ? WHERE id = ?",
              ).run(norm.content_url, norm.content_type, row.id);
              applied += 1;
            }
          }
        } catch (err) {
          skipped.push({ lesson_id: row.id, title: row.title, reason: String((err as Error).message || err) });
        }
      }
      return {
        dry_run: dryRun,
        scanned: rows.length,
        would_change: changes.length,
        applied: dryRun ? 0 : applied,
        changes,
        skipped,
      };
    }

    case "bossmobile_publish_video_playbook":
      return await bossmobilePublishVideoPlaybook(db, {
        heygen_video_id: String(args.heygen_video_id ?? ""),
        lesson_id: Number(args.lesson_id),
        title: args.title as string | undefined,
        description: args.description as string | undefined,
        privacy_status: args.privacy_status as
          | "public"
          | "unlisted"
          | "private"
          | undefined,
        category_id: args.category_id as string | undefined,
        tags: args.tags as string[] | undefined,
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
