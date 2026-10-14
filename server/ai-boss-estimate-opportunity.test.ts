import test from 'node:test';
import assert from 'node:assert/strict';
import { ghlEnsureAiBossEstimateOpportunity } from './ghl-api';
const config = { token:'placeholder', locationId:'mock-location', source:'env' as const };
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status});
test('estimate intake creates a first-stage opportunity, not a payment',async()=>{
 const previous=fetch;const calls:string[]=[];
 try {
  globalThis.fetch=(async(input,options)=>{
   const url=String(input);calls.push((options?.method||'GET')+' '+url);
   if(url.includes('/pipelines?'))return response({pipelines:[{id:'pipeline',name:'AI Boss Mobility — Client Estimates & Agreements',stages:[{id:'stage',name:'Estimate Being Prepared'}]}]});
   if(url.includes('/search?'))return response({opportunities:[]});
   if(url.endsWith('/opportunities/'))return response({opportunity:{id:'opportunity'}},201);
   throw Error('Unexpected request');
  }) as typeof fetch;
  const result=await ghlEnsureAiBossEstimateOpportunity({contactId:'contact',contactName:'Test Contact'},config);
  assert.equal(result.ok,true);
  assert.equal(calls.length,3);
  assert.equal(calls.filter(x=>x.startsWith('POST')).length,1);
  assert.equal(calls.some(x=>/payment|invoice|contract|sms/i.test(x)),false);
 }finally{globalThis.fetch=previous;}
});
test('existing estimate opportunity is reused for the same contact',async()=>{
 const previous=fetch;let writes=0;
 try {
  globalThis.fetch=(async(input,options)=>{
   const url=String(input);
   if(options?.method==='POST')writes++;
   if(url.includes('/pipelines?'))return response({pipelines:[{id:'pipeline',name:'AI Boss Mobility — Client Estimates & Agreements',stages:[{id:'stage',name:'Estimate Being Prepared'}]}]});
   if(url.includes('/search?'))return response({opportunities:[{id:'existing'}]});
   throw Error('Unexpected request');
  }) as typeof fetch;
  const result=await ghlEnsureAiBossEstimateOpportunity({contactId:'contact',contactName:'Test Contact'},config);
  assert.equal(result.ok,true);assert.equal(writes,0);
 }finally{globalThis.fetch=previous;}
});
test('missing pipeline fails without creating an opportunity',async()=>{
 const previous=fetch;let writes=0;
 try {
  globalThis.fetch=(async(input,options)=>{
   if(options?.method==='POST')writes++;
   return response({pipelines:[]});
  }) as typeof fetch;
  const result=await ghlEnsureAiBossEstimateOpportunity({contactId:'contact',contactName:'Test Contact'},config);
  assert.equal(result.ok,false);assert.equal(writes,0);
 }finally{globalThis.fetch=previous;}
});
