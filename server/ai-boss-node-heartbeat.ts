const controlUrl = String(process.env.AI_BOSS_CONTROL_URL || "").replace(/\/$/, "");
const token = String(process.env.AI_BOSS_NODE_HEARTBEAT_TOKEN || "").trim();
const nodeId = String(process.env.AI_BOSS_NODE_ID || "brian-mac-mini").trim();
const displayName = String(process.env.AI_BOSS_NODE_NAME || "Brian's Mac mini").trim();

if (!controlUrl || !token) throw new Error("AI_BOSS_CONTROL_URL and AI_BOSS_NODE_HEARTBEAT_TOKEN are required.");

async function heartbeat() {
  const response = await fetch(`${controlUrl}/api/ai-boss/nodes/heartbeat`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      node_id: nodeId,
      display_name: displayName,
      node_kind: "mac",
      capabilities: ["files", "desktop_commander", "gmail"],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Heartbeat rejected (${response.status}).`);
}

async function main() {
  await heartbeat();
  setInterval(() => heartbeat().catch((error) => console.error(error instanceof Error ? error.message : error)), 30_000);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
