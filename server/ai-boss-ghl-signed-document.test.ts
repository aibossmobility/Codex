import assert from "node:assert/strict";
import {test} from "node:test";
import {readAiBossSignedDocument,AI_BOSS_DOCS_LOCATION} from "./ai-boss-ghl-signed-document";
const document={
 locationId:AI_BOSS_DOCS_LOCATION,documentId:"doc_ai_boss_contract_001",
 _id:"unique_doc_record_123456",name:"AI Boss Mobility - Smart Outreach 995 Agreement - 50 Percent Deposit",
 type:"proposal",deleted:false,isExpired:false,documentRevision:1,
 status:["completed"],paymentStatus:["waiting_for_payment"],
 grandTotal:{amount:497.50,currency:"USD"},
 recipients:[{id:"contact_qa_12345678",role:"signer",isPrimary:true,email:"qa-customer@example.org",
  hasCompleted:true,signedDate:"2026-11-23T18:25:00.000Z"}],
 fillableFields:[{type:"Signature",hasCompleted:true,entityType:"contacts",id:"contact_qa_12345678"}]
};
const args={documentId:document.documentId,contactId:"contact_qa_12345678",
 signerEmail:"qa-customer@example.org",expectedName:document.name,
 expectedRevision:1,expectedDocumentTotalUsd:497.50,
 apiToken:"internal-mock-documents-read-token-12345"};
function mock(record:any=document,status=200){
 let calls=0;
 const fetchImpl=(async(url:string,options:any)=>{
  calls++;
  assert.equal(options.method,"GET");
  assert.equal(options.headers.Version,"v3");
  assert.equal(new URL(url).searchParams.get("locationId"),AI_BOSS_DOCS_LOCATION);
  assert.equal(new URL(url).pathname,"/proposals/document");
  return {ok:status>=200&&status<300,status,json:async()=>({documents:[record],total:1})};
 }) as unknown as typeof fetch;
 return {fetchImpl,calls:()=>calls};
}
test("provider read verifies exact AI Boss signed status, primary signer and $497.50, not scope/payment",async()=>{
 const {fetchImpl,calls}=mock();
 const x=await readAiBossSignedDocument({...args,fetchImpl});
 assert.equal(calls(),1);
 assert.equal(x.signatureStatusConfirmed,true);
 assert.equal(x.documentTotalUsd,497.50);
 assert.equal(x.signedScopeBytesVerified,false);
 assert.equal(x.depositPaymentVerified,false);
 assert.equal(x.authorizedToEnroll,false);
 assert.equal(x.invoiceSent,false);
 assert.match(x.providerReadOnlyEvidenceRef,/ghl-documents:/);
});
test("wrong business location is rejected",async()=>{
 await assert.rejects(()=>readAiBossSignedDocument({...args,
  fetchImpl:mock({...document,locationId:"BYx4g32AidgEkTBg7nLQ"}).fetchImpl}),/agreement not verified/);
});
test("unsigned, expired, deleted or wrong revision are rejected",async()=>{
 for(const record of [{...document,status:["sent"]},{...document,isExpired:true},
  {...document,deleted:true},{...document,documentRevision:2}]){
  await assert.rejects(()=>readAiBossSignedDocument({...args,
   fetchImpl:mock(record).fetchImpl}),/agreement not verified/);
 }
});
test("different signer, missing completion or missing signature field are rejected",async()=>{
 for(const record of [
  {...document,recipients:[{...document.recipients[0],email:"someone-else@example.org"}]},
  {...document,recipients:[{...document.recipients[0],hasCompleted:false}]},
  {...document,fillableFields:[]}
 ]){
  await assert.rejects(()=>readAiBossSignedDocument({...args,
   fetchImpl:mock(record).fetchImpl}),/signer not found|signature field not complete/);
 }
});
test("wrong amount or currency fails before authorization",async()=>{
 for(const money of [{amount:995,currency:"USD"},{amount:497.50,currency:"EUR"}]){
  await assert.rejects(()=>readAiBossSignedDocument({...args,
   fetchImpl:mock({...document,grandTotal:money}).fetchImpl}),/amount or currency/);
 }
});
test("read-only token missing and provider failure fail closed",async()=>{
 await assert.rejects(()=>readAiBossSignedDocument({...args,apiToken:"",
  fetchImpl:mock().fetchImpl}),/Dedicated AI Boss documents credential/);
 await assert.rejects(()=>readAiBossSignedDocument({...args,fetchImpl:mock(document,403).fetchImpl}),/HTTP 403/);
});
