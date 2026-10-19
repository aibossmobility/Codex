import fs from "node:fs";
import assert from "node:assert/strict";
const app=fs.readFileSync("client/src/App.tsx","utf8");
const allPages=fs.readFileSync("client/src/pages/AllPages.tsx","utf8");
const publicDir=fs.readFileSync("client/src/pages/SiteDirectory.tsx","utf8");
const seo=fs.readFileSync("scripts/generate-search-discovery.mjs","utf8");
const mobile=fs.readFileSync("client/src/pages/AiBossMobile.tsx","utf8");
const routes=new Set([...app.matchAll(/<Route path=(?:\{)?"([^"]+)"\}?/g)].map(x=>x[1]));
const isMapped=(url)=>routes.has(url)||url.startsWith("/house/")&&routes.has("/house/:room")||
  url==="/papa-life-master-knowledge-center"&&fs.existsSync("client/public/papa-life-master-knowledge-center/index.html");
const all=[...allPages.matchAll(/\{ label: "[^"]+", path: "([^"]+)" \}/g)].map(x=>x[1]);
const pub=[...publicDir.matchAll(/\["[^"]+", "([^"]+)"\]/g)].map(x=>x[1]);
const search=[...seo.matchAll(/^  \["(\/[^"]*)", "(?:weekly|monthly|yearly)"/gm)].map(x=>x[1]);
const obsolete=new Set(["/membership","/booking","/media-library","/member-register","/member-billing","/member-activate","/contact","/resources","/books","/podcast"]);
const lists={all,pub,search};
for(const [name,list] of Object.entries(lists)){
 assert.equal(list.length,new Set(list).size,name+" contains duplicate destinations");
 for(const url of list){
  assert.ok(isMapped(url),name+" contains unmapped destination "+url);
  assert.ok(!obsolete.has(url),name+" contains retired/misleading link "+url);
 }
}
assert.ok(!mobile.includes("MET A FATHER"),"Old father button still shown");
assert.ok(mobile.includes("GIVE ASSIGNMENT TO WORKERS"),"Worker entry button missing");
assert.ok(mobile.includes('label="Approvals & Queue" onClick={() => navigate("/papa-life-os/approvals")}'),"Mobile approval shortcut still wrong");
const portal=fs.readFileSync("client/src/pages/DigitalTwinPortal.tsx","utf8");
assert.ok(!portal.includes("<iframe"),"The cross-domain Twin iframe is blocked by CSP");
assert.ok(portal.includes('<DigitalBrianGuide mode="owner" />'),"Digital Brian no-model-cost OS guide missing");
assert.ok(portal.includes('onClick={() => setVoiceOpen(true)}'),"Voice must require an explicit user action");
assert.ok(!portal.includes("papa-life-digital-twin-preview-production"),"Old external Digital Twin preview should not be required");
const publicTwin=fs.readFileSync("client/src/pages/DigitalTwinDemo.tsx","utf8");
assert.ok(publicTwin.includes('<DigitalBrianGuide mode="visitor" />'),"Visitor-first no-model-cost guide missing");
assert.ok(publicTwin.includes('onClick={() => setVoiceOpen(true)}'),"Public voice must require explicit opt in");
console.log(JSON.stringify({all_pages:all.length,public_directory:pub.length,seo_directory:search.length,unmapped:0,obsolete:0,duplicates:0,broken_twin_embed_repaired:true,worker_icon_replaced:true},null,2));
