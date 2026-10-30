/** Secure, tenant-isolated AI Boss customer selections and quote intake.
 * A quote is not an order and NEVER proves payment. Designed for Papa Life OS.
 */
import type Database from "better-sqlite3";
import {randomBytes,createHash,randomUUID} from "node:crypto";
import { fixedServiceTemplates,type ClientBrief } from "./fixed-service-draft-worker";

type Code=keyof typeof fixedServiceTemplates;
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const validEmail=(s:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
const allowed=(v:string)=>typeof v==="string"&&v.trim().length>=8&&v.length<=800&&!/[\x00-\x1f]/.test(v);
export type CustomerIntake={
 productCode:Code;email:string;brief:ClientBrief;
 acceptedTerms:boolean;
};
export function initializeCustomerIntake(db:Database.Database){
 db.exec(`CREATE TABLE IF NOT EXISTS ai_boss_customer_intakes (
 id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,
 email TEXT NOT NULL,product_code TEXT NOT NULL,expected_cents INTEGER NOT NULL,
 brief_json TEXT NOT NULL,terms_accepted_at TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK(state IN ('awaiting_payment','verified','working','quality_review','delivered','needs_help')),
 payment_transaction_id TEXT UNIQUE,verified_job_id TEXT,
 created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now'))
 );
 CREATE INDEX IF NOT EXISTS idx_ai_boss_intakes_state ON ai_boss_customer_intakes(state);`);
}
function validateBrief(brief:any):brief is ClientBrief{
 if(!brief||!allowed(brief.organization)||!allowed(brief.objective)||!allowed(brief.currentWorkflow))return false;
 if(!Array.isArray(brief.toolsInUse)||!Array.isArray(brief.constraints)||
  brief.toolsInUse.length>20||brief.constraints.length>20||
  !brief.toolsInUse.every((x:any)=>allowed(x))||!brief.constraints.every((x:any)=>allowed(x)))return false;
 for(const k of ["expectedHoursSavedPerMonth","hourlyCostUsd","estimatedMonthlyToolCostUsd"]){
  const v=brief[k];if(v!==undefined&&(!Number.isFinite(v)||v<0||v>100000))return false;
 }
 return true;
}
export function createCustomerIntake(db:Database.Database,input:CustomerIntake){
 const config=fixedServiceTemplates[input?.productCode];
 if(!config||!validEmail(input?.email?.trim().toLowerCase()||"")||!validateBrief(input.brief)||
  input.acceptedTerms!==true)throw Error("Valid customer choice, complete brief and accepted terms required");
 initializeCustomerIntake(db);
 const id=randomUUID(),token=randomBytes(32).toString("base64url"),email=input.email.trim().toLowerCase();
 const brief=JSON.stringify({organization:input.brief.organization.trim(),objective:input.brief.objective.trim(),
 currentWorkflow:input.brief.currentWorkflow.trim(),toolsInUse:input.brief.toolsInUse.map(x=>x.trim()),
 constraints:input.brief.constraints.map(x=>x.trim()),
 ...(input.brief.expectedHoursSavedPerMonth===undefined?{}:{expectedHoursSavedPerMonth:input.brief.expectedHoursSavedPerMonth}),
 ...(input.brief.hourlyCostUsd===undefined?{}:{hourlyCostUsd:input.brief.hourlyCostUsd}),
 ...(input.brief.estimatedMonthlyToolCostUsd===undefined?{}:{estimatedMonthlyToolCostUsd:input.brief.estimatedMonthlyToolCostUsd})});
 db.prepare(`INSERT INTO ai_boss_customer_intakes
 (id,token_hash,email,product_code,expected_cents,brief_json,terms_accepted_at)
 VALUES(?,?,?,?,?,?,datetime('now'))`).run(id,sha(token),email,input.productCode,config.cents,brief);
 return {intakeId:id,privateStatusToken:token,brand:"ai-boss-mobility" as const,
  product:config.title,priceCents:config.cents,state:"awaiting_payment" as const,
  paymentVerified:false,checkoutReady:false};
}
export function findCustomerIntakeByToken(db:Database.Database,id:string,token:string){
 if(!/^[\da-f-]{36}$/i.test(id)||!token||token.length>100)return null;
 initializeCustomerIntake(db);
 const row=db.prepare(`SELECT id,product_code,expected_cents,state,created_at FROM ai_boss_customer_intakes
 WHERE id=? AND token_hash=?`).get(id,sha(token)) as any;
 if(!row)return null;
 return {intakeId:row.id,brand:"ai-boss-mobility",productCode:row.product_code,
  priceCents:row.expected_cents,state:row.state,paymentVerified:row.state!=="awaiting_payment",
  delivered:row.state==="delivered"};
}
export function findUnpaidIntakeForVerifiedGhlOrder(db:Database.Database,id:string,email:string,productCode:string,amountCents:number){
 initializeCustomerIntake(db);
 const row=db.prepare(`SELECT * FROM ai_boss_customer_intakes WHERE id=? AND email=?
 AND product_code=? AND expected_cents=? AND state='awaiting_payment'`).get(id,email.trim().toLowerCase(),productCode,amountCents) as any;
 if(!row)throw Error("No matching customer-authorized AI Boss brief");
 return {id:row.id,brief:JSON.parse(row.brief_json) as ClientBrief,email:row.email,code:row.product_code,cents:row.expected_cents};
}
/** Only called AFTER authoritative provider-side verification in the dedicated AI Boss GHL location. */
export function associateVerifiedCustomerIntake(db:Database.Database,id:string,txId:string,jobId:string){
 if(!/^[\da-f-]{36}$/i.test(id)||!txId||!jobId)throw Error("Valid verification references required");
 initializeCustomerIntake(db);
 const result=db.prepare(`UPDATE ai_boss_customer_intakes SET state='verified',
 payment_transaction_id=?,verified_job_id=?,updated_at=datetime('now')
 WHERE id=? AND state='awaiting_payment' AND payment_transaction_id IS NULL`).run(txId,jobId,id);
 if(result.changes!==1)throw Error("Intake already processed or absent");
 return {id,state:"verified" as const};
}
