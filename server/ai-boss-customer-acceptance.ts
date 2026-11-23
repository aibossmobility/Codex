/**
 * Cross-service AI Boss 50%-down customer acceptance link.
 * Private issuance ONLY after independent QA + restored backup; never sends
 * email, authorizes an invoice, proves legal identity, or charges a customer.
 */
import type Database from "better-sqlite3";
import {createHash,randomBytes,randomUUID,timingSafeEqual} from "node:crypto";
import {initHalfDownGate,recordHalfDownCustomerDecision} from "./ai-boss-half-down-quality-gate";
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const hashOk=(s:any)=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
type Decision="accepted"|"changes_requested";
type Invite={id:string;job_id:string;version:number;artifact_sha:string;scope_sha:string;
 qa_sha:string;backup_sha:string;qa_event_id:string;backup_event_id:string;customer_email:string;token_hash:string;
 expires_at:number;consumed_at:number|null;revoked_at:number|null;preview_ref:string};
export function initHalfDownAcceptance(db:Database.Database){
 initHalfDownGate(db);
 db.exec("CREATE TABLE IF NOT EXISTS ai_boss_acceptance_invitations ("+
  "id TEXT PRIMARY KEY,job_id TEXT NOT NULL REFERENCES ai_boss_half_down_gates(job_id),"+
  "version INTEGER NOT NULL,artifact_sha TEXT NOT NULL,scope_sha TEXT NOT NULL,"+
  "qa_sha TEXT NOT NULL,backup_sha TEXT NOT NULL,qa_event_id TEXT NOT NULL,backup_event_id TEXT NOT NULL,customer_email TEXT NOT NULL,"+
  "token_hash TEXT NOT NULL UNIQUE,expires_at INTEGER NOT NULL,"+
  "consumed_at INTEGER,revoked_at INTEGER,preview_ref TEXT NOT NULL,created_at INTEGER NOT NULL);"+
  "CREATE INDEX IF NOT EXISTS idx_ai_boss_invite_job ON ai_boss_acceptance_invitations(job_id,version);");
}
const latestEvent=(db:Database.Database,id:string,kind:string)=>{
 const row=db.prepare("SELECT id FROM ai_boss_half_down_events WHERE job_id=? AND kind=? ORDER BY rowid DESC LIMIT 1").get(id,kind) as {id:string}|undefined;
 return row?.id||null;
};
const current=(db:Database.Database,id:string)=>db.prepare(
 "SELECT g.*,j.brand,j.state,j.customer_email,j.product_code,j.payment_evidence "+
 "FROM ai_boss_half_down_gates g JOIN customer_fulfillment_jobs j ON j.id=g.job_id WHERE g.job_id=?"
 ).get(id) as any;
function hasSignedQaProof(db:Database.Database,g:any){
 if(!g||!g.qa_sha)return false;
 const exists=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_boss_signed_qa_gate_proofs'").get();
 if(!exists)return false;
 const latest=latestEvent(db,g.job_id,"independent_qa_passed");
 if(!latest)return false;
 return !!db.prepare("SELECT run_id FROM ai_boss_signed_qa_gate_proofs WHERE job_id=? AND build_version=? AND gate_qa_sha=? AND reviewer=? AND qa_event_id=? LIMIT 1")
  .get(g.job_id,g.version,g.qa_sha,g.qa_actor,latest);
}
function eligible(db:Database.Database,g:any){
 return !!g&&g.brand==="ai-boss-mobility"&&g.state==="production_ready"&&
  Number.isSafeInteger(g.version)&&g.version>0&&hashOk(g.artifact_sha)&&hashOk(g.scope_sha)&&
  hashOk(g.qa_sha)&&g.qa_all_passed===1&&g.qa_actor&&g.qa_actor!==g.builder_actor&&
  g.backup_sha===g.artifact_sha&&g.backup_ref&&g.backup_restore_ref&&
  g.backup_actor&&g.backup_actor!==g.builder_actor&&
  g.customer_decision==="pending"&&!g.invoice_auth_ref&&
  hasSignedQaProof(db,g)&&
  String(g.signature_ref).startsWith("verified_signature:")&&
  String(g.payment_evidence).startsWith("verified_ghl:")&&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.customer_email);
}
const previewOk=(s:any)=>typeof s==="string"&&
 /^verified_preview:[a-zA-Z0-9:_-]{20,180}$/.test(s);
/** Only a trusted worker can call this after verifying a real preview was
 * provided. The opaque token must be delivered to job.customer_email by an
 * independent provider-email adapter that is NOT implemented here.
 */
