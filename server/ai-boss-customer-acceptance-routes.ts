/**
 * Customer acceptance endpoints. Intentionally OFF by default.
 * These routes cannot issue invitations, send mail, charge customers or
 * create final invoices. They should only be enabled after a verified
 * preview portal + signed agreement and payment adapters are tested.
 */
import type {Express,Request,Response} from "express";
import type Database from "better-sqlite3";
import {getHalfDownAcceptancePreview,submitHalfDownCustomerResponse} from "./ai-boss-customer-acceptance";
const trustedOrigins=new Set(["https://ai.bossmobilelifecoach.com"]);
export function installAiBossAcceptanceRoutes(app:Express,db:Database.Database,enabled:boolean){
 const counts=new Map<string,{at:number,n:number}>();
 function allowed(req:Request,res:Response){
  res.set("Cache-Control","no-store");
  res.set("Referrer-Policy","no-referrer");
  res.set("X-Content-Type-Options","nosniff");
  if(!enabled){res.status(404).json({ok:false,error:"Acceptance is not available"});return false;}
  const origin=req.get("origin")||"";
  if(!trustedOrigins.has(origin)){res.status(403).json({ok:false,error:"Approved business website required"});return false;}
  res.set("Access-Control-Allow-Origin",origin);
  res.set("Vary","Origin");
  const key=req.ip||"unknown",now=Date.now();
  if(counts.size>10000)counts.clear();
  const prev=counts.get(key);
  const c=prev&&now-prev.at<3600000?prev:{at:now,n:0};
  c.n++;counts.set(key,c);
  if(c.n>40){res.status(429).json({ok:false,error:"Try again later"});return false;}
  if(Buffer.byteLength(JSON.stringify(req.body||{}))>5000){
   res.status(413).json({ok:false,error:"Request too large"});return false;
  }
  return true;
 }
 app.options("/api/public/ai-boss/acceptance/:kind",(req,res)=>{
  const origin=req.get("origin")||"";
  if(!enabled||!trustedOrigins.has(origin)){res.sendStatus(403);return;}
  res.set("Access-Control-Allow-Origin",origin);
  res.set("Access-Control-Allow-Methods","POST, OPTIONS");
  res.set("Access-Control-Allow-Headers","Content-Type");
  res.set("Vary","Origin");res.sendStatus(204);
 });
 app.post("/api/public/ai-boss/acceptance/preview",(req,res)=>{
  if(!allowed(req,res))return;
  try{
   const result=getHalfDownAcceptancePreview(db,String(req.body?.token||""));
   if(!result){res.status(404).json({ok:false,error:"Invitation unavailable or expired"});return;}
   res.json({ok:true,...result});
  }catch{res.status(404).json({ok:false,error:"Invitation unavailable or expired"});}
 });
 app.post("/api/public/ai-boss/acceptance/decision",(req,res)=>{
  if(!allowed(req,res))return;
  try{
   const result=submitHalfDownCustomerResponse(db,{
    token:String(req.body?.token||""),
    decision:req.body?.decision,
    notes:req.body?.notes,
    viewedPreview:req.body?.viewedPreview,
    reviewedTestResults:req.body?.reviewedTestResults,
    affirmativeAcceptance:req.body?.affirmativeAcceptance
   });
   res.json({ok:true,...result});
  }catch{
   res.status(422).json({ok:false,error:"Invitation invalid, expired, or review incomplete. No invoice was sent."});
  }
 });
}
