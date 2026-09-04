import { execFileSync } from "node:child_process";

const endpoint = String(process.env.AI_BOSS_CAMPAIGN_SYNC_URL || "").trim();
const token = String(process.env.AI_BOSS_CAMPAIGN_SYNC_TOKEN || "").trim();
if (!endpoint || !token) throw new Error("AI_BOSS_CAMPAIGN_SYNC_URL and AI_BOSS_CAMPAIGN_SYNC_TOKEN are required");

function chromeText() {
  const script = `tell application "Google Chrome 3"\nset targetTab to missing value\nrepeat with w in windows\nrepeat with t in tabs of w\nif (URL of t as text) contains "zipshare.ai/office" then set targetTab to t\nend repeat\nend repeat\nif targetTab is missing value then return ""\nreturn execute javascript "document.body.innerText" in targetTab\nend tell`;
  return execFileSync("osascript", ["-e", script], { encoding: "utf8" });
}

function metric(text: string, code: string, label: string) {
  const index = text.indexOf(`Code: ${code}`);
  if (index < 0) return 0;
  const slice = text.slice(index, index + 800);
  const re = new RegExp(`(\\d+)\\s+${label}`, "i");
  return Number(slice.match(re)?.[1] || 0);
}

async function push(payload: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Campaign sync failed: ${response.status} ${await response.text()}`);
}

async function main() {
  const text = chromeText();
  if (!text) throw new Error("ZIPShare Partner Office must be open and signed in in Google Chrome 3");
  for (const [code, name] of [["AIBOSSZIP", "ZIPShare — AI Boss Mobility"], ["PAPALIFECOACH", "ZIPShare — Papa Life"]] as const) {
    await push({
      source: "zipshare", campaign_key: code, display_name: name,
      tracking_url: `https://zipshare.ai/?ref=${code}`, status: "connected",
      enrollments: metric(text, code, "Enrollments"),
      latest_activity: "Synced from authenticated ZIPShare Partner Office on Brian's Mac.",
    });
  }
  console.log("ZIPShare campaign metrics synced to AI Boss OS.");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
