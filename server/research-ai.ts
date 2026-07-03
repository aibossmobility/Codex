/**
 * Claude (Anthropic) for summarizing large note dumps and generating social copy.
 * Set ANTHROPIC_API_KEY or CLAUDE_API_KEY. Optional: ANTHROPIC_MODEL (default Haiku for long inputs).
 */

const PAPA_SNIPPET =
  "PAPA Life / Boss Mobile Life Coach: fathers of adult children, faith-informed, PAPA framework. 9th grade reading level.";

const MAX_INPUT_CHARS = 120000;

function truncateForModel(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_INPUT_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_INPUT_CHARS) + "\n[truncated]", truncated: true };
}

function anthropicKey(): string | null {
  return process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim() || null;
}

async function claudeGenerate(system: string, userContent: string): Promise<string | null> {
  const key = anthropicKey();
  if (!key) return null;
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-20241022";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Anthropic ${r.status}: ${err.slice(0, 400)}`);
  }
  const j = (await r.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = j.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("") ?? "";
  return text.trim() || null;
}

function heuristicThemes(raw: string): string[] {
  const paras = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).slice(0, 12);
  const themes: string[] = [];
  for (const p of paras) {
    if (p.length > 40 && p.length < 500) themes.push(p.slice(0, 240));
    if (themes.length >= 5) break;
  }
  if (themes.length === 0 && raw.length > 0) themes.push(raw.slice(0, 280));
  return themes;
}

export async function analyzeResearchNotes(rawNotes: string): Promise<{
  executive_summary: string;
  themes: string[];
  model: string;
  truncated: boolean;
}> {
  const { text, truncated } = truncateForModel(rawNotes);
  const wc = text.trim() ? text.trim().split(/\s+/).length : 0;
  const userBlock =
    "Large private marketing / research note dump. Reply ONLY valid JSON with keys executive_summary (string) and themes (array of strings). No markdown fences.\n---\n" +
    text;

  try {
    const rawJson = await claudeGenerate(
      "You output only valid JSON. " + PAPA_SNIPPET,
      userBlock
    );
    const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-20241022";
    if (rawJson) {
      const cleaned = rawJson.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned) as { executive_summary?: string; themes?: string[] };
      const executive_summary = String(parsed.executive_summary ?? "").trim();
      const themes = Array.isArray(parsed.themes)
        ? parsed.themes.map((t) => String(t).trim()).filter(Boolean)
        : [];
      if (executive_summary && themes.length > 0) {
        return {
          executive_summary: truncated ? executive_summary + "\n(Context truncated.)" : executive_summary,
          themes,
          model: `anthropic:${model}`,
          truncated,
        };
      }
    }
  } catch {
    /* heuristic */
  }

  const themes = heuristicThemes(text);
  return {
    executive_summary:
      `Heuristic (${wc} words). Set ANTHROPIC_API_KEY or CLAUDE_API_KEY on the server for Claude analysis.\n` +
      themes.map((t, i) => `${i + 1}. ${t}`).join("\n"),
    themes: themes.length ? themes : ["Add ANTHROPIC_API_KEY or structure notes into clearer sections."],
    model: "heuristic",
    truncated,
  };
}

const PLATFORMS = ["instagram", "linkedin", "facebook", "x", "youtube_shorts"] as const;

export async function generateSocialPack(
  rawNotes: string,
  executiveSummary: string,
  themes: string[],
  platforms: string[] | undefined
): Promise<Array<{ platform: string; headline: string; body: string; hashtags: string; cta: string }>> {
  const want = (platforms?.length ? platforms : [...PLATFORMS]).map((p) => p.toLowerCase());
  const { text } = truncateForModel(rawNotes);
  const userBlock =
    "Output ONLY a JSON array (no markdown). Each object: platform, headline, body, hashtags, cta. " +
    "Platforms needed: " +
    want.join(", ") +
    "\n\nExecutive summary:\n" +
    executiveSummary +
    "\n\nThemes: " +
    themes.join(" | ") +
    "\n\nNotes:\n" +
    text;

  try {
    const rawJson = await claudeGenerate(
      "You output only a JSON array. " + PAPA_SNIPPET,
      userBlock
    );
    if (rawJson) {
      const cleaned = rawJson.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const arr = JSON.parse(cleaned) as Array<{
        platform?: string;
        headline?: string;
        body?: string;
        hashtags?: string;
        cta?: string;
      }>;
      if (Array.isArray(arr) && arr.length > 0) {
        return arr
          .filter((row) => row.body && row.platform)
          .map((row) => ({
            platform: String(row.platform).toLowerCase(),
            headline: String(row.headline ?? "").trim(),
            body: String(row.body).trim(),
            hashtags: String(row.hashtags ?? "").trim(),
            cta: String(row.cta ?? "").trim(),
          }))
          .slice(0, 24);
      }
    }
  } catch {
    /* fallback */
  }

  const out: Array<{ platform: string; headline: string; body: string; hashtags: string; cta: string }> = [];
  let n = 0;
  for (const p of want) {
    if (!PLATFORMS.includes(p as (typeof PLATFORMS)[number])) continue;
    out.push({
      platform: p,
      headline: "Start here",
      body:
        p === "x"
          ? executiveSummary.slice(0, 220) + " #PAPALife"
          : executiveSummary.slice(0, 500) + "\n\nTurn long plans into weekly posts.",
      hashtags: "#PAPALife #Fatherhood",
      cta: "Comment one word for your season.",
    });
    n++;
    if (n >= 6) break;
  }
  return out;
}
