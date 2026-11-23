import assert from "node:assert/strict";
import {test} from "node:test";
import {createHash} from "node:crypto";
import Database from "better-sqlite3";
import {registerVerifiedCustomerOrder,advanceCustomerJob} from "./customer-fulfillment-ledger";
import {enrollHalfDownOrder,recordHalfDownBuild,recordHalfDownQa,
 verifyHalfDownRestoredBackup,recordHalfDownCustomerDecision,
 halfDownFinalInvoiceDecision,authorizeHalfDownFinalInvoice,halfDownAuditEvents} from "./ai-boss-half-down-quality-gate";

const sha=(s:string|Buffer)=>createHash("sha256").update(s).digest("hex");
const criteria=[
 {id:"inquiry",expectation:"A test inquiry creates the correct CRM contact"},
 {id:"followup",expectation:"An opted-in customer receives the approved email"}
];
const testsPass=criteria.map((c,i)=>({criterionId:c.id,passed:true,expected:c.expectation,
 observed:"Test output confirmed "+c.id,evidenceRef:"qa-log:real-test-"+i+"-with-logs"}));
const signed=()=>({
 scopeSha:sha("versioned signed scope document"),verifiedSignatureRef:"verified_signature:ghl-document-event-abc1234",
 criteria,builderActor:"ai-builder-service"
});
function setup(serviceCode="service-13",deposit=49750){
 const db=new Database(":memory:");
 const j=registerVerifiedCustomerOrder(db,{brand:"ai-boss-mobility",
  transactionId:"provider-tx-"+serviceCode,orderId:"signed-order-"+serviceCode,
  productCode:serviceCode,priceCents:deposit,email:"qa-customer@example.com",
  paymentVerified:true,paymentEvidence:"verified_ghl:provider-tx-"+serviceCode});
 return {db,jobId:j.id,deposit};
}
const artifact=Buffer.from("A verified build artifact containing workflow files, documentation and test fixtures");
const artifactSha=sha(artifact);
function enroll(s:ReturnType<typeof setup>){
 return enrollHalfDownOrder(s.db,{jobId:s.jobId,totalCents:s.deposit*2,depositCents:s.deposit,...signed()});
}
function build(s:ReturnType<typeof setup>){
 advanceCustomerJob(s.db,s.jobId,"production_ready","Signed scope and deposit provider references verified");
 return recordHalfDownBuild(s.db,{jobId:s.jobId,artifactSha,primaryRef:"git:private-client-work/project-v1",builderActor:"ai-builder-service"});
}
function qa(s:ReturnType<typeof setup>){return recordHalfDownQa(s.db,{jobId:s.jobId,artifactSha,qaActor:"independent-qa-agent",tests:testsPass});}
function backup(s:ReturnType<typeof setup>){return verifyHalfDownRestoredBackup(s.db,{
 jobId:s.jobId,artifactSha,primaryRef:"git:private-client-work/project-v1",
 backupRef:"external-drive:independent-restorable-client-copy-v1",
 restoreEvidenceRef:"restore-test:actual-hash-matched-independent-source",
 backupActor:"backup-restore-verifier",restoredBytes:artifact});}
