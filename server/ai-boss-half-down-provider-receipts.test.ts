import assert from "node:assert/strict";
import {test} from "node:test";
import Database from "better-sqlite3";
import {verifyAndStageAiBossHalfDownReceipt,initAiBossHalfDownProviderReceipts} from "./ai-boss-half-down-provider-receipts";
const location="qJ83IIaK5y2ZPHzLfGG1";
const a={serviceCode:"service-13",transactionId:"tx_internal_123456",
 orderId:"order_internal_123456",documentId:"doc_internal_123456",
 contactId:"contact_internal_123456",customerEmail:"qa-customer@example.org",
 documentName:"AI Boss Smart Outreach signed scope with deposit",
 documentRevision:1,totalCents:99500,depositCents:49750,
 authorizedPaymentProvider:"stripe" as const};
const tx={_id:a.transactionId,altId:location,altType:"location",status:"succeeded",
 liveMode:true,markAsTest:false,entityType:"order",entityId:a.orderId,
 contactId:a.contactId,currency:"USD",amount:497.50,amountRefunded:0,
 chargeId:"charge_test_internal_001",paymentProvider:{type:"stripe"},
 entitySource:{type:"document_contracts",id:a.documentId},createdAt:"2026-11-23T18:30:00Z"};
const order={_id:a.orderId,altId:location,altType:"location",
 status:"completed",liveMode:true,markAsTest:false,contactId:a.contactId,
 currency:"USD",amount:497.50,amountRefunded:0,
 contactSnapshot:{email:a.customerEmail,location_id:location},
 source:{type:"document_contracts",id:a.documentId}};
const doc={documentId:a.documentId,locationId:location,
 name:a.documentName,_id:"doc_record_123456",
 status:["completed"],deleted:false,isExpired:false,documentRevision:1,
 grandTotal:{amount:497.50,currency:"USD"},
 recipients:[{role:"signer",isPrimary:true,id:a.contactId,
 email:a.customerEmail,hasCompleted:true,signedDate:"2026-11-23T18:26:00Z"}],
 fillableFields:[{type:"Signature",hasCompleted:true,entityType:"contacts",id:a.contactId}]};
const payToken="internal-payment-readonly-token-abcdefg";
const docToken="internal-document-readonly-token-abcdefg";
function remote(revoked=false,attacker=false){
 let reads=0;
 const f=(async(url:string,init:any)=>{
  reads++;assert.equal(init.method,"GET");
  const p=new URL(url).pathname;
  if(p.includes("/payments/transactions/"))
   return {ok:true,json:async()=>revoked?{...tx,amountRefunded:497.50}:tx};
  if(p.includes("/payments/orders/"))
   return {ok:true,json:async()=>attacker?{...order,contactSnapshot:{email:"other@example.org"}}:order};
  if(p==="/proposals/document")
   return {ok:true,json:async()=>({documents:[doc],total:1})};
  throw Error("unexpected API URL");
 }) as unknown as typeof fetch;
 return {fetchImpl:f,reads:()=>reads};
}
function args(db:Database.Database,r:ReturnType<typeof remote>){
 return {db,approved:a,paymentReadToken:payToken,documentsReadToken:docToken,fetchImpl:r.fetchImpl};
}
test("successful matching provider reads produce one audit receipt with no production or billing",async()=>{
 const db=new Database(":memory:");
 try{
  const r=remote(),p=await verifyAndStageAiBossHalfDownReceipt(args(db,r));
  assert.equal(p.reused,false);
  assert.equal(p.depositCents,49750);assert.equal(p.scopePdfArchived,false);
  assert.equal(p.productionAuthorized,false);assert.equal(p.invoiceSent,false);
  assert.equal(r.reads(),3);
  const row=db.prepare("SELECT * FROM ai_boss_half_down_provider_receipts").get() as any;
  assert.equal(row.deposit_cents,49750);assert.equal(row.production_authorized,0);
  assert.equal(row.scope_pdf_archived,0);
  assert.notEqual(row.customer_email_sha,a.customerEmail);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM ai_boss_half_down_provider_audit").get() as any).n,1);
 }finally{db.close();}
});
test("duplicate read is idempotent but still queries live provider and does not authorize payment",async()=>{
 const db=new Database(":memory:");
 try{
  const r=remote();
  const first=await verifyAndStageAiBossHalfDownReceipt(args(db,r));
  const repeat=await verifyAndStageAiBossHalfDownReceipt(args(db,r));
  assert.equal(repeat.reused,true);assert.equal(first.receiptId,repeat.receiptId);
  assert.equal(repeat.finalInvoiceAuthorized,false);assert.equal(r.reads(),6);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM ai_boss_half_down_provider_receipts").get() as any).n,1);
 }finally{db.close();}
});
test("a refunded payment or changed customer cannot reuse a prior verified receipt",async()=>{
 const db=new Database(":memory:");
 try{
  await verifyAndStageAiBossHalfDownReceipt(args(db,remote()));
  await assert.rejects(()=>verifyAndStageAiBossHalfDownReceipt(args(db,remote(true))),
   /not verified/);
  await assert.rejects(()=>verifyAndStageAiBossHalfDownReceipt(args(db,remote(false,true))),
   /does not match/);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM ai_boss_half_down_provider_receipts").get() as any).n,1);
 }finally{db.close();}
});
test("no empty ledger is created on an unverifiable transaction",async()=>{
 const db=new Database(":memory:");
 try{
  await assert.rejects(()=>verifyAndStageAiBossHalfDownReceipt(args(db,remote(true))),/not verified/);
  initAiBossHalfDownProviderReceipts(db);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM ai_boss_half_down_provider_receipts").get() as any).n,0);
 }finally{db.close();}
});
