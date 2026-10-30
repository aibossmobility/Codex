import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os";import path from "node:path";
import Database from "better-sqlite3";
import {createCustomerIntake,findCustomerIntakeByToken} from "./ai-boss-customer-intake";
import {pollAiBossPaidOrders,chooseUnambiguousPendingIntake} from "./ai-boss-paid-order-poller";
import {AI_BOSS_LOCATION} from "./ai-boss-ghl-verifier";
const price={productCode:"ai.feasibility.readiness",cents:35000,productId:"product_00000000",priceId:"price_000000000"};
const maps=[price,
{productCode:"ai.strategy.planning",cents:75000,productId:"product_00000001",priceId:"price_000000001"},
{productCode:"ai.workflow.automation",cents:125000,productId:"product_00000002",priceId:"price_000000002"},
{productCode:"ai.cost.benefit.roi",cents:45000,productId:"product_00000003",priceId:"price_000000003"},
{productCode:"ai.leadership.education",cents:50000,productId:"product_00000004",priceId:"price_000000004"}];
const brief={organization:"Example Small Business",objective:"Understand practical AI readiness and identify improvements",currentWorkflow:"The team manually copies incoming emails to a shared spreadsheet daily",toolsInUse:["Existing Google Sheets"],constraints:["Avoid personal customer data collection"]};
const db=new Database(":memory:");
const customer=createCustomerIntake(db,{productCode:price.productCode,email:"customer@example.com",brief,acceptedTerms:true});
const createdAt=new Date(Date.now()+60000).toISOString();
const id="transaction_00000001",orderId="order_00000000000001";
const tx={_id:id,altId:AI_BOSS_LOCATION,altType:"location",liveMode:true,status:"succeeded",entityType:"order",entityId:orderId,amount:350,currency:"USD",contactId:"contact_001",createdAt};
const order={_id:orderId,altId:AI_BOSS_LOCATION,altType:"location",liveMode:true,status:"completed",amount:350,currency:"USD",contactId:"contact_001",contactSnapshot:{email:"customer@example.com"},amountSummary:{subtotal:350},items:[{product:{_id:price.productId},price:{_id:price.priceId,type:"one_time",amount:350},qty:1}]};
assert.equal(chooseUnambiguousPendingIntake(db,order,tx,maps).kind,"match");
const second=createCustomerIntake(db,{productCode:price.productCode,email:"customer@example.com",brief,acceptedTerms:true});
assert.equal(chooseUnambiguousPendingIntake(db,order,tx,maps).kind,"ambiguous");
db.prepare("UPDATE ai_boss_customer_intakes SET state='needs_help' WHERE id=?").run(second.intakeId);
assert.equal(chooseUnambiguousPendingIntake(db,order,tx,maps).kind,"match");
const root=fs.mkdtempSync(path.join(os.tmpdir(),"zero-cost-order-poll-"));
const privateDir=path.join(root,"private-fulfillment");fs.mkdirSync(privateDir);
let calls=0;
const mock=async(url:RequestInfo|URL)=>{
 calls++;const key=String(url);
 return {ok:true,json:async()=>key.includes("/payments/orders/")?order:key.includes("/payments/transactions/")?tx:{transactions:[tx]}} as any;
};
try{
 const before=await pollAiBossPaidOrders({db,apiToken:"",approvedPrices:maps,privateDir,fetchImpl:mock as typeof fetch});
 assert.equal(before.enabled,false);assert.equal(calls,0);
 const result=await pollAiBossPaidOrders({db,apiToken:"a_valid_scoped_test_credential",approvedPrices:maps,privateDir,fetchImpl:mock as typeof fetch});
 assert.equal(result.enabled,true);assert.equal(result.matched,1);assert.equal(result.dispatched,1);
 assert.equal(findCustomerIntakeByToken(db,customer.intakeId,customer.privateStatusToken)?.state,"working");
 const again=await pollAiBossPaidOrders({db,apiToken:"a_valid_scoped_test_credential",approvedPrices:maps,privateDir,fetchImpl:mock as typeof fetch});
 assert.equal(again.dispatched,0);
 const job=db.prepare("SELECT state FROM customer_fulfillment_jobs WHERE brand='ai-boss-mobility'").get() as any;
 assert.equal(job.state,"production_ready");
 console.log("PASS: zero-cost payment polling dispatches one unique, fully verified AI Boss job and never duplicates or sends it");
}finally{fs.rmSync(root,{recursive:true,force:true})}
