// Enrich only listed public Papa Life documents after the existing static-site build.
// This never visits back-office, private library, payment, or member-account pages.
import fs from "node:fs";
import path from "node:path";
import { withPapaPageSchema } from "../shared/papa-structured-data.mjs";

const site = "https://papalifecoach.com";
const dist = path.resolve("dist/public");
const sitemap = fs.readFileSync(path.join(dist, "sitemap.xml"), "utf8");
const publicPaths = new Set(
  [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => {
      try {
        const candidate = new URL(match[1]);
        return candidate.origin === site ? candidate.pathname : null;
      } catch { return null; }
    })
    .filter(Boolean)
);
// These public legal/resource pages are served even if not listed by the
// separate sitemap generator. Never enumerate all build folders indiscriminately.
for (const p of ["/refund-policy", "/resources", "/books", "/podcast", "/contact"]) {
  publicPaths.add(p);
}
function readTag(html, pattern) {
  return (html.match(pattern) || [])[1] || "";
}
function decode(value) {
  const entities = {amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", "#39": "'"};
  return String(value).replace(/&(?:amp|quot|apos|lt|gt|#39);/gi,
    (entity) => entities[entity.slice(1, -1).toLowerCase()] || entity);
}
let updated = 0, skipped = 0;
for (const rawPath of publicPaths) {
  const pathname = rawPath === "/" ? "/" : rawPath.replace(/\/+$/, "");
  const file = pathname === "/"
    ? path.join(dist, "index.html")
    : path.join(dist, pathname.slice(1), "index.html");
  if (!fs.existsSync(file)) { skipped++; continue; }
  const html = fs.readFileSync(file, "utf8");
  const title = decode(readTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i)).trim();
  const description = decode(readTag(html,
    /<meta\s+name="description"\s+content="([^"]*)"\s*\/?>/i)).trim();
  const canonicalUrl = readTag(html, /<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/i);
  let canonicalPath = pathname;
  if (canonicalUrl) {
    try {
      const canonical = new URL(canonicalUrl, site);
      if (canonical.origin !== site) { skipped++; continue; }
      canonicalPath = canonical.pathname;
    } catch { skipped++; continue; }
  }
  const transformed = withPapaPageSchema(html, {
    pathname, canonicalPath, title, description,
  });
  if (transformed === html) { skipped++; continue; }
  fs.writeFileSync(file, transformed);
  updated++;
}
console.log("Papa Life page schemas: updated " + updated + " public documents, skipped " + skipped + " missing or excluded.");
