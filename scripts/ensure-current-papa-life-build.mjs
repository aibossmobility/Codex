import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const sourceMarker = path.join(root, "client", "public", "papa-life-os-build.json");
const builtMarker = path.join(root, "dist", "public", "papa-life-os-build.json");

function read(pathname) {
  try {
    return readFileSync(pathname, "utf8").trim();
  } catch {
    return "";
  }
}

const expected = read(sourceMarker);
const current = read(builtMarker);

if (!expected) {
  console.error("[papa-life-build] Source deployment marker is missing.");
  process.exit(1);
}

if (current === expected) {
  console.log("[papa-life-build] Compiled website is current.");
  process.exit(0);
}

console.log("[papa-life-build] Compiled website is stale; rebuilding from current source.");
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["run", "build"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (read(builtMarker) !== expected) {
  console.error("[papa-life-build] Rebuild completed without the expected deployment marker.");
  process.exit(1);
}

console.log("[papa-life-build] Fresh Papa Life OS website build verified.");
