/** AI Boss signed-off verified-purchase dispatch engine.
 * Uses the AI Boss location credential ONLY; never Papa Life's credential.
 * Never sends customer files or invokes metered AI.
 */
import type Database from "better-sqlite3";
import {AI_BOSS_LOCATION,verifyAiBossPaidOrder,type AiBossPriceMapping} from "./ai-boss-ghl-verifier";
import {findUnpaidIntakeForVerifiedGhlOrder,associateVerifiedCustomerIntake} from "./ai-boss-customer-intake";
import {registerVerifiedCustomerOrder} from "./customer-fulfillment-ledger";
import {saveFixedServiceWorkingDraft} from "./fixed-service-draft-worker";
import {inspectCustomerDraft} from "./fixed-service-draft-quality";

export function parseAiBossPriceMap(text:string):AiBossPriceMapping[]{
 const data=JSON.parse(text||"null");
 if(!Array.isArray(data)||data.length!==5)throw Error("Exactly five approved AI Boss price mappings required");
 const codes=new Set(),products=new Set(),prices=new Set();
 const required:Record<string,number>={
 "ai.feasibility.readiness":35000,"ai.strategy.planning":75000,"ai.workflow.automation":125000,
 "ai.cost.benefit.roi":45000,"ai.leadership.education":50000};
 for(const m of data){
  if(!m||typeof m.productId!=="string"||typeof m.priceId!=="string"||typeof m.productCode!=="string"||
   !/^[a-zA-Z0-9_-]{10,100}$/.test(m.productId)||!/^[a-zA-Z0-9_-]{10,100}$/.test(m.priceId)||
   required[m.productCode]!==m.cents||codes.has(m.productCode)||products.has(m.productId)||prices.has(m.priceId))
   throw Error("Invalid or duplicate approved AI Boss price mapping");
  codes.add(m.productCode);products.add(m.productId);prices.add(m.priceId);
 }
 return data;
}
export async function verifyAndPrepareAiBossPurchase(args:{
 db:Database.Database;intakeId:string;transactionId:string;
 apiToken:string;approvedPrices:readonly AiBossPriceMapping[];privateDir:string;
 fetchImpl?:typeof fetch;
}){
 const {db,intakeId,transactionId,apiToken,approvedPrices,privateDir}=args;
 if(!/^[a-f\d-]{36}$/i.test(intakeId)||!/^[a-zA-Z0-9_-]{10,100}$/.test(transactionId)||
 !apiToken||apiToken.length<20||approvedPrices.length!==5)throw Error("Dedicated verified AI Boss access and input required");
 const row=db.prepare("SELECT email,product_code,expected_cents,created_at FROM ai_boss_customer_intakes WHERE id=? AND state='awaiting_payment'").get(intakeId) as any;
 if(!row)throw Error("Unpaid, accepted customer brief required");
 const config=approvedPrices.filter(x=>x.productCode===row.product_code);
 if(config.length!==1||config[0].cents!==row.expected_cents)throw Error("Service price mapping mismatch");
 const fetchImpl=args.fetchImpl||fetch;
 async function get(resource:string){
  const r=await fetchImpl("https://services.leadconnectorhq.com"+resource,{
   headers:{Authorization:"Bearer "+apiToken,Version:"v3","Content-Type":"application/json"},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error("GoHighLevel payment lookup failed HTTP "+r.status);
  const body=await r.json() as any;
  const v=Array.isArray(body)?body[0]:Array.isArray(body?.data)?body.data[0]:body?.data||body;
  if(!v||typeof v!=="object"||!(v._id||v.id))throw Error("Provider record missing");
  return v;
 }
 const tx=await get("/payments/transactions/"+encodeURIComponent(transactionId));
 if(tx.altId!==AI_BOSS_LOCATION||!tx.entityId)throw Error("Incorrect business or incomplete transaction");
 const order=await get("/payments/orders/"+encodeURIComponent(tx.entityId));
 const purchase=verifyAiBossPaidOrder(tx,order,approvedPrices,{
  email:row.email,code:row.product_code,cents:row.expected_cents,createdAt:row.created_at+"Z"});
 const intake=findUnpaidIntakeForVerifiedGhlOrder(db,intakeId,purchase.email,purchase.productCode,purchase.cents);
 const job=registerVerifiedCustomerOrder(db,{
  brand:"ai-boss-mobility",transactionId:purchase.transactionId,orderId:purchase.orderId,
  productCode:purchase.productCode,priceCents:purchase.cents,email:purchase.email,
  paymentVerified:true,paymentEvidence:"verified_ghl:"+purchase.transactionId+":"+purchase.orderId});
 associateVerifiedCustomerIntake(db,intakeId,purchase.transactionId,job.id);
 let artifact:any=null,quality:any=null,exception:string|null=null;
 try{
  artifact=saveFixedServiceWorkingDraft(db,job.id,intake.brief,privateDir);
  quality=inspectCustomerDraft(db,job.id,artifact.filepath);
  db.prepare("UPDATE ai_boss_customer_intakes SET state='working',updated_at=datetime('now') WHERE id=?").run(intakeId);
 }catch(e:any){
  exception=String(e?.message||"Draft generation failed").slice(0,200);
  db.prepare("UPDATE ai_boss_customer_intakes SET state='needs_help',updated_at=datetime('now') WHERE id=?").run(intakeId);
 }
 return {intakeId,jobId:job.id,verified:true,customerBriefMatched:true,
  draftCreated:Boolean(artifact),structureChecksPassed:quality?.allChecksPass===true,
  delivered:false,productionComplete:false,
  exception,additionalAiCostUsd:0};
}
