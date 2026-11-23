/**
 * AI Boss Mobility -- independent evidence-producing acceptance checker.
 * Operator supplies expected scope/criteria hashes and a trusted origin allowlist
 * from the signed agreement registry, NOT from a customer's submitted text.
 * Performs bounded read-only GET and local artifact SHA-256 checks.
 * This tool has NO authority to approve a customer, send an invoice or bill.
 */
import fs from "node:fs/promises";
import {createReadStream} from "node:fs";
import {createHash,randomUUID,sign as edSign} from "node:crypto";
import path from "node:path";
import {promises as dns} from "node:dns";
import {isIP} from "node:net";
import http from "node:http";
import https from "node:https";

const digest=(v)=>createHash("sha256").update(v).digest("hex");
const hashOk=(x)=>typeof x==="string"&&/^[a-f0-9]{64}$/i.test(x);
const actorOk=(x)=>typeof x==="string"&&/^[a-z0-9_-]{4,90}$/i.test(x);
const safeId=(x)=>typeof x==="string"&&/^[a-z0-9][a-z0-9_-]{1,55}$/i.test(x);
const validOrigin=(s,fixture)=>{try{
 const u=new URL(s);
 if(u.username||u.password||u.search||u.hash||u.pathname!=="/")return false;
 if(fixture && u.origin==="http://127.0.0.1:"+u.port)return true;
 return u.protocol==="https:"&&!isIP(u.hostname)&&/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname);
}catch{return false;}};
const unsafeIpv4=(ip)=>{
 const a=ip.split(".").map(Number);
 return a.length!==4||a[0]===0||a[0]===10||a[0]===127||
 a[0]>=224||a[0]===169&&a[1]===254||a[0]===172&&a[1]>=16&&a[1]<=31||
 a[0]===192&&a[1]===168||a[0]===100&&a[1]>=64&&a[1]<=127||
 a[0]===192&&a[1]===0||a[0]===198&&a[1]>=18&&a[1]<=19||
 a[0]===192&&a[1]===0&&a[2]===2||a[0]===198&&a[1]===51&&a[2]===100||
 a[0]===203&&a[1]===0&&a[2]===113;
};
const unsafeIp=(ip)=>{
 if(isIP(ip)===4)return unsafeIpv4(ip);
 if(isIP(ip)===6){
 const s=ip.toLowerCase();
 return s==="::"||s==="::1"||s.startsWith("fe")||s.startsWith("fc")||
 s.startsWith("fd")||s.startsWith("::ffff:")||s.startsWith("2001:db8");
 }
 return true;
};
const canonicalCriteria=(m)=>m.criteria.map(({id,expectation,check})=>({id,expectation,check}));
export function criteriaSha256(criteria){return digest(JSON.stringify(criteria.map(({id,expectation,check})=>({id,expectation,check}))));}
async function fileSha256(f){
 const h=createHash("sha256");
 for await(const chunk of createReadStream(f))h.update(chunk);
 return h.digest("hex");
}
async function readOnlyHttp(url,fixture){
 const u=new URL(url);
 let address,family;
 if(fixture && u.hostname==="127.0.0.1"&&u.protocol==="http:"){
  address="127.0.0.1";family=4;
 }else{
  const resolved=await dns.lookup(u.hostname,{all:true,verbatim:true});
  if(!resolved.length||resolved.some(x=>unsafeIp(x.address)))throw Error("Unsafe DNS resolution");
  ({address,family}=resolved[0]);
 }
 return await new Promise((resolve,reject)=>{
  const client=u.protocol==="https:"?https:http;
  const req=client.request(u,{method:"GET",timeout:7000,
   lookup:(hostname,options,callback)=>{
    // Node may ask for all addresses (autoSelectFamily); keep only the
    // already-validated pinned address and return the requested shape.
    if(typeof options==="function"){callback=options;options={};}
    if(options?.all)callback(null,[{address,family}]);
    else callback(null,address,family);
   },
   headers:{Accept:"text/plain, application/json, text/html", "User-Agent":"AI-Boss-Independent-QA/1"},
   maxHeaderSize:16384},res=>{
    if((res.statusCode||0)>=300&&(res.statusCode||0)<400){
      res.resume();reject(Error("Redirect forbidden"));return;
    }
    const chunks=[];let n=0;res.on("data",chunk=>{
      n+=chunk.length;
      if(n>256000){req.destroy(Error("Response larger than QA limit"));return;}
      chunks.push(chunk);
    });
    res.on("end",()=>resolve({status:res.statusCode||0,bytes:Buffer.concat(chunks),
      contentType:String(res.headers["content-type"]||"").slice(0,120)}));
    res.on("error",reject);
  });
  req.on("timeout",()=>req.destroy(Error("QA read timeout")));
  req.on("error",reject);req.end();
 });
}
function validate(input,opts){
 if(!input||input.version!==1||!Number.isSafeInteger(input.buildVersion)||input.buildVersion<1||
  !safeId(input.serviceCode)||
  !safeId(input.orderReference)||!actorOk(input.builderActor)||
  !actorOk(opts.qaActor)||opts.qaActor===input.builderActor||
  !hashOk(input.scopeSha256)||!hashOk(input.artifactSha256)||
  input.scopeSha256!==opts.expectedScopeSha256||
  input.artifactSha256!==opts.expectedArtifactSha256||
  !Array.isArray(input.criteria)||input.criteria.length<1||input.criteria.length>50||
  !Array.isArray(opts.allowOrigins)||opts.allowOrigins.length>12||
  !Array.isArray(opts.allowOrigins)||opts.allowOrigins.some(x=>!validOrigin(x,opts.fixture===true))||
  !hashOk(opts.expectedCriteriaSha256))
  throw Error("Trusted signed scope, separate QA actor, and bounded checks required");
 const ids=new Set();
 for(const c of input.criteria){
  if(!c||!safeId(c.id)||ids.has(c.id)||typeof c.expectation!=="string"||
    c.expectation.length<12||c.expectation.length>500||!c.check)
    throw Error("Invalid or duplicate acceptance criterion");
  ids.add(c.id);
  const k=c.check;
  if(k.kind==="http_get"){
    if(typeof k.url!=="string"||!Number.isInteger(k.expectedStatus)||
      k.expectedStatus<200||k.expectedStatus>299||
      typeof k.contains!=="string"||k.contains.length<2||k.contains.length>180)
      throw Error("Invalid read-only HTTP acceptance check");
    let u;try{u=new URL(k.url);}catch{throw Error("Invalid URL");}
    if(u.username||u.password||u.hash||u.search||
      !opts.allowOrigins.includes(u.origin)||
      (u.protocol!=="https:"&&!(opts.fixture===true&&u.hostname==="127.0.0.1"&&u.protocol==="http:")))
      throw Error("URL not approved by trusted test allowlist");
  }else if(k.kind==="artifact_sha256"){
    if(!hashOk(k.sha256)||typeof k.path!=="string"||
      !path.isAbsolute(k.path)||!opts.artifactRoot)
      throw Error("Invalid artifact check");
  }else throw Error("Unsupported acceptance check type");
 }
 if(criteriaSha256(input.criteria)!==opts.expectedCriteriaSha256)
  throw Error("Acceptance criteria differ from signed scope");
}
async function runCheck(c,opts){
 if(c.check.kind==="http_get"){
  const r=await readOnlyHttp(c.check.url,opts.fixture===true);
  const observedContains=r.bytes.toString("utf8").includes(c.check.contains);
  return {passed:r.status===c.check.expectedStatus&&observedContains,
   observed:"HTTP "+r.status+"; required content "+(observedContains?"found":"absent")+
      "; bytes "+r.bytes.length,
   responseSha256:digest(r.bytes)};
 }
 const root=await fs.realpath(opts.artifactRoot);
 const real=await fs.realpath(c.check.path);
 if(real!==root&&!real.startsWith(root+path.sep))throw Error("Artifact outside approved directory");
 const st=await fs.lstat(c.check.path);
 if(!st.isFile()||st.isSymbolicLink()||st.size<1||st.size>40_000_000)
  throw Error("Invalid artifact file");
 const computed=await fileSha256(c.check.path);
 return {passed:computed===c.check.sha256&&computed===opts.expectedArtifactSha256,
  observed:"Artifact file "+st.size+" bytes, SHA-256 "+computed,
  responseSha256:computed};
}
export async function runIndependentQa(input,opts){
 validate(input,opts);
 const startedAt=new Date().toISOString(),checks=[];
 for(const criterion of input.criteria){
  try{
   const result=await runCheck(criterion,opts);
   checks.push({criterionId:criterion.id,expected:criterion.expectation,
    passed:result.passed,observed:result.observed,
    evidenceRef:"qa-evidence:sha256:"+result.responseSha256,
    responseSha256:result.responseSha256});
  }catch(e){
   checks.push({criterionId:criterion.id,expected:criterion.expectation,
    passed:false,observed:"Test failed: "+String(e.message||"unknown").slice(0,140),
    evidenceRef:"qa-evidence:error:"+digest(criterion.id+String(e.message)),
    responseSha256:null});
  }
 }
 const base={schemaVersion:1,runId:randomUUID(),startedAt,finishedAt:new Date().toISOString(),
  orderReference:input.orderReference,serviceCode:input.serviceCode,
  buildVersion:input.buildVersion,
  scopeSha256:input.scopeSha256,criteriaSha256:opts.expectedCriteriaSha256,
  artifactSha256:input.artifactSha256,
  qaActor:opts.qaActor,builderActor:input.builderActor,
  checks,allChecksPass:checks.every(c=>c.passed),customerAccepted:false,
  backupVerified:false,authorizesInvoice:false,sendsInvoice:false,
  // No external provider identity or customer acceptance verified by this runner.
  identityAuthenticated:false};
 return {...base,reportSha256:digest(JSON.stringify(base))};
}
export async function writeQaReport(report,outdir){
 const st=await fs.lstat(outdir);
 if(!st.isDirectory()||st.isSymbolicLink())throw Error("Existing safe report folder required");
 const file=path.join(outdir,"ai-boss-qa-"+report.runId+".json");
 await fs.writeFile(file,JSON.stringify(report,null,2)+"\n",{flag:"wx",mode:0o600});
 return file;
}

/** Only a separately controlled QA worker should possess the Ed25519 private key.
 * Store its PUBLIC key in the final-invoice gate service. Unsigned reports
 * can be inspected but must never be used to authorize a final invoice.
 */
export function signQaReport(report,qaPrivateKey){
 if(!report||report.schemaVersion!==1||!hashOk(report.reportSha256)||
   report.authorizesInvoice!==false||report.customerAccepted!==false||
   report.backupVerified!==false||report.identityAuthenticated!==false||
   !qaPrivateKey)throw Error("Only bounded QA reports may be signed");
 const {reportSha256,...base}=report;
 if(digest(JSON.stringify(base))!==reportSha256)throw Error("QA report content changed");
 const signature=edSign(null,Buffer.from(JSON.stringify(report)),qaPrivateKey);
 return {algorithm:"Ed25519",report,signatureBase64:signature.toString("base64")};
}
