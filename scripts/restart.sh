#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/generate-master-knowledge-page.mjs
node ./node_modules/vite/bin/vite.js build
node scripts/generate-static-seo-pages.mjs
./node_modules/esbuild/bin/esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
./node_modules/esbuild/bin/esbuild mcp-streamable.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Jamel's server allowance matches this command exactly. Do not add flags such
# as --update-env, and never combine this with an MCP restart.
sudo /usr/local/bin/pm2 restart papalife
echo "papalife restarted. papalife-mcp-http was not touched."
