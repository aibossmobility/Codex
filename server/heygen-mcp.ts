const HEYGEN_API = "https://api.heygen.com";
const BRIAN_HEYGEN_VOICE_ID =
  process.env.BRIAN_HEYGEN_VOICE_ID?.trim() || "1d5b92d8097541f881d1be4a061b6559";

const BOSSMOBILE_VOICE =
  "Boss Mobile Life Coach / PAPA Life creates teaching content for men navigating fatherhood, purpose, and personal growth. Be warm, authoritative, and conversational — like a mentor coaching a friend. Speak from real-life experience.";

export const BOSSMOBILE_HEYGEN_GUIDE_MARKDOWN = `## Boss Mobile x HeyGen — Teaching Content Video Pipeline (MCP tools)

Use these tools to turn your **lesson outlines, research dumps, course scripts, Google Drive docs, and agent session notes** into polished avatar videos for the PAPA Life curriculum.

### Content sources for video scripts

1. **Site pages** — fetch any page from bossmobilelifecoach.com with \`bossmobile_heygen_fetch_page\`.
2. **Course / lesson content** — call \`get_content_tree\` to see your curriculum, then reference lesson descriptions in your script prompt.
3. **Research dumps** — call \`get_brand_research_dump\` (with \`include_raw: true\`) to pull raw notes and executive summaries from the Research Lab.
4. **Google Drive docs** — paste the shareable link or exported text into \`bossmobile_heygen_script_from_text\` so the AI can turn it into spoken narration.
5. **Agent session notes** — copy conversation highlights or action items from agent chat sessions into \`bossmobile_heygen_script_from_text\` for video scripting.

### Your face (studio avatar, talking photo, or digital twin)

1. Train or upload in the HeyGen app (Instant Avatar, Photo Avatar, Digital Twin, etc.).
2. **bossmobile_heygen_list_avatars** — lists **avatars** (studio looks) and **talking_photos** (photo avatars). Use the IDs you need.
3. **bossmobile_heygen_video_agent** accepts \`avatar_id\` (studio look) or \`talking_photo_id\` (photo avatar).
4. Optional env defaults: **\`HEYGEN_DEFAULT_AVATAR_ID\`**, **\`HEYGEN_DEFAULT_TALKING_PHOTO_ID\`** so you can omit IDs on every call.

### Your voice (including voice clones)

1. **bossmobile_heygen_list_voices** — confirms available voices.
2. **bossmobile_heygen_video_agent** always sends the Brian Keith Hill voice ID. If another \`voice_id\` is passed, the request fails.

### Typical flow

#### Flow A: Site page → script → video
1. \`bossmobile_heygen_fetch_page\` — fetch page text (e.g. \`/\`, \`/courses\`).
2. \`bossmobile_heygen_script_from_pages\` — Claude writes narration from page copy.
3. \`bossmobile_heygen_video_agent\` — create the video.
4. \`bossmobile_heygen_video_status\` — poll until done.

#### Flow B: Paste text (Google Drive, session notes, outline) → script → video
1. \`bossmobile_heygen_script_from_text\` — paste any raw text (a Google Doc export, agent session notes, a lesson outline). Claude converts it to spoken narration.
2. \`bossmobile_heygen_video_agent\` — create the video.
3. \`bossmobile_heygen_video_status\` — poll until done.

#### Flow C: Research dump → script → video
1. \`get_brand_research_dump\` (include_raw: true) — pull existing research.
2. \`bossmobile_heygen_script_from_text\` — feed the raw_notes or executive_summary.
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

/* ── Helpers ────────────────────────────────────────────────── */

function requireHeygenKey(): string {
  const key = process.env.HEYGEN_API_KEY?.trim();
  if (!key) throw new Error("HEYGEN_API_KEY is not configured");
  return key;
}

function heygenDefaultAvatarId(): string | undefined {
  return process.env.HEYGEN_DEFAULT_AVATAR_ID?.trim() || undefined;
}

function heygenDefaultTalkingPhotoId(): string | undefined {
  return process.env.HEYGEN_DEFAULT_TALKING_PHOTO_ID?.trim() || undefined;
}

function requireBrianHeygenVoiceId(): string {
  const configuredDefault = process.env.HEYGEN_DEFAULT_VOICE_ID?.trim() || BRIAN_HEYGEN_VOICE_ID;
  if (configuredDefault !== BRIAN_HEYGEN_VOICE_ID) {
    throw new Error(
      `HEYGEN_DEFAULT_VOICE_ID must match Brian Keith Hill voice ${BRIAN_HEYGEN_VOICE_ID}; got ${configuredDefault}.`,
    );
  }
  return BRIAN_HEYGEN_VOICE_ID;
}

async function heygenJson<T>(path: string): Promise<T> {
  const key = requireHeygenKey();
  const res = await fetch(`${HEYGEN_API}${path}`, {
    headers: { "x-api-key": key },
  });
  const json = (await res.json()) as T & { error?: { message?: string } | string | null };
  if (!res.ok) {
    const msg =
      typeof json.error === "object" && json.error?.message
        ? json.error.message
        : typeof json.error === "string"
          ? json.error
          : res.statusText;
    throw new Error(`HeyGen ${res.status}: ${msg}`);
  }
  return json as T;
}

function requireAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured — needed for script generation");
  return key;
}

function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-20241022";
}

function siteBase(): string {
  const raw = process.env.PUBLIC_MCP_BASE_URL?.trim() || "https://bossmobilelifecoach.com";
  return raw.replace(/\/$/, "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function chatText(system: string, user: string): Promise<string> {
  const key = requireAnthropicKey();
  const model = anthropicModel();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2800,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return (
    json.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("")
      .trim() || ""
  );
}

/* ── Exports ───────────────────────────────────────────────── */

export function bossmobileHeygenGuide() {
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
      "bossmobile_heygen_video_status",
    ],
    env: {
      HEYGEN_API_KEY: "required for HeyGen API",
      ANTHROPIC_API_KEY: "required for script generation (Claude)",
      PUBLIC_MCP_BASE_URL: "optional site origin for page fetch",
      HEYGEN_CALLBACK_URL: "optional default callback_url",
      HEYGEN_DEFAULT_AVATAR_ID: "optional default studio avatar_id",
      HEYGEN_DEFAULT_TALKING_PHOTO_ID: "optional default talking_photo_id (photo avatar)",
      HEYGEN_DEFAULT_VOICE_ID: `Brian Keith Hill voice_id (${BRIAN_HEYGEN_VOICE_ID})`,
      BRIAN_HEYGEN_VOICE_ID: "required Brian Keith Hill voice guard",
    },
  };
}

/** List studio avatars and talking photos. GET /v2/avatars */
export async function bossmobileHeygenListAvatars() {
  type T = {
    data?: {
      avatars?: Array<{
        avatar_id?: string;
        avatar_name?: string;
        gender?: string;
        premium?: boolean;
        default_voice_id?: string | null;
      }>;
      talking_photos?: Array<{
        talking_photo_id?: string;
        talking_photo_name?: string;
      }>;
    };
  };
  const json = await heygenJson<T>("/v2/avatars");
  const avatars = (json.data?.avatars ?? []).map((a) => ({
    avatar_id: a.avatar_id,
    avatar_name: a.avatar_name,
    gender: a.gender,
    premium: a.premium,
    default_voice_id: a.default_voice_id ?? null,
  }));
  const talking_photos = (json.data?.talking_photos ?? []).map((t) => ({
    talking_photo_id: t.talking_photo_id,
    talking_photo_name: t.talking_photo_name,
  }));
  return {
    hint: "Use avatar_id for studio looks. For photo avatar, pass talking_photo_id to bossmobile_heygen_video_agent (or set HEYGEN_DEFAULT_TALKING_PHOTO_ID).",
    avatar_count: avatars.length,
    talking_photo_count: talking_photos.length,
    avatars,
    talking_photos,
  };
}

/** List AI voices (includes clones). GET /v2/voices */
export async function bossmobileHeygenListVoices(args?: {
  name_contains?: string | null;
  limit?: number | null;
}) {
  type T = {
    data?: {
      voices?: Array<{
        voice_id?: string;
        language?: string;
        gender?: string;
        name?: string;
      }>;
    };
  };
  const json = await heygenJson<T>("/v2/voices");
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
      gender: v.gender,
    })),
  };
}

/** Fetch and strip a site page for script grounding */
export async function bossmobileHeygenFetchPage(pagePath: string) {
  const p = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  const url = `${siteBase()}${p}`;
  const res = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "BossMobile-MCP/1.0 (script-prep)",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Fetch ${url} failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const text = stripHtml(html).slice(0, 60000);
  return {
    url,
    status: res.status,
    text_length: text.length,
    text_excerpt: text.slice(0, 12000),
  };
}

/** Generate spoken narration script from site pages */
export async function bossmobileHeygenScriptFromPages(args: {
  paths: string[];
  goal?: string;
  duration_seconds_hint?: number;
  tone?: string;
  max_chars?: number;
}) {
  const paths = Array.isArray(args.paths) ? args.paths.filter(Boolean) : [];
  if (paths.length === 0) throw new Error("paths must be a non-empty array of paths like /about");

  const maxChars = Math.min(Math.max(args.max_chars ?? 4500, 500), 12000);
  const chunks: { path: string; excerpt: string }[] = [];

  for (const path of paths.slice(0, 12)) {
    const row = await bossmobileHeygenFetchPage(path);
    chunks.push({
      path: path.startsWith("/") ? path : `/${path}`,
      excerpt: row.text_excerpt.slice(0, maxChars),
    });
  }

  const bundle = chunks.map((c) => `### ${c.path}\n${c.excerpt}`).join("\n\n");
  const toneLine = args.tone || "warm, mentor-like, conversational, real";

  const system = `${BOSSMOBILE_VOICE}
You write spoken narration for a HeyGen avatar video. Output plain text only — no stage directions in brackets unless essential.
Rules:
- Stay faithful to the source excerpts; do not invent claims.
- Second person ("you") or inclusive "we" — like coaching a friend.
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
    char_count: script.length,
  };
}

/** Generate spoken narration from raw text (Google Drive docs, agent session notes, outlines) */
export async function bossmobileHeygenScriptFromText(args: {
  text: string;
  goal?: string;
  duration_seconds_hint?: number;
  tone?: string;
  source_label?: string;
}) {
  const rawText = (args.text ?? "").trim();
  if (!rawText) throw new Error("text is required — paste Google Drive doc content, agent session notes, or a lesson outline");

  const truncated = rawText.length > 30000;
  const inputText = rawText.slice(0, 30000);
  const toneLine = args.tone || "warm, mentor-like, conversational, real";

  const system = `${BOSSMOBILE_VOICE}
