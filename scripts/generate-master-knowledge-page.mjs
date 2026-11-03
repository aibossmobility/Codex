import fs from "node:fs";
import path from "node:path";

// The complete master knowledge base belongs in private Google Workspace.
// Do not generate or ship its historical full content as a public HTML page.
const outputPath = path.resolve("client/public/papa-life-master-knowledge-center/index.html");
const html = fs.readFileSync(outputPath, "utf8");
if (!html.includes("Papa Life Owner Knowledge Center") ||
    !html.includes('name="robots" content="noindex,nofollow,noarchive"') ||
    html.includes("The complete Papa Life Master Skill")) {
  throw new Error("Owner-only knowledge center placeholder missing or unsafe");
}
console.log("Verified owner-only knowledge center placeholder");
