import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {test} from "node:test";
import Database from "better-sqlite3";
import {registerVerifiedCustomerOrder,advanceCustomerJob} from "./customer-fulfillment-ledger";
import {enrollHalfDownOrder,recordHalfDownBuild,recordHalfDownQa,
 verifyHalfDownRestoredBackup,halfDownFinalInvoiceDecision} from "./ai-boss-half-down-quality-gate";
import {initHalfDownAcceptance,issueHalfDownAcceptanceInvitation,
 getHalfDownAcceptancePreview,submitHalfDownCustomerResponse} from "./ai-boss-customer-acceptance";
const sha=(b:string|Buffer)=>createHash("sha256").update(b).digest("hex");
const artifact=Buffer.from("Internal-only artifact, made solely to test versioned customer acceptance");
const artifactSha=sha(artifact),scopeSha=sha("Internal simulated signed scope: NOT A REAL CONTRACT");
const criteria=[{id:"consent",expectation:"Only opted-in inbound contacts receive outreach messages"}];
const proof="verified_preview:internal_fixture_review_panel_00001";
const when=Date.UTC(2026,10,23,18,25);
function setup(serviceCode="service-13",cents=49750,brand:"ai-boss-mobility"|"papa-life"="ai-boss-mobility"){
 const db=new Database(":memory:");
 const order=registerVerifiedCustomerOrder(db,{
  brand,transactionId:"qa-provider-"+serviceCode,
  orderId:"qa-order-"+serviceCode,productCode:serviceCode,
  priceCents:cents,email:"internal-acceptance-qa@example.org",
  paymentVerified:true,paymentEvidence:"verified_ghl:qa-provider-"+serviceCode});
 return {db,id:order.id,cents};
}
function enroll(s:ReturnType<typeof setup>){
 return enrollHalfDownOrder(s.db,{jobId:s.id,totalCents:s.cents*2,depositCents:s.cents,
  scopeSha,verifiedSignatureRef:"verified_signature:internal-provider-fixture",
  criteria,builderActor:"ai-builder-service"});
}
function build(s:ReturnType<typeof setup>,shaValue=artifactSha){
 advanceCustomerJob(s.db,s.id,"production_ready","Verified scope and deposit in private QA fixture");
 return recordHalfDownBuild(s.db,{jobId:s.id,artifactSha:shaValue,
  primaryRef:"git:private-client-build-v1",builderActor:"ai-builder-service"});
}
function qa(s:ReturnType<typeof setup>,passed=true){
 return recordHalfDownQa(s.db,{jobId:s.id,artifactSha,qaActor:"independent-qa-agent",
  tests:[{criterionId:"consent",expected:criteria[0].expectation,passed,
   observed:passed?"Test inbound delivery succeeded":"Test inbound delivery failed",
   evidenceRef:"qa-evidence:sha256:"+sha(passed?"passed":"failed")}]});
}
function backup(s:ReturnType<typeof setup>){
 return verifyHalfDownRestoredBackup(s.db,{jobId:s.id,artifactSha,
  primaryRef:"git:private-client-build-v1",
  backupRef:"external-drive:authorized-external-qa-copy-v1",
  restoredBytes:artifact,restoreEvidenceRef:"restore-test:separate-drive-matching-hash",
  backupActor:"independent-restore-agent"});
}
function ready(){
 const s=setup();enroll(s);build(s);qa(s);backup(s);return s;
}
const invite=(s:ReturnType<typeof setup>)=>issueHalfDownAcceptanceInvitation(s.db,{
 jobId:s.id,previewEvidenceRef:proof,timeMs:when});
const accept=(s:ReturnType<typeof setup>,token:string,decision:"accepted"|"changes_requested"="accepted")=>
 submitHalfDownCustomerResponse(s.db,{
 token,decision,notes:decision==="accepted"?
 "I reviewed the completed deliverable and accept the agreed scope.":
 "Please correct the follow-up scheduling and show me the new tests.",
 viewedPreview:true,reviewedTestResults:true,
 affirmativeAcceptance:decision==="accepted",timeMs:when+5000});