function accepted(s:ReturnType<typeof setup>){
 return recordHalfDownCustomerDecision(s.db,{jobId:s.jobId,artifactSha,decision:"accepted",
 verifiedCustomerRef:"verified_customer:portal-event-accepted-abc1234",
 notes:"Customer checked delivered preview and explicitly accepted all agreed results."});
}
test("No order is invoice eligible without QA, backup, and acceptance",()=>{
 const s=setup();enroll(s);build(s);
 const d=halfDownFinalInvoiceDecision(s.db,s.jobId);
 assert.equal(d.eligible,false);assert.match(d.reasons.join(" " ),/independent QA/);
 assert.match(d.reasons.join(" "),/backup/);assert.match(d.reasons.join(" "),/customer/);
 assert.throws(()=>authorizeHalfDownFinalInvoice(s.db,s.jobId));
});
test("Enrolling a half-down order requires exact verified 50%, signed scope and consent",()=>{
 const s=setup();
 assert.throws(()=>enrollHalfDownOrder(s.db,{jobId:s.jobId,totalCents:99500,
  depositCents:50000,...signed()}));
 assert.throws(()=>enrollHalfDownOrder(s.db,{jobId:s.jobId,totalCents:99500,
  depositCents:49750,...signed(),verifiedSignatureRef:"unverified"}));
 enroll(s);
 assert.throws(()=>enroll(s));
});
test("Pauses on missing or spoofed technical checks",()=>{
 const s=setup();enroll(s);build(s);
 assert.throws(()=>recordHalfDownQa(s.db,{jobId:s.jobId,artifactSha,qaActor:"ai-builder-service",tests:testsPass}));
 assert.throws(()=>recordHalfDownQa(s.db,{jobId:s.jobId,artifactSha,qaActor:"independent-qa-agent",tests:[testsPass[0]]}));
 const q=recordHalfDownQa(s.db,{jobId:s.jobId,artifactSha,qaActor:"independent-qa-agent",
 tests:[testsPass[0],{...testsPass[1],passed:false,observed:"The email did not arrive"}]});
 assert.equal(q.allChecksPass,false);
 assert.equal(halfDownFinalInvoiceDecision(s.db,s.jobId).eligible,false);
 assert.throws(()=>recordHalfDownCustomerDecision(s.db,{jobId:s.jobId,artifactSha,decision:"accepted",
  verifiedCustomerRef:"verified_customer:portal-event-abc1234",notes:"Accept"}));
});
test("Backup must actually restore matching bytes from distinct location",()=>{
 const s=setup();enroll(s);build(s);qa(s);
 const b={jobId:s.jobId,artifactSha,primaryRef:"git:private-client-work/project-v1",
 backupRef:"external-drive:independent-restorable-client-copy-v1",
 restoreEvidenceRef:"restore-test:actual-hash-matched-independent-source",
 backupActor:"backup-restore-verifier",restoredBytes:artifact};
 assert.throws(()=>verifyHalfDownRestoredBackup(s.db,{...b,restoredBytes:Buffer.from("not the artifact")}));
 assert.throws(()=>verifyHalfDownRestoredBackup(s.db,{...b,backupRef:b.primaryRef}));
 assert.throws(()=>verifyHalfDownRestoredBackup(s.db,{...b,backupActor:"ai-builder-service"}));
 assert.equal(halfDownFinalInvoiceDecision(s.db,s.jobId).eligible,false);
 assert.equal(verifyHalfDownRestoredBackup(s.db,b).backupVerified,true);
 assert.equal(halfDownFinalInvoiceDecision(s.db,s.jobId).eligible,false);
});
test("Customer objections block invoice until corrected version passes again",()=>{
 const s=setup();enroll(s);build(s);qa(s);backup(s);
 const d=recordHalfDownCustomerDecision(s.db,{jobId:s.jobId,artifactSha,
  decision:"changes_requested",verifiedCustomerRef:"verified_customer:portal-change-request-abc1234",
  notes:"Please correct the workflow acknowledgment timing and show new proof."});
 assert.equal(d.accepted,false);
 assert.equal(halfDownFinalInvoiceDecision(s.db,s.jobId).eligible,false);
 const newSha=sha("Second version after correction and independent tests");
 assert.equal(recordHalfDownBuild(s.db,{jobId:s.jobId,artifactSha:newSha,
  primaryRef:"git:private-client-work/project-v2",builderActor:"ai-builder-service"}).version,2);
 assert.equal(halfDownFinalInvoiceDecision(s.db,s.jobId).eligible,false);
 assert.throws(()=>recordHalfDownCustomerDecision(s.db,{jobId:s.jobId,artifactSha,
  decision:"accepted",verifiedCustomerRef:"verified_customer:portal-old-approval-abc1234",
  notes:"Old version approved"}));
});
test("Customer approval and verified proof permit ONE internal invoice authorization, not a send",()=>{
 const s=setup();enroll(s);build(s);qa(s);backup(s);
 assert.equal(accepted(s).accepted,true);
 const d=halfDownFinalInvoiceDecision(s.db,s.jobId);
 assert.equal(d.eligible,true);assert.equal(d.finalBalanceCents,49750);assert.equal(d.sendsInvoice,false);
 const receipt=authorizeHalfDownFinalInvoice(s.db,s.jobId);
 assert.equal(receipt.amountCents,49750);assert.equal(receipt.invoiceSent,false);
 assert.throws(()=>authorizeHalfDownFinalInvoice(s.db,s.jobId));
 const types=(halfDownAuditEvents(s.db,s.jobId) as any[]).map(x=>x.kind);
 assert.deepEqual(types,["signed_scope_and_deposit","new_build_version","independent_qa_passed",
  "backup_recovered_and_hash_verified","customer_accepted","final_invoice_authorized"]);
});
test("The gate works for another 50%-deposit service, not only Smart Outreach",()=>{
 const s=setup("website-package-50-down",62500);enroll(s);build(s);qa(s);backup(s);accepted(s);
 const d=halfDownFinalInvoiceDecision(s.db,s.jobId);
 assert.equal(d.eligible,true);assert.equal(d.finalBalanceCents,62500);
});
test("Only AI Boss provider-verified deposits may enroll",()=>{
 const db=new Database(":memory:");
 const j=registerVerifiedCustomerOrder(db,{brand:"papa-life",transactionId:"papa-abc",
  orderId:"papa-ord",productCode:"papa.legacy",priceCents:49750,email:"x@example.org",
  paymentVerified:true,paymentEvidence:"verified_ghl:papa-abc"});
 assert.throws(()=>enrollHalfDownOrder(db,{jobId:j.id,totalCents:99500,depositCents:49750,...signed()}));
});
