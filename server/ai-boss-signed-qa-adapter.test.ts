import assert from "node:assert/strict";
import {test} from "node:test";
import {createHash,generateKeyPairSync,randomUUID,sign as edSign} from "node:crypto";
import Database from "better-sqlite3";
import {registerVerifiedCustomerOrder,advanceCustomerJob} from "./customer-fulfillment-ledger";
import {enrollHalfDownOrder,recordHalfDownBuild,halfDownFinalInvoiceDecision} from "./ai-boss-half-down-quality-gate";
import {recordSignedHalfDownQa} from "./ai-boss-signed-qa-adapter";
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const scopeSha=sha("specific signed service scope v1");
const artifactSha=sha("version one of the customer's actual QA fixture");
const criteria=[{id:"inquiry-test",expectation:"An opted-in inquiry reaches the correct contact pipeline"}];
const now="2026-11-23T18:00:00.000Z";
const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const publicPem=publicKey.export({type:"spki",format:"pem"}).toString();
function setup(){
 const db=new Database(":memory:");
 const j=registerVerifiedCustomerOrder(db,{brand:"ai-boss-mobility",transactionId:"provider-fixture-tx1",
  orderId:"provider-fixture-order1",productCode:"service-13",priceCents:49750,
  email:"internal-qa@example.com",paymentVerified:true,
  paymentEvidence:"verified_ghl:provider-fixture-tx1"});
 enrollHalfDownOrder(db,{jobId:j.id,totalCents:99500,depositCents:49750,
  scopeSha,verifiedSignatureRef:"verified_signature:provider-internal-signature-ref123",
  criteria,builderActor:"ai-builder-service"});
 advanceCustomerJob(db,j.id,"production_ready","Verified signed scope and deposit in test ledger");
 recordHalfDownBuild(db,{jobId:j.id,artifactSha,
  primaryRef:"git:scoped-qa-client-build-01",builderActor:"ai-builder-service"});
 return {db,jobId:j.id};
}
function makeReport(jobId:string,passed=true){
 const base={
  schemaVersion:1,runId:randomUUID(),startedAt:now,finishedAt:now,
  orderReference:jobId,serviceCode:"service-13",buildVersion:1,
  scopeSha256:scopeSha,criteriaSha256:sha("signed criteria checks"),
  artifactSha256:artifactSha,qaActor:"separate-qa-reviewer",builderActor:"ai-builder-service",
  checks:[{criterionId:"inquiry-test",expected:criteria[0].expectation,
   passed,observed:passed?"HTTP 200 with verified CRM contact":"HTTP 500 and missing CRM contact",
   evidenceRef:"qa-evidence:sha256:"+sha(passed?"observed true":"observed false"),
   responseSha256:sha(passed?"observed true":"observed false")}],
  allChecksPass:passed,customerAccepted:false as const,backupVerified:false as const,
  authorizesInvoice:false as const,sendsInvoice:false as const,identityAuthenticated:false as const
 };
 return {...base,reportSha256:sha(JSON.stringify(base))};
}
function sign(report:ReturnType<typeof makeReport>){
 return {algorithm:"Ed25519",report,
  signatureBase64:edSign(null,Buffer.from(JSON.stringify(report)),privateKey).toString("base64")};
}
test("valid separately signed QA evidence records result but cannot invoice before customer and backup",()=>{
 const s=setup(),report=makeReport(s.jobId),result=recordSignedHalfDownQa(s.db,s.jobId,sign(report),publicPem);
 assert.equal(result.signedQaVerified,true);
 assert.equal(result.allChecksPass,true);
 assert.equal(result.invoiceAuthorized,false);
 assert.equal(halfDownFinalInvoiceDecision(s.db,s.jobId).eligible,false);
 assert.match(halfDownFinalInvoiceDecision(s.db,s.jobId).reasons.join(" "),/backup/);
 assert.throws(()=>recordSignedHalfDownQa(s.db,s.jobId,sign(report),publicPem),/replay/);
});
test("invalid signature, other signer or tampered QA report cannot be trusted",()=>{
 const s=setup(),report=makeReport(s.jobId);
 const envelope=sign(report);
 const other=generateKeyPairSync("ed25519").publicKey.export({type:"spki",format:"pem"}).toString();
 assert.throws(()=>recordSignedHalfDownQa(s.db,s.jobId,envelope,other),/signature/);
 assert.throws(()=>recordSignedHalfDownQa(s.db,s.jobId,
  {...envelope,report:{...report,allChecksPass:false}},publicPem),/QA content hash mismatch/);
});
test("report for wrong build or contract scope cannot be recorded",()=>{
 const s=setup(),report=makeReport(s.jobId);
 assert.throws(()=>recordSignedHalfDownQa(s.db,s.jobId,sign({...report,buildVersion:2}),publicPem));
 const otherScope={...report,scopeSha256:sha("different signed contract")};
 assert.throws(()=>recordSignedHalfDownQa(s.db,s.jobId,sign(otherScope),publicPem));
 assert.throws(()=>recordSignedHalfDownQa(s.db,s.jobId,sign({...report,orderReference:"wrong-job"}),publicPem));
});
test("even independently signed failed checks are recorded as failed and block payment",()=>{
 const s=setup(),result=recordSignedHalfDownQa(s.db,s.jobId,sign(makeReport(s.jobId,false)),publicPem);
 assert.equal(result.allChecksPass,false);
 assert.equal(halfDownFinalInvoiceDecision(s.db,s.jobId).eligible,false);
});
test("missing acceptance criteria and builder self-review cannot authorize passing QA",()=>{
 const s=setup(),report=makeReport(s.jobId);
 const missing={...report,checks:[]};
 assert.throws(()=>recordSignedHalfDownQa(s.db,s.jobId,sign(missing),publicPem));
 const self={...report,qaActor:"ai-builder-service"};
 assert.throws(()=>recordSignedHalfDownQa(s.db,s.jobId,sign(self),publicPem));
});
