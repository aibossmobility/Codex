/**
 * Protected bridge from an independently signed QA report into the universal
 * 50%-down invoice gate. No public route, customer communication or payments.
 * The approved QA public key must be provisioned separately from the builder.
 */
import type Database from "better-sqlite3";
import {createHash,createPublicKey,verify as verifySignature} from "node:crypto";
import {initHalfDownGate,recordHalfDownQa} from "./ai-boss-half-down-quality-gate";

type RecordedCheck={
 criterionId:string;expected:string;passed:boolean;observed:string;
 evidenceRef:string;responseSha256:string|null;
};
type QaReport={
 schemaVersion:number;runId:string;orderReference:string;serviceCode:string;
 buildVersion:number;scopeSha256:string;criteriaSha256:string;
 artifactSha256:string;builderActor:string;qaActor:string;
 startedAt:string;finishedAt:string;checks:RecordedCheck[];
 allChecksPass:boolean;customerAccepted:false;backupVerified:false;
 authorizesInvoice:false;sendsInvoice:false;identityAuthenticated:false;
 reportSha256:string;
};
type SignedReport={algorithm:string;report:QaReport;signatureBase64:string};
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const hashOk=(s:unknown)=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
const matchRunId=(s:unknown)=>typeof s==="string"&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

export function recordSignedHalfDownQa(db:Database.Database,jobId:string,
 envelope:SignedReport,qaPublicKeyPem:string){
 initHalfDownGate(db);
 return db.transaction(()=>{
  const report=envelope?.report;
  if(!report||envelope.algorithm!=="Ed25519"||!qaPublicKeyPem||
   typeof envelope.signatureBase64!=="string"||
   !/^[a-zA-Z0-9+/]{80,100}={0,2}$/.test(envelope.signatureBase64)||
   report.schemaVersion!==1||!matchRunId(report.runId)||
   !hashOk(report.reportSha256)||!hashOk(report.scopeSha256)||
   !hashOk(report.artifactSha256)||!hashOk(report.criteriaSha256)||
   report.customerAccepted!==false||report.backupVerified!==false||
   report.authorizesInvoice!==false||report.sendsInvoice!==false||
   report.identityAuthenticated!==false||
   !Array.isArray(report.checks)||report.checks.length<1||report.checks.length>50)
   throw Error("Invalid independent QA evidence envelope");
  const {reportSha256,...withoutDigest}=report;
  if(sha(JSON.stringify(withoutDigest))!==reportSha256)
   throw Error("QA content hash mismatch");
  const publicKey=createPublicKey(qaPublicKeyPem);
  if(publicKey.asymmetricKeyType!=="ed25519"||
   !verifySignature(null,Buffer.from(JSON.stringify(report)),publicKey,
     Buffer.from(envelope.signatureBase64,"base64")))
   throw Error("Independent QA signature could not be verified");
  const g=db.prepare("SELECT * FROM ai_boss_half_down_gates WHERE job_id=?").get(jobId) as any;
  const j=db.prepare("SELECT brand,state,product_code FROM customer_fulfillment_jobs WHERE id=?").get(jobId) as any;
  if(!g||!j||j.brand!=="ai-boss-mobility"||j.state!=="production_ready"||
   report.orderReference!==jobId||report.serviceCode!==g.service_code||
   report.serviceCode!==j.product_code||report.buildVersion!==g.version||
   report.buildVersion<1||report.scopeSha256!==g.scope_sha||
   report.artifactSha256!==g.artifact_sha||
   report.builderActor!==g.builder_actor||
   report.qaActor===g.builder_actor||!report.qaActor?.trim())
   throw Error("QA report does not match signed scope, current build or independent reviewer");
  const criteria=JSON.parse(g.criteria_json) as {id:string;expectation:string}[];
  if(report.checks.length!==criteria.length||
   new Set(report.checks.map(c=>c.criterionId)).size!==criteria.length||
   criteria.some(c=>!report.checks.some(x=>x.criterionId===c.id&&
     x.expected===c.expectation&&typeof x.observed==="string"&&
     x.observed.length>=8&&x.observed.length<=500&&
     typeof x.passed==="boolean"&&typeof x.evidenceRef==="string"&&
     x.evidenceRef.length>=14&&
     (x.passed?hashOk(x.responseSha256):true)))||
   report.allChecksPass!==report.checks.every(x=>x.passed))
   throw Error("Independent QA did not cover exact signed acceptance criteria");
  db.exec("CREATE TABLE IF NOT EXISTS ai_boss_signed_qa_runs ("+
    "run_id TEXT PRIMARY KEY,job_id TEXT NOT NULL,build_version INTEGER NOT NULL,"+
    "report_sha TEXT NOT NULL,reviewer TEXT NOT NULL,recorded_at TEXT NOT NULL DEFAULT(datetime('now')))");
  if(db.prepare("SELECT run_id FROM ai_boss_signed_qa_runs WHERE run_id=?").get(report.runId))
   throw Error("QA evidence replay detected");
  const result=recordHalfDownQa(db,{jobId,artifactSha:report.artifactSha256,
   qaActor:report.qaActor,tests:report.checks.map(c=>({
    criterionId:c.criterionId,expected:c.expected,passed:c.passed,
    observed:c.observed,evidenceRef:c.evidenceRef
   }))});
  db.prepare("INSERT INTO ai_boss_signed_qa_runs(run_id,job_id,build_version,report_sha,reviewer) VALUES(?,?,?,?,?)")
   .run(report.runId,jobId,g.version,report.reportSha256,report.qaActor);
  return {jobId,runId:report.runId,allChecksPass:result.allChecksPass,
   signedQaVerified:true,reportSha256:report.reportSha256,
   invoiceAuthorized:false,customerAccepted:false,backupVerified:false};
 })();
}
