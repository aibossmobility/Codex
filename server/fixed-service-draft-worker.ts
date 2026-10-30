/** Free, deterministic AI Boss preliminary report builder.
 * It creates a draft artifact only for a verified customer fulfillment job.
 * It does not send, publish, contact customers, deploy, call models, or mark delivered.
 */
import type Database from "better-sqlite3";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { advanceCustomerJob } from "./customer-fulfillment-ledger";

export type ClientBrief = {
  organization:string;
  objective:string;
  currentWorkflow:string;
  toolsInUse:string[];
  constraints:string[];
  expectedHoursSavedPerMonth?:number;
  hourlyCostUsd?:number;
  estimatedMonthlyToolCostUsd?:number;
};
export const fixedServiceTemplates = {
 "ai.feasibility.readiness": {cents:35000,title:"AI Feasibility & Readiness",sections:["Readiness summary","AI opportunities","Risk register","Prioritized next steps","Findings-review agenda"]},
 "ai.strategy.planning":{cents:75000,title:"AI Strategy & Planning",sections:["Options comparison","Cost and risk assessment","Phased implementation roadmap","Next-step guidance"]},
 "ai.workflow.automation":{cents:125000,title:"AI Workflow Automation",sections:["One scoped workflow specification","Prototype acceptance tests","Handoff guide","Walkthrough agenda"]},
 "ai.cost.benefit.roi":{cents:45000,title:"AI Cost-Benefit & ROI",sections:["Assumptions","Scenario-based ROI worksheet","Sensitivity notes","Recommendation"]},
 "ai.leadership.education":{cents:50000,title:"AI Leadership Education",sections:["Two-hour workshop agenda","Handouts and exercises","Five reusable prompts","Leadership checklist","Follow-up plan"]}
} as const;
type Code = keyof typeof fixedServiceTemplates;
const validText=(s:unknown,max=800)=>typeof s==="string"&&s.trim().length>=8&&s.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s);
function escapeMd(value:string){return value.replace(/[<>]/g,"").replace(/\[/g,"\\[").replace(/\]/g,"\\]");}
function money(n:number){return "$"+n.toFixed(2);}
export function planFixedServiceDraft(db:Database.Database,jobId:string,brief:ClientBrief) {
 const job=db.prepare("SELECT * FROM customer_fulfillment_jobs WHERE id=?").get(jobId) as any;
 if(!job||job.brand!=="ai-boss-mobility"||job.state!=="payment_verified")throw Error("Verified AI Boss job at initial stage required");
 const config=fixedServiceTemplates[job.product_code as Code];
 if(!config||job.price_cents!==config.cents||!String(job.payment_evidence).startsWith("verified_ghl:"))throw Error("Known exact-price and provider-verified service required");
 if(!validText(brief.organization,150)||!validText(brief.objective)||!validText(brief.currentWorkflow)||
 !Array.isArray(brief.toolsInUse)||!Array.isArray(brief.constraints)||brief.toolsInUse.length>20||brief.constraints.length>20||
 !brief.toolsInUse.every(s=>validText(s,150))||!brief.constraints.every(s=>validText(s,200)))throw Error("Complete bounded customer brief required");
 const hasFinancials=[brief.expectedHoursSavedPerMonth,brief.hourlyCostUsd,brief.estimatedMonthlyToolCostUsd].every(x=>Number.isFinite(x)&&Number(x)>=0&&Number(x)<=100000);
 if(Object.values(brief).some(v=>typeof v==="number"&&!Number.isFinite(v)))throw Error("Nonfinite financial assumptions");
 const safe=(s:string)=>escapeMd(s.trim());
 const intro=["# "+config.title+" — WORKING DRAFT","",
  "**Not a completed implementation or verified savings claim.**",
  "**Customer organization:** "+safe(brief.organization),
  "**Purchased package:** "+money(config.cents/100)+" one-time",
  "**Objective:** "+safe(brief.objective),
  "**Current workflow:** "+safe(brief.currentWorkflow),
  "**Current tools:** "+brief.toolsInUse.map(safe).join(", "),
  "**Customer constraints:** "+brief.constraints.map(safe).join("; "),""];
 const sections=config.sections.map((section,index)=>{
  let notes="This section requires project-specific validation against the customer's submitted inputs before release.";
  if(section==="Assumptions"&&hasFinancials)notes="Customer estimates: "+brief.expectedHoursSavedPerMonth+" hours/month saved; "+money(brief.hourlyCostUsd!)+" per hour; "+money(brief.estimatedMonthlyToolCostUsd!)+" in monthly software costs. These figures are customer-supplied, unverified.";
  if(section==="Scenario-based ROI worksheet"&&hasFinancials){
   const monthly=brief.expectedHoursSavedPerMonth!*brief.hourlyCostUsd!-brief.estimatedMonthlyToolCostUsd!;
   notes="Illustrative monthly net benefit = "+money(monthly)+". Illustrative annual net benefit = "+money(monthly*12)+". Does not include implementation fees, maintenance, risks, taxation, or adoption effort.";
  }
  if(section==="Five reusable prompts")notes=["Explain this workflow to a beginner using plain language.","List assumptions and missing information before proposing changes.","Identify privacy and consent risks in this process.","Compare two implementation choices and their tradeoffs.","Produce a step-by-step checklist with verification criteria."].map((x,i)=>String(i+1)+". "+x).join("\n");
  if(section==="Prototype acceptance tests")notes="Describe acceptance criteria, test inputs, expected outputs, error recovery and authorized external integrations before writing automation.";
  if(section==="Two-hour workshop agenda")notes="Draft agenda: 0–20m discovery, 20–45m AI foundations, 45–75m guided examples, 75–105m exercises, 105–120m questions. A live session is not fulfilled by this draft.";
  return "## "+String(index+1)+". "+section+"\n\n"+notes+"\n";
 });
 const contents=[...intro,...sections,"## Quality review before delivery\n\n- Confirm client requirements and package boundaries.\n- Check sources, permission, and deliverable completeness.\n- Verify no fabricated findings, completed integrations or customer savings.\n- Release only after independent quality approval and a secure delivery route.\n"].join("\n");
 return {jobId,productCode:job.product_code,title:config.title,contents,sha256:createHash("sha256").update(contents).digest("hex"),readyForDelivery:false,qualityPassed:false};
}
export function saveFixedServiceWorkingDraft(db:Database.Database,jobId:string,brief:ClientBrief,dir:string){
 const planned=planFixedServiceDraft(db,jobId,brief);
 if(!path.isAbsolute(dir)||!fs.existsSync(dir)||!fs.statSync(dir).isDirectory())throw Error("Existing protected working directory required");
 const resolved=fs.realpathSync(dir);
 if(!resolved.includes("/private-fulfillment/")&&!resolved.endsWith("/private-fulfillment"))throw Error("Draft destination must be private-fulfillment");
 const filepath=path.join(resolved,jobId+".md");
 if(fs.existsSync(filepath))throw Error("Existing customer draft requires explicit reconciliation");
 fs.writeFileSync(filepath,planned.contents,{flag:"wx",mode:0o600});
 try{advanceCustomerJob(db,jobId,"production_ready","Local fixed-scope draft "+planned.sha256+" saved to private fulfillment");}
 catch(error){fs.rmSync(filepath,{force:true});throw error;}
 return {jobId,filepath,sha256:planned.sha256,readyForDelivery:false,qualityPassed:false};
}
