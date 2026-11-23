import assert from "node:assert/strict";
import {test} from "node:test";
import {verifyAiBossHalfDownProviderOrder} from "./ai-boss-half-down-provider-verification";
const location="qJ83IIaK5y2ZPHzLfGG1";
const a={serviceCode:"service-13",transactionId:"tx_internal_123456",
 orderId:"order_internal_123456",documentId:"doc_internal_123456",
 contactId:"contact_internal_123456",customerEmail:"customer-qa@example.org",
 documentName:"AI Boss Mobility - Smart Outreach 995 Agreement - 50 Percent Deposit",
 documentRevision:1,totalCents:99500,depositCents:49750,
 authorizedPaymentProvider:"stripe" as const};
const paymentToken="internal-payment-readonly-token-123456",docToken="internal-documents-readonly-token-654321";
const signer={id:a.contactId,email:a.customerEmail,role:"signer",
 isPrimary:true,hasCompleted:true,signedDate:"2026-11-23T17:00:00.000Z"};
const doc={locationId:location,documentId:a.documentId,_id:"doc_record_12345",
 name:a.documentName,deleted:false,isExpired:false,documentRevision:1,
 status:["completed"],paymentStatus:["waiting_for_payment"],
 grandTotal:{amount:497.5,currency:"USD"},
 recipients:[signer],
 fillableFields:[{type:"Signature",hasCompleted:true,entityType:"contacts",id:a.contactId}]};
const tx={_id:a.transactionId,altId:location,altType:"location",
 status:"succeeded",liveMode:true,markAsTest:false,
 entityType:"order",entityId:a.orderId,contactId:a.contactId,
 currency:"USD",amount:497.5,amountRefunded:0,
 chargeId:"ch_internal_mock_123456789",paymentProvider:{type:"stripe"},
 entitySource:{type:"document_contracts",id:a.documentId},
 createdAt:"2026-11-23T17:04:00.000Z"};
const order={_id:a.orderId,altId:location,altType:"location",status:"completed",
 liveMode:true,markAsTest:false,contactId:a.contactId,currency:"USD",
 amount:497.5,amountRefunded:0,
 contactSnapshot:{email:a.customerEmail,location_id:location},
 source:{type:"document_contracts",id:a.documentId}};
function testFetch(opts:{document?:any;transaction?:any;order?:any;paymentStatus?:number;documentsStatus?:number}={}){
 const hits:string[]=[];
 const fetchImpl=(async(url:string,init:any)=>{
  const u=new URL(url);hits.push(u.pathname);
  assert.equal(init.method,"GET");
  assert.equal(init.headers.Version,"v3");
  assert.ok(init.headers.Authorization==="Bearer "+paymentToken||
    init.headers.Authorization==="Bearer "+docToken);
  if(u.pathname.includes("/payments/transactions/")){
   assert.equal(u.searchParams.get("altId"),location);
   assert.equal(u.searchParams.get("altType"),"location");
   return {ok:(opts.paymentStatus||200)<400,status:opts.paymentStatus||200,json:async()=>opts.transaction||tx};
  }
  if(u.pathname.includes("/payments/orders/")){
   assert.equal(u.searchParams.get("altId"),location);
   return {ok:true,status:200,json:async()=>opts.order||order};
  }
  if(u.pathname==="/proposals/document"){
   assert.equal(u.searchParams.get("locationId"),location);
   assert.equal(init.headers.Authorization,"Bearer "+docToken);
   return {ok:(opts.documentsStatus||200)<400,status:opts.documentsStatus||200,
    json:async()=>({documents:[opts.document||doc],total:1})};
  }
  throw Error("Unapproved provider path");
 }) as unknown as typeof fetch;
 return {fetchImpl,hits};
}
const verify=(mods:Parameters<typeof testFetch>[0]={})=>
 verifyAiBossHalfDownProviderOrder({approved:a,paymentReadToken:paymentToken,
 documentsReadToken:docToken,fetchImpl:testFetch(mods).fetchImpl});