test("no invite before independent QA, restored backup or scope",()=>{
 const s=setup();
 assert.throws(()=>invite(s),/Signed paid/);
 enroll(s);build(s);assert.throws(()=>invite(s),/Signed paid/);
 qa(s);assert.throws(()=>invite(s),/Signed paid/);
 backup(s);assert.equal(invite(s).emailSent,false);
});
test("invite is random, stored hashed, bound to verified customer email and exact build",()=>{
 const s=ready(),i=invite(s);
 assert.equal(i.token.length,43);assert.equal(i.sendOnlyTo,"internal-acceptance-qa@example.org");
 assert.equal(i.invoiceSent,false);
 const dbToken=s.db.prepare("SELECT token_hash FROM ai_boss_acceptance_invitations").get() as any;
 assert.equal(dbToken.token_hash,sha(i.token));assert.notEqual(dbToken.token_hash,i.token);
 const p=getHalfDownAcceptancePreview(s.db,i.token,when+1)!;
 assert.equal(p.version,1);assert.equal(p.amountDueNowCents,0);assert.equal(p.backupRestoreVerified,true);
 assert.equal(p.criteria[0].expectation,criteria[0].expectation);
 assert.equal(getHalfDownAcceptancePreview(s.db,i.token+"a",when+1),null);
});
test("customer acceptance requires explicit preview and affirmative checkbox",()=>{
 const s=ready(),i=invite(s);
 assert.throws(()=>submitHalfDownCustomerResponse(s.db,{
  token:i.token,decision:"accepted",notes:"Customer accepts after reviewing",
  viewedPreview:false,reviewedTestResults:true,affirmativeAcceptance:true,timeMs:when+2000
 }),/explicit review/);
 assert.throws(()=>submitHalfDownCustomerResponse(s.db,{
  token:i.token,decision:"accepted",notes:"Customer accepts after reviewing",
  viewedPreview:true,reviewedTestResults:true,affirmativeAcceptance:false,timeMs:when+2000
 }),/explicit review/);
 assert.equal(getHalfDownAcceptancePreview(s.db,i.token,when+2000)?.version,1);
 const result=accept(s,i.token);assert.equal(result.accepted,true);assert.equal(result.invoiceSent,false);
 assert.equal(halfDownFinalInvoiceDecision(s.db,s.id).eligible,true);
 assert.throws(()=>accept(s,i.token));
});
test("requested changes block invoice and force a new build before another invitation",()=>{
 const s=ready(),i=invite(s);
 const result=accept(s,i.token,"changes_requested");
 assert.equal(result.requiresNewBuild,true);
 assert.equal(halfDownFinalInvoiceDecision(s.db,s.id).eligible,false);
 assert.throws(()=>invite(s),/Signed paid/);
 assert.equal(getHalfDownAcceptancePreview(s.db,i.token,when+20000),null);
});
test("expired, revoked, or reused invites cannot accept work",()=>{
 const s=ready(),a=invite(s);
 assert.equal(getHalfDownAcceptancePreview(s.db,a.token,when+73*3600000),null);
 assert.throws(()=>submitHalfDownCustomerResponse(s.db,{token:a.token,decision:"accepted",
  notes:"I reviewed the material and accept",viewedPreview:true,
  reviewedTestResults:true,affirmativeAcceptance:true,timeMs:when+73*3600000}));
 const b=invite(s);assert.notEqual(a.token,b.token);
 assert.equal(getHalfDownAcceptancePreview(s.db,a.token,when+2000),null);
 assert.equal(getHalfDownAcceptancePreview(s.db,b.token,when+2000)?.version,1);
});
test("a new QA result or build version invalidates prior customer link",()=>{
 const s=ready(),a=invite(s);qa(s);
 assert.equal(getHalfDownAcceptancePreview(s.db,a.token,when+5000),null);
 const b=invite(s);assert.equal(getHalfDownAcceptancePreview(s.db,b.token,when+5000)?.version,1);
 build(s,sha("different version"));
 assert.equal(getHalfDownAcceptancePreview(s.db,b.token,when+5000),null);
});
test("all services with a 50% deposit use identical acceptance rules",()=>{
 const s=setup("other-50-down-service",62500);
 enroll(s);build(s);qa(s);backup(s);
 const a=invite(s),p=getHalfDownAcceptancePreview(s.db,a.token,when+1)!;
 assert.equal(p.remainingBalanceCents,62500);
 assert.equal(accept(s,a.token).invoiceSent,false);
});
test("other brand, failed QA and unverified preview receipt cannot issue invitations",()=>{
 const s=setup("papa-other",49750,"papa-life");
 assert.throws(()=>enroll(s),/Signed scope/);
 const ai=setup();enroll(ai);build(ai);qa(ai,false);backup(ai);
 assert.throws(()=>invite(ai),/Signed paid/);
 assert.throws(()=>issueHalfDownAcceptanceInvitation(ai.db,{jobId:ai.id,
  previewEvidenceRef:"https://random-site.example/preview",timeMs:when}),/preview proof/);
});
