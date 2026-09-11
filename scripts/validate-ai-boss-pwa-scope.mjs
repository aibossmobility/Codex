import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [sharedHtml, appEntry, aiBossMobile, manifestText] = await Promise.all([
  readFile(new URL("../client/index.html", import.meta.url), "utf8"),
  readFile(new URL("../client/src/main.tsx", import.meta.url), "utf8"),
  readFile(new URL("../client/src/pages/AiBossMobile.tsx", import.meta.url), "utf8"),
  readFile(new URL("../client/public/ai-boss-manifest.webmanifest", import.meta.url), "utf8"),
]);

assert.doesNotMatch(sharedHtml, /ai-boss-manifest\.webmanifest/, "Shared Papa Life HTML must not advertise the AI Boss manifest");
assert.doesNotMatch(sharedHtml, /apple-mobile-web-app-title[^>]+AI Boss/, "Shared Papa Life HTML must not label public shortcuts as AI Boss");
assert.doesNotMatch(appEntry, /ai-boss-sw\.js/, "The shared application entry must not register the AI Boss service worker");

assert.match(aiBossMobile, /ai-boss-manifest\.webmanifest/, "The AI Boss route must inject its install manifest");
assert.match(aiBossMobile, /serviceWorker\.register\("\/ai-boss-sw\.js"\)/, "The AI Boss route must register its service worker");

const manifest = JSON.parse(manifestText);
assert.equal(manifest.start_url, "/ai-boss");
assert.equal(manifest.display, "standalone");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, "The AI Boss manifest must include an icon");

console.log("AI Boss PWA scope checks passed.");
