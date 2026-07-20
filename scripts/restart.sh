#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/generate-master-knowledge-page.mjs
node ./node_modules/vite/bin/vite.js build
node scripts/generate-static-seo-pages.mjs
./node_modules/esbuild/bin/esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
./node_modules/esbuild/bin/esbuild mcp-streamable.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Brian's sudo allowance matches these commands exactly. Do not add flags
# such as --update-env, and never combine the service restarts in one command.
sudo /usr/local/bin/pm2 restart papalife
echo "papalife restarted."
sudo /usr/local/bin/pm2 restart papalife-mcp-http
echo "papalife-mcp-http restarted."
