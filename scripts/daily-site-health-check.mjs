#!/usr/bin/env node
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const root = process.cwd();
const domain = "https://bossmobilelifecoach.com";
const reportsDir = path.join(root, "docs", "health-reports");
const dbPath = path.join(root, "leads.db");
const privateResourceDir = path.join(root, "server", "private-resources", "library");
const envPath = path.join(root, ".env");

fs.mkdirSync(reportsDir, { recursive: true });

const checks = [];

function addCheck(name, status, detail, fixPrompt = "") {
  checks.push({ name, status, detail, fixPrompt });
}

function severity() {
  if (checks.some((check) => check.status === "RED")) return "RED";
  if (checks.some((check) => check.status === "YELLOW")) return "YELLOW";
  return "GREEN";
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
    ...options,
  });
  const text = options.method === "HEAD" ? "" : await response.text();
  return {
    url,
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    text,
  };
}

function extractSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function envValue(name, fallback = "") {
  if (process.env[name]) return process.env[name];
  if (!fs.existsSync(envPath)) return fallback;
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith(`${name}=`));
  if (!line) return fallback;
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") || fallback;
}

function meaningfulTextFromHtml(html) {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function checkSearchVisibility() {
  try {
    const robots = await request(`${domain}/robots.txt`);
    const allowsSearch = robots.status === 200 && robots.text.includes("Allow: /") && robots.text.includes(`${domain}/sitemap.xml`);
    addCheck(
      "Robots and sitemap signal",
      allowsSearch ? "GREEN" : "RED",
      allowsSearch ? "robots.txt allows normal search indexing and points to sitemap.xml." : "robots.txt is missing the expected search/sitemap signal.",
      "Check robots.txt and confirm it allows search indexing and includes Sitemap: https://bossmobilelifecoach.com/sitemap.xml."
    );
  } catch (error) {
    addCheck("Robots and sitemap signal", "RED", `robots.txt check failed: ${error.message}`, "Fix robots.txt availability.");
  }

  let urls = [];
  try {
    const sitemap = await request(`${domain}/sitemap.xml`);
    urls = extractSitemapUrls(sitemap.text);
    const ok = sitemap.status === 200 && sitemap.contentType.includes("xml") && urls.length > 0;
    addCheck(
      "Sitemap",
      ok ? "GREEN" : "RED",
      ok ? `sitemap.xml is live with ${urls.length} URLs.` : `sitemap.xml problem. Status: ${sitemap.status}, URLs found: ${urls.length}.`,
      "Fix sitemap.xml so it returns 200 application/xml and lists the public pages."
    );
  } catch (error) {
    addCheck("Sitemap", "RED", `sitemap.xml check failed: ${error.message}`, "Fix sitemap.xml availability.");
  }

  const pageFailures = [];
  const contentFailures = [];
  for (const url of urls) {
    try {
      const page = await request(url);
      if (page.status !== 200) pageFailures.push(`${url} returned ${page.status}`);
      const meaningfulText = meaningfulTextFromHtml(page.text);
      const emptyAppShell = /<div id="root">\s*<\/div>/i.test(page.text);
      const hasServerContent = page.text.includes('id="server-prerender"') || (!emptyAppShell && meaningfulText.length > 250);
      if (!hasServerContent) contentFailures.push(url);
    } catch (error) {
      pageFailures.push(`${url} failed: ${error.message}`);
    }
  }
  addCheck(
    "Public pages",
    pageFailures.length === 0 ? "GREEN" : "RED",
    pageFailures.length === 0 ? `All ${urls.length} sitemap URLs returned 200.` : pageFailures.slice(0, 8).join("; "),
    "Fix sitemap pages that do not return 200."
  );
  addCheck(
    "Raw HTML content",
    contentFailures.length === 0 ? "GREEN" : "RED",
    contentFailures.length === 0 ? "Public pages include crawlable content in the raw HTML." : `Pages missing crawlable raw HTML: ${contentFailures.slice(0, 8).join(", ")}`,
    "Restore server-side/static SEO HTML generation so public page content is visible without browser JavaScript."
  );

  try {
    const missing = await request(`${domain}/this-page-should-not-exist-daily-health-check`);
    addCheck(
      "Real 404 response",
      missing.status === 404 ? "GREEN" : "RED",
      missing.status === 404 ? "Unknown URLs return 404." : `Unknown URL returned ${missing.status}.`,
      "Fix unknown route handling so junk URLs return a real 404."
    );
  } catch (error) {
    addCheck("Real 404 response", "RED", `404 check failed: ${error.message}`, "Fix unknown route handling.");
  }
}

function checkDatabaseContent() {
  if (!fs.existsSync(dbPath)) {
    addCheck("Database", "RED", `Database not found at ${dbPath}.`, "Find the live leads.db path and rerun the health check.");
    return;
  }

  const db = new Database(dbPath, { readonly: true });
  const allCourses = db.prepare("SELECT COUNT(*) AS count FROM courses").get().count;
  const lessonStats = db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN content_url IS NULL OR length(content_url)=0 THEN 1 ELSE 0 END) AS missing FROM lessons").get();
  addCheck(
    "Lesson media",
    Number(lessonStats.missing || 0) === 0 ? "GREEN" : "RED",
    `${lessonStats.total} lessons checked. Missing media: ${lessonStats.missing || 0}.`,
    "Attach media/content URLs to every lesson with a missing content_url."
  );

  const resources = db.prepare("SELECT id, title, file_url, is_free FROM resource_library ORDER BY id").all();
  const missingResources = resources.filter((resource) => !resource.file_url);
  addCheck(
    "Resource library links",
    missingResources.length === 0 ? "GREEN" : "RED",
    missingResources.length === 0 ? `${resources.length} resources checked. Missing file links: 0.` : `Missing links: ${missingResources.map((r) => `${r.id} ${r.title}`).join(", ")}`,
    "Attach file_url values to every resource_library row."
  );

  const paidResourceProblems = [];
  for (const resource of resources.filter((item) => !item.is_free)) {
    if (!String(resource.file_url || "").startsWith("/api/member/library/")) {
      paidResourceProblems.push(`${resource.id} ${resource.title}`);
    }
  }
  addCheck(
    "Paid resource protection",
    paidResourceProblems.length === 0 ? "GREEN" : "RED",
    paidResourceProblems.length === 0 ? "Paid resources use protected member download routes." : `Paid resources not protected: ${paidResourceProblems.join(", ")}`,
    "Move paid resources behind /api/member/library/:id/download and keep paid files out of the public folder."
  );

  const paidMembers = db.prepare("SELECT id, email, payment_status FROM members WHERE status = 'active' AND payment_status = 'paid'").all();
  const accessStmt = db.prepare(`
    SELECT COUNT(*) AS count
    FROM courses c
    WHERE ? = 1
       OR NOT EXISTS (SELECT 1 FROM member_course_access mca WHERE mca.member_id = ?)
       OR EXISTS (
         SELECT 1 FROM member_course_access mca2
         WHERE mca2.member_id = ? AND mca2.course_id = c.id AND mca2.granted = 1
       )
  `);
  const blockedPaidMembers = paidMembers.filter((member) => accessStmt.get(1, member.id, member.id).count !== allCourses);
  addCheck(
    "Paid member course access",
    blockedPaidMembers.length === 0 ? "GREEN" : "RED",
    blockedPaidMembers.length === 0 ? `${paidMembers.length} paid active members can access all ${allCourses} courses.` : `Paid members blocked from all courses: ${blockedPaidMembers.map((m) => m.email).join(", ")}`,
    "Restore paid-member bypass so payment_status = paid unlocks the full course library."
  );

  db.close();
}

