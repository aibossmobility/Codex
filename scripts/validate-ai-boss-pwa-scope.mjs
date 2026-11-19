import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [sharedHtml, appEntry, papaMobile, bossMobile, appRoutes, manifestText, papaManifestText] = await Promise.all([
  readFile(new URL("../client/index.html", import.meta.url), "utf8"),
  readFile(new URL("../client/src/main.tsx", import.meta.url), "utf8"),
  readFile(new URL("../client/src/pages/AiBossMobile.tsx", import.meta.url), "utf8"),
  readFile(new URL("../client/src/pages/AiBossBusinessOS.tsx", import.meta.url), "utf8"),
  readFile(new URL("../client/src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../client/public/ai-boss-manifest.webmanifest", import.meta.url), "utf8"),
  readFile(new URL("../client/public/papa-life-os-manifest.webmanifest", import.meta.url), "utf8"),
]);

assert.doesNotMatch(sharedHtml, /ai-boss-manifest\.webmanifest/, "Shared Papa Life HTML must not advertise the AI Boss manifest");
assert.doesNotMatch(sharedHtml, /apple-mobile-web-app-title[^>]+AI Boss/, "Shared Papa Life HTML must not label public shortcuts as AI Boss");
assert.doesNotMatch(appEntry, /ai-boss-sw\.js/, "The shared application entry must not register the AI Boss service worker");

assert.match(papaMobile, /papa-life-os-manifest\.webmanifest/, "Papa Life must use its own manifest");
assert.match(bossMobile, /ai-boss-manifest\.webmanifest/, "AI Boss must use its own manifest");
assert.match(bossMobile, /serviceWorker\.register\("\/ai-boss-sw\.js", \{ scope: "\/ai-boss" \}\)/, "AI Boss service worker must be scoped to /ai-boss");
assert.match(bossMobile, /reg\.unregister\(\)/, "AI Boss must remove old root-scoped worker installations");
assert.match(appRoutes, /<Route path=\{"\/ai-boss"\} component=\{AiBossBusinessOS\}/, "AI Boss must have its own component");
assert.match(appRoutes, /<Route path=\{"\/papa-life-os"\} component=\{AiBossMobile\}/, "Papa Life keeps its own component");

const manifest = JSON.parse(manifestText);
const papaManifest = JSON.parse(papaManifestText);
assert.equal(papaManifest.start_url, "/papa-life-os");
assert.equal(papaManifest.scope, "/papa-life-os");
assert.equal(papaManifest.display, "standalone");
assert.equal(papaManifest.name, "Papa Life OS");
assert.equal(manifest.start_url, "/ai-boss");
assert.equal(manifest.scope, "/ai-boss");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.name, "AI Boss Mobility OS");
assert.equal(manifest.short_name, "AI Boss OS");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, "The AI Boss manifest must include an icon");
assert.equal(manifest.icons[0].src, "https://ai.bossmobilelifecoach.com/images/ai-boss-journey-logo.webp");

console.log("Papa Life and AI Boss OS route, brand, manifest and PWA scope checks passed.");
