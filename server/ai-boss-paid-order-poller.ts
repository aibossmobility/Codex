/** Periodic, no-model-cost discovery of previously paid AI Boss orders.
 * Always re-checks provider transaction and order in verifyAndPrepareAiBossPurchase.
 * Never initiates a charge, creates a checkout or sends an incomplete draft.
 */
import type Database from "better-sqlite3";
import {AI_BOSS_LOCATION,type AiBossPriceMapping} from "./ai-boss-ghl-verifier";
import {verifyAndPrepareAiBossPurchase} from "./ai-boss-ghl-verified-purchase";
import {installCustomerOrderLedger} from "./customer-fulfillment-ledger";

export type PollSummary={enabled:boolean;scanned:number;matched:number;dispatched:number;ambiguous:number;failed:number};
const newSummary=():PollSummary=>({enabled:false,scanned:0,matched:0,dispatched:0,ambiguous:0,failed:0});
export function chooseUnambiguousPendingIntake(db:Database.Database,order:any,tx:any,prices:readonly AiBossPriceMapping[]){
 const email=String(order?.contactSnapshot?.email||"").trim().toLowerCase();
 const item=Array.isArray(order?.items)&&order.items.length===1?order.items[0]:null;
 const productId=String(item?.product?._id||item?.product?.id||item?.productId||"");
 const priceId=String(item?.price?._id||item?.price?.id||item?.priceId||"");
 const approved=prices.filter(p=>p.productId===productId&&p.priceId===priceId);
 if(approved.length!==1||!email||!/^\S+@\S+\.\S+$/.test(email))return {kind:"none" as const};
 const paymentAt=Date.parse(String(tx?.createdAt||""));
 if(!Number.isFinite(paymentAt))return {kind:"none" as const};
 const candidates=db.prepare(`SELECT id,created_at FROM ai_boss_customer_intakes
   WHERE state='awaiting_payment' AND email=? AND product_code=? AND expected_cents=?`)
   .all(email,approved[0].productCode,approved[0].cents) as {id:string;created_at:string}[];
 const eligible=candidates.filter(x=>{
  const started=Date.parse(x.created_at.replace(" ","T")+"Z");
  return Number.isFinite(started)&&paymentAt>=started-300000&&paymentAt<=started+30*86400000;
 });
 if(eligible.length!==1)return {kind:eligible.length>1?"ambiguous" as const:"none" as const};
 return {kind:"match" as const,intakeId:eligible[0].id};
}
export async function pollAiBossPaidOrders(args:{
 db:Database.Database;apiToken:string;approvedPrices:readonly AiBossPriceMapping[];privateDir:string;
 fetchImpl?:typeof fetch;maxItems?:number;
}):Promise<PollSummary>{
 const summary=newSummary();
 if(!args.apiToken||args.apiToken.length<20||args.approvedPrices.length!==5)return summary;
 summary.enabled=true;
 installCustomerOrderLedger(args.db);
 const fetchImpl=args.fetchImpl||fetch;
 async function get(route:string){
  const url=new URL("https://services.leadconnectorhq.com"+route);
  url.searchParams.set("locationId",AI_BOSS_LOCATION);
  url.searchParams.set("altId",AI_BOSS_LOCATION);
  url.searchParams.set("altType","location");
  const response=await fetchImpl(url,{headers:{Authorization:"Bearer "+args.apiToken,Version:"v3"},
    signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error("Scoped payment lookup failed");
  return response.json() as Promise<any>;
 }
 const list=await get("/payments/transactions?limit=50");
 const items=Array.isArray(list)?list:Array.isArray(list?.transactions)?list.transactions:Array.isArray(list?.data)?list.data:Array.isArray(list?.data?.transactions)?list.data.transactions:[];
 const max=Math.min(50,Math.max(1,args.maxItems??25));
 for(const entry of items.slice(0,max)){
  if(String(entry?.altId)!==AI_BOSS_LOCATION||entry?.status!=="succeeded"||entry?.entityType!=="order"||!entry?.entityId)continue;
  const txId=String(entry._id||entry.id||"");
  if(!/^[a-zA-Z0-9_-]{10,100}$/.test(txId))continue;
  const existing=args.db.prepare("SELECT 1 FROM customer_fulfillment_jobs WHERE brand='ai-boss-mobility' AND transaction_id=?").get(txId);
  if(existing)continue;
  summary.scanned++;
  try{
   const result=await get("/payments/orders/"+encodeURIComponent(entry.entityId));
   const order=Array.isArray(result)?result[0]:Array.isArray(result?.data)?result.data[0]:result?.data||result;
   if(order?.altId!==AI_BOSS_LOCATION||order?.status!=="completed"||order?.contactId!==entry.contactId)continue;
   const chosen=chooseUnambiguousPendingIntake(args.db,order,entry,args.approvedPrices);
   if(chosen.kind==="ambiguous"){summary.ambiguous++;continue;}
   if(chosen.kind!=="match")continue;
   summary.matched++;
   try{
    const result=await verifyAndPrepareAiBossPurchase({
     db:args.db,intakeId:chosen.intakeId,transactionId:txId,apiToken:args.apiToken,
     approvedPrices:args.approvedPrices,privateDir:args.privateDir,fetchImpl
    });
    if(result.verified&&result.draftCreated)summary.dispatched++;
    if(result.exception)summary.failed++;
   }catch{summary.failed++;}
  }catch{summary.failed++;}
 }
 return summary;
}