async function checkResourceUrls() {
  const freeSlugs = [
    "papa-framework-guide",
    "purpose-discovery-worksheet",
    "presence-practices-30-day-plan",
    "life-alignment-assessment",
  ];
  const paidSlugs = [
    "authority-without-anger-workbook",
    "cosmic-insights-lunar-journal-companion",
  ];
  const freeFailures = [];
  for (const slug of freeSlugs) {
    try {
      const response = await request(`${domain}/resources/library/${slug}.pdf`, { method: "HEAD" });
      if (response.status !== 200 || !response.contentType.includes("pdf")) {
        freeFailures.push(`${slug} returned ${response.status} ${response.contentType}`);
      }
    } catch (error) {
      freeFailures.push(`${slug} failed: ${error.message}`);
    }
  }
  addCheck(
    "Free resource downloads",
    freeFailures.length === 0 ? "GREEN" : "RED",
    freeFailures.length === 0 ? "All free PDF resources are publicly downloadable." : freeFailures.join("; "),
    "Restore the missing free resource PDFs under /resources/library/."
  );

  const paidPublicProblems = [];
  for (const slug of paidSlugs) {
    try {
      const response = await request(`${domain}/resources/library/${slug}.pdf`, { method: "HEAD" });
      if (response.status !== 404) paidPublicProblems.push(`${slug} returned ${response.status}`);
    } catch (error) {
      paidPublicProblems.push(`${slug} failed: ${error.message}`);
    }
  }
  addCheck(
    "Paid resource public blocking",
    paidPublicProblems.length === 0 ? "GREEN" : "RED",
    paidPublicProblems.length === 0 ? "Paid PDFs are not exposed at public URLs." : paidPublicProblems.join("; "),
    "Remove paid PDFs from public folders and serve them only through protected member download routes."
  );

  for (const filename of ["authority-without-anger-workbook.pdf", "cosmic-insights-lunar-journal-companion.pdf"]) {
    if (!fs.existsSync(path.join(privateResourceDir, filename))) {
      addCheck("Private paid resource files", "RED", `${filename} missing from private resource folder.`, "Restore missing paid PDFs under server/private-resources/library.");
      return;
    }
  }
  addCheck("Private paid resource files", "GREEN", "Paid PDFs exist in the private resource folder.");
}