export function issueHalfDownAcceptanceInvitation(db:Database.Database,input:{
 jobId:string;previewEvidenceRef:string;timeMs?:number;ttlHours?:number;
}){
 initHalfDownAcceptance(db);
 const now=input.timeMs??Date.now(),hours=input.ttlHours??72;
 if(!Number.isSafeInteger(now)||now<1||!Number.isSafeInteger(hours)||
  hours<1||hours>168||!previewOk(input.previewEvidenceRef))
  throw Error("Trusted preview proof and bounded lifetime required");
 return db.transaction(()=>{
  const g=current(db,input.jobId);
  if(!eligible(db,g))throw Error("Signed paid independently tested and backed-up version required");
  const qaEvent=latestEvent(db,input.jobId,"independent_qa_passed");
  const backupEvent=latestEvent(db,input.jobId,"backup_recovered_and_hash_verified");
  if(!qaEvent||!backupEvent)throw Error("Recorded independent QA and restored backup events required");
  const token=randomBytes(32).toString("base64url"),id=randomUUID();
  db.prepare("UPDATE ai_boss_acceptance_invitations SET revoked_at=? "+
   "WHERE job_id=? AND revoked_at IS NULL AND consumed_at IS NULL").run(now,input.jobId);
  db.prepare("INSERT INTO ai_boss_acceptance_invitations ("+
   "id,job_id,version,artifact_sha,scope_sha,qa_sha,backup_sha,qa_event_id,backup_event_id,customer_email,"+
   "token_hash,expires_at,preview_ref,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
   .run(id,input.jobId,g.version,g.artifact_sha,g.scope_sha,g.qa_sha,g.backup_sha,
    qaEvent,backupEvent,g.customer_email.toLowerCase(),sha(token),now+hours*3600000,
    input.previewEvidenceRef,now);
  return {inviteId:id,token,sendOnlyTo:g.customer_email,
   expiresAt:new Date(now+hours*3600000).toISOString(),version:g.version,
   artifactSha256:g.artifact_sha,previewEvidenceRef:input.previewEvidenceRef,
   emailSent:false,invoiceSent:false};
 })();
}
function tokenLookup(db:Database.Database,token:string,now:number):Invite|null{
 if(typeof token!=="string"||!/^[a-zA-Z0-9_-]{43}$/.test(token)||
  !Number.isSafeInteger(now)||now<1)return null;
 const hashed=sha(token),i=db.prepare(
  "SELECT * FROM ai_boss_acceptance_invitations WHERE token_hash=?").get(hashed) as Invite|undefined;
 if(!i||i.consumed_at!==null||i.revoked_at!==null||i.expires_at<=now||
  !timingSafeEqual(Buffer.from(i.token_hash,"hex"),Buffer.from(hashed,"hex")))return null;
 const g=current(db,i.job_id);
 if(!eligible(db,g)||g.version!==i.version||g.artifact_sha!==i.artifact_sha||
  g.scope_sha!==i.scope_sha||g.qa_sha!==i.qa_sha||
  g.backup_sha!==i.backup_sha||g.customer_email.toLowerCase()!==i.customer_email||
  latestEvent(db,i.job_id,"independent_qa_passed")!==i.qa_event_id||
  latestEvent(db,i.job_id,"backup_recovered_and_hash_verified")!==i.backup_event_id)return null;
 return i;
}
export function getHalfDownAcceptancePreview(db:Database.Database,token:string,now=Date.now()){
 initHalfDownAcceptance(db);
 const i=tokenLookup(db,token,now);if(!i)return null;
 const g=current(db,i.job_id);
 const criteria=JSON.parse(g.criteria_json) as {id:string;expectation:string}[];
 return {inviteId:i.id,serviceCode:g.service_code,version:i.version,
  artifactSha256:i.artifact_sha,scopeSha256:i.scope_sha,
  criteria:criteria.map(c=>({id:c.id,expectation:c.expectation,passed:true})),
  qaReportSha256:i.qa_sha,backupRestoreVerified:true,
  previewEvidenceRef:i.preview_ref,remainingBalanceCents:g.deposit_cents,
  amountDueNowCents:0,customerAccepted:false,invoiceSent:false};
}
export function submitHalfDownCustomerResponse(db:Database.Database,input:{
 token:string;decision:Decision;notes:string;viewedPreview:boolean;
 reviewedTestResults:boolean;affirmativeAcceptance?:boolean;timeMs?:number;
}){
 initHalfDownAcceptance(db);
 const now=input.timeMs??Date.now();
 return db.transaction(()=>{
  const i=tokenLookup(db,input.token,now);
  if(!i||!["accepted","changes_requested"].includes(input.decision)||
   input.viewedPreview!==true||input.reviewedTestResults!==true||
   typeof input.notes!=="string"||input.notes.trim().length<15||
   input.notes.length>2000||
   (input.decision==="accepted"&&input.affirmativeAcceptance!==true))
   throw Error("Valid customer invitation and explicit review required");
  const result=recordHalfDownCustomerDecision(db,{
   jobId:i.job_id,artifactSha:i.artifact_sha,decision:input.decision,
   verifiedCustomerRef:"verified_customer:email_link:"+i.id,notes:input.notes.trim()
  });
  const updated=db.prepare("UPDATE ai_boss_acceptance_invitations SET consumed_at=? "+
   "WHERE id=? AND consumed_at IS NULL AND revoked_at IS NULL").run(now,i.id);
  if(updated.changes!==1)throw Error("Customer invitation replay");
  db.prepare("UPDATE ai_boss_acceptance_invitations SET revoked_at=? "+
   "WHERE job_id=? AND id<>? AND consumed_at IS NULL AND revoked_at IS NULL")
   .run(now,i.job_id,i.id);
  return {decision:input.decision,accepted:result.accepted,
   jobId:i.job_id,version:i.version,artifactSha256:i.artifact_sha,
   requiresNewBuild:input.decision==="changes_requested",
   invoiceSent:false,paymentCharged:false};
 })();
}
