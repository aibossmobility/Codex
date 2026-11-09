import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPublicKey, randomBytes, verify } from "node:crypto";
import { installPapaAiBossOwnerSso } from "./papa-ai-boss-sso";

const directory=fs.mkdtempSync(path.join(os.tmpdir(),"papa-sso-test-"));
const routes=new Map<string,(req:any,res:any)=>any>();
const app={get:(route:string,handler:(req:any,res:any)=>any)=>{routes.set(route,handler);}} as any;
installPapaAiBossOwnerSso(app,{
 directory,
 getAdminById:(id:number)=>id===1?{id:1,username:"papalife",email:"brian@bossmobility.net"}:undefined,
});
function response(){
 const res:any={code:200,headers:{},body:null,location:null};
 res.set=(k:string,v:string)=>{res.headers[k]=v;return res;};
 res.status=(code:number)=>{res.code=code;return res;};
 res.type=()=>res;
 res.send=(body:any)=>{res.body=body;return res;};
 res.json=(body:any)=>{res.body=body;return res;};
 res.redirect=(code:number,url:string)=>{res.code=code;res.location=url;return res;};
 return res;
}
const keyHandler=routes.get("/api/auth/ai-boss-sso/public-key")!;
const issue=routes.get("/api/auth/ai-boss-sso/authorize")!;
try{
 const keyResponse=response();
 keyHandler({},keyResponse);
 assert.equal(keyResponse.code,200);
 assert.equal(keyResponse.body.ok,true);
 assert.equal(keyResponse.body.alg,"EdDSA");
 assert.equal(keyResponse.body.issuer,"https://papalifecoach.com");
 assert.equal(typeof keyResponse.body.publicKey,"string");
 assert.equal(JSON.stringify(keyResponse.body).includes("PRIVATE KEY"),false);
 const pub=createPublicKey({key:Buffer.from(keyResponse.body.publicKey,"base64"),format:"der",type:"spki"});
 assert.equal(pub.asymmetricKeyType,"ed25519");
 const state=randomBytes(32).toString("base64url");
 const validReq={query:{state},session:{adminId:1,adminUser:{id:1,email:"brian@bossmobility.net"}}};
 const validRes=response();
 issue(validReq,validRes);
 assert.equal(validRes.code,303);
 const redirect=new URL(validRes.location);
 assert.equal(redirect.origin,"https://ai.bossmobilelifecoach.com");
 assert.equal(redirect.pathname,"/auth/papa/callback");
 assert.equal(redirect.searchParams.get("state"),state);
 const ticket=redirect.searchParams.get("ticket")!;
 const [header,body,signature]=ticket.split(".");
 const claims=JSON.parse(Buffer.from(body,"base64url").toString());
 assert.equal(claims.iss,"https://papalifecoach.com");
 assert.equal(claims.aud,"ai-boss-mobility-owner-os");
 assert.equal(claims.owner_verified,true);
 assert.equal(claims.email,"brian@bossmobility.net");
 assert.equal(claims.state,state);
 assert.ok(claims.exp-claims.iat<=90);
 assert.ok(verify(null,Buffer.from(header+"."+body),pub,Buffer.from(signature,"base64url")));
 const noSession=response();
 issue({query:{state},session:{}},noSession);
 assert.equal(noSession.code,302);
 assert.match(noSession.location,/^\/login\?returnTo=/);
 const unauthorized=response();
 issue({query:{state},session:{adminId:1,adminUser:{id:1,email:"not-owner@example.com"}}},unauthorized);
 assert.equal(unauthorized.code,403);
 const badState=response();
 issue({query:{state:"bad"},session:validReq.session},badState);
 assert.equal(badState.code,400);
 const missingUser=response();
 issue({query:{state},session:{adminId:2,adminUser:{id:2,email:"brian@bossmobility.net"}}},missingUser);
 assert.equal(missingUser.code,403);
 const file=path.join(directory,"papa-ai-boss-owner-sso-ed25519.pem");
 assert.ok(fs.existsSync(file));
 assert.equal(fs.lstatSync(file).mode&0o077,0);
 console.log("PASS Papa Life owner SSO: signed tickets, 90-second validity, exact owner and safe login redirect");
}finally{fs.rmSync(directory,{recursive:true,force:true});}
