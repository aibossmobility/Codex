import { indexNowKey } from "./papa-indexnow-key.mjs";

const origin = "https://papalifecoach.com";
const paths = process.argv.slice(2);
if (paths.length === 0) {
  throw new Error("Pass the published paths to submit, such as /resources /books /podcast.");
}
const urls = [...new Set(paths.map((pathname) => {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    throw new Error("Use site-relative paths beginning with /.");
  }
  return new URL(pathname, origin).href;
}))];

const sitemap = await fetch(origin + "/sitemap.xml", { signal: AbortSignal.timeout(15000) });
if (!sitemap.ok) throw new Error("Could not read the live Papa Life sitemap: " + sitemap.status);
const listed = new Set(Array.from((await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g), ([, url]) => url));
if (urls.some((url) => !listed.has(url))) {
  throw new Error("Submit only canonical URLs listed in the live sitemap.");
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    host: new URL(origin).hostname,
    key: indexNowKey,
    keyLocation: origin + "/" + indexNowKey + ".txt",
    urlList: urls,
  }),
  signal: AbortSignal.timeout(15000),
});
if (!response.ok) throw new Error("IndexNow submission failed: " + response.status);
console.log("IndexNow responded " + response.status + " for " + urls.length + " published URLs.");
