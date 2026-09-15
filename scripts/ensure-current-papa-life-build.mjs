import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const sourceMarker = path.join(root, "client", "public", "papa-life-os-build.json");
const builtMarker = path.join(root, "dist", "public", "papa-life-os-build.json");
const compiledServer = path.join(root, "dist", "index.js");
const compiledWebsite = path.join(root, "dist", "public", "index.html");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function read(pathname) {
  try {
    return readFileSync(pathname, "utf8").trim();
  } catch {
    return "";
  }
}

function hasBetterSqlite3Binding() {
  const probe = spawnSync(
    process.execPath,
    ["-e", "const Database=require('better-sqlite3'); const db=new Database(':memory:'); db.close();"],
    { cwd: root, env: process.env, stdio: "ignore" },
  );
  return probe.status === 0;
}

function ensureBetterSqlite3Binding() {
  if (hasBetterSqlite3Binding()) {
    console.log("[sqlite-native] better-sqlite3 binding is available.");
    return;
  }

  const pnpmStore = path.join(root, "node_modules", ".pnpm");
  let packageDir = "";
  try {
    const entry = readdirSync(pnpmStore).find((name) => name.startsWith("better-sqlite3@"));
    if (entry) {
      packageDir = path.join(pnpmStore, entry, "node_modules", "better-sqlite3");
    }
  } catch {
    packageDir = "";
  }

  if (!packageDir || !existsSync(packageDir)) {
    console.error("[sqlite-native] better-sqlite3 package directory was not found.");
    process.exit(1);
  }

  console.warn("[sqlite-native] Native binding is missing; running better-sqlite3 installer.");
  const install = spawnSync(pnpmCommand, ["--dir", packageDir, "run", "install"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  if (install.status !== 0 || !hasBetterSqlite3Binding()) {
    console.error("[sqlite-native] better-sqlite3 native binding could not be prepared.");
    process.exit(install.status ?? 1);
  }

  console.log("[sqlite-native] better-sqlite3 binding verified.");
}

ensureBetterSqlite3Binding();

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

if (existsSync(compiledServer) && existsSync(compiledWebsite)) {
  console.warn(
    "[papa-life-build] Compiled marker is stale or missing, but runnable compiled output exists. Skipping startup rebuild for availability; rebuild during deployment instead.",
  );
  process.exit(0);
}

console.log("[papa-life-build] Compiled output is missing; rebuilding from current source.");
const result = spawnSync(pnpmCommand, ["run", "build"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!existsSync(compiledServer) || !existsSync(compiledWebsite)) {
  console.error("[papa-life-build] Rebuild completed without runnable compiled output.");
  process.exit(1);
}

console.log("[papa-life-build] Fresh Papa Life OS website build verified.");