async function checkServerApps() {
  const problems = [];
  try {
    const mainHealth = await request(`${domain}/api/health`);
    if (mainHealth.status !== 200 || !mainHealth.text.includes('"ok":true')) {
      problems.push(`main site health returned ${mainHealth.status}`);
    }
  } catch (error) {
    problems.push(`main site health failed: ${error.message}`);
  }

  const mcpPort = envValue("MCP_PORT", "3009");
  try {
    const mcpHealth = await request(`http://127.0.0.1:${mcpPort}/health`);
    if (mcpHealth.status !== 200 || !mcpHealth.text.includes('"ok":true')) {
      problems.push(`helper health returned ${mcpHealth.status}`);
    }
  } catch (error) {
    problems.push(`helper health failed on port ${mcpPort}: ${error.message}`);
  }

  addCheck(
    "Server apps",
    problems.length === 0 ? "GREEN" : "RED",
    problems.length === 0 ? "Main site and helper service health endpoints are responding." : problems.join("; "),
    "Restart services one at a time with bash scripts/restart.sh."
  );
}

function buildPrompt(overall) {
  const badChecks = checks.filter((check) => check.status !== "GREEN");
  if (badChecks.length === 0) {
    return "No fix needed today. The daily BossMobileLifeCoach health check is green.";
  }
  return [
    `Fix BossMobileLifeCoach daily health check issues. Overall status: ${overall}.`,
    "",
    ...badChecks.map((check) => `- ${check.name}: ${check.detail} Fix: ${check.fixPrompt}`),
    "",
    "After fixing, rebuild/restart with bash scripts/restart.sh and rerun scripts/daily-site-health-check.mjs.",
  ].join("\n");
}

function writeReports() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const overall = severity();
  const fixPrompt = buildPrompt(overall);
  const markdown = [
    "# BossMobileLifeCoach Daily Health Check",
    "",
    `Generated: ${now.toISOString()}`,
    `Overall status: ${overall}`,
    "",
    "## Checks",
    "",
    ...checks.map((check) => `- **${check.status}** ${check.name}: ${check.detail}`),
    "",
    "## Fix Prompt",
    "",
    "```",
    fixPrompt,
    "```",
    "",
  ].join("\n");
  const json = JSON.stringify({ generated_at: now.toISOString(), overall, checks, fix_prompt: fixPrompt }, null, 2);
  fs.writeFileSync(path.join(reportsDir, `health-check-${stamp}.md`), markdown);
  fs.writeFileSync(path.join(reportsDir, "latest.md"), markdown);
  fs.writeFileSync(path.join(reportsDir, "latest.json"), json);
  console.log(markdown);
  if (overall === "RED") process.exitCode = 2;
  if (overall === "YELLOW") process.exitCode = 1;
}

try {
  await checkSearchVisibility();
  checkDatabaseContent();
  await checkResourceUrls();
  await checkServerApps();
} catch (error) {
  addCheck("Health check runner", "RED", error?.stack || error?.message || String(error), "Debug the daily health check script.");
} finally {
  writeReports();
}
