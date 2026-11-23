/**
 * Universal AI Boss Mobility 50%-deposit evidence gate, for every service code.
 * Deliberately has NO invoice-sending, money-moving, backup-writing or
 * customer-messaging side effects. Its final-invoice result is advisory until
 * a verified payment/signature/customer portal adapter invokes it.
 */
import type Database from "better-sqlite3";
import {createHash,randomUUID} from "node:crypto";
const sha=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const hashOk=(v:any)=>typeof v==="string"&&/^[a-f0-9]{64}$/i.test(v);
const refOk=(v:any)=>typeof v==="string"&&v.length>=14&&v.length<=500&&!/[\x00-\x1f]/.test(v);
const actorOk=(v:any)=>typeof v==="string"&&v.trim().length>=4&&v.length<=120;
type Criterion={id:string;expectation:string};
type Check={criterionId:string;passed:boolean;expected:string;observed:string;evidenceRef:string};
export function initHalfDownGate(db:Database.Database){
 db.exec("CREATE TABLE IF NOT EXISTS ai_boss_half_down_gates ("+
  "job_id TEXT PRIMARY KEY REFERENCES customer_fulfillment_jobs(id),"+
  "service_code TEXT NOT NULL,total_cents INTEGER NOT NULL,deposit_cents INTEGER NOT NULL,"+
  "scope_sha TEXT NOT NULL,signature_ref TEXT NOT NULL,criteria_json TEXT NOT NULL,"+
  "builder_actor TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0,"+
  "artifact_sha TEXT,primary_ref TEXT,qa_actor TEXT,qa_sha TEXT,qa_all_passed INTEGER NOT NULL DEFAULT 0,"+
  "backup_ref TEXT,backup_sha TEXT,backup_restore_ref TEXT,backup_actor TEXT,"+
  "customer_decision TEXT NOT NULL DEFAULT 'pending',customer_ref TEXT,customer_notes TEXT,"+
  "invoice_auth_ref TEXT,updated_at TEXT DEFAULT(datetime('now')));"+
  "CREATE TABLE IF NOT EXISTS ai_boss_half_down_events("+
  "id TEXT PRIMARY KEY,job_id TEXT NOT NULL REFERENCES ai_boss_half_down_gates(job_id),"+
  "kind TEXT NOT NULL,proof TEXT NOT NULL,at TEXT NOT NULL DEFAULT(datetime('now')));");
}
function gate(db:Database.Database,id:string):any{
 initHalfDownGate(db);
 const g=db.prepare("SELECT * FROM ai_boss_half_down_gates WHERE job_id=?").get(id) as any;
 if(!g)throw Error("Enrolled half-down order required");
 return g;
}
function audit(db:Database.Database,id:string,kind:string,proof:string){
 db.prepare("INSERT INTO ai_boss_half_down_events(id,job_id,kind,proof) VALUES(?,?,?,?)")
 .run(randomUUID(),id,kind,proof.slice(0,1000));
}
export function enrollHalfDownOrder(db:Database.Database,input:{
 jobId:string;totalCents:number;depositCents:number;scopeSha:string;
 verifiedSignatureRef:string;criteria:Criterion[];builderActor:string;
}){
 initHalfDownGate(db);
 return db.transaction(()=>{
  const j=db.prepare("SELECT * FROM customer_fulfillment_jobs WHERE id=?").get(input.jobId) as any;
  if(!j||j.brand!=="ai-boss-mobility"||j.state!=="payment_verified"||
   !String(j.payment_evidence).startsWith("verified_ghl:")||
   j.price_cents!==input.depositCents||!Number.isSafeInteger(input.totalCents)||
   !Number.isSafeInteger(input.depositCents)||input.depositCents<=0||
   input.depositCents*2!==input.totalCents||!hashOk(input.scopeSha)||
   !refOk(input.verifiedSignatureRef)||
   !input.verifiedSignatureRef.startsWith("verified_signature:")||
   !actorOk(input.builderActor)||!Array.isArray(input.criteria)||
   input.criteria.length<1||input.criteria.length>50||
   input.criteria.some(c=>!c||!/^[a-z0-9][a-z0-9_-]{1,55}$/i.test(c.id)||
    typeof c.expectation!=="string"||c.expectation.trim().length<12||c.expectation.length>500)||
   new Set(input.criteria.map(c=>c.id)).size!==input.criteria.length)
    throw Error("Signed scope and provider-verified exact 50% deposit required");
  if(db.prepare("SELECT job_id FROM ai_boss_half_down_gates WHERE job_id=?").get(input.jobId))
    throw Error("Existing half-down order cannot be overwritten");
  db.prepare("INSERT INTO ai_boss_half_down_gates(job_id,service_code,total_cents,deposit_cents,"+
   "scope_sha,signature_ref,criteria_json,builder_actor) VALUES(?,?,?,?,?,?,?,?)")
   .run(input.jobId,j.product_code,input.totalCents,input.depositCents,input.scopeSha,
    input.verifiedSignatureRef,JSON.stringify(input.criteria),input.builderActor);
  audit(db,input.jobId,"signed_scope_and_deposit",input.verifiedSignatureRef);
  return {jobId:input.jobId,finalBalanceCents:input.depositCents,invoiceEligible:false};
 })();
}
export function recordHalfDownBuild(db:Database.Database,input:{
 jobId:string;artifactSha:string;primaryRef:string;builderActor:string;
}){
 return db.transaction(()=>{
  const g=gate(db,input.jobId);
  const j=db.prepare("SELECT state FROM customer_fulfillment_jobs WHERE id=?").get(input.jobId) as any;
  if(j?.state!=="production_ready"||!hashOk(input.artifactSha)||
   !refOk(input.primaryRef)||input.builderActor!==g.builder_actor||g.invoice_auth_ref)
    throw Error("Versioned unfinished production evidence required");
  db.prepare("UPDATE ai_boss_half_down_gates SET version=version+1,artifact_sha=?,primary_ref=?,"+
   "qa_actor=NULL,qa_sha=NULL,qa_all_passed=0,backup_ref=NULL,backup_sha=NULL,"+
   "backup_restore_ref=NULL,backup_actor=NULL,customer_decision='pending',customer_ref=NULL,"+
   "customer_notes=NULL,updated_at=datetime('now') WHERE job_id=?")
   .run(input.artifactSha,input.primaryRef,input.jobId);
  audit(db,input.jobId,"new_build_version",String(g.version+1)+":"+input.artifactSha);
  return {version:g.version+1,invoiceEligible:false};
 })();
}
export function recordHalfDownQa(db:Database.Database,input:{
 jobId:string;artifactSha:string;qaActor:string;tests:Check[];
}){
 return db.transaction(()=>{
  const g=gate(db,input.jobId),criteria=JSON.parse(g.criteria_json) as Criterion[];
  if(g.artifact_sha!==input.artifactSha||!actorOk(input.qaActor)||
   input.qaActor===g.builder_actor||!Array.isArray(input.tests)||
   input.tests.length!==criteria.length||
   new Set(input.tests.map(t=>t.criterionId)).size!==criteria.length||
   criteria.some(c=>!input.tests.some(t=>t.criterionId===c.id&&
    t.expected===c.expectation&&typeof t.observed==="string"&&
    t.observed.length>=8&&t.observed.length<=500&&
    typeof t.passed==="boolean"&&refOk(t.evidenceRef)))||
   g.invoice_auth_ref)throw Error("Independent test result for every signed criterion required");
  const passed=input.tests.every(t=>t.passed);
  const proof=sha(JSON.stringify({artifact:input.artifactSha,tests:input.tests,actor:input.qaActor}));
  db.prepare("UPDATE ai_boss_half_down_gates SET qa_actor=?,qa_sha=?,qa_all_passed=?,"+
   "customer_decision='pending',customer_ref=NULL,customer_notes=NULL WHERE job_id=?")
   .run(input.qaActor,proof,passed?1:0,input.jobId);
  audit(db,input.jobId,passed?"independent_qa_passed":"independent_qa_failed",proof);
  return {allChecksPass:passed,invoiceEligible:false,qaSha:proof};
 })();
}
export function verifyHalfDownRestoredBackup(db:Database.Database,input:{
 jobId:string;artifactSha:string;backupRef:string;primaryRef:string;restoredBytes:Buffer;
 restoreEvidenceRef:string;backupActor:string;
}){
 return db.transaction(()=>{
  const g=gate(db,input.jobId);
  if(g.artifact_sha!==input.artifactSha||g.primary_ref!==input.primaryRef||
   !Buffer.isBuffer(input.restoredBytes)||input.restoredBytes.length<1||
   input.restoredBytes.length>40_000_000||sha(input.restoredBytes)!==g.artifact_sha||
   !refOk(input.backupRef)||input.backupRef===input.primaryRef||
   !/^(gdrive:|s3:|external-drive:|secure-vault:)/.test(input.backupRef)||
   !refOk(input.restoreEvidenceRef)||!actorOk(input.backupActor)||
   input.backupActor===g.builder_actor||g.invoice_auth_ref)
   throw Error("Matching bytes restored from independently located backup required");
  db.prepare("UPDATE ai_boss_half_down_gates SET backup_ref=?,backup_sha=?,"+
   "backup_restore_ref=?,backup_actor=?,customer_decision='pending',"+
   "customer_ref=NULL,customer_notes=NULL WHERE job_id=?")
   .run(input.backupRef,input.artifactSha,input.restoreEvidenceRef,input.backupActor,input.jobId);
  audit(db,input.jobId,"backup_recovered_and_hash_verified",input.restoreEvidenceRef);
  return {backupVerified:true,invoiceEligible:false};
 })();
}
export function recordHalfDownCustomerDecision(db:Database.Database,input:{
 jobId:string;artifactSha:string;decision:"accepted"|"changes_requested";
 verifiedCustomerRef:string;notes:string;
}){
 return db.transaction(()=>{
  const g=gate(db,input.jobId);
  if(g.artifact_sha!==input.artifactSha||g.qa_all_passed!==1||
   g.backup_sha!==g.artifact_sha||!g.backup_restore_ref||
   !["accepted","changes_requested"].includes(input.decision)||
   !refOk(input.verifiedCustomerRef)||
   !input.verifiedCustomerRef.startsWith("verified_customer:")||
   !input.notes?.trim()||input.notes.length>2000||g.invoice_auth_ref)
    throw Error("Verified customer approval of the exact QA-passed, backed-up version required");
  db.prepare("UPDATE ai_boss_half_down_gates SET customer_decision=?,customer_ref=?,"+
   "customer_notes=? WHERE job_id=?")
   .run(input.decision,input.verifiedCustomerRef,input.notes,input.jobId);
  audit(db,input.jobId,"customer_"+input.decision,input.verifiedCustomerRef);
  return {accepted:input.decision==="accepted",invoiceEligible:input.decision==="accepted"};
 })();
}
export function halfDownFinalInvoiceDecision(db:Database.Database,jobId:string){
 const g=gate(db,jobId);
 const j=db.prepare("SELECT * FROM customer_fulfillment_jobs WHERE id=?").get(jobId) as any;
 const reasons:string[]=[];
 if(!j||j.brand!=="ai-boss-mobility"||j.product_code!==g.service_code||
  j.price_cents!==g.deposit_cents||!String(j.payment_evidence).startsWith("verified_ghl:"))
   reasons.push("verified deposit missing");
 if(!g.signature_ref?.startsWith("verified_signature:"))reasons.push("signed agreement missing");
 if(!hashOk(g.artifact_sha)||!refOk(g.primary_ref))reasons.push("completed version missing");
 if(g.qa_all_passed!==1||!g.qa_sha||g.qa_actor===g.builder_actor)
   reasons.push("independent QA not passed");
 if(!g.backup_ref||g.backup_sha!==g.artifact_sha||
  !g.backup_restore_ref||g.backup_actor===g.builder_actor)
   reasons.push("restorable independent backup not verified");
 if(g.customer_decision!=="accepted"||!g.customer_ref?.startsWith("verified_customer:"))
   reasons.push("customer has not accepted this version");
 if(g.invoice_auth_ref)reasons.push("final invoice already authorized");
 return {eligible:reasons.length===0,reasons,finalBalanceCents:g.deposit_cents,
  serviceCode:g.service_code,version:g.version,artifactSha:g.artifact_sha,
  sendsInvoice:false};
}
export function authorizeHalfDownFinalInvoice(db:Database.Database,jobId:string){
 return db.transaction(()=>{
  const decision=halfDownFinalInvoiceDecision(db,jobId);
  if(!decision.eligible)throw Error("Final invoice blocked: "+decision.reasons.join("; "));
  const receipt="internal_final_invoice_gate:"+randomUUID();
  db.prepare("UPDATE ai_boss_half_down_gates SET invoice_auth_ref=? WHERE job_id=? AND invoice_auth_ref IS NULL")
   .run(receipt,jobId);
  audit(db,jobId,"final_invoice_authorized",receipt);
  return {authorizationRef:receipt,amountCents:decision.finalBalanceCents,
   version:decision.version,invoiceSent:false};
 })();
}
export function halfDownAuditEvents(db:Database.Database,jobId:string){
 gate(db,jobId);
 return db.prepare("SELECT kind,proof,at FROM ai_boss_half_down_events WHERE job_id=? ORDER BY rowid").all(jobId);
}