You write spoken narration for a HeyGen avatar video. Output plain text only — no stage directions in brackets unless essential.
Rules:
- Stay faithful to the source text; do not invent claims.
- Second person ("you") or inclusive "we" — like coaching a friend.
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
    char_count: script.length,
  };
}

/** Create video via HeyGen Video Agent v3 */
export async function bossmobileHeygenVideoAgent(args: {
  prompt: string;
  mode?: "generate" | "chat";
  avatar_id?: string | null;
  talking_photo_id?: string | null;
  voice_id?: string | null;
  orientation?: "landscape" | "portrait" | null;
  callback_url?: string | null;
  callback_id?: string | null;
  auto_proceed?: boolean;
  style_id?: string | null;
}) {
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

  const body: Record<string, unknown> = {
    prompt: prompt.slice(0, 10000),
    mode: args.mode || "generate",
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
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as {
    data?: {
      session_id?: string;
      status?: string;
      video_id?: string | null;
      created_at?: number;
    };
    error?: { code?: string; message?: string };
  };

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
      avatar_id_sent: (body.avatar_id as string | undefined) ?? null,
      voice_id_sent: (body.voice_id as string | undefined) ?? null,
      voice_guard: "Brian Keith Hill",
      used_talking_photo_id: Boolean(
        explicitTalking || (!explicitAvatar && !!defaultT && effectiveCharacter === defaultT),
      ),
    },
    poll_hint: data?.video_id
      ? `Call bossmobile_heygen_video_status with video_id "${data.video_id}"`
      : "No video_id yet; check HeyGen dashboard or retry with a shorter prompt",
    next_step: data?.video_id
      ? "After video completes, use update_lesson with content_url = video_url to attach it to a course lesson."
      : undefined,
  };
}

/** Poll video status. GET /v3/videos/{video_id} */
export async function bossmobileHeygenVideoStatus(video_id: string) {
  const key = requireHeygenKey();
  const id = video_id?.trim();
  if (!id) throw new Error("video_id is required");

  const res = await fetch(`${HEYGEN_API}/v3/videos/${encodeURIComponent(id)}`, {
    headers: { "x-api-key": key },
  });

  const json = (await res.json()) as {
    data?: {
      id?: string;
      status?: string;
      video_url?: string | null;
      thumbnail_url?: string | null;
      duration?: number;
      error?: unknown;
    };
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(`HeyGen ${res.status}: ${json.error?.message || res.statusText}`);
  }

  const d = json.data ?? (json as Record<string, unknown>);
  return {
    ...d,
    next_step:
      (d as Record<string, unknown>).status === "completed" && (d as Record<string, unknown>).video_url
        ? "Video ready! Preferred path: call bossmobile_publish_video_playbook(heygen_video_id, lesson_id) — it returns the step-by-step playbook for uploading to YouTube via your own Composio connection and embedding into the lesson. Or skip to update_lesson directly if you already have a hosted video URL."
        : undefined,
  };
}
