import assert from "node:assert/strict";
import {test} from "node:test";
import {createHash} from "node:crypto";
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {runIndependentQa,criteriaSha256,writeQaReport} from "./ai-boss-independent-qa-runner.mjs";

const sha=x=>createHash("sha256").update(x).digest("hex");
const scopeSha=sha("signed authorized scope fixture");
const artifact=Buffer.from("Signed test deliverable: customer-approved mock version one.");
const artifactSha=sha(artifact);
const base={version:1,orderReference:"internal-order-qa",serviceCode:"service-13",
 scopeSha256:scopeSha,artifactSha256:artifactSha,builderActor:"builder-agent"};
const options={expectedScopeSha256:scopeSha,qaActor:"separate-qa-agent",
 fixture:true,allowOrigins:[]};

async function fixture(){
 const server=http.createServer((req,res)=>{
  if(req.url==="/healthy"){res.writeHead(200,{"Content-Type":"text/plain"});
   res.end("INQUIRY_OK ACCEPTED_TO_CRM");return;}
  if(req.url==="/redirect"){res.writeHead(302,{Location:"/healthy"});res.end();return;}
  res.writeHead(500);res.end("ERROR");
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const port=server.address().port;
 return {server,origin:"http://127.0.0.1:"+port,close:()=>new Promise(r=>server.close(r))};
}
function inputs(origin){
 const criteria=[{id:"inquiry-test",
  expectation:"Website test inquiry endpoint responds with CRM accepted evidence",
  check:{kind:"http_get",url:origin+"/healthy",expectedStatus:200,contains:"ACCEPTED_TO_CRM"}}];
 return {...base,criteria};
}
function opts(input,origin){return {...options,allowOrigins:[origin],expectedCriteriaSha256:criteriaSha256(input.criteria)};}

test("independent live fixture GET checks actual status and content and records evidence",async()=>{
 const f=await fixture();
 try{
  const input=inputs(f.origin);
  const report=await runIndependentQa(input,opts(input,f.origin));
  assert.equal(report.allChecksPass,true);
  assert.equal(report.checks.length,1);
  assert.equal(report.checks[0].passed,true);
  assert.match(report.checks[0].observed,/HTTP 200/);
  assert.match(report.checks[0].evidenceRef,/qa-evidence:sha256:/);
  assert.equal(report.customerAccepted,false);
  assert.equal(report.backupVerified,false);
  assert.equal(report.authorizesInvoice,false);
 }finally{await f.close();}
});
test("missing response marker is a real failed acceptance check",async()=>{
 const f=await fixture();
 try{
  const input=inputs(f.origin);
  input.criteria[0].check.contains="THIS_IS_MISSING";
  const report=await runIndependentQa(input,opts(input,f.origin));
  assert.equal(report.allChecksPass,false);
  assert.match(report.checks[0].observed,/absent/);
 }finally{await f.close();}
});
test("HTTP failures and redirects never count as completed work",async()=>{
 const f=await fixture();
 try{
  for(const endpoint of ["/failed","/redirect"]){
   const input=inputs(f.origin);
   input.criteria[0].check.url=f.origin+endpoint;
   const report=await runIndependentQa(input,opts(input,f.origin));
   assert.equal(report.allChecksPass,false);
  }
 }finally{await f.close();}
});
test("signed-scope criteria mismatch and builder-as-reviewer are rejected",async()=>{
 const f=await fixture();
 try{
  const input=inputs(f.origin);
  const p=opts(input,f.origin);
  assert.throws(()=>runIndependentQa({...input,scopeSha256:sha("different")},p),/Trusted signed scope/);
  assert.throws(()=>runIndependentQa(input,{...p,qaActor:"builder-agent"}),/Trusted signed scope/);
  const changed=inputs(f.origin);
  changed.criteria[0].check.contains="ANOTHER_RESPONSE";
  assert.throws(()=>runIndependentQa(changed,p),/Acceptance criteria differ/);
 }finally{await f.close();}
});
test("unapproved network origin is blocked before any GET",async()=>{
 const f=await fixture();
 try{
  const input=inputs(f.origin);
  assert.throws(()=>runIndependentQa(input,{...opts(input,f.origin),allowOrigins:[]}),/not approved/);
 }finally{await f.close();}
});
test("checks the real content of an authorized local file; refuses escapes",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"aiboss-qa-artifact-"));
 try{
  const file=path.join(dir,"deliverable.txt");await fs.writeFile(file,artifact);
  const input={...base,criteria:[{
   id:"file-integrity",expectation:"The delivered artifact matches the agreed version exactly",
   check:{kind:"artifact_sha256",path:file,sha256:artifactSha}
  }]};
  const p={...options,artifactRoot:dir,expectedCriteriaSha256:criteriaSha256(input.criteria)};
  const passed=await runIndependentQa(input,p);
  assert.equal(passed.allChecksPass,true);
  await fs.writeFile(file,Buffer.from("corrupt deliverable"));
  const failed=await runIndependentQa(input,p);
  assert.equal(failed.allChecksPass,false);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test("reports are persisted without granting invoice or customer acceptance",async()=>{
 const f=await fixture(),dir=await fs.mkdtemp(path.join(os.tmpdir(),"aiboss-qa-report-"));
 try{
  const input=inputs(f.origin),report=await runIndependentQa(input,opts(input,f.origin));
  const reportPath=await writeQaReport(report,dir);
  const persisted=JSON.parse(await fs.readFile(reportPath,"utf8"));
  assert.equal(persisted.reportSha256,report.reportSha256);
  assert.equal(persisted.authorizesInvoice,false);
  assert.equal(persisted.identityAuthenticated,false);
  await assert.rejects(()=>writeQaReport(report,{x:1}),/path/i);
 }finally{await f.close();await fs.rm(dir,{recursive:true,force:true});}
});
