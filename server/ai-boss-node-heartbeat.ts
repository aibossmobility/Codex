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
    const npx = "/Users/bossmobility/.nvm/versions/node/v24.19.0/bin/npx";
    const common = ["-y", "agent-browser@0.36.0", "--profile", "Default", "--session", "zipshare-heartbeat"];
    execFileSync(npx, [...common, "open", "https://zipshare.ai/office?tab=share"], { encoding: "utf8", timeout: 30_000 });
    execFileSync(npx, [...common, "wait", "1500"], { encoding: "utf8", timeout: 10_000 });
    const text = execFileSync(npx, [...common, "get", "text", "body"], { encoding: "utf8", timeout: 15_000 });
    if (!text.includes("Code: AIBOSSZIP") || !text.includes("Code: PAPALIFECOACH")) {
      throw new Error("ZIPShare campaign portfolio is not available in the authenticated background session.");
    }
    zipShareMetrics = {
      AIBOSSZIP: { clicks: 0, enrollments: metric(text, "AIBOSSZIP", "Enrollments") },
      PAPALIFECOACH: { clicks: 0, enrollments: metric(text, "PAPALIFECOACH", "Enrollments") },
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
