import { execFileSync } from "node:child_process";

const controlUrl = String(process.env.AI_BOSS_CONTROL_URL || "").replace(/\/$/, "");
const token = String(process.env.AI_BOSS_NODE_HEARTBEAT_TOKEN || "").trim();
const nodeId = String(process.env.AI_BOSS_NODE_ID || "brian-mac-mini").trim();
const displayName = String(process.env.AI_BOSS_NODE_NAME || "Brian's Mac mini").trim();

if (!controlUrl || !token) throw new Error("AI_BOSS_CONTROL_URL and AI_BOSS_NODE_HEARTBEAT_TOKEN are required.");

type ZipShareMetrics = Record<string, { clicks: number; enrollments: number }>;
let zipShareMetrics: ZipShareMetrics = {};
let zipShareLastSync = "";

function metric(text: string, code: string, label: string) {
  const index = text.indexOf(`Code: ${code}`);
  if (index < 0) return 0;
  const match = text.slice(index, index + 1000).match(new RegExp(`(\\d+)\\s+${label}`, "i"));
  return Number(match?.[1] || 0);
}

function refreshZipShareMetrics() {
  try {
    const script = `tell application "Google Chrome 3"\nset targetTab to missing value\nrepeat with w in windows\nrepeat with t in tabs of w\nif (URL of t as text) contains "zipshare.ai/office" then set targetTab to t\nend repeat\nend repeat\nif targetTab is missing value then return ""\nreturn execute javascript "document.body.innerText" in targetTab\nend tell`;
    const text = execFileSync("osascript", ["-e", script], { encoding: "utf8", timeout: 10_000 });
    if (!text) return;
    zipShareMetrics = {
      AIBOSSZIP: { clicks: metric(text, "AIBOSSZIP", "Clicks"), enrollments: metric(text, "AIBOSSZIP", "Enrollments") },
      PAPALIFECOACH: { clicks: metric(text, "PAPALIFECOACH", "Clicks"), enrollments: metric(text, "PAPALIFECOACH", "Enrollments") },
    };
    zipShareLastSync = new Date().toISOString();
  } catch (error) {
    console.error(`ZIPShare metric read failed: ${error instanceof Error ? error.message : error}`);
  }
}

function campaignCapabilities() {
  const capabilities = ["files", "desktop_commander", "gmail"];
  for (const [code, values] of Object.entries(zipShareMetrics)) {
    capabilities.push(`zipshare:${code}:clicks:${values.clicks}`);
    capabilities.push(`zipshare:${code}:enrollments:${values.enrollments}`);
  }
  if (zipShareLastSync) capabilities.push(`zipshare:last_sync:${Date.parse(zipShareLastSync)}`);
  return capabilities;
}

async function heartbeat() {
  const response = await fetch(`${controlUrl}/api/ai-boss/nodes/heartbeat`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ node_id: nodeId, display_name: displayName, node_kind: "mac", capabilities: campaignCapabilities() }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Heartbeat rejected (${response.status}).`);
}

async function main() {
  refreshZipShareMetrics();
  await heartbeat().catch((error) => console.error(error instanceof Error ? error.message : error));
  setInterval(() => heartbeat().catch((error) => console.error(error instanceof Error ? error.message : error)), 30_000);
  setInterval(refreshZipShareMetrics, 300_000);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