test("independent read-only provider checks verify matching $497.50 paid after signed document, but do not enroll",async()=>{
 const m=testFetch();
 const p=await verifyAiBossHalfDownProviderOrder({approved:a,paymentReadToken:paymentToken,
  documentsReadToken:docToken,fetchImpl:m.fetchImpl});
 assert.equal(p.depositCents,49750);assert.equal(p.totalCents,99500);
 assert.equal(p.signedDocumentMetadataVerified,true);assert.equal(p.depositVerified,true);
 assert.equal(p.signedAgreementBytesArchived,false);
 assert.equal(p.productionAuthorized,false);assert.equal(p.finalInvoiceAuthorized,false);
 assert.equal(p.invoiceSent,false);
 assert.deepEqual(m.hits,[
  "/payments/transactions/"+a.transactionId,
  "/payments/orders/"+a.orderId,"/proposals/document"]);
});
test("wrong AI Boss location, contact, and customer identity fail closed",async()=>{
 for(const mods of [
  {transaction:{...tx,altId:"BYx4g32AidgEkTBg7nLQ"}},
  {order:{...order,altId:"BYx4g32AidgEkTBg7nLQ"}},
  {transaction:{...tx,contactId:"another_contact"}},
  {order:{...order,contactSnapshot:{email:"other@example.org",location_id:location}}},
  {document:{...doc,recipients:[{...signer,email:"attacker@example.org"}]}}
 ]){
  await assert.rejects(()=>verify(mods),/not verified|does not match|signer not found/);
 }
});
test("missing amount, refund, wrong currency or nonlive payments fail",async()=>{
 for(const changes of [
  {amount:995},{amount:497.49},{amountRefunded:1},{currency:"EUR"},
  {status:"pending"},{liveMode:false},{markAsTest:true},
  {subscriptionId:"sub_unauthorized"},{paymentProvider:{type:"manual"}},
  {chargeId:null}
 ]){
  await assert.rejects(()=>verify({transaction:{...tx,...changes}}),/not verified/);
 }
});
test("order cannot be a different amount, customer, or payment state",async()=>{
 for(const mods of [
  {order:{...order,amount:995}},{order:{...order,status:"pending"}},
  {order:{...order,liveMode:false}},{order:{...order,amountRefunded:2}}
 ]){
  await assert.rejects(()=>verify(mods),/does not match/);
 }
});
test("a paid invoice without exact link to signed document is NOT assumed to be that contract",async()=>{
 await assert.rejects(()=>verify({
  order:{...order,source:{type:"invoice",id:"another_invoice"}},
  transaction:{...tx,entitySource:{type:"invoice",id:"another_invoice"}}
 }),/cannot be linked/);
});
test("unsigned document is not equivalent to successful payment",async()=>{
 await assert.rejects(()=>verify({document:{...doc,status:["sent"]}}),/signed AI Boss agreement/);
 await assert.rejects(()=>verify({document:{...doc,fillableFields:[]}}),/signature field/);
});
test("money must follow signature; no work before contract signing",async()=>{
 await assert.rejects(()=>verify({transaction:{...tx,createdAt:"2026-11-23T15:20:00.000Z"}}),/must follow customer signature/);
});
test("provider HTTP failures or absent separate read scopes block verification",async()=>{
 await assert.rejects(()=>verify({paymentStatus:403}),/record unavailable/);
 await assert.rejects(()=>verify({documentsStatus:403}),/document read rejected/);
 await assert.rejects(()=>verifyAiBossHalfDownProviderOrder({
  approved:a,paymentReadToken:paymentToken,documentsReadToken:paymentToken,
  fetchImpl:testFetch().fetchImpl
 }),/must be distinct/);
});
test("wrong 50-percent math and wrong document contact cannot be authorized",async()=>{
 await assert.rejects(()=>verifyAiBossHalfDownProviderOrder({
  approved:{...a,depositCents:50000},paymentReadToken:paymentToken,
  documentsReadToken:docToken,fetchImpl:testFetch().fetchImpl
 }),/Trusted 50% business order/);
 await assert.rejects(()=>verify({document:{...doc,recipients:[{...signer,id:"other_contact"}]}}),/signer not found/);
});
test("same verification contract works with another 50-percent service code",async()=>{
 const other={...a,serviceCode:"another-50-down-service",totalCents:125000,depositCents:62500};
 const d={...doc,grandTotal:{amount:625,currency:"USD"}};
 const t={...tx,amount:625};
 const o={...order,amount:625};
 const p=await verifyAiBossHalfDownProviderOrder({
  approved:other,paymentReadToken:paymentToken,documentsReadToken:docToken,
  fetchImpl:testFetch({document:d,transaction:t,order:o}).fetchImpl
 });
 assert.equal(p.serviceCode,other.serviceCode);assert.equal(p.depositCents,62500);
});
