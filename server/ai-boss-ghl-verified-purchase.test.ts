import assert from "node:assert/strict";
import fs from "node:fs";import path from "node:path";import os from "node:os";
import Database from "better-sqlite3";
import {createCustomerIntake,findCustomerIntakeByToken} from "./ai-boss-customer-intake";
import {verifyAndPrepareAiBossPurchase,parseAiBossPriceMap} from "./ai-boss-ghl-verified-purchase";
import {AI_BOSS_LOCATION} from "./ai-boss-ghl-verifier";
const ids=["ai.feasibility.readiness","ai.strategy.planning","ai.workflow.automation","ai.cost.benefit.roi","ai.leadership.education"] as const;
const money=[35000,75000,125000,45000,50000];
const maps=ids.map((code,i)=>({productCode:code,cents:money[i],productId:"product_000000"+i,priceId:"price_00000000"+i}));
assert.equal(parseAiBossPriceMap(JSON.stringify(maps)).length,5);
assert.throws(()=>parseAiBossPriceMap(JSON.stringify(maps.slice(1))));
const db=new Database(":memory:");
const root=fs.mkdtempSync(path.join(os.tmpdir(),"papa-verified-flow-"));
const dir=path.join(root,"private-fulfillment");fs.mkdirSync(dir);
const brief={organization:"Example Local Organization",objective:"Identify practical AI improvements for daily administrative workflow",currentWorkflow:"The team currently copies new requests from emails to a spreadsheet by hand",toolsInUse:["Google Sheets currently"],constraints:["No confidential details should be shared"]};
try{
 for(let i=0;i<ids.length;i++){
  const intake=createCustomerIntake(db,{productCode:ids[i],email:"customer@example.com",brief,acceptedTerms:true});
  const txid="transaction_000000"+i;const oid="order_000000000000"+i;
  const tx={_id:txid,altId:AI_BOSS_LOCATION,altType:"location",liveMode:true,status:"succeeded",entityType:"order",entityId:oid,amount:money[i]/100,currency:"USD",contactId:"contact",createdAt:"2026-10-30T17:30:00Z"};
  const order={_id:oid,altId:AI_BOSS_LOCATION,altType:"location",liveMode:true,status:"completed",amount:money[i]/100,currency:"USD",contactId:"contact",contactSnapshot:{email:"customer@example.com"},amountSummary:{subtotal:money[i]/100},items:[{product:{_id:maps[i].productId},price:{_id:maps[i].priceId,type:"one_time",amount:money[i]/100},qty:1}]};
  const mock=async (url:RequestInfo|URL)=>({ok:true,json:async()=>String(url).includes("/transactions/")?tx:order}) as any;
  const response=await verifyAndPrepareAiBossPurchase({db,intakeId:intake.intakeId,transactionId:txid,apiToken:"a_valid_scoped_test_credential",approvedPrices:maps,privateDir:dir,fetchImpl:mock as typeof fetch});
  assert(response.verified);assert(response.draftCreated);assert(response.structureChecksPassed);assert.equal(response.delivered,false);assert.equal(response.additionalAiCostUsd,0);
  assert.equal(findCustomerIntakeByToken(db,intake.intakeId,intake.privateStatusToken)?.state,"working");
  await assert.rejects(()=>verifyAndPrepareAiBossPurchase({db,intakeId:intake.intakeId,transactionId:txid,apiToken:"a_valid_scoped_test_credential",approvedPrices:maps,privateDir:dir,fetchImpl:mock as typeof fetch}),/Unpaid/);
 }
 const bad=createCustomerIntake(db,{productCode:ids[0],email:"customer@example.com",brief,acceptedTerms:true});
 const badTx={_id:"transaction_bad00",altId:"BYx4g32AidgEkTBg7nLQ",entityId:"order_000000000000",status:"succeeded"};
 const badMock=async()=>({ok:true,json:async()=>badTx}) as any;
 await assert.rejects(()=>verifyAndPrepareAiBossPurchase({db,intakeId:bad.intakeId,transactionId:"transaction_bad00",apiToken:"a_valid_scoped_test_credential",approvedPrices:maps,privateDir:dir,fetchImpl:badMock as typeof fetch}),/Incorrect business/);
 assert.equal(findCustomerIntakeByToken(db,bad.intakeId,bad.privateStatusToken)?.state,"awaiting_payment");
 console.log("PASS: five simulated GHL paid orders independently verified, paired to private briefs and dispatched to no-cost draft/QA; wrong brand blocked; zero delivery");
}finally{fs.rmSync(root,{recursive:true,force:true})}
