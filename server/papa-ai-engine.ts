import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildPapaLifeKbPromptContext, getPapaLifeKbStatus } from "./papa-life-kb";

type PapaAiProvider = "openai" | "anthropic" | "gemini" | "local";
type PapaAiMode =
  | "coach"
  | "assessment"
  | "resource"
  | "tuesday"
  | "membership"
  | "prayer"
  | "bible-study";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ResourceItem = {
  title: string;
  type: "Video" | "Article" | "Podcast" | "Bible Study" | "Worksheet" | "Course" | "Book Chapter";
  pillar: "Purpose" | "Authority" | "Presence" | "Alignment" | "General";
  description: string;
  path: string;
  keywords: string[];
};

type AssessmentAnswer = {
  id: string;
  label: string;
  score: number;
  pillar: "Purpose" | "Authority" | "Presence" | "Alignment" | "Communication" | "Forgiveness" | "Trust" | "Humility" | "Listening" | "Connection";
};

const PAPA_SYSTEM_PROMPT = `You are the Papa Life AI Coach, the digital extension of Brian Keith Hill's coaching ministry.

Mission: help fathers of adult children rebuild connection, restore trust, and lead with Purpose, Authority, Presence, and Alignment.

Voice: warm, authentic, biblical, direct, hopeful, masculine, encouraging, relationship-centered, and practical. Never shame fathers. Never manipulate pain. Never guarantee reconciliation. Never sound robotic. Listen first, ask thoughtful questions, offer biblical wisdom naturally, and give one clear next step.

Core framework:
- Purpose: who the father is becoming under God.
- Authority: leading wisely without controlling.
- Presence: showing up consistently and safely.
- Alignment: living what he says matters.

Safety: this is coaching and spiritual encouragement, not therapy, legal advice, medical advice, or crisis intervention. Encourage urgent local help when harm, abuse, self-harm, or immediate danger is present.`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let cachedSystemPrompt: string | null = null;

export function loadPapaLifeSystemPrompt() {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  const configuredPath = process.env.PAPA_LIFE_SYSTEM_PROMPT_PATH?.trim();
  const candidates = [
    configuredPath,
    path.resolve(process.cwd(), "server", "papa-life-system-prompt.md"),
    path.resolve(__dirname, "..", "server", "papa-life-system-prompt.md"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        cachedSystemPrompt = fs.readFileSync(candidate, "utf8").trim();
        return cachedSystemPrompt;
      }
    } catch {
      /* fall back to embedded prompt */
    }
  }

  cachedSystemPrompt = PAPA_SYSTEM_PROMPT;
  return cachedSystemPrompt;
}

