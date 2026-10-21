/** Read-only local worker skill; no AI, messages, purchases, or edits. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
const SITES = {
  "papa-life": { origin:"https://papalifecoach.com", paths:[
    "/", "/papa-life-os", "/papa-life-os/approvals", "/papa-life-os/digital-twin",
    "/digital-twin", "/courses", "/papa-first-lesson", "/papa-framework",
    "/assessment", "/about-brian-keith-hill" ] },
  "ai-boss-mobility": { origin:"https://ai.bossmobilelifecoach.com", paths:["/"] },
};
const PREVENT_EXTERNAL = /\b(send|email|upload|publish|broadcast|start streaming|record|edit|change|delete|update|save to youtube|configure|fix|repair|post|invoice|charge|buy|pay|deploy)\b/i;
async function checkUrl(url) {
  try {
    const result = await fetch(url,{method:"HEAD",redirect:"error",signal:AbortSignal.timeout(8000),
      headers:{"user-agent":"PapaLifeOS-Owner-ReadOnly-Worker/1.0"}});
    return {url,status:result.status,ok:result.status>=200&&result.status<400};
  } catch(error) { return {url,status:null,ok:false,error:String(error).slice(0,150)}; }
}
function block(reason,next) { return { deliverable_verified:false,block_reason:reason,next_step:next,evidence:[] }; }
export async function inspectReadOnlyTask(role,project,instruction,rootDir=os.homedir()+"/.ai-boss-os") {
  if (!Object.hasOwn(SITES,project)) throw Error("Unknown business project");
  if(typeof instruction!=="string"||instruction.length<12||instruction.length>2000)throw Error("Invalid assignment");
  if(role!=="seo-website") return block(
    "The worker only inspected role references; its read-only capability does not perform the requested external or administrative action.",
    "Use a worker with verified access and specific execution approval, and require a file, record, confirmation, or linked result.");
  if(PREVENT_EXTERNAL.test(instruction)) return block(
    "Website review only: this worker cannot edit, send, deploy, broadcast, or repair links.",
    "Approve a separately scoped worker with the needed write access after reviewing the request.");
  if(!/(web(site)?|link|seo|route|page|audit|review|check|health)/.test(instruction.toLowerCase()))
    return block("Requested task is outside this worker's checked website-audit capability.",
      "Choose an execution-capable worker with a testable deliverable.");
  const site=SITES[project];
  const checked=await Promise.all(site.paths.map(p=>checkUrl(site.origin+p)));
  const bad=checked.filter(x=>!x.ok);
  const reportDir=path.join(rootDir,"reports");
  fs.mkdirSync(reportDir,{recursive:true,mode:0o700});
  const reportFile=path.join(reportDir,"worker-site-audit-"+project+"-"+Date.now()+"-"+randomUUID().slice(0,8)+".json");
  fs.writeFileSync(reportFile,JSON.stringify({project,instruction,checked_at:new Date().toISOString(),checked,read_only:true},null,2),{mode:0o600,flag:"wx"});
  const summary="Website worker checked "+checked.length+" approved "+project+" URLs; "+(checked.length-bad.length)+" responded, "+bad.length+" require attention. Saved a local read-only report with HTTP results. No edits or paid AI calls.";
  return {
    deliverable_verified:true,deliverable_summary:summary,
    evidence:[
      ...checked.map(item => ({
        kind:"http-check",description:"Read-only website check returned HTTP "+(item.status ?? "ERROR")+" for "+new URL(item.url).pathname+".",reference:item.url,
      })),
      {kind:"local-report",description:"Saved complete per-URL HTTP evidence in the Mac worker reports folder.",reference:reportFile},
    ],
    checked_count:checked.length,failed_count:bad.length,read_only:true,
  };
}
