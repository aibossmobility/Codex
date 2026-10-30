import assert from "node:assert/strict";
import {discoverAiBossPriceMap,getApprovedAiBossPrices} from "./ai-boss-ghl-price-discovery";
import {AI_BOSS_LOCATION} from "./ai-boss-ghl-verifier";
const defs=[
 ["AI Feasibility & Readiness",350],
 ["AI Strategy & Planning",750],
 ["AI Workflow Automation",1250],
 ["AI Cost-Benefit & ROI",450],
 ["AI Leadership Education",500]
] as const;
const products=defs.map(([name],i)=>({_id:"approvedproduct_"+i+"000",name,type:"digital"}));
let requests:string[]=[];
const fake=async(input:RequestInfo|URL,options:any)=>{
 const url=String(input);requests.push(url);
 assert(url.includes("locationId="+AI_BOSS_LOCATION));
 assert(String(options.headers.Authorization).startsWith("Bearer "));
 if(url.includes("/price?")){
  const i=products.findIndex(p=>url.includes(p._id));
  return {ok:true,json:async()=>({prices:[{_id:"approvedprice_"+i+"000",type:"one_time",amount:defs[i][1],currency:"USD"}]})} as any;
 }
 return {ok:true,json:async()=>({products})} as any;
};
const token="a_valid_scoped_private_integration_credential";
const result=await discoverAiBossPriceMap(token,fake as typeof fetch);
assert.equal(result.length,5);
assert.deepEqual(result.map(x=>x.cents),[35000,75000,125000,45000,50000]);
assert.equal(requests.length,6);
const cached=await getApprovedAiBossPrices(token,"",fake as typeof fetch);
assert.equal(cached.length,5);
const before=requests.length;
await getApprovedAiBossPrices(token,"",fake as typeof fetch);
assert.equal(requests.length,before);
const bad=async(input:RequestInfo|URL,options:any)=>({
 ok:true,json:async()=>({products:[...products,products[0]]})
}) as any;
await assert.rejects(()=>discoverAiBossPriceMap(token,bad as typeof fetch),/duplicated/);
console.log("PASS: discovers five unique digital product and exact one-time price IDs using readonly GHL queries; rejects duplicates and caches");
