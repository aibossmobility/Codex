import assert from "node:assert/strict";
import {test} from "node:test";
import express from "express";
import Database from "better-sqlite3";
import {installAiBossAcceptanceRoutes} from "./ai-boss-customer-acceptance-routes";

async function setup(enabled:boolean){
 const db=new Database(":memory:"),app=express();
 app.use(express.json({limit:"12kb"}));
 installAiBossAcceptanceRoutes(app,db,enabled);
 const server=app.listen(0,"127.0.0.1");
 await new Promise<void>(resolve=>server.once("listening",resolve));
 const port=(server.address() as any).port;
 return {db,url:"http://127.0.0.1:"+port,close:async()=>{
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));db.close();
 }};
}
function submit(base:string,kind:string,body:any,origin="https://ai.bossmobilelifecoach.com"){
 return fetch(base+"/api/public/ai-boss/acceptance/"+kind,{
  method:"POST",headers:{"Content-Type":"application/json",Origin:origin},
  body:JSON.stringify(body)
 });
}
test("production default-off acceptance routes cannot receive decisions or disclose data",async()=>{
 const s=await setup(false);
 try{
  for(const kind of ["preview","decision"]){
   const r=await submit(s.url,kind,{token:"not-a-token",decision:"accepted"});
   assert.equal(r.status,404);
   assert.equal(r.headers.get("cache-control"),"no-store");
   assert.equal((await r.json()).ok,false);
  }
 }finally{await s.close();}
});
test("only AI Boss website origin can use even enabled preview flow",async()=>{
 const s=await setup(true);
 try{
  const unauthorized=await submit(s.url,"preview",{token:"a".repeat(43)},"https://papalifecoach.com");
  assert.equal(unauthorized.status,403);
  const invalid=await submit(s.url,"preview",{token:"a".repeat(43)});
  assert.equal(invalid.status,404);
  assert.equal(invalid.headers.get("access-control-allow-origin"),"https://ai.bossmobilelifecoach.com");
  const decision=await submit(s.url,"decision",{token:"a".repeat(43),
   decision:"accepted",notes:"I accept the completed version",
   viewedPreview:true,reviewedTestResults:true,affirmativeAcceptance:true});
  assert.equal(decision.status,422);
  assert.match((await decision.json()).error,/No invoice was sent/);
 }finally{await s.close();}
});
test("CORS preflight fails closed while disabled",async()=>{
 const s=await setup(false);
 try{
  const r=await fetch(s.url+"/api/public/ai-boss/acceptance/decision",{
   method:"OPTIONS",headers:{Origin:"https://ai.bossmobilelifecoach.com"}
  });
  assert.equal(r.status,403);
 }finally{await s.close();}
});
