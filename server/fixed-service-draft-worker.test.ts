import assert from "node:assert/strict";
import fs from "node:fs";import os from "node:os";import path from "node:path";
import Database from "better-sqlite3";
import {registerVerifiedCustomerOrder} from "./customer-fulfillment-ledger";
import {fixedServiceTemplates,planFixedServiceDraft,saveFixedServiceWorkingDraft} from "./fixed-service-draft-worker";
import {inspectCustomerDraft} from "./fixed-service-draft-quality";
const db=new Database(":memory:");
const make=(code:string,cents:number,brand:"papa-life"|"ai-boss-mobility"="ai-boss-mobility")=>registerVerifiedCustomerOrder(db,{
brand,transactionId:"tx-"+code+"-"+brand+"-"+cents,orderId:"order-"+code,productCode:code,priceCents:cents,email:"customer@example.com",
paymentVerified:true,paymentEvidence:"verified_ghl:transaction-verified:order-verified"
});
const brief={organization:"Example Customer Organization",objective:"Reduce administrative work without exposing client records",currentWorkflow:"Employees currently copy requests between a mailbox and a shared tracker",toolsInUse:["Google Sheets existing"],constraints:["No customer health information may be shared"],expectedHoursSavedPerMonth:12,hourlyCostUsd:30,estimatedMonthlyToolCostUsd:10};
const base=fs.mkdtempSync(path.join(os.tmpdir(),"papa-fulfillment-test-"));
const privateDir=path.join(base,"private-fulfillment");fs.mkdirSync(privateDir);
try{
 for(const [code,config] of Object.entries(fixedServiceTemplates)){
  const job=make(code,config.cents);
  const draft=planFixedServiceDraft(db,job.id,brief);
  assert(draft.contents.includes(config.title));assert(draft.contents.includes("WORKING DRAFT"));
  assert.equal(draft.qualityPassed,false);assert.equal(draft.readyForDelivery,false);
  for(const section of config.sections)assert(draft.contents.includes(section));
  const stored=saveFixedServiceWorkingDraft(db,job.id,brief,privateDir);
  assert.equal(fs.readFileSync(stored.filepath,"utf8"),draft.contents);
  assert.equal(fs.statSync(stored.filepath).mode&0o777,0o600);
  const inspected=inspectCustomerDraft(db,job.id,stored.filepath);
  assert(inspected.allChecksPass,JSON.stringify(inspected.checks));
  assert.equal(inspected.fulfillmentComplete,false);
  assert.throws(()=>saveFixedServiceWorkingDraft(db,job.id,brief,privateDir));
 }
 const wrong=make("ai.feasibility.readiness",35000,"papa-life");
 assert.throws(()=>planFixedServiceDraft(db,wrong.id,brief),/Verified AI Boss/);
 const mismatch=make("ai.cost.benefit.roi",999);
 assert.throws(()=>planFixedServiceDraft(db,mismatch.id,brief),/Known exact-price/);
 const fresh=registerVerifiedCustomerOrder(db,{brand:"ai-boss-mobility",transactionId:"separate-leadership-test",orderId:"separate-leadership-order",productCode:"ai.leadership.education",priceCents:50000,email:"customer@example.com",paymentVerified:true,paymentEvidence:"verified_ghl:test:order"});
 const missing=fresh;
 assert.throws(()=>planFixedServiceDraft(db,missing.id,{...brief,currentWorkflow:""}),/Complete bounded/);
 assert.throws(()=>planFixedServiceDraft(db,missing.id,{...brief,expectedHoursSavedPerMonth:Infinity}),/Nonfinite/);
 const unverified=registerVerifiedCustomerOrder(db,{brand:"ai-boss-mobility",transactionId:"manual",orderId:"manual",productCode:"ai.leadership.education",priceCents:50000,email:"customer@example.com",paymentVerified:true,paymentEvidence:"not_provider_verified"});
 assert.throws(()=>planFixedServiceDraft(db,unverified.id,brief),/provider-verified/);
 console.log("PASS: five price-scoped local draft workers produce safe artifacts only for verified-brand paid jobs, private files, and no automatic delivery");
}finally{fs.rmSync(base,{recursive:true,force:true})}