export const papaAiResources: ResourceItem[] = [
  {
    title: "The PAPA Framework Guide",
    type: "Worksheet",
    pillar: "General",
    description: "A practical map for Purpose, Authority, Presence, and Alignment.",
    path: "/papa-framework",
    keywords: ["framework", "papa", "purpose", "authority", "presence", "alignment", "start"],
  },
  {
    title: "Fatherhood Didn't End. It Changed.",
    type: "Course",
    pillar: "Presence",
    description: "Free first lesson for fathers learning the new role with adult children.",
    path: "/papa-first-lesson",
    keywords: ["adult child", "changed", "first lesson", "workshop", "course"],
  },
  {
    title: "Give. Listen. Love. Serve.",
    type: "Course",
    pillar: "Presence",
    description:
      "A Brian Keith Hill pathway for fathers who need to show up with presence, listen first, love as the foundation, and serve without control.",
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
      "brian",
    ],
  },
  {
    title: "Adult Daughter Relationship Path",
    type: "Article",
    pillar: "Presence",
    description: "Guidance for fathers who want to reconnect with an adult daughter without pressure.",
    path: "/adult-daughter-relationship",
    keywords: ["daughter", "reconnect", "distance", "listen", "presence"],
  },
  {
    title: "Adult Son Relationship Path",
    type: "Article",
    pillar: "Authority",
    description: "A fatherhood path for adult sons, respect, humility, and repaired trust.",
    path: "/adult-son-relationship",
    keywords: ["son", "respect", "authority", "trust", "conversation"],
  },
  {
    title: "Why Adult Children Pull Away",
    type: "Article",
    pillar: "Humility" as ResourceItem["pillar"],
    description: "A clear look at distance, silence, and what fathers can do first.",
    path: "/why-adult-children-pull-away",
    keywords: ["pull away", "silence", "estrangement", "distance", "humility"],
  },
  {
    title: "Father-Child Estrangement",
    type: "Article",
    pillar: "Alignment",
    description: "A steady starting point when the relationship feels broken or guarded.",
    path: "/father-child-estrangement",
    keywords: ["estrangement", "broken", "repair", "apology", "trust"],
  },
  {
    title: "Free PAPA Self-Assessment",
    type: "Worksheet",
    pillar: "General",
    description: "Score your relationship across the PAPA pillars and find your starting point.",
    path: "/assessment",
    keywords: ["assessment", "score", "clarity", "purpose", "authority", "presence", "alignment"],
  },
  {
    title: "Papa Life Tuesday Live",
    type: "Video",
    pillar: "General",
    description: "Live coaching and teaching for fathers of adult children.",
    path: "/tuesday",
    keywords: ["tuesday", "live", "questions", "show", "episode", "coaching"],
  },
  {
    title: "Papa Life Membership",
    type: "Course",
    pillar: "General",
    description: "Guided lessons, reflection tools, community, and continued growth.",
    path: "/go/join",
    keywords: ["membership", "community", "pricing", "subscription", "join", "courses"],
  },
  {
    title: "About Brian Keith Hill",
    type: "Article",
    pillar: "General",
    description: "Learn the heart and voice behind Papa Life.",
    path: "/about-brian-keith-hill",
    keywords: ["brian", "founder", "coach", "ministry", "story"],
  },
];

export const papaAssessmentQuestions = [
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
  ["connection_2", "I know one small, respectful next step I can take this week.", "Connection"],
] as const;

export function getPapaAiStatus() {
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
    inactive_message:
      provider === "local"
        ? "Live provider is not connected yet. Papa Life guided coaching mode is active."
        : "Live AI provider is connected.",
  };
}

function buildRuntimeSystemPrompt(message: string) {
  const kbContext = buildPapaLifeKbPromptContext(message);
  if (!kbContext) return loadPapaLifeSystemPrompt();
  return `${loadPapaLifeSystemPrompt()}\n\n---\n\n${kbContext}`;
}

export function buildPapaAiLocalReply(input: {
  message: string;
  mode?: PapaAiMode;
  history?: ChatMessage[];
}) {
  const message = input.message.trim();
  const mode = input.mode || "coach";
  const lower = message.toLowerCase();
  const pillar = detectPillar(lower);
  const need = detectNeed(lower);
  const resources = findPapaResources(message, 3);

  if (isCrisisLike(lower)) {
    return {
      provider: "local" as PapaAiProvider,
      reply:
        "Father, I want to answer with care. If there is immediate danger, abuse, violence, or thoughts of self-harm, pause the coaching path and contact local emergency help or a trusted crisis resource right now. Papa Life can walk with fatherhood repair, but safety comes first.\n\nWhen things are stable, start with one grounded step: write down what happened, who may be at risk, and who can help you make the next wise call today.",
      resources: findPapaResources("safety trust support", 3),
    };
  }

  if (mode === "prayer") {
    return {
      provider: "local" as PapaAiProvider,
      reply: buildPrayer(message, pillar),
      resources,
    };
  }

  if (mode === "bible-study") {
    return {
      provider: "local" as PapaAiProvider,
      reply: buildBibleStudy(message, pillar),
      resources,
    };
  }

  if (mode === "resource") {
    return {
      provider: "local" as PapaAiProvider,
      reply: `Here is where I would start based on what you shared: ${resources[0]?.title || "The PAPA Framework Guide"}.\n\nLook for the resource that helps you take one next faithful step, not the one that gives you the most information. The father changes first, and small consistent action rebuilds more trust than a large emotional speech.`,
      resources,
    };
  }

  if (mode === "tuesday") {
    return {
      provider: "local" as PapaAiProvider,
      reply:
        "That is a strong Tuesday Live question. I would frame it this way for the show: what does a father do when he wants repair, but his adult child is not ready for the conversation?\n\nStart with humility, then move to one practical action. Ask the question before Tuesday, bring one real example, and the follow-up resource should point back to Presence and Alignment.",
      resources: findPapaResources(`${message} Tuesday live`, 3),
    };
  }

  if (mode === "membership") {
    return {
      provider: "local" as PapaAiProvider,
      reply:
        "Papa Life membership is for fathers who do not want a one-time emotional moment. They want a path. The value is guided lessons, reflection, brotherhood, and steady practice around Purpose, Authority, Presence, and Alignment.\n\nIf you are ready to work through this with structure, start with the free assessment, then move into the membership path when you want ongoing guidance.",
      resources: findPapaResources("membership courses community", 3),
    };
  }

  return {
    provider: "local" as PapaAiProvider,
    reply: buildCoachingReply(message, pillar, need),
    resources,
  };
}

