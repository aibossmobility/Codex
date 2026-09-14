import fs from "node:fs";
import path from "node:path";

const serverPath = path.resolve(process.cwd(), "server", "index.ts");
let source = fs.readFileSync(serverPath, "utf8");

const replacements = [
  {
    from: 'if (pathname.startsWith("/ai-boss")) return aiBossServerPage();',
    to: 'if (pathname.startsWith("/papa-life-os") || pathname.startsWith("/ai-boss")) return aiBossServerPage();',
    label: "server-rendered Papa Life OS route",
  },
  {
    from: 'if (/^\\/ai-boss(?:\\/|$)/.test(pathname)) {',
    to: 'if (/^\\/(?:papa-life-os|ai-boss)(?:\\/|$)/.test(pathname)) {',
    label: "authenticated Papa Life OS SPA route",
  },
];

for (const replacement of replacements) {
  const count = source.split(replacement.from).length - 1;
  if (count !== 1) {
    throw new Error(`[papa-life-os-server] Expected exactly one ${replacement.label} match, found ${count}`);
  }
  source = source.replace(replacement.from, replacement.to);
}

fs.writeFileSync(serverPath, source);
console.log("[papa-life-os-server] Canonical and legacy OS routes enabled for production build.");
