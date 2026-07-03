import fs from "fs";
import path from "path";

type KbChunk = {
  source: string;
  index: number;
  text: string;
};

let cachedChunks: KbChunk[] | null = null;
let cachedSignature = "";

function configuredKbPaths() {
  return String(process.env.PAPA_LIFE_KB_PATHS || process.env.PAPA_LIFE_MASTER_KB_PATH || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function defaultKbCandidates() {
  return [
    path.resolve(process.cwd(), "server", "papa-life-system-prompt.md"),
    path.resolve(process.cwd(), "data", "papa-life-master-kb.txt"),
    path.resolve(process.cwd(), "data", "Papa_Life_Master_Skill.md"),
  ];
}

function chunkText(source: string, text: string): KbChunk[] {
  const normalized = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const chunks: KbChunk[] = [];
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

  const chunks: KbChunk[] = [];
  for (const rawPath of paths) {
    try {
      const filePath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
      if (!fs.existsSync(filePath)) continue;
      const stat = fs.statSync(filePath);
      if (!stat.isFile() || stat.size > 2_500_000) continue;
      const text = fs.readFileSync(filePath, "utf8");
      chunks.push(...chunkText(path.basename(filePath), text));
    } catch {
      /* ignore unreadable KB candidates */
    }
  }

  cachedSignature = signature;
  cachedChunks = chunks;
  return chunks;
}

function keywords(input: string) {
  const stop = new Set([
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
    "your",
  ]);
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 3 && !stop.has(word))
    )
  ).slice(0, 24);
}

export function getPapaLifeKbStatus() {
  const chunks = loadChunks();
  const configured = configuredKbPaths();
  return {
    enabled: chunks.length > 0,
    configured_paths: configured.length,
    chunks: chunks.length,
    sources: Array.from(new Set(chunks.map((chunk) => chunk.source))).slice(0, 12),
  };
}

export function findPapaLifeKbContext(query: string, limit = 3) {
  const chunks = loadChunks();
  if (!chunks.length) return [];
  const terms = keywords(query);
  if (!terms.length) return [];

  return chunks
    .map((chunk) => {
      const lower = chunk.text.toLowerCase();
      const score = terms.reduce((sum, term) => {
        const exact = lower.includes(term) ? 2 : 0;
        const prefix = lower.includes(term.slice(0, 5)) ? 1 : 0;
        return sum + exact + prefix;
      }, 0);
      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ source, index, text }) => ({ source, index, text }));
}

export function buildPapaLifeKbPromptContext(query: string) {
  const matches = findPapaLifeKbContext(query, 3);
  if (!matches.length) return "";
  return [
    "Relevant Papa Life knowledge base excerpts. Use these as grounding when they fit the visitor's question. Do not mention file names unless asked.",
    ...matches.map((match, idx) => `Excerpt ${idx + 1} (${match.source} #${match.index + 1}):\n${match.text}`),
  ].join("\n\n");
}
