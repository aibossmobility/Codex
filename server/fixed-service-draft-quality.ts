/** Independent deterministic draft inspection. No model usage or automatic customer release. */
import type Database from "better-sqlite3";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {fixedServiceTemplates} from "./fixed-service-draft-worker";
export type DraftReview={jobId:string;checks:Record<string,boolean>;allChecksPass:boolean;fulfillmentComplete:false;status:"draft_passed_structure_only"|"draft_failed"};
export function inspectCustomerDraft(db:Database.Database,jobId:string,filepath:string):DraftReview{
 const job=db.prepare("SELECT * FROM customer_fulfillment_jobs WHERE id=?").get(jobId) as any;
 if(!job||job.brand!=="ai-boss-mobility"||job.state!=="production_ready")throw Error("AI Boss production-stage job required");
 const cfg=fixedServiceTemplates[job.product_code as keyof typeof fixedServiceTemplates];
 if(!cfg||cfg.cents!==job.price_cents)throw Error("Incorrect service or price");
 const st=fs.lstatSync(filepath);
 if(!st.isFile()||st.isSymbolicLink()||(st.mode&0o077)!==0||st.size>1000000)throw Error("Expected private regular draft file");
 const txt=fs.readFileSync(filepath,"utf8");
 const hash=createHash("sha256").update(txt).digest("hex");
 const event=db.prepare("SELECT evidence FROM customer_fulfillment_events WHERE job_id=? AND state='production_ready' ORDER BY recorded_at DESC LIMIT 1").get(jobId) as {evidence:string}|undefined;
 const checks={
  matchingService:txt.includes("# "+cfg.title+" — WORKING DRAFT"),
  allSections:cfg.sections.every(k=>txt.includes("## "+String(Array.from(cfg.sections).indexOf(k)+1)+". "+k)),
  explicitLimitations:txt.includes("Not a completed implementation or verified savings claim."),
  safeFileSize:txt.length>500&&txt.length<1000000,
  customerPrivacy:!/(?:\bsk-proj-\w+|-----BEGIN PRIVATE KEY-----|password\s*[:=]\s*\S+)/i.test(txt),
  hasQualityInstructions:txt.includes("Quality review before delivery"),
  sha256Evidence:event?.evidence?.includes(hash)===true
 };
 const allChecksPass=Object.values(checks).every(Boolean);
 return {jobId,checks,allChecksPass,fulfillmentComplete:false,status:allChecksPass?"draft_passed_structure_only":"draft_failed"};
}