export async function buildPapaAiReply(input: {
  message: string;
  mode?: PapaAiMode;
  history?: ChatMessage[];
}) {
  const provider = resolveConfiguredProvider();
  if (provider === "openai") return completeWithOpenAI(input);
  if (provider === "anthropic") return completeWithAnthropic(input);
  if (provider === "gemini") return completeWithGemini(input);
  return buildPapaAiLocalReply(input);
}

export function findPapaResources(query: string, limit = 6) {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);

  const scored = papaAiResources.map((resource) => {
    const haystack = [
      resource.title,
      resource.type,
      resource.pillar,
      resource.description,
      ...resource.keywords,
    ]
      .join(" ")
      .toLowerCase();
    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    return { resource, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.resource.title.localeCompare(b.resource.title))
    .slice(0, limit)
    .map((item) => item.resource);
}

export function buildAssessmentReport(answers: AssessmentAnswer[]) {
  const valid = answers
    .filter((answer) => Number.isFinite(answer.score))
    .map((answer) => ({
      ...answer,
      score: Math.max(1, Math.min(5, Math.round(answer.score))),
    }));

  const groups = new Map<string, { total: number; count: number }>();
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
    percent: Math.round((value.total / (value.count * 5)) * 100),
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
      "Use the free workshop or membership path for continued practice.",
    ],
    report:
      `Father, your report points first to ${focusPillar}. Start there with humility and hope. ` +
      `Do not try to repair the whole relationship in one conversation. Ask God for a clean heart, take responsibility for your part, and practice one steady action your adult child can experience as safe.`,
    resources,
  };
}

function resolveConfiguredProvider(): PapaAiProvider {
  const preferred = normalizeProvider(process.env.DEFAULT_AI_PROVIDER);
  if (preferred === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (preferred === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (preferred === "gemini" && (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY)) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY) return "gemini";
  return "local";
}

function normalizeProvider(value: unknown): PapaAiProvider {
  const provider = String(value || "").trim().toLowerCase();
  if (provider === "openai" || provider === "anthropic" || provider === "gemini") return provider;
  return "local";
}

async function completeWithOpenAI(input: { message: string; mode?: PapaAiMode; history?: ChatMessage[] }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: buildRuntimeSystemPrompt(input.message) },
        ...(input.history || []).slice(-8),
        { role: "user", content: input.message },
      ],
    }),
  });
  const json = (await response.json()) as any;
  if (!response.ok) throw new Error(json?.error?.message || "OpenAI request failed");
  return {
    provider: "openai" as PapaAiProvider,
    reply: String(json?.choices?.[0]?.message?.content || "").trim(),
    resources: findPapaResources(input.message, 3),
  };
}

