/** Discover only the five approved AI Boss digital one-time prices from its scoped GoHighLevel token. */
import {createHash} from "node:crypto";
import {AI_BOSS_LOCATION,type AiBossPriceMapping} from "./ai-boss-ghl-verifier";
import {parseAiBossPriceMap} from "./ai-boss-ghl-verified-purchase";
const required=[
 ["AI Feasibility & Readiness","ai.feasibility.readiness",35000],
 ["AI Strategy & Planning","ai.strategy.planning",75000],
 ["AI Workflow Automation","ai.workflow.automation",125000],
 ["AI Cost-Benefit & ROI","ai.cost.benefit.roi",45000],
 ["AI Leadership Education","ai.leadership.education",50000]
] as const;
const cents=(v:unknown)=>Math.round(Number(v)*100);
let cache:{fingerprint:string;expires:number;prices:AiBossPriceMapping[]}|null=null;
export async function discoverAiBossPriceMap(token:string,fetchImpl:typeof fetch=fetch){
 if(token.length<20)throw Error("Dedicated AI Boss token required");
 async function api(route:string){
  const url=new URL("https://services.leadconnectorhq.com"+route);
  url.searchParams.set("locationId",AI_BOSS_LOCATION);
  const response=await fetchImpl(url,{headers:{Authorization:"Bearer "+token,Version:"v3"},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error("AI Boss product/price lookup failed");
  return response.json() as Promise<any>;
 }
 const list=await api("/products/?limit=100");
 const products=Array.isArray(list?.products)?list.products:Array.isArray(list?.data)?list.data:Array.isArray(list?.data?.products)?list.data.products:[];
 const approved:AiBossPriceMapping[]=[];
 for(const [name,code,expected] of required){
  const matches=products.filter((p:any)=>String(p?.name||"").trim()===name);
  if(matches.length!==1)throw Error("Approved AI Boss product is missing or duplicated: "+code);
  const product=matches[0];
  if(String(product.productType||product.type||"").toLowerCase()==="physical")throw Error("Physical product is forbidden");
  const productId=String(product._id||product.id||"");
  if(!/^[a-zA-Z0-9_-]{10,100}$/.test(productId))throw Error("Product identifier invalid");
  const data=await api("/products/"+encodeURIComponent(productId)+"/price?limit=100");
  const prices=Array.isArray(data?.prices)?data.prices:Array.isArray(data?.data)?data.data:Array.isArray(data?.data?.prices)?data.data.prices:[];
  const found=prices.filter((p:any)=>p?.type==="one_time"&&String(p.currency).toUpperCase()==="USD"&&cents(p.amount)===expected);
  if(found.length!==1)throw Error("Approved AI Boss price missing or ambiguous: "+code);
  const priceId=String(found[0]._id||found[0].id||"");
  approved.push({productId,priceId,productCode:code,cents:expected});
 }
 return parseAiBossPriceMap(JSON.stringify(approved));
}
export async function getApprovedAiBossPrices(token:string,configuredMap:string,fetchImpl:typeof fetch=fetch){
 if(configuredMap.trim())return parseAiBossPriceMap(configuredMap);
 const fingerprint=createHash("sha256").update(token).digest("hex");
 if(cache&&cache.fingerprint===fingerprint&&Date.now()<cache.expires)return cache.prices;
 const prices=await discoverAiBossPriceMap(token,fetchImpl);
 cache={fingerprint,expires:Date.now()+300000,prices};
 return prices;
}
