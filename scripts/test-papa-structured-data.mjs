import assert from "node:assert/strict";
import {schemaForPapaPage, withPapaPageSchema} from "../shared/papa-structured-data.mjs";
const BASE="https://papalifecoach.com";
const opts=(pathname,title="Papa Life Example",description="Practical fatherhood education")=>
  ({pathname,title,description});

const home=schemaForPapaPage(opts("/"));
assert.equal(home["@graph"][0]["@type"],"WebPage");
assert.equal(home["@graph"][0].publisher["@id"],BASE+"/#organization");
assert.equal(home["@graph"][0].isPartOf["@id"],BASE+"/#website");

const featured=schemaForPapaPage(opts("/"));
const featuredProducts=featured["@graph"].filter(x=>x["@type"]==="Product");
assert.equal(featuredProducts.length,5, "Homepage schema must describe the five real featured offers");
assert.deepEqual(featuredProducts.map(x=>Number(x.offers.price)).sort((a,b)=>a-b), [14.99,14.99,19.99,79,129]);
assert(featured["@graph"].some(x=>x["@type"]==="FAQPage"));
const guidance=schemaForPapaPage({...opts("/parents-of-adult-children"),faq:[["Can I listen?","Yes, when contact is welcome."]]});
assert.equal(guidance["@graph"].find(x=>x["@type"]==="FAQPage").mainEntity.length,1);

const bio=schemaForPapaPage(opts("/about-brian-keith-hill"));
assert.deepEqual(bio["@graph"].map(x=>x["@type"]),["AboutPage","Person"]);
assert.equal(bio["@graph"][0].mainEntity["@id"],BASE+"/about-brian-keith-hill#person");
assert.equal(bio["@graph"][1].worksFor["@id"],BASE+"/#organization");

const framework=schemaForPapaPage(opts("/papa-framework"));
assert.equal(framework["@graph"][0].mainEntity["@id"],BASE+"/papa-framework#framework");
assert.equal(framework["@graph"][1].name,"PAPA Framework");
assert.match(framework["@graph"][1].description,/Presence, Authority, Purpose, and Alignment/);

const course=schemaForPapaPage({...opts("/courses/101","From Distance to Reconnection"),
  course:{name:"From Distance to Reconnection",description:"Original 12-lesson learning program"}});
assert.deepEqual(course["@graph"].map(x=>x["@type"]),["WebPage","Course"]);
assert.equal(course["@graph"][1].provider["@id"],BASE+"/#organization");
assert(!("offers" in course["@graph"][1]),"Never invent course prices or purchase availability");
assert.equal(schemaForPapaPage({...opts("/courses/101"),course:{name:"",description:""}})["@graph"].length,1);
assert.equal(schemaForPapaPage(opts("/courses"))["@graph"][0]["@type"],"CollectionPage");
assert.equal(schemaForPapaPage(opts("/shop"))["@graph"][0]["@type"],"CollectionPage");
assert.equal(schemaForPapaPage(opts("/music-room"))["@graph"][0]["@type"],"WebPage");

for(const pathname of ["/papa-life-os","/papa-life-os/reports","/admin/console","/ai-boss/approval",
  "/api/courses","/member-login","/portal","/assessment","/privacy"]){
  assert.equal(schemaForPapaPage(opts(pathname)),null,"Private or redirect path must be excluded: "+pathname);
}
assert.equal(schemaForPapaPage(opts("//evil.example/")),null);

const shell="<html><head><title>Example</title></head><body><main>Fatherhood</main></body></html>";
const withSchema=withPapaPageSchema(shell,opts("/papa-framework"));
assert(withSchema.includes('data-papa-schema="page"'));
assert.equal(withSchema,withPapaPageSchema(withSchema,opts("/papa-framework")),"Must be idempotent");
const changed=withPapaPageSchema(withSchema,opts("/courses"));
assert.equal((changed.match(/data-papa-schema="page"/g)||[]).length,1,"Replace old page schema");
const match=changed.match(/<script type="application\/ld\+json" data-papa-schema="page">([\s\S]*?)<\/script>/);
assert(match);
assert.equal(JSON.parse(match[1])["@graph"][0].url,BASE+"/courses");
assert.equal(withPapaPageSchema(withSchema,{...opts("/private"),indexable:false}).includes('data-papa-schema="page"'),false);
assert.equal(withPapaPageSchema(
 "<head><meta name=\"robots\" content=\"noindex, follow\"></head>",opts("/courses"))
 .includes('data-papa-schema="page"'),false);
console.log("Papa Life schema tests passed: public pages, PAPA framework, founder, course, private-page exclusions and replacement.");
