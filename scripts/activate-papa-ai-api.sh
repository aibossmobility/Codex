#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/html/bossmobilelifecoach.com"
cd "$APP_DIR"

echo "Building Papa Life website..."
pnpm run build

echo "Restarting PM2 apps that run this website..."
node <<'NODE'
const { execSync } = require("node:child_process");
const appDir = "/var/www/html/bossmobilelifecoach.com";
const targets = [
  `${appDir}/dist/index.js`,
  `${appDir}/dist/mcp-streamable.js`,
];

const list = JSON.parse(execSync("pm2 jlist", { encoding: "utf8" }));
const matches = list.filter((app) => targets.includes(app?.pm2_env?.pm_exec_path));

if (matches.length === 0) {
  console.error("No matching PM2 apps found for bossmobilelifecoach.com.");
  console.error("Current PM2 apps:");
  console.error(execSync("pm2 list", { encoding: "utf8" }));
  process.exit(1);
}

for (const app of matches) {
  console.log(`Restarting ${app.name} (${app.pm_id})`);
  execSync(`pm2 restart ${app.pm_id}`, { stdio: "inherit" });
}
NODE

pm2 save

echo "Checking API routes..."
curl -fsS https://bossmobilelifecoach.com/api/health
echo
curl -fsS https://bossmobilelifecoach.com/api/ai/status
echo

echo "Papa Life AI API activation complete."

