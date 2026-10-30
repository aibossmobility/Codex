/** Public AI Boss project-brief intake for Papa Life OS.
 * Unauthenticated, rate-limited, no payment, model execution, or customer data exposure.
 */
import type {Express} from "express";
import type Database from "better-sqlite3";
import {createCustomerIntake,findCustomerIntakeByToken,initializeCustomerIntake} from "./ai-boss-customer-intake";
import {fixedServiceTemplates} from "./fixed-service-draft-worker";
import {parseAiBossPriceMap,verifyAndPrepareAiBossPurchase} from "./ai-boss-ghl-verified-purchase";
const allowedOrigins=new Set(["https://ai.bossmobilelifecoach.com","https://papalifecoach.com"]);
export function installAiBossCustomerIntakeRoutes(app:Express,db:Database.Database,privateDir:()=>string){
 initializeCustomerIntake(db);
 const counters=new Map<string,{at:number,count:number}>();
 const limit=(ip:string,max:number)=>{
  const now=Date.now();
  if(counters.size>15000)counters.clear();
  let c=counters.get(ip);
  if(!c||now-c.at>3600000){c={at:now,count:0};counters.set(ip,c);}
  return ++c.count<=max;
 };
 app.options("/api/public/ai-boss/intakes",(req,res)=>{
  const origin=req.get("origin")||"";
  if(!allowedOrigins.has(origin))return res.sendStatus(403);
  res.set("Access-Control-Allow-Origin",origin);
  res.set("Vary","Origin");
  res.set("Access-Control-Allow-Methods","POST, OPTIONS");
  res.set("Access-Control-Allow-Headers","Content-Type");
  res.sendStatus(204);
 });
 app.post("/api/public/ai-boss/intakes",(req,res)=>{
  const origin=req.get("origin")||"";
  if(!allowedOrigins.has(origin))return res.status(403).json({ok:false,error:"Approved website origin required"});
  res.set("Access-Control-Allow-Origin",origin);
  res.set("Vary","Origin");
  res.set("Cache-Control","no-store");
  if(!limit(req.ip||"unknown",10))return res.status(429).json({ok:false,error:"Too many requests"});
  if(Buffer.byteLength(JSON.stringify(req.body||{}))>11000)return res.status(413).json({ok:false,error:"Brief too large"});
  try{
   const result=createCustomerIntake(db,req.body);
   res.status(201).json({ok:true,...result,
    message:"Selections recorded. Payment will only be available after a verified checkout link is connected. Do not pay through an unrelated link.",
    statusUrl:"https://papalifecoach.com/api/public/ai-boss/intakes/"+result.intakeId+"/status"});
  }catch(error:any){res.status(422).json({ok:false,error:String(error?.message||"Invalid brief").slice(0,180)});}
 });
 app.options("/api/public/ai-boss/confirm-payment",(req,res)=>{
   const origin=req.get("origin")||"";
   if(!allowedOrigins.has(origin))return res.sendStatus(403);
   res.set("Access-Control-Allow-Origin",origin);
   res.set("Vary","Origin");
   res.set("Access-Control-Allow-Methods","POST, OPTIONS");
   res.set("Access-Control-Allow-Headers","Content-Type");
   res.sendStatus(204);
 });
 app.post("/api/public/ai-boss/confirm-payment",async(req,res)=>{
   const origin=req.get("origin")||"";
   if(!allowedOrigins.has(origin))return res.status(403).json({ok:false,error:"Approved website origin required"});
   res.set("Access-Control-Allow-Origin",origin);res.set("Vary","Origin");res.set("Cache-Control","no-store");
   if(!limit(req.ip||"unknown",5))return res.status(429).json({ok:false,error:"Too many payment checks"});
   const id=String(req.body?.intakeId||""),token=String(req.body?.privateStatusToken||"");
   if(!findCustomerIntakeByToken(db,id,token))return res.status(404).json({ok:false,error:"Private project reference unavailable"});
   const credential=String(process.env.AI_BOSS_GHL_API_TOKEN||"");
   if(!credential||process.env.AI_BOSS_GHL_LOCATION_ID!=="qJ83IIaK5y2ZPHzLfGG1")
     return res.status(503).json({ok:false,error:"AI Boss payment verification is not connected yet. Do not pay again."});
   try{
    const prices=parseAiBossPriceMap(String(process.env.AI_BOSS_GHL_PRICE_MAP_JSON||""));
    const result=await verifyAndPrepareAiBossPurchase({db,intakeId:id,
      transactionId:String(req.body?.transactionId||""),apiToken:credential,
      approvedPrices:prices,privateDir:privateDir()});
    res.json({ok:true,verified:result.verified,state:result.exception?"needs_help":"working",
      productionComplete:false,delivered:false,additionalAiCostUsd:0,
      message:result.exception?"The order is verified but needs technical recovery. No second payment is required.":"Verified payment matched to your saved brief and the worker prepared a draft for quality review."});
   }catch(error:any){res.status(422).json({ok:false,error:"Payment is not verified against your selected package. Check your receipt; do not pay again."});}
 });
 app.get("/api/public/ai-boss/intakes/:id/status",(req,res)=>{
  const origin=req.get("origin")||"";if(allowedOrigins.has(origin)){res.set("Access-Control-Allow-Origin",origin);res.set("Vary","Origin");}
  res.set("Cache-Control","no-store");
  if(!limit(req.ip||"unknown",90))return res.status(429).json({ok:false,error:"Too many requests"});
  const token=String(req.get("x-order-status-token")||req.query.token||"");
  const status=findCustomerIntakeByToken(db,String(req.params.id),token);
  if(!status)return res.status(404).json({ok:false,error:"Order reference unavailable"});
  res.json({ok:true,...status,notice:status.delivered?"Delivery recorded.":"Your selection is saved. A payment redirect is not proof of payment."});
 });
 app.get("/api/public/ai-boss/fixed-services",(req,res)=>{
  const origin=req.get("origin")||"";if(allowedOrigins.has(origin)){res.set("Access-Control-Allow-Origin",origin);res.set("Vary","Origin");}
  res.set("Cache-Control","public,max-age=120");
  res.json({ok:true,brand:"ai-boss-mobility",checkoutReady:false,
   products:Object.entries(fixedServiceTemplates).map(([code,c])=>({code,title:c.title,priceCents:c.cents,includedSections:c.sections}))});
 });
}