async function completeWithAnthropic(input: { message: string; mode?: PapaAiMode; history?: ChatMessage[] }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": String(process.env.ANTHROPIC_API_KEY),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      max_tokens: 900,
      temperature: 0.7,
      system: buildRuntimeSystemPrompt(input.message),
      messages: [
        ...(input.history || []).filter((m) => m.role !== "system").slice(-8),
        { role: "user", content: input.message },
      ],
    }),
  });
  const json = (await response.json()) as any;
  if (!response.ok) throw new Error(json?.error?.message || "Anthropic request failed");
  return {
    provider: "anthropic" as PapaAiProvider,
    reply: String(json?.content?.[0]?.text || "").trim(),
    resources: findPapaResources(input.message, 3),
  };
}

async function completeWithGemini(input: { message: string; mode?: PapaAiMode; history?: ChatMessage[] }) {
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
          ...(input.history || [])
            .filter((m) => m.role !== "system")
            .slice(-8)
            .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          { role: "user", parts: [{ text: input.message }] },
        ],
      }),
    }
  );
  const json = (await response.json()) as any;
  if (!response.ok) throw new Error(json?.error?.message || "Gemini request failed");
  return {
    provider: "gemini" as PapaAiProvider,
    reply: String(json?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim(),
    resources: findPapaResources(input.message, 3),
  };
}

function detectPillar(text: string) {
  if (/(purpose|identity|legacy|meaning|calling)/.test(text)) return "Purpose";
  if (/(authority|respect|control|lead|anger|defensive)/.test(text)) return "Authority";
  if (/(presence|listen|silent|distance|daughter|son|available|show up)/.test(text)) return "Presence";
  if (/(alignment|apology|faith|values|integrity|consistent)/.test(text)) return "Alignment";
  return "Presence";
}

function detectNeed(text: string) {
  if (/(daughter)/.test(text)) return "daughter";
  if (/(son)/.test(text)) return "son";
  if (/(sorry|apolog|forgive)/.test(text)) return "apology";
  if (/(silent|won't talk|not talking|estranged|distance)/.test(text)) return "distance";
  if (/(membership|price|join|subscription)/.test(text)) return "membership";
  return "repair";
}

function isCrisisLike(text: string) {
  return /(suicide|self harm|kill myself|violence|abuse|danger|threat|weapon|emergency)/.test(text);
}

function buildCoachingReply(message: string, pillar: string, need: string) {
  const firstQuestion =
    need === "daughter"
      ? "What do you believe your daughter needs to feel safe enough to hear you again?"
      : need === "son"
        ? "What kind of respect are you trying to build: demanded respect, or earned trust?"
        : need === "apology"
          ? "What part can you own without adding an explanation after it?"
          : "What is the one part of this situation that is actually yours to change?";

  return `Father, start here: do not try to fix the whole relationship in one move.

What I hear is a ${pillar} issue. That means the next step is not pressure. It is a steadier way to show up.

${firstQuestion}

Here is the practical move for this week: write one short message that carries humility, not control. Something like, "I've been thinking about how I have shown up, and I want to listen better. No pressure to respond today. I just want you to know I love you and I am working on my part."

Scripture says to be quick to listen and slow to speak. That is not weakness. That is fatherhood with maturity.

Your next step: before you send anything, remove every sentence that tries to defend, explain, or force a response. Keep the love. Keep the ownership. Let Presence lead.`;
}

function buildPrayer(message: string, pillar: string) {
  return `Father God,

Give me a clean heart and a steady spirit. Help me lead with ${pillar}, not pride. Teach me to listen before I answer, to own what is mine, and to love without trying to control the outcome.

Where I have caused pain, give me humility. Where I have been silent, give me courage. Where I have pushed too hard, teach me patience. Let my adult child experience me as safe, honest, and consistent.

Lord, make me the kind of father whose words and actions line up. Help me walk in truth, grace, forgiveness, and love.

Amen.`;
}

function buildBibleStudy(message: string, pillar: string) {
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
