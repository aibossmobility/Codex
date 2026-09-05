import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const controlUrl = String(process.env.AI_BOSS_CONTROL_URL || "").replace(/\/$/, "");
const token = String(process.env.AI_BOSS_NODE_HEARTBEAT_TOKEN || "").trim();
const nodeId = String(process.env.AI_BOSS_NODE_ID || "brian-mac-mini").trim();
const displayName = String(process.env.AI_BOSS_NODE_NAME || "Brian's Mac mini").trim();
const cdpPort = Number(process.env.AI_BOSS_ZIPSHARE_CDP_PORT || 9333);
const cdpBase = `http://127.0.0.1:${cdpPort}`;
const zipShareProfile = process.env.AI_BOSS_ZIPSHARE_PROFILE || join(homedir(), ".ai-boss-os", "zipshare-browser-profile");
const chromePath = process.env.AI_BOSS_ZIPSHARE_CHROME || "/Applications/Google Chrome 3.app/Contents/MacOS/Google Chrome";

if (!controlUrl || !token) throw new Error("AI_BOSS_CONTROL_URL and AI_BOSS_NODE_HEARTBEAT_TOKEN are required.");

type ZipShareMetrics = Record<string, { clicks: number; enrollments: number }>;
let zipShareMetrics: ZipShareMetrics = {};
let zipShareLastSync = "";

function metric(text: string, code: string, label: string) {
  const index = text.indexOf(`Code: ${code}`);
  if (index < 0) return 0;
  const match = text.slice(index, index + 1200).match(new RegExp(`(\\d+)\\s+${label}`, "i"));
  return Number(match?.[1] || 0);
}
async function cdpReady() {
  try {
    const response = await fetch(`${cdpBase}/json/version`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureZipShareBrowser() {
  if (await cdpReady()) return;
  const child = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${zipShareProfile}`,
    "--profile-directory=Default",
    `--remote-debugging-port=${cdpPort}`,
    "https://zipshare.ai/office?tab=share",
  ], { detached: true, stdio: "ignore" });
  child.unref();
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await cdpReady()) return;
  }
  throw new Error("ZIPShare background browser did not start.");
}
async function pageTarget() {
  const response = await fetch(`${cdpBase}/json`, { signal: AbortSignal.timeout(3000) });
  const targets = await response.json() as Array<{ type?: string; url?: string; webSocketDebuggerUrl?: string }>;
  let target = targets.find((item) => item.type === "page" && item.url?.includes("zipshare.ai/office"));
  if (!target) {
    await fetch(`${cdpBase}/json/new?${encodeURIComponent("https://zipshare.ai/office?tab=share")}`, {
      method: "PUT",
      signal: AbortSignal.timeout(3000),
    });
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const retry = await fetch(`${cdpBase}/json`, { signal: AbortSignal.timeout(3000) });
    const retryTargets = await retry.json() as Array<{ type?: string; url?: string; webSocketDebuggerUrl?: string }>;
    target = retryTargets.find((item) => item.type === "page" && item.url?.includes("zipshare.ai/office"));
  }
  if (!target?.webSocketDebuggerUrl) throw new Error("ZIPShare page target unavailable.");
  return target.webSocketDebuggerUrl;
}

async function evaluateText(wsUrl: string) {
  return await new Promise<string>((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const timeout = setTimeout(() => { socket.close(); reject(new Error("CDP evaluation timed out.")); }, 8000);
    socket.addEventListener("open", () => socket.send(JSON.stringify({
      id: 1,
      method: "Runtime.evaluate",
      params: { expression: "document.body.innerText", returnByValue: true },
    })));
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data));
      if (payload.id !== 1) return;
      clearTimeout(timeout); socket.close();
      resolve(String(payload.result?.result?.value || ""));
    });
    socket.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("CDP socket failed.")); });
  });
}
async function refreshZipShareMetrics() {
  try {
    await ensureZipShareBrowser();
    let text = await evaluateText(await pageTarget());
    if (!text.includes("Code: AIBOSSZIP") || !text.includes("Code: PAPALIFECOACH")) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      text = await evaluateText(await pageTarget());
    }
    if (!text.includes("Code: AIBOSSZIP") || !text.includes("Code: PAPALIFECOACH")) {
      throw new Error("ZIPShare campaign cards are not available in the background session.");
    }
    zipShareMetrics = {
      AIBOSSZIP: { clicks: 0, enrollments: metric(text, "AIBOSSZIP", "Enrollments") },
      PAPALIFECOACH: { clicks: 0, enrollments: metric(text, "PAPALIFECOACH", "Enrollments") },
    };
    zipShareLastSync = new Date().toISOString();
    console.log(`ZIPShare metrics refreshed: AIBOSSZIP=${zipShareMetrics.AIBOSSZIP.enrollments}, PAPALIFECOACH=${zipShareMetrics.PAPALIFECOACH.enrollments}`);
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
    body: JSON.stringify({
      node_id: nodeId,
      display_name: displayName,
      node_kind: "mac",
      capabilities: campaignCapabilities(),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Heartbeat rejected (${response.status}).`);
}

async function main() {
  await refreshZipShareMetrics();
  await heartbeat().catch((error) => console.error(error instanceof Error ? error.message : error));
  setInterval(() => heartbeat().catch((error) => console.error(error instanceof Error ? error.message : error)), 30_000);
  setInterval(() => void refreshZipShareMetrics(), 300_000);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
